-- Promote admins after running migration 0010. Replace the emails with real sign-in emails.

update public.user_profiles
set role = 'admin'
where lower(email) in (
  lower('you@example.edu'),
  lower('manager@example.edu')
);

-- Check everyone's role
select email, full_name, role, department_code
from public.user_profiles
order by role, email;
