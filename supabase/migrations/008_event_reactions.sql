-- Likes and comments on feed events (mirrors post_reactions for posts)
create table if not exists public.event_reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.feed_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  body text,
  parent_id uuid references public.event_reactions (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists event_reactions_event_idx on public.event_reactions (event_id);

-- RLS
alter table public.event_reactions enable row level security;

create policy event_reactions_insert_own on public.event_reactions
  for insert with check (auth.uid() = user_id);

create policy event_reactions_delete_own on public.event_reactions
  for delete using (auth.uid() = user_id);

create policy event_reactions_select on public.event_reactions
  for select using (
    exists (
      select 1 from public.feed_events e
      where e.id = event_reactions.event_id
    )
  );
