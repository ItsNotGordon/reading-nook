-- Likes on individual comments (post_reactions or event_reactions)
create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  reaction_id uuid not null,
  reaction_source text not null check (reaction_source in ('post', 'event')),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reaction_id, reaction_source, user_id)
);

create index if not exists comment_likes_reaction_idx
  on public.comment_likes (reaction_id, reaction_source);

alter table public.comment_likes enable row level security;

create policy comment_likes_insert_own on public.comment_likes
  for insert with check (auth.uid() = user_id);

create policy comment_likes_delete_own on public.comment_likes
  for delete using (auth.uid() = user_id);

create policy comment_likes_select on public.comment_likes
  for select using (auth.uid() is not null);
