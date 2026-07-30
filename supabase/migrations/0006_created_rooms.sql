-- Persistent list of rooms created via the scan app (shared across devices).
-- Run in Supabase SQL Editor if not applied via CLI.

create table if not exists public.created_rooms (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  created_at timestamptz not null default now(),
  created_by text,
  constraint created_rooms_location_key unique (location)
);

create index if not exists created_rooms_created_at_idx
  on public.created_rooms (created_at desc);

alter table public.created_rooms enable row level security;

drop policy if exists "created_rooms_select" on public.created_rooms;
create policy "created_rooms_select"
  on public.created_rooms for select
  to anon, authenticated
  using (true);

drop policy if exists "created_rooms_insert" on public.created_rooms;
create policy "created_rooms_insert"
  on public.created_rooms for insert
  to anon, authenticated
  with check (true);

drop policy if exists "created_rooms_update" on public.created_rooms;
create policy "created_rooms_update"
  on public.created_rooms for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.created_rooms to anon, authenticated;

comment on table public.created_rooms is
  'Rooms introduced via Create room / add flow; shown in Newly created rooms list.';

-- Backfill: rooms that only have manually inserted rows (no sheet import id)
insert into public.created_rooms (location)
select distinct trim(location)
from public.inventory_items
where location is not null
  and trim(location) <> ''
group by trim(location)
having bool_and(sheet_row_id is null)
on conflict (location) do nothing;

-- Paper-sheet rooms you assigned (safe to re-run)
insert into public.created_rooms (location) values
  ('ECS 3.204'),
  ('ECS 3.202'),
  ('ECS 3.217'),
  ('ECS 3.213')
on conflict (location) do nothing;
