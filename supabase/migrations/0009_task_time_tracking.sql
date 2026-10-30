-- Task time tracking.
--
-- A task's duration is stored as the intervals that produced it, not as a
-- single number. Starting the stopwatch inserts a row with ended_at null;
-- stopping it fills ended_at in. A task can therefore be worked on in as
-- many sittings as it takes and still report one total (the sum), with a
-- log that explains where that total came from.
--
-- Keeping the open interval in the database — rather than in the tab that
-- started it — is what makes a running timer survive a refresh, a crash,
-- or moving to another device.
--
-- Typed-in time ("I spent 2h on this yesterday") is stored the same way,
-- as a closed interval marked source = 'manual', so there is one shape to
-- read, sum and edit instead of two.

create table if not exists public.task_time_entries (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  board_id text not null references public.boards(id) on delete cascade,
  member_id text references public.board_members(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  source text not null default 'timer',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_time_entries_source_valid
    check (source in ('timer', 'manual')),
  -- A stopwatch cannot stop before it started. Without this a clock skew
  -- or a bad edit would contribute a negative span to the total.
  constraint task_time_entries_interval_valid
    check (ended_at is null or ended_at >= started_at)
);

create index if not exists idx_time_entries_task on public.task_time_entries(task_id);
create index if not exists idx_time_entries_board on public.task_time_entries(board_id);
-- Finding "what is running right now" is the one hot lookup; open rows are
-- a tiny slice of the table, so index just those.
create index if not exists idx_time_entries_running
  on public.task_time_entries(member_id) where ended_at is null;

-- RLS mirrors contacts: anyone can read (shared boards and signed-out
-- dashboards show totals), only members of the parent board can write.
alter table public.task_time_entries enable row level security;

drop policy if exists "momentum read"                on public.task_time_entries;
drop policy if exists "time entries members insert"  on public.task_time_entries;
drop policy if exists "time entries members update"  on public.task_time_entries;
drop policy if exists "time entries members delete"  on public.task_time_entries;

create policy "momentum read"
  on public.task_time_entries for select using (true);
create policy "time entries members insert"
  on public.task_time_entries for insert to authenticated
  with check (public.is_board_member(board_id));
create policy "time entries members update"
  on public.task_time_entries for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));
create policy "time entries members delete"
  on public.task_time_entries for delete to authenticated
  using (public.is_board_member(board_id));
