-- Google auth + per-action RLS.
--
-- (a) Link board_members to Supabase auth users and store the Google
--     profile picture URL so avatars show real photos.
-- (b) Replace the "anon all" demo policies with split read/write rules:
--     anyone (anon + authenticated) can SELECT — needed for share links and
--     the home dashboard for signed-out visitors — but only authenticated
--     users can INSERT / UPDATE / DELETE. This matches the client behaviour
--     where signed-out users see the same UI as a share-link viewer.

alter table public.board_members
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists avatar_url text;

create index if not exists idx_members_auth_user
  on public.board_members(auth_user_id);

-- Drop the legacy permissive policies.
drop policy if exists "momentum anon all" on public.boards;
drop policy if exists "momentum anon all" on public.board_groups;
drop policy if exists "momentum anon all" on public.board_members;
drop policy if exists "momentum anon all" on public.tasks;
drop policy if exists "momentum anon all" on public.task_assignees;

-- Also drop the new ones if re-running.
drop policy if exists "momentum read"   on public.boards;
drop policy if exists "momentum write"  on public.boards;
drop policy if exists "momentum update" on public.boards;
drop policy if exists "momentum delete" on public.boards;
drop policy if exists "momentum read"   on public.board_groups;
drop policy if exists "momentum write"  on public.board_groups;
drop policy if exists "momentum update" on public.board_groups;
drop policy if exists "momentum delete" on public.board_groups;
drop policy if exists "momentum read"   on public.board_members;
drop policy if exists "momentum write"  on public.board_members;
drop policy if exists "momentum update" on public.board_members;
drop policy if exists "momentum delete" on public.board_members;
drop policy if exists "momentum read"   on public.tasks;
drop policy if exists "momentum write"  on public.tasks;
drop policy if exists "momentum update" on public.tasks;
drop policy if exists "momentum delete" on public.tasks;
drop policy if exists "momentum read"   on public.task_assignees;
drop policy if exists "momentum write"  on public.task_assignees;
drop policy if exists "momentum update" on public.task_assignees;
drop policy if exists "momentum delete" on public.task_assignees;

-- Read: everyone (anon + authenticated).
create policy "momentum read"   on public.boards          for select using (true);
create policy "momentum read"   on public.board_groups    for select using (true);
create policy "momentum read"   on public.board_members   for select using (true);
create policy "momentum read"   on public.tasks           for select using (true);
create policy "momentum read"   on public.task_assignees  for select using (true);

-- Write: only signed-in users.
create policy "momentum write"  on public.boards          for insert to authenticated with check (true);
create policy "momentum update" on public.boards          for update to authenticated using (true) with check (true);
create policy "momentum delete" on public.boards          for delete to authenticated using (true);

create policy "momentum write"  on public.board_groups    for insert to authenticated with check (true);
create policy "momentum update" on public.board_groups    for update to authenticated using (true) with check (true);
create policy "momentum delete" on public.board_groups    for delete to authenticated using (true);

create policy "momentum write"  on public.board_members   for insert to authenticated with check (true);
create policy "momentum update" on public.board_members   for update to authenticated using (true) with check (true);
create policy "momentum delete" on public.board_members   for delete to authenticated using (true);

create policy "momentum write"  on public.tasks           for insert to authenticated with check (true);
create policy "momentum update" on public.tasks           for update to authenticated using (true) with check (true);
create policy "momentum delete" on public.tasks           for delete to authenticated using (true);

create policy "momentum write"  on public.task_assignees  for insert to authenticated with check (true);
create policy "momentum update" on public.task_assignees  for update to authenticated using (true) with check (true);
create policy "momentum delete" on public.task_assignees  for delete to authenticated using (true);
