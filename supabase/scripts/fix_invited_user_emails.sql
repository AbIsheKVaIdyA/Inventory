-- Fix invited users who set a password but still get "Invalid login credentials".
-- Run in Supabase SQL Editor for affected accounts (or all unconfirmed users).

-- 1) See who is unconfirmed / missing a usable password marker
select
  id,
  email,
  email_confirmed_at,
  invited_at,
  last_sign_in_at,
  (encrypted_password is not null and length(encrypted_password) > 0) as has_password_hash
from auth.users
order by created_at desc;

-- 2) Confirm emails for invited users (safe if already confirmed)
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where invited_at is not null
  and email_confirmed_at is null;

-- If login still fails for a specific person: Auth → Users → user → "Send password recovery"
-- or set a temporary password with the Admin API / dashboard.
