-- Yönetici tarafından eğitmene atanan okul(lar). Uygulama yalnızca okur.
-- Satır ekleme/silme: Supabase SQL Editor veya service_role ile (authenticated için INSERT/UPDATE/DELETE politikası yok).

create table if not exists public.school_instructor_assignments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, school_id)
);

create index if not exists school_instructor_assignments_user_idx
  on public.school_instructor_assignments (user_id);

alter table public.school_instructor_assignments enable row level security;

drop policy if exists "Users read own school assignments" on public.school_instructor_assignments;
create policy "Users read own school assignments"
on public.school_instructor_assignments
for select
to authenticated
using (auth.uid() = user_id);
