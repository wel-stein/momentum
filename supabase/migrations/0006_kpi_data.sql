-- Add items JSON column so kpi_sets stores the full item/sub-item tree
alter table public.kpi_sets add column if not exists items jsonb not null default '[]';
