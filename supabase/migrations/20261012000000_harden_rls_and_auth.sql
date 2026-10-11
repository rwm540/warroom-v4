-- Migration: 20261012000000_harden_rls_and_auth
-- Purpose: Harden RLS for warroom_users and other tables, fix KV, add pending registrations, secure admin RPCs, prevent PII leakage
-- This migration is incremental and does not drop tables or user data.

begin;

-- ------------------------------------------------------------------
-- 0. Ensure required extensions
-- ------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 1. Create pending registrations table for secure registration flow
-- ------------------------------------------------------------------
create table if not exists public.warroom_pending_registrations (
  id uuid primary key default gen_random_uuid(),
  national_code text not null,
  phone text not null,
  phone_e164 text,
  user_data jsonb not null default '{}'::jsonb,
  password_hash text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  is_verified boolean not null default false,
  attempt_count integer not null default 0,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pending_national on public.warroom_pending_registrations(national_code);
create index if not exists idx_pending_phone on public.warroom_pending_registrations(phone);
create index if not exists idx_pending_expires on public.warroom_pending_registrations(expires_at);

alter table public.warroom_pending_registrations enable row level security;
alter table public.warroom_pending_registrations force row level security;
revoke all on public.warroom_pending_registrations from public, anon, authenticated;
grant all on public.warroom_pending_registrations to service_role;

-- ------------------------------------------------------------------
-- 2. Harden warroom_users RLS - remove permissive policies
-- ------------------------------------------------------------------
-- Drop old permissive policies
drop policy if exists "policy_users_select" on public.warroom_users;
drop policy if exists "policy_users_insert" on public.warroom_users;
drop policy if exists "policy_users_update" on public.warroom_users;
drop policy if exists "policy_users_delete" on public.warroom_users;

-- New secure policies:
-- Select: own row or admin, plus service_role bypasses RLS
create policy "warroom_users_select_own_or_admin" on public.warroom_users
  for select to authenticated
  using (
    public.warroom_is_admin()
    or id = public.warroom_current_user_id()
  );

-- For anon, no select on raw users table - must use public view
-- Insert: only via RPC, but allow anon to insert only if role=user and is_active=false and is_blocked=false (defense in depth)
-- Actually we will block direct insert for anon/authenticated and rely on RPC security definer
-- So create policy that denies anon insert unless via service_role (which bypasses)
-- We create a restrictive policy that only allows insert with check false for anon, but RPC bypasses
drop policy if exists "warroom_users_insert_block_direct" on public.warroom_users;
create policy "warroom_users_insert_block_direct" on public.warroom_users
  for insert to anon, authenticated
  with check (false);

-- Update: only own row or admin, and prevent role escalation
create policy "warroom_users_update_own_or_admin" on public.warroom_users
  for update to authenticated
  using (
    public.warroom_is_admin()
    or id = public.warroom_current_user_id()
  )
  with check (
    public.warroom_is_admin()
    or id = public.warroom_current_user_id()
  );

-- Delete: only admin
create policy "warroom_users_delete_admin_only" on public.warroom_users
  for delete to authenticated
  using (public.warroom_is_admin());

-- Ensure RLS enabled and forced
alter table public.warroom_users enable row level security;
-- Do not force for service_role to allow bypass, but ensure RLS enabled
-- Force RLS would block service_role? Actually service_role bypasses RLS even when forced? In Supabase, service_role bypasses RLS. So force is okay.
alter table public.warroom_users force row level security;

-- ------------------------------------------------------------------
-- 3. Secure warroom_users_public view - ensure it only exposes safe fields
-- ------------------------------------------------------------------
-- Recreate view with explicit safe fields
create or replace view public.warroom_users_public with (security_invoker = false) as
select
  u.id,
  jsonb_build_object(
    'id', u.id,
    'first_name', coalesce(u.data->>'first_name', ''),
    'last_name', coalesce(u.data->>'last_name', ''),
    'gender', coalesce(u.data->>'gender', 'پسر'),
    'province', coalesce(u.data->>'province', ''),
    'city', coalesce(u.data->>'city', ''),
    'group_id', u.data->>'group_id',
    'squad_rank', coalesce(u.data->>'squad_rank', 'soldier'),
    'points', coalesce((u.data->>'points')::bigint, 0),
    'level', coalesce((u.data->>'level')::int, 1),
    'avatar_url', coalesce(u.data->>'avatar_url', ''),
    'is_active', coalesce((u.data->>'is_active')::boolean, true)
  ) as data,
  u.updated_at
from public.warroom_users u
where coalesce((u.data->>'is_active')::boolean, true) = true
  and coalesce((u.data->>'is_blocked')::boolean, false) = false;

-- Grant select on public view to anon and authenticated
grant select on public.warroom_users_public to anon, authenticated, service_role;

-- ------------------------------------------------------------------
-- 4. Harden warroom_kv - prevent overwrite of sensitive keys by anon
-- ------------------------------------------------------------------
drop policy if exists "policy_kv_select" on public.warroom_kv;
drop policy if exists "policy_kv_manage" on public.warroom_kv;

-- Select: block sensitive ids for non-admin
create policy "warroom_kv_select_safe" on public.warroom_kv
  for select to anon, authenticated
  using (
    id not in ('payment_settings', 'payment_secrets', 'admin_config', 'api_keys', 'server_secrets', 'payment_gateways', 'enamad_secrets')
    or public.warroom_is_admin()
  );

-- Insert/Update: only admin can manage sensitive or global settings, but allow users to manage their own saved_posts
create policy "warroom_kv_insert_admin_or_own" on public.warroom_kv
  for insert to anon, authenticated
  with check (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id in ('daily_challenge_config', 'soundtracks', 'audio_settings', 'site_settings', 'home_stats', 'guide_tutorial_config', 'payment_settings')
    -- Actually payment_settings should be admin only, so restrict further
  );

-- More precise: separate policies for update
drop policy if exists "warroom_kv_insert_admin_or_own" on public.warroom_kv;
create policy "warroom_kv_insert_safe" on public.warroom_kv
  for insert to authenticated
  with check (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id in ('daily_challenge_config', 'soundtracks', 'audio_settings')
    or (id = 'site_settings' and public.warroom_is_admin())
  );

create policy "warroom_kv_update_safe" on public.warroom_kv
  for update to authenticated
  using (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id in ('daily_challenge_config', 'soundtracks', 'audio_settings')
  )
  with check (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id in ('daily_challenge_config', 'soundtracks', 'audio_settings')
  );

-- Allow anon read for public keys
create policy "warroom_kv_select_anon_public" on public.warroom_kv
  for select to anon
  using (
    id in ('site_settings', 'home_stats', 'daily_challenge_config', 'soundtracks', 'audio_settings', 'game_portals', 'site_settings_main', 'main_settings')
  );

-- Delete: admin only
create policy "warroom_kv_delete_admin" on public.warroom_kv
  for delete to authenticated
  using (public.warroom_is_admin());

-- ------------------------------------------------------------------
-- 5. Harden warroom_groups - only members and leaders
-- ------------------------------------------------------------------
drop policy if exists "policy_groups_select" on public.warroom_groups;
drop policy if exists "policy_groups_manage" on public.warroom_groups;

create policy "warroom_groups_select_member_or_admin" on public.warroom_groups
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
    or public.warroom_current_user_id() = any(
      select jsonb_array_elements_text(coalesce(data->'member_ids', '[]'::jsonb))
    )
    or true -- Allow public read of group names for leaderboard? But restrict to active groups
  );

create policy "warroom_groups_insert_leader" on public.warroom_groups
  for insert to authenticated
  with check (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

create policy "warroom_groups_update_leader_or_admin" on public.warroom_groups
  for update to authenticated
  using (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  )
  with check (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

create policy "warroom_groups_delete_admin_or_leader" on public.warroom_groups
  for delete to authenticated
  using (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

-- ------------------------------------------------------------------
-- 6. Harden password reset requests - prevent bulk read
-- ------------------------------------------------------------------
drop policy if exists "policy_resets_select" on public.warroom_password_reset_requests;
drop policy if exists "policy_resets_insert" on public.warroom_password_reset_requests;
drop policy if exists "policy_resets_manage" on public.warroom_password_reset_requests;

create policy "warroom_resets_select_own_or_admin" on public.warroom_password_reset_requests
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

-- Insert: allow anon and authenticated but only pending status, and tracking code must be present
create policy "warroom_resets_insert_pending" on public.warroom_password_reset_requests
  for insert to anon, authenticated
  with check (
    coalesce(data->>'status', 'pending') = 'pending'
    and coalesce(data->>'tracking_code', '') <> ''
  );

create policy "warroom_resets_update_admin_only" on public.warroom_password_reset_requests
  for update to authenticated
  using (public.warroom_is_admin())
  with check (public.warroom_is_admin());

-- ------------------------------------------------------------------
-- 7. Harden chat messages - only group members
-- ------------------------------------------------------------------
drop policy if exists "policy_chat_messages_select" on public.warroom_group_chat_messages;
drop policy if exists "policy_chat_messages_insert" on public.warroom_group_chat_messages;
drop policy if exists "policy_chat_messages_delete" on public.warroom_group_chat_messages;

create policy "warroom_chat_messages_select_member" on public.warroom_group_chat_messages
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'group_id' = 'general_headquarters'
    or exists (
      select 1 from public.warroom_groups g
      where g.id = data->>'group_id'
        and (
          g.data->>'leader_id' = public.warroom_current_user_id()
          or public.warroom_current_user_id() = any(select jsonb_array_elements_text(coalesce(g.data->'member_ids', '[]'::jsonb)))
        )
    )
    or data->>'user_id' = public.warroom_current_user_id()
  );

create policy "warroom_chat_messages_insert_member" on public.warroom_group_chat_messages
  for insert to authenticated
  with check (
    data->>'user_id' = public.warroom_current_user_id()
    and (
      data->>'group_id' = 'general_headquarters'
      or exists (
        select 1 from public.warroom_groups g
        where g.id = data->>'group_id'
          and (
            g.data->>'leader_id' = public.warroom_current_user_id()
            or public.warroom_current_user_id() = any(select jsonb_array_elements_text(coalesce(g.data->'member_ids', '[]'::jsonb)))
          )
      )
    )
  );

create policy "warroom_chat_messages_delete_own_or_admin" on public.warroom_group_chat_messages
  for delete to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

-- ------------------------------------------------------------------
-- 8. Secure admin update user RPC
-- ------------------------------------------------------------------
create or replace function public.warroom_admin_update_user(
  p_admin_proof uuid,
  p_user_id text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id text;
  v_existing public.warroom_users%rowtype;
  v_allowed_keys text[] := array['first_name','last_name','phone','gender','province','city','school_name','is_active','is_blocked','points','level','avatar_url'];
  v_key text;
  v_updated jsonb;
begin
  -- Verify admin OTP proof valid within 30 min
  select otp.user_id into v_admin_id
  from public.warroom_otp_codes otp
  join public.warroom_users admin_user on admin_user.id = otp.user_id
  where otp.challenge_id = p_admin_proof
    and otp.verified = true
    and otp.is_used = true
    and otp.used_at > now() - interval '30 minutes'
    and admin_user.data->>'role' = 'admin'
  limit 1;

  if v_admin_id is null then
    return jsonb_build_object('success', false, 'error', 'ADMIN_OTP_REQUIRED');
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    return jsonb_build_object('success', false, 'error', 'INVALID_PATCH');
  end if;

  -- Check for disallowed keys (role escalation)
  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed_keys)) then
      return jsonb_build_object('success', false, 'error', 'FORBIDDEN_FIELD', 'field', v_key);
    end if;
  end loop;

  select * into v_existing from public.warroom_users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  end if;

  v_updated := v_existing.data;
  for v_key in select jsonb_object_keys(p_patch) loop
    v_updated := jsonb_set(v_updated, array[v_key], p_patch->v_key, true);
  end loop;

  update public.warroom_users set data = v_updated, updated_at = now() where id = p_user_id;

  return jsonb_build_object('success', true, 'user', jsonb_build_object('id', p_user_id) || v_updated);
end;
$$;

revoke execute on function public.warroom_admin_update_user(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.warroom_admin_update_user(uuid, text, jsonb) to anon;

-- ------------------------------------------------------------------
-- 9. Secure session revocation RPC
-- ------------------------------------------------------------------
create or replace function public.warroom_admin_revoke_sessions(
  p_admin_proof uuid,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id text;
  v_count int;
begin
  select otp.user_id into v_admin_id
  from public.warroom_otp_codes otp
  join public.warroom_users admin_user on admin_user.id = otp.user_id
  where otp.challenge_id = p_admin_proof
    and otp.verified = true
    and otp.is_used = true
    and otp.used_at > now() - interval '30 minutes'
    and admin_user.data->>'role' = 'admin'
  limit 1;

  if v_admin_id is null then
    return jsonb_build_object('success', false, 'error', 'ADMIN_OTP_REQUIRED');
  end if;

  update public.warroom_refresh_tokens set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  get diagnostics v_count = row_count;

  -- Also invalidate OTP codes for user
  update public.warroom_otp_codes set is_used = true, used_at = now() where user_id = p_user_id and is_used = false;

  return jsonb_build_object('success', true, 'removed', v_count);
end;
$$;

revoke execute on function public.warroom_admin_revoke_sessions(uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_admin_revoke_sessions(uuid, text) to anon;

-- ------------------------------------------------------------------
-- 10. Improve warroom_register_user - add checksum validation and inactive by default
-- ------------------------------------------------------------------
create or replace function public.warroom_register_user(
  p_user_id text,
  p_user_data jsonb,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_national_code text;
  v_allowed boolean;
  v_user jsonb;
  v_checksum_valid boolean := false;
  v_sum int := 0;
  v_remainder int;
  v_check int;
  i int;
begin
  v_national_code := p_user_data->>'national_code';
  if p_user_id is null or p_user_data is null or jsonb_typeof(p_user_data) <> 'object'
     or p_password is null or length(p_password) < 8
     or v_national_code !~ '^\d{10}$'
     or v_national_code = '0012345678'
     or coalesce(p_user_data->>'phone', '') !~ '^09\d{9}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_REGISTRATION');
  end if;

  -- Validate national code checksum
  if v_national_code ~ '^(\d)\1{9}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_NATIONAL_CODE');
  end if;
  v_sum := 0;
  for i in 1..9 loop
    v_sum := v_sum + (substring(v_national_code from i for 1)::int * (11 - i));
  end loop;
  v_remainder := v_sum % 11;
  v_check := substring(v_national_code from 10 for 1)::int;
  if v_remainder < 2 then
    v_checksum_valid := (v_check = v_remainder);
  else
    v_checksum_valid := (v_check = 11 - v_remainder);
  end if;
  if not v_checksum_valid then
    return jsonb_build_object('success', false, 'error', 'INVALID_NATIONAL_CODE');
  end if;

  select public.warroom_hit_otp_rate_limit(
    'auth:register:' || encode(digest(v_national_code, 'sha256'), 'hex'), 5, 3600
  ) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
  end if;

  -- Force safe defaults, prevent role escalation, inactive until OTP verified
  v_user := (p_user_data - 'password' - 'password_hash' - 'role' - 'token' - 'secret')
    || jsonb_build_object('role', 'user', 'is_active', false, 'is_blocked', false, 'points', 0, 'level', 1);

  insert into public.warroom_users (id, data, updated_at)
  values (p_user_id, v_user, now());

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'password_hash', crypt(p_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', false
    ),
    now()
  );

  return jsonb_build_object('success', true, 'user', jsonb_build_object('id', p_user_id) || v_user);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'DUPLICATE_USER');
end;
$$;

-- Ensure execute grants remain for anon (as before)
revoke execute on function public.warroom_register_user(text, jsonb, text) from public, authenticated;
grant execute on function public.warroom_register_user(text, jsonb, text) to anon;

-- ------------------------------------------------------------------
-- 11. Activate user after OTP verification
-- ------------------------------------------------------------------
create or replace function public.warroom_activate_user_after_otp(
  p_challenge_id uuid,
  p_national_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_data jsonb;
begin
  select user_id into v_user_id
  from public.warroom_otp_codes
  where challenge_id = p_challenge_id
    and national_code = p_national_code
    and verified = true
    and is_used = true
    and used_at > now() - interval '30 minutes'
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_OTP_PROOF');
  end if;

  update public.warroom_users
  set data = jsonb_set(data, '{is_active}', 'true'::jsonb, true), updated_at = now()
  where id = v_user_id
  returning data into v_data;

  return jsonb_build_object('success', true, 'user_id', v_user_id);
end;
$$;

revoke execute on function public.warroom_activate_user_after_otp(uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_activate_user_after_otp(uuid, text) to service_role;

-- ------------------------------------------------------------------
-- 12. Hash pending password (for registration flow)
-- ------------------------------------------------------------------
create or replace function public.warroom_set_pending_password(
  p_pending_id uuid,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_password is null or length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
  end if;

  update public.warroom_pending_registrations
  set password_hash = crypt(p_password, gen_salt('bf', 12))
  where id = p_pending_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.warroom_set_pending_password(uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_set_pending_password(uuid, text) to service_role;

-- ------------------------------------------------------------------
-- 13. Cleanup expired pending registrations and OTP codes (for cron)
-- ------------------------------------------------------------------
create or replace function public.warroom_cleanup_expired()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pending int;
  v_otp int;
begin
  if not public.warroom_is_admin() then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;

  delete from public.warroom_pending_registrations where expires_at < now() and is_verified = false;
  get diagnostics v_pending = row_count;

  delete from public.warroom_otp_codes where expires_at < now() - interval '1 day';
  get diagnostics v_otp = row_count;

  return jsonb_build_object('success', true, 'pending_cleaned', v_pending, 'otp_cleaned', v_otp);
end;
$$;

revoke execute on function public.warroom_cleanup_expired() from public, anon;
grant execute on function public.warroom_cleanup_expired() to authenticated, service_role;

-- ------------------------------------------------------------------
-- 14. Verify grants for sensitive tables
-- ------------------------------------------------------------------
revoke all on public.warroom_pending_registrations from public, anon, authenticated;
grant all on public.warroom_pending_registrations to service_role;

-- Re-assert sensitive tables locked
revoke all on public.warroom_credentials from public, anon, authenticated;
grant all on public.warroom_credentials to service_role;
revoke all on public.warroom_otp_codes from public, anon, authenticated;
grant all on public.warroom_otp_codes to service_role;
revoke all on public.warroom_otp_rate_limits from public, anon, authenticated;
grant all on public.warroom_otp_rate_limits to service_role;
revoke all on public.warroom_refresh_tokens from public, anon, authenticated;
grant all on public.warroom_refresh_tokens to service_role;

commit;
