-- Roles & departments.
--   admin       → everything (scan queue, room submissions, device requests, departments, users)
--   it          → ECS IT: review device requests from departments
--   department  → sees only its own department's systems and registers new devices
--   scanner     → scan team (the original app)
--   pending     → signed in but no access yet (default for newly invited accounts)
--
-- Run in Supabase SQL Editor after 0009. Safe to re-run.
-- Every account that exists when this runs becomes `scanner` so nothing changes for the scan team.
-- Then promote admins with supabase/scripts/set_admins.sql.

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
create table if not exists public.departments (
  code text primary key,
  name text not null unique,
  sort_order integer not null default 0
);

insert into public.departments (code, name, sort_order)
values
  ('bioe', 'Bio Engineering', 10),
  ('cs', 'Computer Science', 20),
  ('ece', 'Electrical and Computer Engineering', 30),
  ('mse', 'Materials Science and Engineering', 40),
  ('me', 'Mechanical Engineering', 50),
  ('se', 'System Engineering', 60)
on conflict (code) do update
set name = excluded.name,
    sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- User profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'pending',
  department_code text references public.departments (code) on update cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_role_check
    check (role in ('pending', 'admin', 'it', 'department', 'scanner')),
  constraint user_profiles_department_check
    check (role <> 'department' or department_code is not null)
);

create index if not exists user_profiles_role_idx on public.user_profiles (role);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id, email, full_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.user_profiles (user_id, email, full_name, role)
select u.id, u.email, nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), 'scanner'
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.user_profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.role <> 'department' then
    new.department_code := null;
  end if;
  if old.role = 'admin' and new.role <> 'admin' and not exists (
    select 1 from public.user_profiles p
    where p.role = 'admin' and p.user_id <> old.user_id
  ) then
    raise exception 'At least one admin must remain.';
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_guard on public.user_profiles;
create trigger user_profiles_guard
  before update on public.user_profiles
  for each row execute function public.user_profiles_guard();

-- Role lookups used by every policy below (security definer avoids RLS recursion).
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role from public.user_profiles p where p.user_id = auth.uid()),
    'pending'
  );
$$;

create or replace function public.app_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.department_code from public.user_profiles p where p.user_id = auth.uid();
$$;

revoke execute on function public.app_role() from public, anon;
revoke execute on function public.app_department() from public, anon;
grant execute on function public.app_role() to authenticated;
grant execute on function public.app_department() to authenticated;

-- ---------------------------------------------------------------------------
-- Room → department mapping; devices inherit their department from their room
-- ---------------------------------------------------------------------------
create table if not exists public.room_department_map (
  location text primary key,
  location_key text generated always as (upper(regexp_replace(location, '\s+', '', 'g'))) stored,
  department_code text not null references public.departments (code) on update cascade,
  created_at timestamptz not null default now(),
  constraint room_department_map_location_key unique (location_key)
);

alter table public.inventory_items
  add column if not exists department_code text
  references public.departments (code) on update cascade on delete set null;

create index if not exists inventory_items_department_code_idx
  on public.inventory_items (department_code);

create index if not exists inventory_items_location_key_idx
  on public.inventory_items ((upper(regexp_replace(coalesce(location, ''), '\s+', '', 'g'))));

create or replace function public.inventory_items_assign_department()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mapped text;
begin
  if tg_op = 'INSERT' and new.department_code is not null then
    return new;
  end if;
  select m.department_code into mapped
  from public.room_department_map m
  where m.location_key = upper(regexp_replace(coalesce(new.location, ''), '\s+', '', 'g'));
  if mapped is not null then
    new.department_code := mapped;
  end if;
  return new;
end;
$$;

drop trigger if exists inventory_items_assign_department on public.inventory_items;
create trigger inventory_items_assign_department
  before insert or update of location on public.inventory_items
  for each row execute function public.inventory_items_assign_department();

create or replace function public.room_department_map_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.inventory_items i
    set department_code = null
    where upper(regexp_replace(coalesce(i.location, ''), '\s+', '', 'g')) = old.location_key
      and i.department_code = old.department_code;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.inventory_items i
    set department_code = new.department_code
    where upper(regexp_replace(coalesce(i.location, ''), '\s+', '', 'g')) = new.location_key;
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists room_department_map_sync on public.room_department_map;
create trigger room_department_map_sync
  after insert or update or delete on public.room_department_map
  for each row execute function public.room_department_map_sync();

update public.inventory_items i
set department_code = m.department_code
from public.room_department_map m
where m.location_key = upper(regexp_replace(coalesce(i.location, ''), '\s+', '', 'g'))
  and i.department_code is distinct from m.department_code;

-- ---------------------------------------------------------------------------
-- Device requests (department registers → ECS IT approves / rejects)
-- ---------------------------------------------------------------------------
create table if not exists public.device_requests (
  id uuid primary key default gen_random_uuid(),
  department_code text not null references public.departments (code) on update cascade,
  location text not null,
  tag_number text,
  serial_id text,
  manufacturer text,
  model text,
  description text,
  notes text,
  status text not null default 'pending',
  requested_by uuid references auth.users (id) on delete set null,
  requested_by_email text,
  requested_by_name text,
  reviewed_by_email text,
  reviewed_at timestamptz,
  review_note text,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint device_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint device_requests_location_check
    check (length(trim(location)) > 0),
  constraint device_requests_identity_check
    check (coalesce(nullif(trim(tag_number), ''), nullif(trim(serial_id), '')) is not null)
);

create index if not exists device_requests_status_created_idx
  on public.device_requests (status, created_at desc);
create index if not exists device_requests_department_idx
  on public.device_requests (department_code, created_at desc);

create or replace function public.device_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'pending';
  new.requested_by := auth.uid();
  select p.email, p.full_name
  into new.requested_by_email, new.requested_by_name
  from public.user_profiles p
  where p.user_id = auth.uid();
  new.reviewed_by_email := null;
  new.reviewed_at := null;
  new.review_note := null;
  new.inventory_item_id := null;
  return new;
end;
$$;

drop trigger if exists device_requests_before_insert on public.device_requests;
create trigger device_requests_before_insert
  before insert on public.device_requests
  for each row execute function public.device_requests_before_insert();

create or replace function public.approve_device_request(p_request_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.device_requests%rowtype;
  new_item_id uuid;
  reviewer text;
begin
  if public.app_role() not in ('admin', 'it') then
    raise exception 'Only ECS IT or admins can approve requests.' using errcode = '42501';
  end if;

  select * into r from public.device_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  if r.status <> 'pending' then
    raise exception 'This request was already %.', r.status;
  end if;

  if nullif(trim(r.tag_number), '') is not null and exists (
    select 1 from public.inventory_items i
    where upper(trim(i.tag_number)) = upper(trim(r.tag_number))
  ) then
    raise exception 'Tag % is already in the inventory.', trim(r.tag_number);
  end if;

  select p.email into reviewer from public.user_profiles p where p.user_id = auth.uid();

  insert into public.inventory_items (
    tag_number, serial_id, location, manufacturer, model, description,
    department_code, inventory_status, scan_status
  )
  values (
    nullif(trim(r.tag_number), ''),
    nullif(trim(r.serial_id), ''),
    trim(r.location),
    nullif(trim(r.manufacturer), ''),
    nullif(trim(r.model), ''),
    nullif(trim(r.description), ''),
    r.department_code,
    'Registered by department',
    'pending'
  )
  returning id into new_item_id;

  update public.device_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by_email = reviewer,
      review_note = nullif(trim(p_note), ''),
      inventory_item_id = new_item_id
  where id = p_request_id;

  return new_item_id;
end;
$$;

create or replace function public.reject_device_request(p_request_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.device_requests%rowtype;
  reviewer text;
begin
  if public.app_role() not in ('admin', 'it') then
    raise exception 'Only ECS IT or admins can reject requests.' using errcode = '42501';
  end if;

  select * into r from public.device_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found.';
  end if;
  if r.status <> 'pending' then
    raise exception 'This request was already %.', r.status;
  end if;

  select p.email into reviewer from public.user_profiles p where p.user_id = auth.uid();

  update public.device_requests
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by_email = reviewer,
      review_note = nullif(trim(p_note), '')
  where id = p_request_id;
end;
$$;

revoke execute on function public.approve_device_request(uuid, text) from public, anon;
revoke execute on function public.reject_device_request(uuid, text) from public, anon;
grant execute on function public.approve_device_request(uuid, text) to authenticated;
grant execute on function public.reject_device_request(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.departments enable row level security;
alter table public.user_profiles enable row level security;
alter table public.room_department_map enable row level security;
alter table public.device_requests enable row level security;

drop policy if exists "departments_select" on public.departments;
create policy "departments_select"
  on public.departments for select
  to authenticated
  using (true);

drop policy if exists "departments_admin_all" on public.departments;
create policy "departments_admin_all"
  on public.departments for all
  to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');

drop policy if exists "user_profiles_select" on public.user_profiles;
create policy "user_profiles_select"
  on public.user_profiles for select
  to authenticated
  using (user_id = auth.uid() or (select public.app_role()) = 'admin');

drop policy if exists "user_profiles_admin_update" on public.user_profiles;
create policy "user_profiles_admin_update"
  on public.user_profiles for update
  to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');

drop policy if exists "room_department_map_staff_select" on public.room_department_map;
create policy "room_department_map_staff_select"
  on public.room_department_map for select
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "room_department_map_admin_all" on public.room_department_map;
create policy "room_department_map_admin_all"
  on public.room_department_map for all
  to authenticated
  using ((select public.app_role()) = 'admin')
  with check ((select public.app_role()) = 'admin');

-- Inventory: was open to everyone (even signed out); now role based.
drop policy if exists "inventory_items_select" on public.inventory_items;
drop policy if exists "inventory_items_insert" on public.inventory_items;
drop policy if exists "inventory_items_update" on public.inventory_items;

drop policy if exists "inventory_items_staff_select" on public.inventory_items;
create policy "inventory_items_staff_select"
  on public.inventory_items for select
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "inventory_items_department_select" on public.inventory_items;
create policy "inventory_items_department_select"
  on public.inventory_items for select
  to authenticated
  using (
    (select public.app_role()) = 'department'
    and department_code = (select public.app_department())
  );

drop policy if exists "inventory_items_staff_insert" on public.inventory_items;
create policy "inventory_items_staff_insert"
  on public.inventory_items for insert
  to authenticated
  with check ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "inventory_items_staff_update" on public.inventory_items;
create policy "inventory_items_staff_update"
  on public.inventory_items for update
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'))
  with check ((select public.app_role()) in ('admin', 'scanner'));

-- Device requests
drop policy if exists "device_requests_select" on public.device_requests;
create policy "device_requests_select"
  on public.device_requests for select
  to authenticated
  using (
    (select public.app_role()) in ('admin', 'it')
    or (
      (select public.app_role()) = 'department'
      and department_code = (select public.app_department())
    )
  );

drop policy if exists "device_requests_insert" on public.device_requests;
create policy "device_requests_insert"
  on public.device_requests for insert
  to authenticated
  with check (
    (select public.app_role()) = 'admin'
    or (
      (select public.app_role()) = 'department'
      and department_code = (select public.app_department())
    )
  );

drop policy if exists "device_requests_cancel_own" on public.device_requests;
create policy "device_requests_cancel_own"
  on public.device_requests for delete
  to authenticated
  using (requested_by = auth.uid() and status = 'pending');

-- Room submissions and done rooms belong to the scan side only.
drop policy if exists "room_assignments_auth_select" on public.room_assignments;
create policy "room_assignments_auth_select"
  on public.room_assignments for select
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "room_assignments_auth_delete" on public.room_assignments;
create policy "room_assignments_auth_delete"
  on public.room_assignments for delete
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "done_rooms_select" on public.done_rooms;
create policy "done_rooms_select"
  on public.done_rooms for select
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "done_rooms_insert" on public.done_rooms;
create policy "done_rooms_insert"
  on public.done_rooms for insert
  to authenticated
  with check ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "done_rooms_update" on public.done_rooms;
create policy "done_rooms_update"
  on public.done_rooms for update
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'))
  with check ((select public.app_role()) in ('admin', 'scanner'));

drop policy if exists "done_rooms_delete" on public.done_rooms;
create policy "done_rooms_delete"
  on public.done_rooms for delete
  to authenticated
  using ((select public.app_role()) in ('admin', 'scanner'));

grant select on public.departments to authenticated;
grant select, update on public.user_profiles to authenticated;
grant select, insert, update, delete on public.room_department_map to authenticated;
grant select, insert, delete on public.device_requests to authenticated;

comment on table public.user_profiles is
  'Role per account: admin | it | department | scanner | pending. Admins edit from /admin/users.';
comment on table public.room_department_map is
  'Room → department. Devices in a mapped room get that department automatically.';
comment on table public.device_requests is
  'Devices registered by departments; ECS IT approves (adds to inventory) or rejects.';
