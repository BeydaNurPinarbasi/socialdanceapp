-- Eğitmen: sizi takip eden kullanıcılar içinde isim / kullanıcı adı / kayıt e-postasında arama (kelime kelime AND).

create or replace function public.instructor_search_my_followers(p_query text)
returns table (
  student_user_id uuid,
  display_name text,
  username text,
  email text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_tokens text[];
  v_tok text;
  v_haystack text;
  r record;
  v_ok boolean;
  v_q text;
  v_count int;
begin
  if auth.uid() is null then
    return;
  end if;

  if not exists (
    select 1 from public.instructor_profiles ip where ip.user_id = auth.uid()
  ) then
    return;
  end if;

  v_q := trim(coalesce(p_query, ''));
  if length(v_q) < 2 then
    return;
  end if;

  select coalesce(array_agg(elem), '{}')
  into v_tokens
  from unnest(regexp_split_to_array(lower(v_q), '\s+')) as elem
  where elem <> '';

  if v_tokens is null or cardinality(v_tokens) = 0 then
    return;
  end if;

  v_count := 0;

  for r in
    select
      p.id as pid,
      coalesce(nullif(trim(p.display_name), ''), '') as dname,
      coalesce(nullif(trim(p.username), ''), '') as uname,
      coalesce(nullif(trim(u.email), ''), '') as em
    from public.follows f
    inner join public.profiles p on p.id = f.follower_id
    inner join auth.users u on u.id = p.id
    where f.following_id = auth.uid()
      and f.follower_id is distinct from auth.uid()
  loop
    v_haystack := lower(r.dname || ' ' || r.uname || ' ' || r.em);
    v_ok := true;
    foreach v_tok in array v_tokens
    loop
      if position(v_tok in v_haystack) = 0 then
        v_ok := false;
        exit;
      end if;
    end loop;

    if v_ok then
      student_user_id := r.pid;
      display_name := nullif(r.dname, '');
      username := nullif(r.uname, '');
      email := nullif(r.em, '');
      return next;
      v_count := v_count + 1;
      if v_count >= 40 then
        exit;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.instructor_search_my_followers(text) from public;
grant execute on function public.instructor_search_my_followers(text) to authenticated;
