import { ApiError, hasSupabaseConfig, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

export type InstructorWorkMode = 'individual' | 'school' | 'both';

export type InstructorProfileModel = {
  userId: string;
  workMode: InstructorWorkMode;
  headline: string;
  instructorBio: string;
  specialties: string[];
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InstructorProfileUpsert = {
  workMode: InstructorWorkMode;
  headline: string;
  instructorBio: string;
  specialties: string[];
  isVisible: boolean;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type InstructorProfileRow = {
  user_id: string;
  work_mode: string;
  headline: string;
  instructor_bio: string;
  specialties: string[] | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

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

function isWorkMode(v: string): v is InstructorWorkMode {
  return v === 'individual' || v === 'school' || v === 'both';
}

type InstructorProfileExploreRow = {
  user_id: string;
  headline: string;
  instructor_bio: string;
  specialties: string[] | null;
};

type ProfileCardRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

/** Keşfet / eğitmen listesi (giriş yoksa veya hata olursa []). */
export type ExploreInstructorListItem = {
  userId: string;
  headline: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  profileBio: string;
  instructorBio: string;
  specialties: string[];
};

export type InstructorCardRow = {
  key: string;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
  userId: string;
  navigateName: string;
  navigateUsername: string;
  navigateBio?: string;
};

export function cardRowsFromExploreInstructors(items: ExploreInstructorListItem[]): InstructorCardRow[] {
  return items.map((i) => ({
    key: i.userId,
    title: i.headline || i.displayName,
    subtitle: i.username
      ? `@${i.username}`
      : i.specialties.length > 0
        ? i.specialties.slice(0, 3).join(' · ')
        : 'Eğitmen',
    avatarUrl: i.avatarUrl,
    userId: i.userId,
    navigateName: i.displayName,
    navigateUsername: i.username,
    navigateBio: i.instructorBio || i.profileBio,
  }));
}

function mapRow(row: InstructorProfileRow): InstructorProfileModel {
  const wm = row.work_mode;
  return {
    userId: row.user_id,
    workMode: isWorkMode(wm) ? wm : 'individual',
    headline: row.headline ?? '',
    instructorBio: row.instructor_bio ?? '',
    specialties: Array.isArray(row.specialties) ? row.specialties : [],
    isVisible: row.is_visible !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const instructorProfileService = {
  /** Keşfet profili / yayın sayfası: görünür eğitmen tek kullanıcı. */
  async getVisibleByUserId(userId: string): Promise<ExploreInstructorListItem | null> {
    if (!hasSupabaseConfig()) return null;
    try {
      return await withAuthorizedUserRequest(async (accessToken) => {
        const ipRows = await supabaseRestRequest<InstructorProfileExploreRow[]>(
          `/instructor_profiles?select=user_id,headline,instructor_bio,specialties&user_id=eq.${encodeURIComponent(
            userId,
          )}&is_visible=eq.true&limit=1`,
          { method: 'GET', accessToken },
        );
        const ip = ipRows?.[0];
        if (!ip) return null;

        const profileRows = await supabaseRestRequest<ProfileCardRow[]>(
          `/profiles?select=id,display_name,username,avatar_url,bio&id=eq.${encodeURIComponent(userId)}&limit=1`,
          { method: 'GET', accessToken },
        );
        const p = profileRows?.[0];
        const displayName =
          (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || 'Eğitmen';
        const username = (p?.username ?? '').trim();
        return {
          userId: ip.user_id,
          headline: (ip.headline ?? '').trim(),
          displayName,
          username,
          avatarUrl: p?.avatar_url?.trim() || null,
          profileBio: (p?.bio ?? '').trim(),
          instructorBio: (ip.instructor_bio ?? '').trim(),
          specialties: Array.isArray(ip.specialties) ? ip.specialties : [],
        };
      });
    } catch {
      return null;
    }
  },

  async listVisibleForExplore(): Promise<ExploreInstructorListItem[]> {
    if (!hasSupabaseConfig()) return [];
    try {
      return await withAuthorizedUserRequest(async (accessToken) => {
        const ipRows = await supabaseRestRequest<InstructorProfileExploreRow[]>(
          '/instructor_profiles?select=user_id,headline,instructor_bio,specialties&is_visible=eq.true&order=created_at.desc&limit=100',
          { method: 'GET', accessToken },
        );
        const list = ipRows ?? [];
        if (list.length === 0) return [];

        const ids = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
        const inClause = ids.map((id) => encodeURIComponent(id)).join(',');
        const profileRows = await supabaseRestRequest<ProfileCardRow[]>(
          `/profiles?select=id,display_name,username,avatar_url,bio&id=in.(${inClause})`,
          { method: 'GET', accessToken },
        );
        const byId = new Map((profileRows ?? []).map((p) => [p.id, p]));

        return list.map((ip) => {
          const p = byId.get(ip.user_id);
          const displayName =
            (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || 'Eğitmen';
          const username = (p?.username ?? '').trim();
          return {
            userId: ip.user_id,
            headline: (ip.headline ?? '').trim(),
            displayName,
            username,
            avatarUrl: p?.avatar_url?.trim() || null,
            profileBio: (p?.bio ?? '').trim(),
            instructorBio: (ip.instructor_bio ?? '').trim(),
            specialties: Array.isArray(ip.specialties) ? ip.specialties : [],
          };
        });
      });
    } catch {
      return [];
    }
  },

  async getMine(): Promise<InstructorProfileModel | null> {
    if (!hasSupabaseConfig()) return null;
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<InstructorProfileRow[]>(
        `/instructor_profiles?select=user_id,work_mode,headline,instructor_bio,specialties,is_visible,created_at,updated_at&user_id=eq.${encodeURIComponent(me)}&limit=1`,
        { method: 'GET', accessToken },
      );
      const row = rows?.[0];
      return row ? mapRow(row) : null;
    });
  },

  async upsertMine(input: InstructorProfileUpsert): Promise<InstructorProfileModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const body = {
        user_id: me,
        work_mode: input.workMode,
        headline: input.headline.trim(),
        instructor_bio: input.instructorBio.trim(),
        specialties: input.specialties,
        is_visible: input.isVisible,
      };
      const rows = await supabaseRestRequest<InstructorProfileRow[]>(
        '/instructor_profiles',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body,
        },
      );
      const row = rows?.[0];
      if (!row) {
        throw new ApiError('Eğitmen profili kaydedilemedi.', { status: 500 });
      }
      return mapRow(row);
    });
  },
};
