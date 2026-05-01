-- Internal asset tracking. Run in Supabase SQL Editor or via CLI.
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  computer_name text not null,
  status text not null default 'pending',
  scanned_by text,
  scanned_at timestamptz,
  constraint assets_status_check check (status in ('pending', 'scanned'))
);

alter table public.assets enable row level security;

-- Internal kiosk / shared anon key pattern — tighten policies if you expose the key widely.
create policy "assets_select" on public.assets for select using (true);
create policy "assets_insert" on public.assets for insert with check (true);
create policy "assets_update" on public.assets for update using (true) with check (true);

-- Realtime: also verify Dashboard → Database → Replication for table `assets`.
alter publication supabase_realtime add table public.assets;

comment on table public.assets is 'Computer inventory scans; statuses pending | scanned';
