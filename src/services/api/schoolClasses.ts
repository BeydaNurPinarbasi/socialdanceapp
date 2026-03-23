import { supabaseRestRequest } from './apiClient';

export type SchoolClassRow = {
  id: string;
  school_id: string;
  title: string;
  day: string;
  time: string;
  level: string;
  sort_order: number;
};

export async function listSchoolClasses(schoolId: string, limit = 50): Promise<SchoolClassRow[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  return await supabaseRestRequest<SchoolClassRow[]>(
    `/school_classes?select=id,school_id,title,day,time,level,sort_order&school_id=eq.${encodeURIComponent(schoolId)}&order=sort_order.asc,title.asc&limit=${safeLimit}`,
    { method: 'GET' },
  );
}
