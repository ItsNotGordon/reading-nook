-- Reading Nook: accepted friends can always read each other's libraries (no share_shelves opt-out)

drop policy if exists libraries_select_friends on public.libraries;

create policy libraries_select_friends on public.libraries
  for select using (
    exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = libraries.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = libraries.user_id)
        )
    )
  );

alter table public.profiles
  alter column share_shelves set default true;
