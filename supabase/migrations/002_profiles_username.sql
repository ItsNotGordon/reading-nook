-- Reading Nook: unique @username for friend discovery

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null
    or username ~ '^[a-z0-9_]{3,24}$'
  );

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

-- Authenticated users can discover others who set a username (public card fields only).
create policy profiles_select_discover on public.profiles
  for select using (
    auth.uid() is not null
    and username is not null
    and id <> auth.uid()
  );

-- Friend list / requests: read basic profile for pending or accepted friendships.
create policy profiles_select_friendship_participants on public.profiles
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.friendships f
      where f.status in ('pending', 'accepted')
        and (
          (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
          or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
        )
    )
  );
