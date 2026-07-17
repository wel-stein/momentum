-- Requester support: a per-board contact directory plus a nullable
-- tasks.requester_id pointing into it.
--
-- Contacts are people outside the board's member list (they never sign in),
-- so they carry a phone number for WhatsApp notifications instead of an
-- auth identity.

create table if not exists public.contacts (
  id text primary key,
  board_id text not null references public.boards(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  add column if not exists requester_id text references public.contacts(id) on delete set null;

create index if not exists idx_contacts_board on public.contacts(board_id);
create index if not exists idx_tasks_requester on public.tasks(requester_id);

-- RLS mirrors the other per-board tables: anyone can read (share links and
-- signed-out dashboards), only members of the parent board can write.
alter table public.contacts enable row level security;

drop policy if exists "momentum read"            on public.contacts;
drop policy if exists "contacts members insert"  on public.contacts;
drop policy if exists "contacts members update"  on public.contacts;
drop policy if exists "contacts members delete"  on public.contacts;

create policy "momentum read"
  on public.contacts for select using (true);
create policy "contacts members insert"
  on public.contacts for insert to authenticated
  with check (public.is_board_member(board_id));
create policy "contacts members update"
  on public.contacts for update to authenticated
  using (public.is_board_member(board_id))
  with check (public.is_board_member(board_id));
create policy "contacts members delete"
  on public.contacts for delete to authenticated
  using (public.is_board_member(board_id));
