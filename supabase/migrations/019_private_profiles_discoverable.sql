-- Instagram-style discover: private accounts with a username remain searchable.
-- Only basic profile card fields live on `profiles`; library access stays gated on `libraries`.

drop policy if exists profiles_select_discover on public.profiles;
create policy profiles_select_discover on public.profiles
  for select using (
    auth.uid() is not null
    and username is not null
    and id <> auth.uid()
  );
