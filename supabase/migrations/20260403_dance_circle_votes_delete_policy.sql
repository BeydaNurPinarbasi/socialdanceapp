-- Dance Circle sıfırlama: kullanıcı kendi oylarını silebilsin (RLS'te DELETE yoktu, silme sessizce engelleniyordu).
drop policy if exists "Users can delete own dance circle votes" on public.dance_circle_votes;
create policy "Users can delete own dance circle votes"
on public.dance_circle_votes
for delete
to authenticated
using (auth.uid() = voter_id);
