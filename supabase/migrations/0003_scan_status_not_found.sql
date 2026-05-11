-- Allow marking rows as physically not found on site (separate from scanned).
alter table public.inventory_items
  drop constraint if exists inventory_items_scan_status_check;

alter table public.inventory_items
  add constraint inventory_items_scan_status_check check (
    scan_status in ('pending', 'scanned', 'not_found')
  );

comment on column public.inventory_items.scan_status is
  'pending = in queue; scanned = found and verified; not_found = could not locate asset on site';
