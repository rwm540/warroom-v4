-- ============================================================
--  WarRoom Supabase Permission Fix
--  Run this in Supabase SQL Editor to fix the 401 / permission denied errors.
--  This is the quick dev fix for the current broken state.
-- ============================================================

-- 1) Ensure schema access
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.warroom_users to anon, authenticated;
grant select, insert, update, delete on public.warroom_groups to anon, authenticated;
grant select, insert, update, delete on public.warroom_support_tickets to anon, authenticated;
grant select, insert, update, delete on public.warroom_support_replies to anon, authenticated;
grant select, insert, update, delete on public.warroom_group_join_requests to anon, authenticated;
grant select, insert, update, delete on public.warroom_payment_transactions to anon, authenticated;
grant select, insert, update, delete on public.warroom_credentials to anon, authenticated;
grant select, insert, update, delete on public.warroom_otp_codes to anon, authenticated;
grant select, insert, update, delete on public.warroom_otp_rate_limits to anon, authenticated;
grant select, insert, update, delete on public.warroom_refresh_tokens to anon, authenticated;

grant select, insert, update, delete on public.warroom_kv to anon, authenticated;

-- 2) Enable row level security on the main auth/OTP tables
alter table public.warroom_users enable row level security;
alter table public.warroom_groups enable row level security;
alter table public.warroom_support_tickets enable row level security;
alter table public.warroom_support_replies enable row level security;
alter table public.warroom_group_join_requests enable row level security;
alter table public.warroom_payment_transactions enable row level security;
alter table public.warroom_credentials enable row level security;
alter table public.warroom_otp_codes enable row level security;
alter table public.warroom_otp_rate_limits enable row level security;
alter table public.warroom_refresh_tokens enable row level security;

-- 3) Temporary permissive policies for development
drop policy if exists "anon_all_warroom_users" on public.warroom_users;
create policy "anon_all_warroom_users" on public.warroom_users
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_groups" on public.warroom_groups;
create policy "anon_all_warroom_groups" on public.warroom_groups
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_support_tickets" on public.warroom_support_tickets;
create policy "anon_all_warroom_support_tickets" on public.warroom_support_tickets
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_support_replies" on public.warroom_support_replies;
create policy "anon_all_warroom_support_replies" on public.warroom_support_replies
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_group_join_requests" on public.warroom_group_join_requests;
create policy "anon_all_warroom_group_join_requests" on public.warroom_group_join_requests
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_payment_transactions" on public.warroom_payment_transactions;
create policy "anon_all_warroom_payment_transactions" on public.warroom_payment_transactions
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_credentials" on public.warroom_credentials;
create policy "anon_all_warroom_credentials" on public.warroom_credentials
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_otp_codes" on public.warroom_otp_codes;
create policy "anon_all_warroom_otp_codes" on public.warroom_otp_codes
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_otp_rate_limits" on public.warroom_otp_rate_limits;
create policy "anon_all_warroom_otp_rate_limits" on public.warroom_otp_rate_limits
for all using (true) with check (true);

drop policy if exists "anon_all_warroom_refresh_tokens" on public.warroom_refresh_tokens;
create policy "anon_all_warroom_refresh_tokens" on public.warroom_refresh_tokens
for all using (true) with check (true);

-- 4) Quick verification queries
select 'warroom_users' as table_name, has_table_privilege('anon', 'public.warroom_users', 'select') as anon_select;
select 'warroom_groups' as table_name, has_table_privilege('anon', 'public.warroom_groups', 'select') as anon_select;
select 'warroom_otp_codes' as table_name, has_table_privilege('anon', 'public.warroom_otp_codes', 'select') as anon_select;

-- ============================================================
-- NOTE:
-- This is intentional for development / rapid fix.
-- For production, move to stricter row-level policies and keep service_role only in Node backend.
-- ============================================================
