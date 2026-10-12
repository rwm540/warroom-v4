-- Remove permissive legacy policies left by the original bootstrap migration.
begin;
drop policy if exists "Enable all access for warroom_users" on public.warroom_users;
drop policy if exists "Enable all access for warroom_kv" on public.warroom_kv;
drop policy if exists "Enable all access for warroom_password_reset_requests" on public.warroom_password_reset_requests;
drop policy if exists "Enable all access for warroom_audit_log" on public.warroom_audit_log;
drop policy if exists "Enable all access for warroom_daily_challenges" on public.warroom_daily_challenges;
drop policy if exists "Enable all access for warroom_group_chat_messages" on public.warroom_group_chat_messages;
drop policy if exists "Enable all access for warroom_group_chat_rooms" on public.warroom_group_chat_rooms;
drop policy if exists "Enable all access for warroom_groups" on public.warroom_groups;
drop policy if exists "Enable all access for warroom_soundtracks" on public.warroom_soundtracks;
drop policy if exists "Enable all access for warroom_support_replies" on public.warroom_support_replies;
drop policy if exists "Enable all access for warroom_support_tickets" on public.warroom_support_tickets;
commit;
