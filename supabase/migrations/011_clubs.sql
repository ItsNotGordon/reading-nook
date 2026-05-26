-- Book Clubs

-- Create both tables first
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  creator_id uuid not null references auth.users (id) on delete cascade,
  is_public boolean not null default false,
  invite_code text unique not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  current_book_id text,
  current_book_title text,
  current_book_author text,
  current_book_cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  unique (club_id, user_id)
);

-- SECURITY DEFINER function to check membership without triggering RLS recursion
create or replace function public.is_club_member(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id
  );
$$;

-- RLS for clubs
alter table public.clubs enable row level security;

create policy clubs_select on public.clubs
  for select using (
    is_public
    or creator_id = auth.uid()
    or public.is_club_member(id, auth.uid())
  );

create policy clubs_insert_own on public.clubs
  for insert with check (auth.uid() = creator_id);

create policy clubs_update_own on public.clubs
  for update using (auth.uid() = creator_id);

create policy clubs_delete_own on public.clubs
  for delete using (auth.uid() = creator_id);

-- RLS for club_members
alter table public.club_members enable row level security;

create policy club_members_select on public.club_members
  for select using (
    user_id = auth.uid()
    or public.is_club_member(club_id, auth.uid())
    or exists (
      select 1 from public.clubs c
      where c.id = club_members.club_id and c.is_public
    )
  );

create policy club_members_insert_own on public.club_members
  for insert with check (auth.uid() = user_id);

create policy club_members_delete_own on public.club_members
  for delete using (auth.uid() = user_id);

-- Add club_id to posts for cross-posting
alter table public.posts add column if not exists club_id uuid references public.clubs (id) on delete set null;

-- Club members can see posts shared to their club
create policy posts_select_club on public.posts
  for select using (
    club_id is not null
    and public.is_club_member(club_id, auth.uid())
  );

-- Indexes
create index if not exists club_members_club_idx on public.club_members (club_id);
create index if not exists club_members_user_idx on public.club_members (user_id);
create index if not exists clubs_invite_code_idx on public.clubs (invite_code);
create index if not exists posts_club_idx on public.posts (club_id) where club_id is not null;
