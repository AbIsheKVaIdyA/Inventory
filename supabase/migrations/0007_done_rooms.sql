-- Rooms marked done by scanners — hidden from “Pick a room”, listed under Done rooms.
-- Run in Supabase SQL Editor if not applied via CLI.

create table if not exists public.done_rooms (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  marked_at timestamptz not null default now(),
  marked_by text,
  constraint done_rooms_location_key unique (location)
);

create index if not exists done_rooms_marked_at_idx
  on public.done_rooms (marked_at desc);

alter table public.done_rooms enable row level security;

drop policy if exists "done_rooms_select" on public.done_rooms;
create policy "done_rooms_select"
  on public.done_rooms for select
  to anon, authenticated
  using (true);

drop policy if exists "done_rooms_insert" on public.done_rooms;
create policy "done_rooms_insert"
  on public.done_rooms for insert
  to anon, authenticated
  with check (true);

drop policy if exists "done_rooms_update" on public.done_rooms;
create policy "done_rooms_update"
  on public.done_rooms for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "done_rooms_delete" on public.done_rooms;
create policy "done_rooms_delete"
  on public.done_rooms for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete on public.done_rooms to anon, authenticated;

comment on table public.done_rooms is
  'Rooms marked complete; excluded from Pick a room until reopened.';
