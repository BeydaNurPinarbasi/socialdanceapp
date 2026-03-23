-- Mesaj listesi RPC yok / "schema cache" hatası için Supabase SQL Editor'de çalıştır.
-- Doğru isim: dm_list_conversations (çoğul, s ile). Tekil isim hatası için alias da eklenir.

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

notify pgrst, 'reload schema';
