-- Add parent_id to post_reactions for one-level threaded replies
alter table public.post_reactions
  add column if not exists parent_id uuid references public.post_reactions (id) on delete cascade;
