-- Asymmetric follows + account visibility (public/private profiles).
--
-- friendships: mutual friend requests (pending | accepted). Accepted pairs keep
--   library / feed / taste access — unchanged product semantics.
-- follows: one-way edges (follower_id -> following_id). Powers follower/following
--   counts and instant follow on public accounts. NOT the same as friendship
--   requester/addressee direction.

alter table public.profiles
  add column if not exists is_public boolean not null default false;

create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index if not exists follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists follows_select_participant on public.follows;
create policy follows_select_participant on public.follows
  for select using (
    auth.uid() = follower_id or auth.uid() = following_id
  );

drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows
  for insert with check (auth.uid() = follower_id);

drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows
  for delete using (auth.uid() = follower_id);

-- Existing accepted friends become mutual follows so counts stay meaningful.
insert into public.follows (follower_id, following_id)
select f.requester_id, f.addressee_id
from public.friendships f
where f.status = 'accepted'
on conflict do nothing;

insert into public.follows (follower_id, following_id)
select f.addressee_id, f.requester_id
from public.friendships f
where f.status = 'accepted'
on conflict do nothing;

-- Discover search: public accounts with a username only.
drop policy if exists profiles_select_discover on public.profiles;
create policy profiles_select_discover on public.profiles
  for select using (
    auth.uid() is not null
    and username is not null
    and id <> auth.uid()
    and is_public = true
  );

-- Followers may read basic public profile card fields.
drop policy if exists profiles_select_followers on public.profiles;
create policy profiles_select_followers on public.profiles
  for select using (
    auth.uid() is not null
    and is_public = true
    and exists (
      select 1 from public.follows fl
      where fl.follower_id = auth.uid()
        and fl.following_id = profiles.id
    )
  );
