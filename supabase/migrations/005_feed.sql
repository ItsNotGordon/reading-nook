-- Feed: shelf activity events, user posts, and reactions

-- Shelf activity events (auto-posted when user shelves/finishes a book)
create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  book_id text not null,
  book_title text not null,
  book_author text not null,
  book_cover_url text not null default '',
  shelf text,
  sentiment text,
  derived_score real,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists feed_events_user_idx on public.feed_events (user_id);
create index if not exists feed_events_created_idx on public.feed_events (created_at desc);

-- User-authored posts with optional book attachment
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  book_id text,
  book_title text,
  book_author text,
  book_cover_url text,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_idx on public.posts (user_id);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- Likes and comments on posts
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  body text,
  created_at timestamptz not null default now()
);

create index if not exists post_reactions_post_idx on public.post_reactions (post_id);

-- RLS
alter table public.feed_events enable row level security;
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;

-- feed_events: insert own, select own + accepted friends
create policy feed_events_insert_own on public.feed_events
  for insert with check (auth.uid() = user_id);

create policy feed_events_select_own on public.feed_events
  for select using (auth.uid() = user_id);

create policy feed_events_select_friends on public.feed_events
  for select using (
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = feed_events.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = feed_events.user_id)
        )
    )
  );

-- posts: insert/delete own, select own + accepted friends
create policy posts_insert_own on public.posts
  for insert with check (auth.uid() = user_id);

create policy posts_select_own on public.posts
  for select using (auth.uid() = user_id);

create policy posts_select_friends on public.posts
  for select using (
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = posts.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = posts.user_id)
        )
    )
  );

create policy posts_delete_own on public.posts
  for delete using (auth.uid() = user_id);

-- post_reactions: insert/delete own, select if user can see parent post
create policy post_reactions_insert_own on public.post_reactions
  for insert with check (auth.uid() = user_id);

create policy post_reactions_delete_own on public.post_reactions
  for delete using (auth.uid() = user_id);

create policy post_reactions_select on public.post_reactions
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = post_reactions.post_id
    )
  );
