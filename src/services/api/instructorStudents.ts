import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

export type InstructorStudentListItem = {
  id: string;
  studentUserId: string;
  status: 'invited' | 'active' | 'archived';
  displayName: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
};

export type InstructorFollowerSearchHit = {
  studentUserId: string;
  displayName: string;
  username: string;
  email: string;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type StudentRow = {
  id: string;
  student_user_id: string;
  status: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
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

function isStatus(v: string): v is InstructorStudentListItem['status'] {
  return v === 'invited' || v === 'active' || v === 'archived';
}

export const instructorStudentsService = {
  async listMine(): Promise<InstructorStudentListItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<StudentRow[]>(
        `/instructor_students?select=id,student_user_id,status,created_at&instructor_user_id=eq.${encodeURIComponent(
          me,
        )}&order=created_at.desc&limit=200`,
        { method: 'GET', accessToken },
      );
      const list = rows ?? [];
      if (list.length === 0) return [];

      const ids = [...new Set(list.map((r) => r.student_user_id).filter(Boolean))];
      const inClause = ids.map((id) => encodeURIComponent(id)).join(',');
      const profiles = await supabaseRestRequest<ProfileRow[]>(
        `/profiles?select=id,display_name,username,avatar_url&id=in.(${inClause})`,
        { method: 'GET', accessToken },
      );
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return list.map((r) => {
        const p = byId.get(r.student_user_id);
        const displayName =
          (p?.display_name ?? '').trim() || (p?.username ?? '').trim() || 'Öğrenci';
        const username = (p?.username ?? '').trim();
        const st = r.status;
        return {
          id: r.id,
          studentUserId: r.student_user_id,
          status: isStatus(st) ? st : 'active',
          displayName,
          username,
          avatarUrl: p?.avatar_url?.trim() || null,
          createdAt: r.created_at,
        };
      });
    });
  },

  async addStudent(studentUserId: string): Promise<void> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      if (studentUserId === me) {
        throw new ApiError('Kendinizi öğrenci olarak ekleyemezsiniz.', { status: 400 });
      }
      await supabaseRestRequest('/instructor_students', {
        method: 'POST',
        accessToken,
        headers: { Prefer: 'return=minimal' },
        body: {
          instructor_user_id: me,
          student_user_id: studentUserId,
          status: 'active',
        },
      });
    });
  },

  /**
   * Sizi takip eden kullanıcılar içinde arama (görünen ad, kullanıcı adı, kayıt e-postası).
   * Sorgu boşlukla ayrılmış kelimeler; hepsi eşleşmeli (AND). Yalnızca eğitmen profili olanlar.
   */
  async searchMyFollowers(query: string): Promise<InstructorFollowerSearchHit[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const q = query.trim();
      if (q.length < 2) return [];
      const rows = await supabaseRestRequest<
        Array<{
          student_user_id?: string;
          display_name?: string | null;
          username?: string | null;
          email?: string | null;
        }>
      >('/rpc/instructor_search_my_followers', {
        method: 'POST',
        accessToken,
        body: { p_query: q },
      });
      return (rows ?? [])
        .map((r) => ({
          studentUserId: typeof r.student_user_id === 'string' ? r.student_user_id : '',
          displayName: (r.display_name ?? '').trim(),
          username: (r.username ?? '').trim(),
          email: (r.email ?? '').trim(),
        }))
        .filter((r) => r.studentUserId.length > 0);
    });
  },
};
