-- If you already ran 0002 when acq_date/inventory_date were `date`, CSV imports with DD/MM/YYYY failed.
-- Run this once, then re-import your CSV. Dates stay as text until you normalize (optional SQL below).
alter table public.inventory_items
  alter column acq_date type text using (
    case when acq_date is null then null else acq_date::text end
  ),
  alter column inventory_date type text using (
    case when inventory_date is null then null else inventory_date::text end
  );
