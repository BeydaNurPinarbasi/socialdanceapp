import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

export type SchoolEventRow = {
  id: string;
  school_id: string;
  title: string;
  starts_at: string;
  location: string | null;
  image_url: string | null;
  description: string | null;
};

export type ManagedSchoolEventItem = SchoolEventRow & {
  school_name: string;
};

export type CreateSchoolEventInput = {
  schoolId: string;
  title: string;
  startsAt: string;
  location?: string | null;
  description?: string | null;
};

type SupabaseUserResponse = {
  id: string;
};

type SupabaseSessionResponse = {
  access_token: string;
  refresh_token: string;
};

type SchoolRow = {
  id: string;
  name: string;
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
  if (!accessToken) {
    accessToken = await refreshAccessToken();
  }
  if (!accessToken) {
    throw new Error('No access token.');
  }

  try {
    return await run(accessToken);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) throw error;
    return run(refreshedToken);
  }
}

async function getMyUserId(accessToken: string): Promise<string> {
  const user = await supabaseAuthRequest<SupabaseUserResponse>('/user', { accessToken });
  return user.id;
}

export async function listSchoolEvents(schoolId: string, limit = 20): Promise<SchoolEventRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=id,school_id,title,starts_at,location,image_url,description&school_id=eq.${encodeURIComponent(schoolId)}&order=starts_at.asc&limit=${safeLimit}`,
    { method: 'GET' },
  );
}

export async function listAllSchoolEvents(limit = 100): Promise<SchoolEventRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  return await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=id,school_id,title,starts_at,location,image_url,description&order=starts_at.desc&limit=${safeLimit}`,
    { method: 'GET' },
  );
}

export async function getSchoolEventById(eventId: string): Promise<SchoolEventRow | null> {
  const rows = await supabaseRestRequest<SchoolEventRow[]>(
    `/school_events?select=id,school_id,title,starts_at,location,image_url,description&id=eq.${encodeURIComponent(eventId)}&limit=1`,
    { method: 'GET' },
  );
  return rows?.[0] ?? null;
}

export const instructorSchoolEventsService = {
  async listMine(): Promise<ManagedSchoolEventItem[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const assignments = await supabaseRestRequest<{ school_id: string }[]>(
        `/school_instructor_assignments?select=school_id&user_id=eq.${encodeURIComponent(me)}`,
        { method: 'GET', accessToken },
      );

      const schoolIds = [...new Set((assignments ?? []).map((row) => row.school_id).filter(Boolean))];
      if (schoolIds.length === 0) return [];

      const idIn = schoolIds.map((id) => encodeURIComponent(id)).join(',');
      const [events, schools] = await Promise.all([
        supabaseRestRequest<SchoolEventRow[]>(
          `/school_events?select=id,school_id,title,starts_at,location,image_url,description&school_id=in.(${idIn})&order=starts_at.asc`,
          { method: 'GET', accessToken },
        ),
        supabaseRestRequest<SchoolRow[]>(
          `/schools?select=id,name&id=in.(${idIn})`,
          { method: 'GET', accessToken },
        ),
      ]);

      const schoolNameById = new Map((schools ?? []).map((school) => [school.id, school.name]));

      return (events ?? []).map((event) => ({
        ...event,
        school_name: schoolNameById.get(event.school_id)?.trim() || 'Okul',
      }));
    });
  },

  async create(input: CreateSchoolEventInput): Promise<SchoolEventRow> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const response = await supabaseRestRequest<SchoolEventRow | SchoolEventRow[]>(
        '/school_events?select=id,school_id,title,starts_at,location,image_url,description',
        {
          method: 'POST',
          accessToken,
          headers: {
            Prefer: 'return=representation',
          },
          body: {
            school_id: input.schoolId,
            title: input.title.trim(),
            starts_at: input.startsAt,
            location: input.location?.trim() || null,
            description: input.description?.trim() || null,
          },
        },
      );

      const rows = Array.isArray(response) ? response : [response];
      if (!rows[0]) {
        throw new Error('Etkinlik oluşturulamadı.');
      }

      return rows[0];
    });
  },
};
