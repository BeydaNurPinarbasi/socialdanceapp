-- Eğitmenlerin öğrenciyi kayıtlı e-posta ile bulması (auth.users); yalnızca instructor_profiles kaydı olanlar çağırabilir.

create or replace function public.instructor_resolve_student_user_id_by_email(p_email text)
returns table (student_user_id uuid)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_norm text;
begin
  if auth.uid() is null then
    return;
  end if;

  if not exists (
    select 1 from public.instructor_profiles ip
    where ip.user_id = auth.uid()
  ) then
    return;
  end if;

  v_norm := lower(trim(p_email));
  if v_norm = '' then
    return;
  end if;

  return query
  select u.id
  from auth.users u
  where lower(trim(u.email)) = v_norm
  limit 1;
end;
$$;

revoke all on function public.instructor_resolve_student_user_id_by_email(text) from public;
grant execute on function public.instructor_resolve_student_user_id_by_email(text) to authenticated;
