-- Club icon photos in Supabase Storage

alter table public.clubs
  add column if not exists icon_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-icons',
  'club-icons',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy club_icons_select_public on storage.objects
  for select using (bucket_id = 'club-icons');

create policy club_icons_insert_admin on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'club-icons'
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = ((storage.foldername(name))[1])::uuid
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
    and name = ((storage.foldername(name))[1] || '/icon.webp')
  );

create policy club_icons_update_admin on storage.objects
  for update to authenticated
  using (
    bucket_id = 'club-icons'
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = ((storage.foldername(name))[1])::uuid
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  )
  with check (
    bucket_id = 'club-icons'
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = ((storage.foldername(name))[1])::uuid
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
    and name = ((storage.foldername(name))[1] || '/icon.webp')
  );

create policy club_icons_delete_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'club-icons'
    and exists (
      select 1 from public.club_members cm
      where cm.club_id = ((storage.foldername(name))[1])::uuid
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
    )
  );
