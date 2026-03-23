-- Bu sorguları SQL Editor'de çalıştır: fonksiyonlar var mı, PostgREST görebiliyor mu?

-- 1) Fonksiyonlar tanımlı mı?
select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'dm_%'
order by p.proname;

-- 2) authenticated rolü çalıştırabiliyor mu?
select has_function_privilege('authenticated', 'public.dm_list_conversations()', 'execute') as can_list;
select has_function_privilege('authenticated', 'public.dm_get_or_create(uuid)', 'execute') as can_get_or_create;

-- 3) API şema önbelleğini yenile (yetkin yoksa Supabase Dashboard → Project Settings → API → "Restart" / destek)
notify pgrst, 'reload schema';
