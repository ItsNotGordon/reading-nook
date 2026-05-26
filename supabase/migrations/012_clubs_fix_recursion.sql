-- Fix infinite recursion in club RLS policies by using a SECURITY DEFINER function

create or replace function public.is_club_member(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id
  );
$$;

-- Drop and recreate clubs_select to use the function
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs
  for select using (
    is_public
    or creator_id = auth.uid()
    or public.is_club_member(id, auth.uid())
  );

-- Drop and recreate club_members_select to avoid self-reference
drop policy if exists club_members_select on public.club_members;
create policy club_members_select on public.club_members
  for select using (
    user_id = auth.uid()
    or public.is_club_member(club_id, auth.uid())
    or exists (
      select 1 from public.clubs c
      where c.id = club_members.club_id and c.is_public
    )
  );

-- Also fix posts_select_club to use the function
drop policy if exists posts_select_club on public.posts;
create policy posts_select_club on public.posts
  for select using (
    club_id is not null
    and public.is_club_member(club_id, auth.uid())
  );
