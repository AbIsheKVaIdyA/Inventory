-- Room info collection (public form — no login).
-- Run in Supabase SQL Editor (or via CLI). Safe to re-run lookups with ON CONFLICT.

-- ---------------------------------------------------------------------------
-- Lookup lists (edit names / add rows anytime; form reads active = true)
-- ---------------------------------------------------------------------------
create table if not exists public.room_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  constraint room_departments_name_key unique (name)
);

create table if not exists public.room_buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  constraint room_buildings_name_key unique (name)
);

-- One spreadsheet-style row per room (person fields repeated per room)
create table if not exists public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  building text not null,
  room_number text not null,
  firstname text not null,
  lastname text not null,
  netid text not null,
  job_title text not null,
  created_at timestamptz not null default now()
);

create index if not exists room_assignments_created_at_idx
  on public.room_assignments (created_at desc);

create index if not exists room_assignments_netid_idx
  on public.room_assignments (netid);

-- Seed ECS departments & buildings (form dropdowns)
insert into public.room_departments (name, sort_order)
values
  ('Bioengineering', 10),
  ('Computer Science', 20),
  ('Electrical Engineering', 30),
  ('Materials Science and Engineering', 40),
  ('Mechanical Engineering', 50),
  ('Systems Engineering', 60)
on conflict (name) do nothing;

insert into public.room_buildings (name, sort_order)
values
  ('ECSW', 10),
  ('ECSN', 20),
  ('ECSS', 30)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- RLS: public can read lookups + insert assignments; only signed-in can read all rows
-- ---------------------------------------------------------------------------
alter table public.room_departments enable row level security;
alter table public.room_buildings enable row level security;
alter table public.room_assignments enable row level security;

drop policy if exists "room_departments_select_active" on public.room_departments;
create policy "room_departments_select_active"
  on public.room_departments
  for select
  to anon, authenticated
  using (active = true);

drop policy if exists "room_buildings_select_active" on public.room_buildings;
create policy "room_buildings_select_active"
  on public.room_buildings
  for select
  to anon, authenticated
  using (active = true);

-- Staff can manage lookup lists when signed in (dashboard / SQL optional later)
drop policy if exists "room_departments_auth_all" on public.room_departments;
create policy "room_departments_auth_all"
  on public.room_departments
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "room_buildings_auth_all" on public.room_buildings;
create policy "room_buildings_auth_all"
  on public.room_buildings
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "room_assignments_anon_insert" on public.room_assignments;
create policy "room_assignments_anon_insert"
  on public.room_assignments
  for insert
  to anon, authenticated
  with check (
    length(trim(department)) > 0
    and length(trim(building)) > 0
    and length(trim(room_number)) > 0
    and length(trim(firstname)) > 0
    and length(trim(lastname)) > 0
    and length(trim(netid)) > 0
    and length(trim(job_title)) > 0
  );

drop policy if exists "room_assignments_auth_select" on public.room_assignments;
create policy "room_assignments_auth_select"
  on public.room_assignments
  for select
  to authenticated
  using (true);

drop policy if exists "room_assignments_auth_delete" on public.room_assignments;
create policy "room_assignments_auth_delete"
  on public.room_assignments
  for delete
  to authenticated
  using (true);

comment on table public.room_assignments is
  'Public room-info form submissions; one row per room. Anon insert only; auth can read/export.';

grant usage on schema public to anon, authenticated;
grant select on public.room_departments to anon, authenticated;
grant select, insert, update, delete on public.room_departments to authenticated;
grant select on public.room_buildings to anon, authenticated;
grant select, insert, update, delete on public.room_buildings to authenticated;
grant insert on public.room_assignments to anon, authenticated;
grant select, delete on public.room_assignments to authenticated;
