-- In-app notifications (no push): club invites + feed read tracking

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('club_added')),
  club_id uuid references public.clubs (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_club_idx
  on public.notifications (club_id)
  where club_id is not null;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id);

-- Service role inserts club_added rows from API routes

alter table public.club_members
  add column if not exists last_feed_seen_at timestamptz not null default now();
