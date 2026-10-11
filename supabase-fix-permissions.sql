-- Deprecated compatibility filename. Do not add broad anon policies here.
-- Review and apply the versioned migrations manually, in filename order:
--   supabase/migrations/20261011000000_warroom_schema.sql
--   supabase/migrations/20261011001000_lock_auth_secrets.sql
-- These queries are read-only and verify that sensitive table privileges are closed.

select table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'select') as anon_select,
  has_table_privilege('anon', format('public.%I', table_name), 'insert') as anon_insert,
  has_table_privilege('anon', format('public.%I', table_name), 'update') as anon_update,
  has_table_privilege('anon', format('public.%I', table_name), 'delete') as anon_delete,
  has_table_privilege('authenticated', format('public.%I', table_name), 'select') as authenticated_select,
  has_table_privilege('authenticated', format('public.%I', table_name), 'insert') as authenticated_insert,
  has_table_privilege('authenticated', format('public.%I', table_name), 'update') as authenticated_update,
  has_table_privilege('authenticated', format('public.%I', table_name), 'delete') as authenticated_delete,
  has_table_privilege('service_role', format('public.%I', table_name), 'select') as service_role_select
from (values
  ('warroom_credentials'),
  ('warroom_otp_codes'),
  ('warroom_otp_rate_limits'),
  ('warroom_refresh_tokens')
) as protected(table_name);
