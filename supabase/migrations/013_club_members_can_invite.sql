-- Allow club creator to let any member invite others by username (admins can always invite).

alter table public.clubs
  add column if not exists members_can_invite boolean not null default false;
