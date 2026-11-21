-- KPI sets and JD modules belong to the person who created them.
--
-- Both carried `for all using (true)`: anyone holding the anon key — which
-- ships in the client bundle — could read, overwrite or delete them. Unlike
-- boards these are personal records (a person's own KPIs, their own job
-- description progress), so the right scope is the signed-in user, not a
-- membership list.

-- Existing ownerless rows are handed to whoever owns the most boards in
-- this deployment — the person who created them. Without a backfill they
-- would vanish the moment the policies below take effect. (The migration
-- is safe to re-run: each backfill only touches rows still lacking one.)

-- ---------------------------------------------------------------- KPI ----

update public.kpi_sets
set user_id = (
  select m.auth_user_id::text
  from public.board_members m
  where m.auth_user_id is not null and m.role = 'owner'
  group by m.auth_user_id
  order by count(*) desc
  limit 1
)
where user_id is null;

-- Filled in by the database from the caller's session, so no client can
-- write a row on someone else's behalf by sending a different user_id.
alter table public.kpi_sets
  alter column user_id set default (auth.uid())::text;
alter table public.kpi_sets
  alter column user_id set not null;

drop policy if exists "kpi anon all" on public.kpi_sets;
drop policy if exists "kpi own rows" on public.kpi_sets;
create policy "kpi own rows" on public.kpi_sets
  for all to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);

-- kpi_items is not used by the app today (items live inline on the set),
-- but an anonymously writable table is a hole whether or not anything
-- reads it. Scope it through the set it belongs to.
drop policy if exists "kpi anon all" on public.kpi_items;
drop policy if exists "kpi own rows" on public.kpi_items;
create policy "kpi own rows" on public.kpi_items
  for all to authenticated
  using (exists (
    select 1 from public.kpi_sets s
    where s.id = kpi_items.set_id and s.user_id = (auth.uid())::text
  ))
  with check (exists (
    select 1 from public.kpi_sets s
    where s.id = kpi_items.set_id and s.user_id = (auth.uid())::text
  ));

-- ----------------------------------------------------------------- JD ----

alter table public.jd_modules
  add column if not exists user_id text;

update public.jd_modules
set user_id = (
  select m.auth_user_id::text
  from public.board_members m
  where m.auth_user_id is not null and m.role = 'owner'
  group by m.auth_user_id
  order by count(*) desc
  limit 1
)
where user_id is null;

alter table public.jd_modules
  alter column user_id set default (auth.uid())::text;
alter table public.jd_modules
  alter column user_id set not null;

-- The module id is deterministic ("jd-applied-ai-2026") so every client
-- seeds the same template. Per user, that id repeats once per person, so
-- the key becomes (id, user_id) — otherwise a second user's copy would
-- collide with the first's.
alter table public.jd_modules drop constraint if exists jd_modules_pkey;
alter table public.jd_modules add primary key (id, user_id);

drop policy if exists "jd anon all" on public.jd_modules;
drop policy if exists "jd own rows" on public.jd_modules;
create policy "jd own rows" on public.jd_modules
  for all to authenticated
  using (user_id = (auth.uid())::text)
  with check (user_id = (auth.uid())::text);
