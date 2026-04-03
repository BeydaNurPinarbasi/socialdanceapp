-- Kullanıcı bildirim tercihi (push / yerel hatırlatıcılar için sunucu tarafı kaynak)

alter table public.profiles
  add column if not exists notifications_enabled boolean not null default true;

notify pgrst, 'reload schema';
