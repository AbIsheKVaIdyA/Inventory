-- Worksheet replica + handheld scan metadata.
--
-- WHY A SEPARATE "Status" FIELD:
-- Your sheet column "Status" is stored as inventory_status (whatever your workbook uses).
-- The scan app's pending/scanned lifecycle uses scan_status so imports do not overwrite field checks.

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),

  -- Original spreadsheet primary key-style column ("ID"); unique when present
  sheet_row_id bigint unique,

  area_id text,
  tag_number text,
  fy_missing text,
  location text,
  manufacturer text,
  model text,
  serial_id text,
  description text,
  profile_id text,
  -- text: CSV often uses DD/MM/YYYY (e.g. 30/6/2025); Postgres `date` rejects that during import
  acq_date text,
  po_no text,
  asset_id text,
  inventory_date text,

  -- Imported worksheet status (not the same as scan pending/scanned)
  inventory_status text,

  -- Kiosk / scanner workflow (matches the Next.js app semantics)
  scan_status text not null default 'pending',
  scanned_by text,
  scanned_at timestamptz,

  constraint inventory_items_scan_status_check check (
    scan_status in ('pending', 'scanned')
  )
);

create index inventory_items_tag_number_idx on public.inventory_items (tag_number);
create index inventory_items_asset_id_idx on public.inventory_items (asset_id);
create index inventory_items_scan_status_idx on public.inventory_items (scan_status);

alter table public.inventory_items enable row level security;

create policy "inventory_items_select" on public.inventory_items for select using (true);
create policy "inventory_items_insert" on public.inventory_items for insert with check (true);
create policy "inventory_items_update" on public.inventory_items for update using (true) with check (true);

alter publication supabase_realtime add table public.inventory_items;

comment on table public.inventory_items is
  'Full worksheet columns + scan_status/scanned_by/scanned_at for floor scanning.';
