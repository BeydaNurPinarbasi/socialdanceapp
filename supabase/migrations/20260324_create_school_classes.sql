create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  title text not null,
  day text not null,
  time text not null,
  level text not null default 'Tüm Seviyeler',
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists school_classes_school_id_idx
  on public.school_classes (school_id, sort_order asc, title asc);

alter table public.school_classes enable row level security;

drop policy if exists "School classes are readable by everyone" on public.school_classes;
create policy "School classes are readable by everyone"
on public.school_classes
for select
using (true);
