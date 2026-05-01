-- OPTIONAL after CSV import: parse DD/MM/YYYY text into real dates for reporting.
-- Run in SQL Editor. Adjust patterns if your sheet mixes formats.

alter table public.inventory_items add column if not exists acq_date_parsed date;

alter table public.inventory_items add column if not exists inventory_date_parsed date;

update public.inventory_items
set
  acq_date_parsed = case
    when acq_date is null or trim(acq_date) = '' then null
    when trim(acq_date) ~ '^\d{1,2}/\d{1,2}/\d{4}$'
    then to_date(trim(acq_date), 'DD/MM/YYYY')
    when trim(acq_date) ~ '^\d{4}-\d{2}-\d{2}$' then cast(trim(acq_date) as date)
    else null
  end,
  inventory_date_parsed = case
    when inventory_date is null or trim(inventory_date) = '' then null
    when trim(inventory_date) ~ '^\d{1,2}/\d{1,2}/\d{4}$'
    then to_date(trim(inventory_date), 'DD/MM/YYYY')
    when trim(inventory_date) ~ '^\d{4}-\d{2}-\d{2}$'
    then cast(trim(inventory_date) as date)
    else null
  end;
