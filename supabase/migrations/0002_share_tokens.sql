-- View-only share links. Adds a nullable share_token to boards; a board
-- with a token is reachable read-only at /share/<token>. Setting the
-- column to NULL revokes the link.

alter table public.boards
  add column if not exists share_token text;

create unique index if not exists idx_boards_share_token
  on public.boards(share_token)
  where share_token is not null;

-- The anon RLS policy on public.boards already covers select-by-token,
-- so no policy changes are needed.
