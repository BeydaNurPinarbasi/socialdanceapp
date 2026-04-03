import { ApiError, supabaseAuthRequest, supabaseRestRequest } from './apiClient';
import { storage } from '../storage';

export type InstructorLessonModel = {
  id: string;
  instructorUserId: string;
  schoolId: string | null;
  title: string;
  description: string;
  priceCents: number | null;
  currency: string;
  level: string;
  isPublished: boolean;
  /** ISO 8601 veya null (tarih/saat seçilmediyse) */
  startsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InstructorLessonInput = {
  title: string;
  description: string;
  priceCents: number | null;
  currency?: string;
  level: string;
  isPublished: boolean;
  schoolId?: string | null;
  startsAt: string | null;
};

export type InstructorScheduleSlotModel = {
  id: string;
  lessonId: string;
  weekday: number;
  startTime: string;
  tz: string;
  locationType: 'online' | 'in_person' | 'school';
  address: string | null;
};

export type InstructorScheduleSlotInput = {
  lessonId: string;
  weekday: number;
  startTime: string;
  locationType: 'online' | 'in_person' | 'school';
  address?: string | null;
  tz?: string;
};

type SupabaseUserResponse = { id: string };
type SupabaseSessionResponse = { access_token: string; refresh_token: string };

type LessonRow = {
  id: string;
  instructor_user_id: string;
  school_id: string | null;
  title: string;
  description: string | null;
  price_cents: number | null;
  currency: string;
  level: string;
  is_published: boolean;
  starts_at?: string | null;
  created_at: string;
  updated_at: string;
};

type SlotRow = {
  id: string;
  lesson_id: string;
  weekday: number;
  start_time: string;
  tz: string;
  location_type: string;
  address: string | null;
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

function mapLesson(row: LessonRow): InstructorLessonModel {
  return {
    id: row.id,
    instructorUserId: row.instructor_user_id,
    schoolId: row.school_id,
    title: row.title ?? '',
    description: (row.description ?? '').trim(),
    priceCents: row.price_cents,
    currency: row.currency ?? 'TRY',
    level: row.level ?? 'Tüm Seviyeler',
    isPublished: row.is_published !== false,
    startsAt: row.starts_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isLocationType(v: string): v is InstructorScheduleSlotModel['locationType'] {
  return v === 'online' || v === 'in_person' || v === 'school';
}

function formatTimeForApi(input: string): string {
  const trimmed = input.trim();
  const m2 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (m2) {
    const h = m2[1].padStart(2, '0');
    const min = m2[2].padStart(2, '0');
    return `${h}:${min}:00`;
  }
  const m3 = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m3) {
    return `${m3[1].padStart(2, '0')}:${m3[2].padStart(2, '0')}:${m3[3].padStart(2, '0')}`;
  }
  return trimmed;
}

function mapSlot(row: SlotRow): InstructorScheduleSlotModel {
  const st = typeof row.start_time === 'string' ? row.start_time : String(row.start_time);
  const shortTime = st.length >= 5 ? st.slice(0, 5) : st;
  const loc = row.location_type;
  return {
    id: row.id,
    lessonId: row.lesson_id,
    weekday: row.weekday,
    startTime: shortTime,
    tz: row.tz ?? 'Europe/Istanbul',
    locationType: isLocationType(loc) ? loc : 'in_person',
    address: row.address,
  };
}

export const instructorLessonsService = {
  /** Yayında dersler — görünür eğitmen için (RLS). */
  async listPublishedByInstructor(instructorUserId: string): Promise<InstructorLessonModel[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<LessonRow[]>(
        `/instructor_lessons?select=id,instructor_user_id,school_id,title,description,price_cents,currency,level,is_published,starts_at,created_at,updated_at&instructor_user_id=eq.${encodeURIComponent(
          instructorUserId,
        )}&is_published=eq.true&order=created_at.desc&limit=50`,
        { method: 'GET', accessToken },
      );
      return (rows ?? []).map(mapLesson);
    });
  },

  async listMine(): Promise<InstructorLessonModel[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const rows = await supabaseRestRequest<LessonRow[]>(
        `/instructor_lessons?select=id,instructor_user_id,school_id,title,description,price_cents,currency,level,is_published,starts_at,created_at,updated_at&instructor_user_id=eq.${encodeURIComponent(
          me,
        )}&order=created_at.desc&limit=100`,
        { method: 'GET', accessToken },
      );
      return (rows ?? []).map(mapLesson);
    });
  },

  async create(input: InstructorLessonInput): Promise<InstructorLessonModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const me = await getMyUserId(accessToken);
      const body = {
        instructor_user_id: me,
        title: input.title.trim(),
        description: input.description.trim() ? input.description.trim() : null,
        price_cents: input.priceCents,
        currency: input.currency ?? 'TRY',
        level: input.level,
        is_published: input.isPublished,
        school_id: input.schoolId ?? null,
        starts_at: input.startsAt,
      };
      const rows = await supabaseRestRequest<LessonRow[]>(
        '/instructor_lessons',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body,
        },
      );
      const row = rows?.[0];
      if (!row) throw new ApiError('Ders oluşturulamadı.', { status: 500 });
      return mapLesson(row);
    });
  },

  async update(id: string, input: InstructorLessonInput): Promise<InstructorLessonModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const body = {
        title: input.title.trim(),
        description: input.description.trim() ? input.description.trim() : null,
        price_cents: input.priceCents,
        currency: input.currency ?? 'TRY',
        level: input.level,
        is_published: input.isPublished,
        school_id: input.schoolId ?? null,
        starts_at: input.startsAt,
      };
      const rows = await supabaseRestRequest<LessonRow[]>(
        `/instructor_lessons?id=eq.${encodeURIComponent(id)}&select=id,instructor_user_id,school_id,title,description,price_cents,currency,level,is_published,starts_at,created_at,updated_at`,
        {
          method: 'PATCH',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body,
        },
      );
      const row = rows?.[0];
      if (!row) throw new ApiError('Ders güncellenemedi.', { status: 500 });
      return mapLesson(row);
    });
  },

  async remove(id: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      await supabaseRestRequest(`/instructor_lessons?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        accessToken,
        headers: { Prefer: 'return=minimal' },
      });
    });
  },
};

export const instructorScheduleService = {
  async listByLesson(lessonId: string): Promise<InstructorScheduleSlotModel[]> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const rows = await supabaseRestRequest<SlotRow[]>(
        `/instructor_schedule_slots?select=id,lesson_id,weekday,start_time,tz,location_type,address&lesson_id=eq.${encodeURIComponent(
          lessonId,
        )}&order=weekday.asc,start_time.asc`,
        { method: 'GET', accessToken },
      );
      return (rows ?? []).map(mapSlot);
    });
  },

  async createSlot(input: InstructorScheduleSlotInput): Promise<InstructorScheduleSlotModel> {
    return await withAuthorizedUserRequest(async (accessToken) => {
      const body = {
        lesson_id: input.lessonId,
        weekday: input.weekday,
        start_time: formatTimeForApi(input.startTime),
        tz: input.tz ?? 'Europe/Istanbul',
        location_type: input.locationType,
        address: input.address?.trim() ? input.address.trim() : null,
      };
      const rows = await supabaseRestRequest<SlotRow[]>(
        '/instructor_schedule_slots',
        {
          method: 'POST',
          accessToken,
          headers: { Prefer: 'return=representation' },
          body,
        },
      );
      const row = rows?.[0];
      if (!row) throw new ApiError('Program satırı eklenemedi.', { status: 500 });
      return mapSlot(row);
    });
  },

  async removeSlot(id: string): Promise<void> {
    await withAuthorizedUserRequest(async (accessToken) => {
      await supabaseRestRequest(`/instructor_schedule_slots?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
        accessToken,
        headers: { Prefer: 'return=minimal' },
      });
    });
  },
};

export function formatLessonStartsAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('tr-TR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function parseLessonStartsAtToIso(d: Date | null): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function lessonStartsAtToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatLessonPrice(model: InstructorLessonModel): string {
  if (model.priceCents == null || model.priceCents <= 0) return 'Ücretsiz';
  const tl = model.priceCents / 100;
  const formatted = tl % 1 === 0 ? String(tl) : tl.toFixed(2);
  return `₺${formatted}`;
}

export function parseTlToCents(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower.includes('ücretsiz') || lower === '0' || lower === '0,00' || lower === '0.00') return null;
  const normalized = t.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
