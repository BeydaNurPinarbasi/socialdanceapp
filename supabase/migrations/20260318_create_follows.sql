create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, following_id)
);

create index if not exists follows_following_id_idx on public.follows (following_id);
create index if not exists follows_follower_id_idx on public.follows (follower_id);

alter table public.follows enable row level security;

drop policy if exists "Anyone can read follows" on public.follows;
create policy "Anyone can read follows"
on public.follows
for select
using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
on public.follows
for insert
with check (auth.uid() = follower_id and auth.uid() <> following_id);

drop policy if exists "Users can unfollow others" on public.follows;
create policy "Users can unfollow others"
on public.follows
for delete
using (auth.uid() = follower_id);

create or replace function public.get_follow_counts(p_user_id uuid)
returns table(followers_count bigint, following_count bigint)
language sql
stable
as $$
  select
    (select count(*) from public.follows f where f.following_id = p_user_id) as followers_count,
    (select count(*) from public.follows f where f.follower_id = p_user_id) as following_count;
$$;

revoke all on function public.get_follow_counts(uuid) from public;
grant execute on function public.get_follow_counts(uuid) to anon, authenticated;

