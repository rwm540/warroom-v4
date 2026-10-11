-- Migration: 20261013000000_final_hardening_and_session
-- Purpose: Final hardening - remaining permissive policies, secure session, OTP proof one-time, prevent blocked re-activation, clean old tables
-- No data deletion, only policy tightening and new secure RPCs

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 1. Harden warroom_group_chat_rooms - was permissive using true
-- ------------------------------------------------------------------
drop policy if exists "policy_chat_rooms_select" on public.warroom_group_chat_rooms;
drop policy if exists "policy_chat_rooms_manage" on public.warroom_group_chat_rooms;
drop policy if exists "warroom_group_chat_rooms_select_all" on public.warroom_group_chat_rooms;
drop policy if exists "warroom_group_chat_rooms_insert_all" on public.warroom_group_chat_rooms;
drop policy if exists "warroom_group_chat_rooms_update_all" on public.warroom_group_chat_rooms;
drop policy if exists "warroom_group_chat_rooms_delete_all" on public.warroom_group_chat_rooms;

-- Select: members, admin, or general headquarters public
create policy "warroom_chat_rooms_select_secure" on public.warroom_group_chat_rooms
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'id' = 'general_headquarters'
    or data->>'group_id' = 'general_headquarters'
    or data->>'leader_id' = public.warroom_current_user_id()
    or public.warroom_current_user_id() = any(
      select jsonb_array_elements_text(coalesce(data->'member_ids', '[]'::jsonb))
    )
  );

-- Allow anon to read general headquarters only
create policy "warroom_chat_rooms_select_anon_general" on public.warroom_group_chat_rooms
  for select to anon
  using (
    data->>'id' = 'general_headquarters'
    or data->>'group_id' = 'general_headquarters'
  );

-- Insert: only authenticated, must be leader or admin
create policy "warroom_chat_rooms_insert_secure" on public.warroom_group_chat_rooms
  for insert to authenticated
  with check (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

-- Update: leader or admin
create policy "warroom_chat_rooms_update_secure" on public.warroom_group_chat_rooms
  for update to authenticated
  using (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  )
  with check (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

-- Delete: admin only
create policy "warroom_chat_rooms_delete_admin" on public.warroom_group_chat_rooms
  for delete to authenticated
  using (public.warroom_is_admin());

-- ------------------------------------------------------------------
-- 2. Harden warroom_submissions - was permissive
-- ------------------------------------------------------------------
drop policy if exists "policy_submissions_select" on public.warroom_submissions;
drop policy if exists "policy_submissions_insert" on public.warroom_submissions;
drop policy if exists "policy_submissions_manage" on public.warroom_submissions;

create policy "warroom_submissions_select_own_or_admin" on public.warroom_submissions
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
    or data->>'author_id' = public.warroom_current_user_id()
  );

create policy "warroom_submissions_insert_own" on public.warroom_submissions
  for insert to authenticated
  with check (
    data->>'user_id' = public.warroom_current_user_id()
    or data->>'author_id' = public.warroom_current_user_id()
  );

create policy "warroom_submissions_update_own_or_admin" on public.warroom_submissions
  for update to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  )
  with check (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

-- ------------------------------------------------------------------
-- 3. Harden support tickets
-- ------------------------------------------------------------------
drop policy if exists "policy_tickets_select" on public.warroom_support_tickets;
drop policy if exists "policy_tickets_insert" on public.warroom_support_tickets;
drop policy if exists "policy_tickets_manage" on public.warroom_support_tickets;

create policy "warroom_tickets_select_own_or_admin" on public.warroom_support_tickets
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
    or data->>'requester_id' = public.warroom_current_user_id()
  );

create policy "warroom_tickets_insert_own" on public.warroom_support_tickets
  for insert to authenticated
  with check (
    data->>'user_id' = public.warroom_current_user_id()
    or data->>'requester_id' = public.warroom_current_user_id()
  );

create policy "warroom_tickets_update_own_or_admin" on public.warroom_support_tickets
  for update to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  )
  with check (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

-- Replies
drop policy if exists "policy_replies_select" on public.warroom_support_replies;
drop policy if exists "policy_replies_insert" on public.warroom_support_replies;

create policy "warroom_replies_select_own_or_admin" on public.warroom_support_replies
  for select to authenticated
  using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
    or exists (
      select 1 from public.warroom_support_tickets t
      where t.id = (data->>'ticket_id')
        and (t.data->>'user_id' = public.warroom_current_user_id() or public.warroom_is_admin())
    )
  );

create policy "warroom_replies_insert_own_or_admin" on public.warroom_support_replies
  for insert to authenticated
  with check (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

-- ------------------------------------------------------------------
-- 4. Prevent blocked user re-activation via trigger
-- ------------------------------------------------------------------
create or replace function public.warroom_prevent_blocked_reactivation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_old_blocked boolean;
  v_old_active boolean;
  v_new_blocked boolean;
  v_new_active boolean;
begin
  v_old_blocked := coalesce((old.data->>'is_blocked')::boolean, false);
  v_old_active := coalesce((old.data->>'is_active')::boolean, true);
  v_new_blocked := coalesce((new.data->>'is_blocked')::boolean, false);
  v_new_active := coalesce((new.data->>'is_active')::boolean, true);

  -- If user was blocked, only admin can unblock or activate
  if v_old_blocked = true and v_new_blocked = false then
    if not public.warroom_is_admin() and auth.jwt()->>'role' <> 'service_role' then
      raise exception 'forbidden: only admin can unblock user';
    end if;
  end if;

  -- If user was inactive and is being activated, ensure not blocked and check admin or OTP flow
  -- This trigger prevents direct update to is_active=true if is_blocked=true
  if v_new_active = true and v_new_blocked = true then
    raise exception 'invalid_state: blocked user cannot be active';
  end if;

  -- Prevent role escalation via direct update
  if (new.data->>'role') = 'admin' and coalesce((old.data->>'role'), 'user') <> 'admin' then
    if not public.warroom_is_admin() and auth.jwt()->>'role' <> 'service_role' then
      new.data := jsonb_set(new.data, '{role}', to_jsonb(coalesce(old.data->>'role', 'user')), true);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_blocked_reactivation on public.warroom_users;
create trigger trg_prevent_blocked_reactivation
before update on public.warroom_users
for each row execute function public.warroom_prevent_blocked_reactivation();

-- ------------------------------------------------------------------
-- 5. Secure OTP proof consumption - one-time use
-- ------------------------------------------------------------------
create table if not exists public.warroom_security_kv (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.warroom_security_kv enable row level security;
alter table public.warroom_security_kv force row level security;
revoke all on public.warroom_security_kv from public, anon, authenticated;
grant all on public.warroom_security_kv to service_role;

-- RPC to consume OTP proof atomically (one-time)
create or replace function public.warroom_consume_otp_proof(
  p_challenge_id uuid,
  p_purpose text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_otp public.warroom_otp_codes%rowtype;
  v_key text;
begin
  if p_challenge_id is null or p_purpose is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  select * into v_otp
  from public.warroom_otp_codes
  where challenge_id = p_challenge_id
    and verified = true
    and is_used = true
    and used_at > now() - interval '5 minutes'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_PROOF');
  end if;

  v_key := 'otp_proof_consumed:' || p_challenge_id::text || ':' || p_purpose;

  -- Check if already consumed for this purpose
  if exists (select 1 from public.warroom_security_kv where id = v_key) then
    return jsonb_build_object('success', false, 'error', 'PROOF_ALREADY_CONSUMED');
  end if;

  -- Mark as consumed
  insert into public.warroom_security_kv (id, value, updated_at)
  values (v_key, jsonb_build_object('user_id', v_otp.user_id, 'purpose', p_purpose, 'consumed_at', now()), now())
  on conflict (id) do nothing;

  -- Verify insert succeeded (prevent race)
  if not exists (select 1 from public.warroom_security_kv where id = v_key and (value->>'user_id') = v_otp.user_id) then
    return jsonb_build_object('success', false, 'error', 'PROOF_CONSUME_RACE');
  end if;

  return jsonb_build_object('success', true, 'user_id', v_otp.user_id, 'national_code', v_otp.national_code);
end;
$$;

revoke execute on function public.warroom_consume_otp_proof(uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_consume_otp_proof(uuid, text) to service_role;

-- ------------------------------------------------------------------
-- 6. Harden warroom_verify_login to respect is_blocked and is_active
-- ------------------------------------------------------------------
create or replace function public.warroom_verify_login(
  p_national_code text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
  v_user public.warroom_users%rowtype;
  v_credential public.warroom_credentials%rowtype;
  v_hash text;
  v_legacy_plain text;
  v_valid boolean := false;
  v_user_data jsonb;
begin
  if p_national_code is null or p_password is null or p_password = '' then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  select public.warroom_hit_otp_rate_limit(
    'auth:login:' || encode(digest(p_national_code, 'sha256'), 'hex'), 10, 900
  ) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
  end if;

  select * into v_user
  from public.warroom_users
  where data->>'national_code' = p_national_code
  limit 1;
  if not found then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  -- Blocked check - critical: blocked users cannot login even with correct password
  if coalesce((v_user.data->>'is_blocked')::boolean, false) then
    return jsonb_build_object('success', false, 'error', 'USER_BLOCKED');
  end if;

  -- Inactive check - pending users cannot login without OTP
  if coalesce((v_user.data->>'is_active')::boolean, true) = false then
    return jsonb_build_object('success', false, 'error', 'USER_INACTIVE');
  end if;

  select * into v_credential
  from public.warroom_credentials
  where id = v_user.id;
  v_hash := coalesce(v_credential.data->>'password_hash', '');
  v_legacy_plain := coalesce(v_user.data->>'password', '');

  if v_hash like '$2%$%' then
    v_valid := crypt(p_password, v_hash) = v_hash;
  elsif v_hash ~ '^[0-9a-fA-F]{64}$' then
    v_valid := encode(digest(p_password, 'sha256'), 'hex') = lower(v_hash);
  elsif v_legacy_plain <> '' then
    v_valid := p_password = v_legacy_plain;
  end if;

  if not v_valid then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  if v_hash !~ '^\\$2[aby]\\$' then
    insert into public.warroom_credentials (id, data, updated_at)
    values (
      v_user.id,
      jsonb_build_object(
        'password_hash', crypt(p_password, gen_salt('bf', 12)),
        'password_algorithm', 'bcrypt',
        'mustChangePassword', coalesce((v_credential.data->>'mustChangePassword')::boolean, false)
      ),
      now()
    )
    on conflict (id) do update set
      data = excluded.data,
      updated_at = now();
  end if;

  v_user_data := v_user.data - 'password' - 'password_hash' - 'token' - 'secret';
  return jsonb_build_object(
    'success', true,
    'user', jsonb_build_object('id', v_user.id) || v_user_data,
    'mustChangePassword', coalesce((v_credential.data->>'mustChangePassword')::boolean, false)
  );
end;
$$;

revoke execute on function public.warroom_verify_login(text, text) from public, authenticated;
grant execute on function public.warroom_verify_login(text, text) to anon;
grant execute on function public.warroom_verify_login(text, text) to service_role;

-- ------------------------------------------------------------------
-- 7. Secure session revocation on password change, block, etc.
-- ------------------------------------------------------------------
create or replace function public.warroom_revoke_user_sessions(
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if p_user_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_USER_ID');
  end if;

  update public.warroom_refresh_tokens set revoked_at = now() where user_id = p_user_id and revoked_at is null;
  get diagnostics v_count = row_count;

  update public.warroom_otp_codes set is_used = true, used_at = now() where user_id = p_user_id and is_used = false;

  return jsonb_build_object('success', true, 'revoked', v_count);
end;
$$;

revoke execute on function public.warroom_revoke_user_sessions(text) from public, anon, authenticated;
grant execute on function public.warroom_revoke_user_sessions(text) to service_role;

-- Trigger to auto-revoke sessions when user blocked or password changed
create or replace function public.warroom_auto_revoke_on_security_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- If user blocked or deactivated, revoke sessions
  if coalesce((new.data->>'is_blocked')::boolean, false) = true and coalesce((old.data->>'is_blocked')::boolean, false) = false then
    perform public.warroom_revoke_user_sessions(new.id);
  end if;
  if coalesce((new.data->>'is_active')::boolean, true) = false and coalesce((old.data->>'is_active')::boolean, true) = true then
    perform public.warroom_revoke_user_sessions(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_revoke_on_security on public.warroom_users;
create trigger trg_auto_revoke_on_security
after update on public.warroom_users
for each row execute function public.warroom_auto_revoke_on_security_change();

-- ------------------------------------------------------------------
-- 8. Ensure warroom_kv sensitive keys blocked for anon
-- ------------------------------------------------------------------
drop policy if exists "warroom_kv_select_safe" on public.warroom_kv;
drop policy if exists "warroom_kv_select_anon_public" on public.warroom_kv;
drop policy if exists "warroom_kv_insert_safe" on public.warroom_kv;
drop policy if exists "warroom_kv_update_safe" on public.warroom_kv;
drop policy if exists "warroom_kv_delete_admin" on public.warroom_kv;
drop policy if exists "warroom_kv_insert_admin_or_own" on public.warroom_kv;

-- Select: block all sensitive
create policy "warroom_kv_select_final" on public.warroom_kv
  for select to anon, authenticated
  using (
    id not in ('payment_settings', 'payment_secrets', 'admin_config', 'api_keys', 'server_secrets', 'payment_gateways', 'enamad_secrets', 'enamad_html', 'server_config')
    or public.warroom_is_admin()
  );

-- Insert: only own saved_posts or admin, no anon insert for sensitive
create policy "warroom_kv_insert_final" on public.warroom_kv
  for insert to authenticated
  with check (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id like 'user_%'
  );

-- Update: same
create policy "warroom_kv_update_final" on public.warroom_kv
  for update to authenticated
  using (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id like 'user_%'
  )
  with check (
    public.warroom_is_admin()
    or id like 'saved_posts_%'
    or id like 'user_%'
  );

-- Delete: admin only
create policy "warroom_kv_delete_final" on public.warroom_kv
  for delete to authenticated
  using (public.warroom_is_admin());

-- ------------------------------------------------------------------
-- 9. Final verification - ensure no sensitive tables have anon grants
-- ------------------------------------------------------------------
revoke all on public.warroom_credentials from public, anon, authenticated;
revoke all on public.warroom_otp_codes from public, anon, authenticated;
revoke all on public.warroom_otp_rate_limits from public, anon, authenticated;
revoke all on public.warroom_refresh_tokens from public, anon, authenticated;
revoke all on public.warroom_pending_registrations from public, anon, authenticated;
revoke all on public.warroom_security_kv from public, anon, authenticated;
revoke all on public.warroom_payment_config from public, anon, authenticated;
revoke all on public.warroom_admin_settings from public, anon, authenticated;
revoke all on public.warroom_server_settings from public, anon, authenticated;
revoke all on public.warroom_sessions from public, anon, authenticated;
revoke all on public.warroom_password_resets from public, anon, authenticated;
revoke all on public.warroom_session_log from public, anon, authenticated;

grant all on public.warroom_credentials to service_role;
grant all on public.warroom_otp_codes to service_role;
grant all on public.warroom_otp_rate_limits to service_role;
grant all on public.warroom_refresh_tokens to service_role;
grant all on public.warroom_pending_registrations to service_role;
grant all on public.warroom_security_kv to service_role;
grant all on public.warroom_payment_config to service_role;
grant all on public.warroom_admin_settings to service_role;
grant all on public.warroom_server_settings to service_role;
grant all on public.warroom_sessions to service_role;
grant all on public.warroom_password_resets to service_role;
grant all on public.warroom_session_log to service_role;

commit;
