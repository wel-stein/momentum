-- Per-board write RLS.
--
-- Migration 0003 split SELECT (anyone) from INSERT/UPDATE/DELETE
-- (authenticated). That stopped anonymous writes but still let any
-- signed-in user mutate any board. This migration tightens writes to
-- "must be a member of the target board", with carve-outs that keep
-- the existing client flows working:
--
--   1. INSERT on `boards`             — any authenticated user (so they
--                                       can create a fresh board).
--   2. INSERT on `board_members`      — the inserter must be either
--                                       claiming the row for themselves
--                                       (typical owner row in
--                                       createBoard) OR already a
--                                       member of the board (inviting
--                                       teammates).
--   3. UPDATE on `board_members`      — existing members of the board,
--                                       PLUS a "claim" path: anyone may
--                                       attach their auth.uid() to a
--                                       row whose auth_user_id is NULL
--                                       and whose email matches their
--                                       JWT email (the legacy
--                                       claimMyMember flow).
--   4. UPDATE/DELETE on boards,
--      groups, tasks, task_assignees  — members of the parent board.

create or replace function public.is_board_member(target_board_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members m
    where m.board_id = target_board_id
      and m.auth_user_id = auth.uid()
  );
$$;

grant execute on function public.is_board_member(text) to anon, authenticated;

-- Drop the broad authenticated policies from 0003 and the helper carve-outs
-- we're about to recreate.
drop policy if exists "momentum write"  on public.boards;
drop policy if exists "momentum update" on public.boards;
drop policy if exists "momentum delete" on public.boards;
drop policy if exists "momentum write"  on public.board_groups;
drop policy if exists "momentum update" on public.board_groups;
drop policy if exists "momentum delete" on public.board_groups;
drop policy if exists "momentum write"  on public.board_members;
drop policy if exists "momentum update" on public.board_members;
drop policy if exists "momentum delete" on public.board_members;
drop policy if exists "momentum write"  on public.tasks;
drop policy if exists "momentum update" on public.tasks;
drop policy if exists "momentum delete" on public.tasks;
drop policy if exists "momentum write"  on public.task_assignees;
drop policy if exists "momentum update" on public.task_assignees;
drop policy if exists "momentum delete" on public.task_assignees;

drop policy if exists "boards create"           on public.boards;
drop policy if exists "boards members update"   on public.boards;
drop policy if exists "boards members delete"   on public.boards;
drop policy if exists "groups members insert"   on public.board_groups;
drop policy if exists "groups members update"   on public.board_groups;
drop policy if exists "groups members delete"   on public.board_groups;
drop policy if exists "members self or member insert" on public.board_members;
drop policy if exists "members member or claim update" on public.board_members;
drop policy if exists "members member delete"   on public.board_members;
drop policy if exists "tasks members insert"    on public.tasks;
drop policy if exists "tasks members update"    on public.tasks;
drop policy if exists "tasks members delete"    on public.tasks;
drop policy if exists "assignees members insert" on public.task_assignees;
drop policy if exists "assignees members delete" on public.task_assignees;

-- boards: create freely, mutate only if member.
create policy "boards create"
  on public.boards for insert to authenticated
  with check (true);
create policy "boards members update"
  on public.boards for update to authenticated
  using (public.is_board_member(id))
  with check (public.is_board_member(id));
create policy "boards members delete"
  on public.boards for delete to authenticated
  using (public.is_board_member(id));

-- board_groups: members of the parent board.
create policy "groups members insert"
  on public.board_groups for insert to authenticated
  with check (public.is_board_member(board_id));
create policy "groups members update"
  on public.board_groups for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));
create policy "groups members delete"
  on public.board_groups for delete to authenticated
  using (public.is_board_member(board_id));

-- board_members: self-claim or member of the board.
create policy "members self or member insert"
  on public.board_members for insert to authenticated
  with check (
    auth_user_id = auth.uid()
    OR public.is_board_member(board_id)
  );
-- Claim path: pre-auth seed rows have auth_user_id = NULL and a placeholder
-- email ("you@momentum.app") that doesn't match the user's real Google
-- address, so we can't tie the claim to email equality. Bound it on null
-- + the resulting row pointing at the caller instead.
create policy "members member or claim update"
  on public.board_members for update to authenticated
  using (
    public.is_board_member(board_id)
    OR auth_user_id IS NULL
  )
  with check (
    public.is_board_member(board_id)
    OR auth_user_id = auth.uid()
  );
create policy "members member delete"
  on public.board_members for delete to authenticated
  using (public.is_board_member(board_id));

-- tasks: members of the parent board.
create policy "tasks members insert"
  on public.tasks for insert to authenticated
  with check (public.is_board_member(board_id));
create policy "tasks members update"
  on public.tasks for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));
create policy "tasks members delete"
  on public.tasks for delete to authenticated
  using (public.is_board_member(board_id));

-- task_assignees: must be member of the parent board (via tasks).
create policy "assignees members insert"
  on public.task_assignees for insert to authenticated
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_board_member(t.board_id)
    )
  );
create policy "assignees members delete"
  on public.task_assignees for delete to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id
        and public.is_board_member(t.board_id)
    )
  );
