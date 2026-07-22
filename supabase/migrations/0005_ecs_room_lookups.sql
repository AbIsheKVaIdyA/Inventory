-- Replace room form lookup lists with ECS buildings & departments.
-- Run in Supabase SQL Editor after 0004 (safe to re-run).

update public.room_departments set active = false;

insert into public.room_departments (name, sort_order, active)
values
  ('Bioengineering', 10, true),
  ('Computer Science', 20, true),
  ('Electrical Engineering', 30, true),
  ('Materials Science and Engineering', 40, true),
  ('Mechanical Engineering', 50, true),
  ('Systems Engineering', 60, true)
on conflict (name) do update
set sort_order = excluded.sort_order,
    active = true;

update public.room_buildings set active = false;

insert into public.room_buildings (name, sort_order, active)
values
  ('ECSW', 10, true),
  ('ECSN', 20, true),
  ('ECSS', 30, true)
on conflict (name) do update
set sort_order = excluded.sort_order,
    active = true;
