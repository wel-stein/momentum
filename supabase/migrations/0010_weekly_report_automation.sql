-- Weekly report: scheduled sending, and a record of what has been reported.
--
-- Two halves of one feature. The schedule sends the report without anyone
-- pressing a button; reported_at is what makes that safe to trust, because
-- the board can then show which tasks management has already seen, so
-- finished ones can be cleared out with confidence.

-- Per-board opt-in. The schedule is global (one cron), but each board
-- decides whether it takes part and who its report goes to, so enabling it
-- is a normal in-app choice rather than a redeploy.
alter table public.boards
  add column if not exists auto_report_enabled boolean not null default false;
alter table public.boards
  add column if not exists auto_report_recipients text[] not null default '{}';
-- Guards against a double send: a retried or duplicated cron invocation
-- would otherwise mail management the same report twice.
alter table public.boards
  add column if not exists auto_report_last_sent_at timestamptz;

-- When this task was last included in a report that actually sent. Null
-- means management has never seen it.
alter table public.tasks
  add column if not exists reported_at timestamptz;

-- The cron picks up boards by this flag; few rows qualify, so index just
-- the ones that do.
create index if not exists idx_boards_auto_report
  on public.boards(id) where auto_report_enabled;
