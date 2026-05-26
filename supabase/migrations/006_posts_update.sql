-- Allow users to update their own posts (for editing post body)
create policy posts_update_own on public.posts
  for update using (auth.uid() = user_id);

-- Allow users to delete their own feed_events
create policy feed_events_delete_own on public.feed_events
  for delete using (auth.uid() = user_id);
