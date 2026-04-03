import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

export type AssignedSchoolItem = {
  schoolId: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  imageUrl: string | null;
  telephone: string | null;
  assignedAt: string;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type AssignmentRow = {
  school_id: string;
  created_at: string;
};

type SchoolRow = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  address: string | null;
  image_url: string | null;
  telephone: string | null;
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

export const instructorSchoolAssignmentsService = {
  /** Yönetici ataması olan okullar (yoksa []). */
  async listMine(): Promise<AssignedSchoolItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const assignRows = await supabaseRestRequest<AssignmentRow[]>(
        `/school_instructor_assignments?select=school_id,created_at&user_id=eq.${encodeURIComponent(me)}&order=created_at.asc`,
        { method: 'GET', accessToken },
      );
      const list = assignRows ?? [];
      if (list.length === 0) return [];

      const ids = [...new Set(list.map((r) => r.school_id).filter(Boolean))];
      const inClause = ids.map((id) => encodeURIComponent(id)).join(',');
      const schoolRows = await supabaseRestRequest<SchoolRow[]>(
        `/schools?select=id,name,city,district,address,image_url,telephone&id=in.(${inClause})`,
        { method: 'GET', accessToken },
      );
      const byId = new Map((schoolRows ?? []).map((s) => [s.id, s]));

      return list.map((a) => {
        const s = byId.get(a.school_id);
        return {
          schoolId: a.school_id,
          name: (s?.name ?? 'Okul').trim() || 'Okul',
          city: s?.city ?? null,
          district: s?.district ?? null,
          address: s?.address ?? null,
          imageUrl: s?.image_url ?? null,
          telephone: s?.telephone ?? null,
          assignedAt: a.created_at,
        };
      });
    });
  },
};
