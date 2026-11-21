-- Boards are private to their members.
--
-- Until now every table carried `for select using (true)`. Writes were
-- locked to board members back in 0004, but reads were open to everyone —
-- and the anon key ships inside the client bundle, as it is designed to.
-- So any visitor could read every board, task, member email and contact
-- phone number straight from the REST API. Hiding boards in the UI does
-- not change that; this does.
--
-- Shared boards stay readable. Turning on a share link is an explicit
-- decision to let anyone with the URL view the board, so a board holding
-- a share_token stays visible. Residual: such a board can be listed
-- without knowing its token. Closing that needs a security-definer
-- lookup by token instead of a policy; worth doing, but it is a larger
-- change and no board is shared today.

-- Visible = you are a member, or the board is deliberately shared.
-- Security definer so the policies can call it without recursing into
-- the very policies being evaluated.
create or replace function public.is_board_visible(target_board_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.boards b
    where b.id = target_board_id
      and (b.share_token is not null or public.is_board_member(b.id))
  );
$$;

-- task_assignees carries no board_id, so it resolves through its task.
create or replace function public.is_task_visible(target_task_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and public.is_board_visible(t.board_id)
  );
$$;

grant execute on function public.is_board_visible(text) to anon, authenticated;
grant execute on function public.is_task_visible(text)  to anon, authenticated;

-- Replace the blanket read policies, one table at a time.
drop policy if exists "momentum read" on public.boards;
create policy "momentum read" on public.boards
  for select using (public.is_board_visible(id));

drop policy if exists "momentum read" on public.board_groups;
create policy "momentum read" on public.board_groups
  for select using (public.is_board_visible(board_id));

drop policy if exists "momentum read" on public.board_members;
create policy "momentum read" on public.board_members
  for select using (public.is_board_visible(board_id));

drop policy if exists "momentum read" on public.contacts;
create policy "momentum read" on public.contacts
  for select using (public.is_board_visible(board_id));

drop policy if exists "momentum read" on public.tasks;
create policy "momentum read" on public.tasks
  for select using (public.is_board_visible(board_id));

drop policy if exists "momentum read" on public.task_time_entries;
create policy "momentum read" on public.task_time_entries
  for select using (public.is_board_visible(board_id));

drop policy if exists "momentum read" on public.task_assignees;
create policy "momentum read" on public.task_assignees
  for select using (public.is_task_visible(task_id));

-- Membership lookups are now on the hot path for every read.
create index if not exists idx_board_members_auth_user
  on public.board_members(auth_user_id);
