-- Library visibility: public profiles open to all authenticated users;
-- private profiles visible only to approved one-way followers.

drop policy if exists libraries_select_friends on public.libraries;

create policy libraries_select_public_profiles on public.libraries
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = libraries.user_id
        and p.is_public = true
    )
  );

create policy libraries_select_private_approved_followers on public.libraries
  for select using (
    exists (
      select 1
      from public.profiles p
      where p.id = libraries.user_id
        and p.is_public = false
    )
    and exists (
      select 1
      from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = libraries.user_id
    )
  );
