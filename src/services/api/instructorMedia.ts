import {
  ApiError,
  getSupabaseStoragePublicUrl,
  hasSupabaseConfig,
  supabaseAuthRequest,
  supabaseRestRequest,
  supabaseStorageRemove,
  supabaseStorageUpload,
} from './apiClient';
import { storage } from '../storage';

const BUCKET = 'instructor-media';
const MAX_ITEMS = 24;

export type InstructorMediaItem = {
  id: string;
  instructorUserId: string;
  storageObjectPath: string;
  publicUrl: string;
  createdAt: string;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type MediaRow = {
  id: string;
  instructor_user_id: string;
  storage_object_path: string;
  created_at: string;
};

function guessFileExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const extension = match?.[1]?.toLowerCase();
  if (extension === 'jpeg') return 'jpg';
  if (extension && ['jpg', 'png', 'webp', 'heic'].includes(extension)) return extension;
  return 'jpg';
}

function guessMimeType(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getRefreshToken();
  if (!refreshToken) return null;
  const session = await supabaseAuthRequest<SupabaseSessionResponse>('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  await Promise.all([
    storage.setAccessToken(session.access_token),
    storage.setRefreshToken(session.refresh_token),
    storage.setLoggedIn(true),
  ]);
  return session.access_token;
}

async function withAuthorizedUserRequest<T>(run: (accessToken: string) => Promise<T>): Promise<T> {
  let accessToken = await storage.getAccessToken();
  if (!accessToken) accessToken = await refreshAccessToken();
  if (!accessToken) throw new Error('No access token.');
  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw error;
    return run(refreshed);
  }
}

async function getMyUserId(accessToken: string): Promise<string> {
  const user = await supabaseAuthRequest<SupabaseUserResponse>('/user', { accessToken });
  return user.id;
}

function mapRow(row: MediaRow): InstructorMediaItem {
  return {
    id: row.id,
    instructorUserId: row.instructor_user_id,
    storageObjectPath: row.storage_object_path,
    publicUrl: getSupabaseStoragePublicUrl(BUCKET, row.storage_object_path),
    createdAt: row.created_at,
  };
}

export const instructorMediaService = {
  maxItems: MAX_ITEMS,

  /**
   * Görünür eğitmen profili sayfası (RLS: is_visible veya kendi kayıtları).
   */
  async listForPublishedProfile(instructorUserId: string): Promise<InstructorMediaItem[]> {
    if (!hasSupabaseConfig()) return [];
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<MediaRow[]>(
        `/instructor_media?select=id,instructor_user_id,storage_object_path,created_at&instructor_user_id=eq.${encodeURIComponent(
          instructorUserId,
        )}&order=created_at.desc&limit=${MAX_ITEMS}`,
        { method: 'GET', accessToken },
      );
      return (rows ?? []).map(mapRow);
    });
  },

  async listMine(): Promise<InstructorMediaItem[]> {
    if (!hasSupabaseConfig()) return [];
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<MediaRow[]>(
        `/instructor_media?select=id,instructor_user_id,storage_object_path,created_at&instructor_user_id=eq.${encodeURIComponent(
          me,
        )}&order=created_at.desc&limit=${MAX_ITEMS}`,
        { method: 'GET', accessToken },
      );
      return (rows ?? []).map(mapRow);
    });
  },

  async addFromLocalUri(localUri: string): Promise<InstructorMediaItem> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const existing = await supabaseRestRequest<Pick<MediaRow, 'id'>[]>(
        `/instructor_media?select=id&instructor_user_id=eq.${encodeURIComponent(me)}&limit=${MAX_ITEMS}`,
        { method: 'GET', accessToken },
      );
      if ((existing ?? []).length >= MAX_ITEMS) {
        throw new ApiError(`En fazla ${MAX_ITEMS} görsel ekleyebilirsiniz.`, { status: 400 });
      }

      const ext = guessFileExtension(localUri);
      const objectPath = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const contentType = guessMimeType(ext);
      const fileResponse = await fetch(localUri);
      const fileBlob = await fileResponse.blob();

      await supabaseStorageUpload(`${BUCKET}/${objectPath}`, {
        file: fileBlob,
        contentType,
        accessToken,
        upsert: false,
      });

      const rows = await supabaseRestRequest<MediaRow[]>(
        '/instructor_media',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body: {
            instructor_user_id: me,
            storage_object_path: objectPath,
          },
        },
      );
      const row = rows?.[0];
      if (!row) throw new ApiError('Medya kaydı oluşturulamadı.', { status: 500 });
      return mapRow(row);
    });
  },

  async remove(id: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<MediaRow[]>(
        `/instructor_media?select=id,storage_object_path,instructor_user_id&id=eq.${encodeURIComponent(id)}&instructor_user_id=eq.${encodeURIComponent(me)}&limit=1`,
        { method: 'GET', accessToken },
      );
      const row = rows?.[0];
      if (!row) {
        throw new ApiError('Görsel bulunamadı.', { status: 404 });
      }

      await supabaseRestRequest(`/instructor_media?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        accessToken,
      });

      await supabaseStorageRemove(`${BUCKET}/${row.storage_object_path}`, { accessToken }).catch(() => undefined);
    });
  },
};
