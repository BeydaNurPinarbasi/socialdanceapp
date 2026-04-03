-- Eğitmen portföy görselleri: satır + public storage (instructor-media)

create table if not exists public.instructor_media (
  id uuid primary key default gen_random_uuid(),
  instructor_user_id uuid not null references public.profiles (id) on delete cascade,
  storage_object_path text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (instructor_user_id, storage_object_path)
);

create index if not exists instructor_media_instructor_idx
  on public.instructor_media (instructor_user_id, created_at desc);

alter table public.instructor_media enable row level security;

drop policy if exists "Instructor media select" on public.instructor_media;
create policy "Instructor media select"
on public.instructor_media
for select
to authenticated
using (
  auth.uid() = instructor_user_id
  or exists (
    select 1 from public.instructor_profiles p
    where p.user_id = instructor_media.instructor_user_id
      and p.is_visible = true
  )
);

drop policy if exists "Instructor media insert own" on public.instructor_media;
create policy "Instructor media insert own"
on public.instructor_media
for insert
to authenticated
with check (auth.uid() = instructor_user_id);

drop policy if exists "Instructor media delete own" on public.instructor_media;
create policy "Instructor media delete own"
on public.instructor_media
for delete
to authenticated
using (auth.uid() = instructor_user_id);

-- Storage bucket: paths {userId}/{filename}
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'instructor-media',
  'instructor-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Instructor media public read" on storage.objects;
create policy "Instructor media public read"
on storage.objects
for select
using (bucket_id = 'instructor-media');

drop policy if exists "Users upload own instructor media" on storage.objects;
create policy "Users upload own instructor media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'instructor-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own instructor media" on storage.objects;
create policy "Users update own instructor media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'instructor-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'instructor-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own instructor media" on storage.objects;
create policy "Users delete own instructor media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'instructor-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

notify pgrst, 'reload schema';
