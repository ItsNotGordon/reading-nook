-- Reading Nook: profiles, library sync, friendships (Phase B–D)

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  tagline text not null default '',
  share_shelves boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create type public.friendship_status as enum ('pending', 'accepted');

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_idx on public.friendships (requester_id);

alter table public.profiles enable row level security;
alter table public.libraries enable row level security;
alter table public.friendships enable row level security;

-- Profiles: own row + read accepted friends who share shelves
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_select_friends on public.profiles
  for select using (
    share_shelves = true
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
          or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
        )
    )
  );

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

-- Libraries: own row + read accepted friends who share
create policy libraries_select_own on public.libraries
  for select using (auth.uid() = user_id);

create policy libraries_select_friends on public.libraries
  for select using (
    exists (
      select 1
      from public.profiles p
      join public.friendships f on f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = libraries.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = libraries.user_id)
        )
      where p.id = libraries.user_id and p.share_shelves = true
    )
  );

create policy libraries_insert_own on public.libraries
  for insert with check (auth.uid() = user_id);

create policy libraries_update_own on public.libraries
  for update using (auth.uid() = user_id);

-- Friendships: participants only
create policy friendships_select on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy friendships_insert on public.friendships
  for insert with check (auth.uid() = requester_id);

create policy friendships_update on public.friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy friendships_delete on public.friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, tagline)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'Reading Nook Reader'),
    coalesce(new.raw_user_meta_data->>'tagline', 'Curating stories, one cozy shelf at a time.')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
