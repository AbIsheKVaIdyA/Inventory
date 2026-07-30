-- Remove unused created_rooms table (newly created rooms feature removed).
-- Safe to re-run.

drop policy if exists "created_rooms_select" on public.created_rooms;
drop policy if exists "created_rooms_insert" on public.created_rooms;
drop policy if exists "created_rooms_update" on public.created_rooms;
drop table if exists public.created_rooms;
