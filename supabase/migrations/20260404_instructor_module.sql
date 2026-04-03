-- Eğitmen modülü: profiller, okul bağlantıları, dersler, program slotları, öğrenci ilişkileri

create table if not exists public.instructor_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  work_mode text not null default 'individual'
    check (work_mode in ('individual', 'school', 'both')),
  headline text not null default '',
  instructor_bio text not null default '',
  specialties text[] not null default '{}'::text[],
  is_visible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists instructor_profiles_visible_idx
  on public.instructor_profiles (is_visible)
  where is_visible = true;

drop trigger if exists set_instructor_profiles_updated_at on public.instructor_profiles;
create trigger set_instructor_profiles_updated_at
before update on public.instructor_profiles
for each row
execute function public.set_profiles_updated_at();

alter table public.instructor_profiles enable row level security;

drop policy if exists "Instructor profiles readable" on public.instructor_profiles;
create policy "Instructor profiles readable"
on public.instructor_profiles
for select
to authenticated
using (is_visible = true or auth.uid() = user_id);

drop policy if exists "Users insert own instructor profile" on public.instructor_profiles;
create policy "Users insert own instructor profile"
on public.instructor_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users update own instructor profile" on public.instructor_profiles;
create policy "Users update own instructor profile"
on public.instructor_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own instructor profile" on public.instructor_profiles;
create policy "Users delete own instructor profile"
on public.instructor_profiles
for delete
to authenticated
using (auth.uid() = user_id);

-- ---

create table if not exists public.instructor_school_links (
  id uuid primary key default gen_random_uuid(),
  instructor_user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  status text not null default 'active'
    check (status in ('pending', 'active', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (instructor_user_id, school_id)
);

create index if not exists instructor_school_links_instructor_idx
  on public.instructor_school_links (instructor_user_id);

drop trigger if exists set_instructor_school_links_updated_at on public.instructor_school_links;
create trigger set_instructor_school_links_updated_at
before update on public.instructor_school_links
for each row
execute function public.set_profiles_updated_at();

alter table public.instructor_school_links enable row level security;

drop policy if exists "Instructor school links select" on public.instructor_school_links;
create policy "Instructor school links select"
on public.instructor_school_links
for select
to authenticated
using (
  auth.uid() = instructor_user_id
  or (
    status = 'active'
    and exists (
      select 1 from public.instructor_profiles p
      where p.user_id = instructor_school_links.instructor_user_id
        and p.is_visible = true
    )
  )
);

drop policy if exists "Instructor school links insert" on public.instructor_school_links;
create policy "Instructor school links insert"
on public.instructor_school_links
for insert
to authenticated
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor school links update" on public.instructor_school_links;
create policy "Instructor school links update"
on public.instructor_school_links
for update
to authenticated
using (auth.uid() = instructor_user_id)
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor school links delete" on public.instructor_school_links;
create policy "Instructor school links delete"
on public.instructor_school_links
for delete
to authenticated
using (auth.uid() = instructor_user_id);

-- ---

create table if not exists public.instructor_lessons (
  id uuid primary key default gen_random_uuid(),
  instructor_user_id uuid not null references public.profiles (id) on delete cascade,
  school_id uuid references public.schools (id) on delete set null,
  title text not null,
  description text,
  price_cents integer,
  currency text not null default 'TRY',
  level text not null default 'Tüm Seviyeler',
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint instructor_lessons_price_non_negative check (price_cents is null or price_cents >= 0)
);

create index if not exists instructor_lessons_instructor_idx
  on public.instructor_lessons (instructor_user_id, is_published);

drop trigger if exists set_instructor_lessons_updated_at on public.instructor_lessons;
create trigger set_instructor_lessons_updated_at
before update on public.instructor_lessons
for each row
execute function public.set_profiles_updated_at();

alter table public.instructor_lessons enable row level security;

drop policy if exists "Instructor lessons select" on public.instructor_lessons;
create policy "Instructor lessons select"
on public.instructor_lessons
for select
to authenticated
using (
  auth.uid() = instructor_user_id
  or (
    is_published = true
    and exists (
      select 1 from public.instructor_profiles p
      where p.user_id = instructor_lessons.instructor_user_id
        and p.is_visible = true
    )
  )
);

drop policy if exists "Instructor lessons insert" on public.instructor_lessons;
create policy "Instructor lessons insert"
on public.instructor_lessons
for insert
to authenticated
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor lessons update" on public.instructor_lessons;
create policy "Instructor lessons update"
on public.instructor_lessons
for update
to authenticated
using (auth.uid() = instructor_user_id)
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor lessons delete" on public.instructor_lessons;
create policy "Instructor lessons delete"
on public.instructor_lessons
for delete
to authenticated
using (auth.uid() = instructor_user_id);

-- ---

create table if not exists public.instructor_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.instructor_lessons (id) on delete cascade,
  weekday smallint not null check (weekday >= 0 and weekday <= 6),
  start_time time not null,
  tz text not null default 'Europe/Istanbul',
  location_type text not null default 'in_person'
    check (location_type in ('online', 'in_person', 'school')),
  address text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists instructor_schedule_slots_lesson_idx
  on public.instructor_schedule_slots (lesson_id);

drop trigger if exists set_instructor_schedule_slots_updated_at on public.instructor_schedule_slots;
create trigger set_instructor_schedule_slots_updated_at
before update on public.instructor_schedule_slots
for each row
execute function public.set_profiles_updated_at();

alter table public.instructor_schedule_slots enable row level security;

drop policy if exists "Instructor schedule slots select" on public.instructor_schedule_slots;
create policy "Instructor schedule slots select"
on public.instructor_schedule_slots
for select
to authenticated
using (
  exists (
    select 1 from public.instructor_lessons l
    where l.id = instructor_schedule_slots.lesson_id
      and (
        l.instructor_user_id = auth.uid()
        or (
          l.is_published = true
          and exists (
            select 1 from public.instructor_profiles p
            where p.user_id = l.instructor_user_id
              and p.is_visible = true
          )
        )
      )
  )
);

drop policy if exists "Instructor schedule slots insert" on public.instructor_schedule_slots;
create policy "Instructor schedule slots insert"
on public.instructor_schedule_slots
for insert
to authenticated
with check (
  exists (
    select 1 from public.instructor_lessons l
    where l.id = instructor_schedule_slots.lesson_id
      and l.instructor_user_id = auth.uid()
  )
);

drop policy if exists "Instructor schedule slots update" on public.instructor_schedule_slots;
create policy "Instructor schedule slots update"
on public.instructor_schedule_slots
for update
to authenticated
using (
  exists (
    select 1 from public.instructor_lessons l
    where l.id = instructor_schedule_slots.lesson_id
      and l.instructor_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.instructor_lessons l
    where l.id = instructor_schedule_slots.lesson_id
      and l.instructor_user_id = auth.uid()
  )
);

drop policy if exists "Instructor schedule slots delete" on public.instructor_schedule_slots;
create policy "Instructor schedule slots delete"
on public.instructor_schedule_slots
for delete
to authenticated
using (
  exists (
    select 1 from public.instructor_lessons l
    where l.id = instructor_schedule_slots.lesson_id
      and l.instructor_user_id = auth.uid()
  )
);

-- ---

create table if not exists public.instructor_students (
  id uuid primary key default gen_random_uuid(),
  instructor_user_id uuid not null references public.profiles (id) on delete cascade,
  student_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('invited', 'active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (instructor_user_id, student_user_id),
  constraint instructor_students_distinct check (instructor_user_id <> student_user_id)
);

create index if not exists instructor_students_instructor_idx
  on public.instructor_students (instructor_user_id, status);

create index if not exists instructor_students_student_idx
  on public.instructor_students (student_user_id, status);

drop trigger if exists set_instructor_students_updated_at on public.instructor_students;
create trigger set_instructor_students_updated_at
before update on public.instructor_students
for each row
execute function public.set_profiles_updated_at();

alter table public.instructor_students enable row level security;

drop policy if exists "Instructor students select" on public.instructor_students;
create policy "Instructor students select"
on public.instructor_students
for select
to authenticated
using (auth.uid() = instructor_user_id or auth.uid() = student_user_id);

drop policy if exists "Instructor students insert" on public.instructor_students;
create policy "Instructor students insert"
on public.instructor_students
for insert
to authenticated
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor students update" on public.instructor_students;
create policy "Instructor students update"
on public.instructor_students
for update
to authenticated
using (auth.uid() = instructor_user_id)
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor students delete" on public.instructor_students;
create policy "Instructor students delete"
on public.instructor_students
for delete
to authenticated
using (auth.uid() = instructor_user_id or auth.uid() = student_user_id);
