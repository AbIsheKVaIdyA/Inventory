-- Add NESRL and ROW building / branch options for the public rooms form.
-- Safe to re-run.

insert into public.room_buildings (name, sort_order, active)
values
  ('ECSW', 10, true),
  ('ECSN', 20, true),
  ('ECSS', 30, true),
  ('NESRL', 40, true),
  ('ROW', 50, true)
on conflict (name) do update
set sort_order = excluded.sort_order,
    active = true;
