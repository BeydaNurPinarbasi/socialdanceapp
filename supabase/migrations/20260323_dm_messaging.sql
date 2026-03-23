-- Direct messaging: conversations, members, messages, pair lookup (dedupe)
-- Requires pgcrypto for gen_random_uuid (enabled by default on Supabase)

-- Allow authenticated users to read other profiles (display name / avatar for chat & social)
drop policy if exists "Authenticated users can read profiles" on public.profiles;
create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

-- Uygulama + dm_list_conversations bu sütunu bekliyor; eski şemalarda eksik olabiliyor
alter table public.profiles add column if not exists display_name text not null default '';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'full_name'
  ) then
    update public.profiles p
    set display_name = coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.full_name), ''), '')
    where trim(coalesce(p.display_name, '')) = ''
      and p.full_name is not null
      and trim(coalesce(p.full_name, '')) <> '';
  end if;
end;
$$;

create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dm_conversation_members (
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default to_timestamp(0),
  primary key (conversation_id, user_id)
);

create index if not exists dm_conversation_members_user_id_idx
  on public.dm_conversation_members (user_id);

create table if not exists public.dm_pair_lookup (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  primary key (user_a, user_b),
  constraint dm_pair_order check (user_a < user_b)
);

create index if not exists dm_pair_lookup_conversation_idx on public.dm_pair_lookup (conversation_id);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '',
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint dm_messages_body_or_image check (
    length(trim(body)) > 0 or image_url is not null
  )
);

create index if not exists dm_messages_conversation_created_idx
  on public.dm_messages (conversation_id, created_at desc);

alter table public.dm_conversations enable row level security;
alter table public.dm_conversation_members enable row level security;
alter table public.dm_pair_lookup enable row level security;
alter table public.dm_messages enable row level security;

-- Conversations: members only
drop policy if exists "DM members view conversations" on public.dm_conversations;
create policy "DM members view conversations"
on public.dm_conversations
for select
using (
  exists (
    select 1
    from public.dm_conversation_members m
    where m.conversation_id = dm_conversations.id
      and m.user_id = auth.uid()
  )
);

-- Pair lookup: participants only
drop policy if exists "DM pair lookup for participants" on public.dm_pair_lookup;
create policy "DM pair lookup for participants"
on public.dm_pair_lookup
for select
using (auth.uid() = user_a or auth.uid() = user_b);

-- Members: read if member; update own last_read_at
drop policy if exists "DM members read membership" on public.dm_conversation_members;
create policy "DM members read membership"
on public.dm_conversation_members
for select
using (
  conversation_id in (
    select m.conversation_id
    from public.dm_conversation_members m
    where m.user_id = auth.uid()
  )
);

drop policy if exists "DM members update own read cursor" on public.dm_conversation_members;
create policy "DM members update own read cursor"
on public.dm_conversation_members
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Messages
drop policy if exists "DM members read messages" on public.dm_messages;
create policy "DM members read messages"
on public.dm_messages
for select
using (
  exists (
    select 1
    from public.dm_conversation_members m
    where m.conversation_id = dm_messages.conversation_id
      and m.user_id = auth.uid()
  )
);

drop policy if exists "DM members insert own messages" on public.dm_messages;
create policy "DM members insert own messages"
on public.dm_messages
for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.dm_conversation_members m
    where m.conversation_id = dm_messages.conversation_id
      and m.user_id = auth.uid()
  )
);

-- RPC: find or create 1:1 conversation (security definer; bypasses RLS for inserts)
create or replace function public.dm_get_or_create(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_small uuid;
  v_big uuid;
  v_cid uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'invalid peer';
  end if;

  v_small := least(v_me, p_other);
  v_big := greatest(v_me, p_other);

  select pl.conversation_id into v_cid
  from public.dm_pair_lookup pl
  where pl.user_a = v_small and pl.user_b = v_big
  limit 1;

  if v_cid is not null then
    return v_cid;
  end if;

  insert into public.dm_conversations default values
  returning id into v_cid;

  insert into public.dm_conversation_members (conversation_id, user_id)
  values (v_cid, v_me), (v_cid, p_other);

  insert into public.dm_pair_lookup (user_a, user_b, conversation_id)
  values (v_small, v_big, v_cid);

  return v_cid;
end;
$$;

revoke all on function public.dm_get_or_create(uuid) from public;
grant execute on function public.dm_get_or_create(uuid) to authenticated;

-- RPC: list conversations for current user (with peer profile + last message)
create or replace function public.dm_list_conversations()
returns table (
  conversation_id uuid,
  peer_id uuid,
  peer_display_name text,
  peer_avatar_url text,
  last_body text,
  last_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    mc.conversation_id,
    p.peer_id,
    coalesce(prof.display_name, '') as peer_display_name,
    prof.avatar_url as peer_avatar_url,
    coalesce(lm.last_body, '') as last_body,
    lm.last_at,
    coalesce(
      (
        select count(*)::bigint
        from public.dm_messages x
        where x.conversation_id = mc.conversation_id
          and x.sender_id <> auth.uid()
          and x.created_at > mc.last_read_at
      ),
      0
    ) as unread_count
  from public.dm_conversation_members mc
  join public.dm_conversations conv on conv.id = mc.conversation_id
  join lateral (
    select m2.user_id as peer_id
    from public.dm_conversation_members m2
    where m2.conversation_id = mc.conversation_id
      and m2.user_id <> auth.uid()
    limit 1
  ) p on true
  left join lateral (
    select dm.body as last_body, dm.created_at as last_at
    from public.dm_messages dm
    where dm.conversation_id = mc.conversation_id
    order by dm.created_at desc
    limit 1
  ) lm on true
  left join public.profiles prof on prof.id = p.peer_id
  where mc.user_id = auth.uid()
  order by coalesce(lm.last_at, conv.created_at) desc nulls last;
$$;

revoke all on function public.dm_list_conversations() from public;
grant execute on function public.dm_list_conversations() to authenticated;

-- Yanlış isimle çağrı / eski istemciler için (dm_list_conversation tekil)
create or replace function public.dm_list_conversation()
returns table (
  conversation_id uuid,
  peer_id uuid,
  peer_display_name text,
  peer_avatar_url text,
  last_body text,
  last_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.dm_list_conversations();
$$;

revoke all on function public.dm_list_conversation() from public;
grant execute on function public.dm_list_conversation() to authenticated;

-- PostgREST şema önbelleğini yenile (SQL editörden fonksiyon eklendikten sonra API bazen bunu ister)
notify pgrst, 'reload schema';

-- Realtime: new messages
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end;
$$;

-- Chat images bucket (paths: {userId}/{conversationId}/...)
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-images',
  'chat-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Chat images are public read" on storage.objects;
create policy "Chat images are public read"
on storage.objects
for select
using (bucket_id = 'chat-images');

drop policy if exists "Users can upload chat images" on storage.objects;
create policy "Users can upload chat images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own chat images" on storage.objects;
create policy "Users can update own chat images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own chat images" on storage.objects;
create policy "Users can delete own chat images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
