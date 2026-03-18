create extension if not exists pgcrypto;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  category text,
  address text,
  city text,
  district text,

  latitude double precision,
  longitude double precision,

  rating numeric(3,2),
  review_count integer,
  price_range text,

  current_status text,
  next_status text,
  website text,
  telephone text,

  original_url text,
  keyword text,
  detail_url text,
  scraped_at timestamptz,

  snippet text,
  image_url text,

  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists schools_name_address_uniq on public.schools (name, address);
create index if not exists schools_name_idx on public.schools using gin (to_tsvector('simple', name));
create index if not exists schools_city_district_idx on public.schools (city, district);
create index if not exists schools_location_idx on public.schools (latitude, longitude);

create or replace function public.set_schools_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_schools_updated_at on public.schools;
create trigger set_schools_updated_at
before update on public.schools
for each row
execute function public.set_schools_updated_at();

alter table public.schools enable row level security;

drop policy if exists "Anyone can read schools" on public.schools;
create policy "Anyone can read schools"
on public.schools
for select
using (true);

drop policy if exists "Service role can write schools" on public.schools;
create policy "Service role can write schools"
on public.schools
for all
to service_role
using (true)
with check (true);

