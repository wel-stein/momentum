-- Momentum schema (boards / groups / tasks / members / assignees)
-- Paste this into the Supabase SQL Editor and run it once.

create table if not exists public.boards (
  id text primary key,
  name text not null,
  description text,
  emoji text default '📋',
  view text not null default 'kanban',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_groups (
  id text primary key,
  board_id text not null references public.boards(id) on delete cascade,
  name text not null,
  color text not null,
  collapsed boolean not null default false,
  position int not null default 0
);

create table if not exists public.board_members (
  id text primary key,
  board_id text not null references public.boards(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_color text,
  role text not null default 'member'
);

create table if not exists public.tasks (
  id text primary key,
  board_id text not null references public.boards(id) on delete cascade,
  group_id text not null references public.board_groups(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'not_started',
  priority text not null default 'medium',
  start_date timestamptz,
  due_date timestamptz,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_assignees (
  task_id text not null references public.tasks(id) on delete cascade,
  member_id text not null references public.board_members(id) on delete cascade,
  primary key (task_id, member_id)
);

create index if not exists idx_groups_board on public.board_groups(board_id);
create index if not exists idx_tasks_board on public.tasks(board_id);
create index if not exists idx_tasks_group on public.tasks(group_id);
create index if not exists idx_members_board on public.board_members(board_id);
create index if not exists idx_assignees_member on public.task_assignees(member_id);

-- Enable RLS, then add permissive policies so the anon key can read/write.
-- (This is a demo without auth — anyone with the URL can edit everything.
--  Tighten the policies once you add Supabase Auth.)
alter table public.boards          enable row level security;
alter table public.board_groups    enable row level security;
alter table public.board_members   enable row level security;
alter table public.tasks           enable row level security;
alter table public.task_assignees  enable row level security;

drop policy if exists "momentum anon all" on public.boards;
drop policy if exists "momentum anon all" on public.board_groups;
drop policy if exists "momentum anon all" on public.board_members;
drop policy if exists "momentum anon all" on public.tasks;
drop policy if exists "momentum anon all" on public.task_assignees;

create policy "momentum anon all" on public.boards
  for all using (true) with check (true);
create policy "momentum anon all" on public.board_groups
  for all using (true) with check (true);
create policy "momentum anon all" on public.board_members
  for all using (true) with check (true);
create policy "momentum anon all" on public.tasks
  for all using (true) with check (true);
create policy "momentum anon all" on public.task_assignees
  for all using (true) with check (true);
