alter table public.instructor_lessons
  add column if not exists starts_at timestamptz;

create index if not exists instructor_lessons_starts_at_idx
  on public.instructor_lessons (starts_at desc nulls last)
  where starts_at is not null;
