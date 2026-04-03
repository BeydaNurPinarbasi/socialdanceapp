-- Eğitmen, kendi öğrenci listesindeki kullanıcıların profil kartı alanlarını okuyabilsin.

drop policy if exists "Profiles readable for instructor roster" on public.profiles;
create policy "Profiles readable for instructor roster"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.instructor_students s
    where s.student_user_id = profiles.id
      and s.instructor_user_id = auth.uid()
  )
);
