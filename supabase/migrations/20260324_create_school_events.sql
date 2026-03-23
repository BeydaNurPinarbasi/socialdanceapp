create table if not exists public.school_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  location text,
  image_url text,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists school_events_school_id_idx
  on public.school_events (school_id, starts_at desc);

alter table public.school_events enable row level security;

drop policy if exists "School events are readable by everyone" on public.school_events;
create policy "School events are readable by everyone"
on public.school_events
for select
using (true);
