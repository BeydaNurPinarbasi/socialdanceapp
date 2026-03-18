create table if not exists public.school_favorites (
  user_id uuid not null default auth.uid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),

  constraint school_favorites_pkey primary key (user_id, school_id)
);

alter table public.school_favorites enable row level security;

drop policy if exists "Users can read their school favorites" on public.school_favorites;
create policy "Users can read their school favorites"
on public.school_favorites
for select
using (auth.uid() = user_id);

drop policy if exists "Users can add their school favorites" on public.school_favorites;
create policy "Users can add their school favorites"
on public.school_favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can remove their school favorites" on public.school_favorites;
create policy "Users can remove their school favorites"
on public.school_favorites
for delete
using (auth.uid() = user_id);

drop policy if exists "Service role can manage school favorites" on public.school_favorites;
create policy "Service role can manage school favorites"
on public.school_favorites
for all
to service_role
using (true)
with check (true);

