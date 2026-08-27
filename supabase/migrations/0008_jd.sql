-- JD module: track readiness against the promoted role's key responsibilities

create table if not exists public.jd_modules (
  id text primary key,
  role text not null default '',
  title text not null default '',
  items jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.jd_modules enable row level security;

drop policy if exists "jd anon all" on public.jd_modules;

create policy "jd anon all" on public.jd_modules
  for all using (true) with check (true);
