-- KPI module: kpi_sets and kpi_items tables

create table if not exists public.kpi_sets (
  id text primary key,
  year int not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id text,
  unique (year, user_id)
);

create table if not exists public.kpi_items (
  id text primary key,
  set_id text not null references public.kpi_sets(id) on delete cascade,
  no int not null default 1,
  objectives text not null default '',
  sub_items text[] not null default '{}',
  weightage numeric(5,2) not null default 0,
  measurable text not null default '',
  target_1 text not null default '',
  target_2 text not null default '',
  target_3 text not null default '',
  target_4 text not null default '',
  target_5 text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kpi_items_set on public.kpi_items(set_id);

alter table public.kpi_sets   enable row level security;
alter table public.kpi_items  enable row level security;

drop policy if exists "kpi anon all" on public.kpi_sets;
drop policy if exists "kpi anon all" on public.kpi_items;

create policy "kpi anon all" on public.kpi_sets
  for all using (true) with check (true);
create policy "kpi anon all" on public.kpi_items
  for all using (true) with check (true);
