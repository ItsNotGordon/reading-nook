-- Pending club invitations (username invite — accept/decline before membership)

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (club_id, invitee_id)
);

create index if not exists club_invites_invitee_pending_idx
  on public.club_invites (invitee_id, created_at desc)
  where status = 'pending';

alter table public.club_invites enable row level security;

create policy club_invites_select_involved on public.club_invites
  for select using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Inserts/updates via service-role API routes

-- Allow club_invite notification type (keep club_added for legacy rows)
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('club_added', 'club_invite'));
