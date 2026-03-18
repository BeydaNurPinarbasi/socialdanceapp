import { supabaseRestRequest } from './apiClient';
import { storage } from '../storage';
import type { SchoolRow } from './schools';

async function requireAccessToken(): Promise<string> {
  const token = await storage.getAccessToken();
  if (!token) throw new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
  return token;
}

export async function listFavoriteSchoolIds(): Promise<string[]> {
  const accessToken = await requireAccessToken();
  const rows = await supabaseRestRequest<{ school_id: string }[]>(
    `/school_favorites?select=school_id&order=created_at.desc`,
    { method: 'GET', accessToken },
  );
  return rows.map((r) => r.school_id).filter(Boolean);
}

export async function addFavoriteSchool(schoolId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await supabaseRestRequest(
    `/school_favorites`,
    {
      method: 'POST',
      accessToken,
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: [{ school_id: schoolId }],
    },
  );
}

export async function isSchoolFavorited(schoolId: string): Promise<boolean> {
  const accessToken = await requireAccessToken();
  const rows = await supabaseRestRequest<{ school_id: string }[]>(
    `/school_favorites?select=school_id&school_id=eq.${encodeURIComponent(schoolId)}&limit=1`,
    { method: 'GET', accessToken },
  );
  return rows.length > 0;
}

export async function removeFavoriteSchool(schoolId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await supabaseRestRequest(`/school_favorites?school_id=eq.${encodeURIComponent(schoolId)}`, {
    method: 'DELETE',
    accessToken,
    headers: { Prefer: 'return=minimal' },
  });
}

export async function listFavoriteSchools(): Promise<SchoolRow[]> {
  const ids = await listFavoriteSchoolIds();
  if (!ids.length) return [];

  const accessToken = await requireAccessToken();
  const select =
    'id,name,category,address,city,district,latitude,longitude,rating,review_count,website,telephone,image_url,current_status,next_status,snippet';
  // PostgREST syntax: id=in.(uuid1,uuid2)
  const inList = `(${ids.map((id) => encodeURIComponent(id)).join(',')})`;
  return await supabaseRestRequest<SchoolRow[]>(`/schools?select=${select}&id=in.${inList}`, {
    method: 'GET',
    accessToken,
  });
}

