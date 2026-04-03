-- Keşfet: görünür eğitmen profiline sahip kullanıcıların genel profil kartı alanları (ad, kullanıcı adı, avatar, bio) okunabilsin.
-- Mevcut "Users can view own profile" politikası ile birlikte OR ile değerlendirilir.

drop policy if exists "Profiles readable for visible instructors" on public.profiles;
create policy "Profiles readable for visible instructors"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1 from public.instructor_profiles ip
    where ip.user_id = profiles.id
      and ip.is_visible = true
  )
);
