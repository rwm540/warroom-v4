-- Migration: 20261014000000_post_merge_auth_session_security
-- Purpose (post-merge security remediation):
--   1. Bind OTP proofs to a purpose (login / registration / admin) and consume them with a
--      single atomic statement, so a proof can be used exactly once for exactly one operation.
--   2. Add an atomic "finalize registration" function: pending registration + verify proof +
--      create user + store credentials, all in one transaction, refusing duplicates and never
--      re-activating an account that an administrator disabled.
--   3. Replace the proof-based, anon-executable admin RPCs with service_role-only variants that
--      require a server-verified admin id (the Node server resolves the admin from the HttpOnly
--      session cookie before calling them).
--   4. Revoke the remaining `anon` EXECUTE grants on authentication RPCs.
--
-- This migration is INCREMENTAL and non-destructive: it adds columns, replaces functions and
-- adjusts grants. It contains no data deletion and has NOT been executed in this environment.

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------
-- 1. OTP codes: bind every proof to a purpose and (for registration) to a pending row
-- ------------------------------------------------------------------
alter table public.warroom_otp_codes
  add column if not exists purpose text not null default 'login';

alter table public.warroom_otp_codes
  add column if not exists pending_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'warroom_otp_codes_purpose_check'
      and conrelid = 'public.warroom_otp_codes'::regclass
  ) then
    alter table public.warroom_otp_codes
      add constraint warroom_otp_codes_purpose_check
      check (purpose in ('login', 'registration', 'admin'));
  end if;
end;
$$;

create index if not exists idx_warroom_otp_codes_purpose on public.warroom_otp_codes(purpose);
create index if not exists idx_warroom_otp_codes_pending on public.warroom_otp_codes(pending_id);

-- At most one active pending registration per national code (guarded: skip if legacy
-- duplicates exist so this migration cannot fail on production data).
do $$
begin
  if not exists (
    select 1 from (
      select national_code
      from public.warroom_pending_registrations
      where is_verified = false
      group by national_code
      having count(*) > 1
      limit 1
    ) duplicates
  ) then
    execute 'create unique index if not exists idx_pending_national_active
             on public.warroom_pending_registrations(national_code)
             where is_verified = false';
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 2. Atomic, purpose-bound, one-time OTP proof consumption
-- ------------------------------------------------------------------
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
  v_expected_otp_purpose text;
  v_is_admin boolean := false;
  v_inserted boolean := false;
begin
  if p_challenge_id is null or p_purpose is null or length(p_purpose) = 0 then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  -- The operation must be one we know, and it must map onto the OTP purpose it consumes.
  if p_purpose = 'session:login' then
    v_expected_otp_purpose := 'login';
  elsif p_purpose = 'session:registration' then
    v_expected_otp_purpose := 'registration';
  elsif p_purpose like 'admin:%' then
    v_expected_otp_purpose := 'admin';
  else
    return jsonb_build_object('success', false, 'error', 'PROOF_PURPOSE_MISMATCH');
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

  if coalesce(v_otp.purpose, 'login') <> v_expected_otp_purpose then
    return jsonb_build_object('success', false, 'error', 'PROOF_PURPOSE_MISMATCH');
  end if;

  if v_expected_otp_purpose = 'admin' then
    select coalesce(u.data->>'role', 'user') = 'admin' into v_is_admin
    from public.warroom_users u
    where u.id = v_otp.user_id;
    if not coalesce(v_is_admin, false) then
      return jsonb_build_object('success', false, 'error', 'ADMIN_PROOF_REQUIRED');
    end if;
  end if;

  v_key := 'otp_proof_consumed:' || p_challenge_id::text || ':' || p_purpose;

  insert into public.warroom_security_kv (id, value, updated_at)
  values (
    v_key,
    jsonb_build_object('user_id', v_otp.user_id, 'purpose', p_purpose, 'consumed_at', now()),
    now()
  )
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return jsonb_build_object('success', false, 'error', 'PROOF_ALREADY_CONSUMED');
  end if;

  return jsonb_build_object(
    'success', true,
    'user_id', v_otp.user_id,
    'national_code', v_otp.national_code,
    'pending_id', v_otp.pending_id,
    'purpose', p_purpose
  );
end;
$$;

revoke execute on function public.warroom_consume_otp_proof(uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_consume_otp_proof(uuid, text) to service_role;

-- ------------------------------------------------------------------
-- 3. Internal helper: assert admin by server-verified id
-- ------------------------------------------------------------------
create or replace function public.warroom_is_admin_id(p_admin_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.warroom_users u
    where u.id = p_admin_id
      and coalesce(u.data->>'role', 'user') = 'admin'
      and coalesce((u.data->>'is_blocked')::boolean, false) = false
      and coalesce((u.data->>'is_active')::boolean, true) = true
  );
$$;

revoke execute on function public.warroom_is_admin_id(text) from public, anon, authenticated;
grant execute on function public.warroom_is_admin_id(text) to service_role;

-- ------------------------------------------------------------------
-- 4. Atomic registration finalization (pending -> active user + credentials)
-- ------------------------------------------------------------------
create or replace function public.warroom_finalize_registration(
  p_challenge_id uuid,
  p_pending_id uuid,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_otp public.warroom_otp_codes%rowtype;
  v_pending public.warroom_pending_registrations%rowtype;
  v_existing_id text;
  v_existing_data jsonb;
  v_idempotency_key text;
  v_previous_user_id text;
  v_user_data jsonb;
begin
  if p_challenge_id is null or p_pending_id is null or p_user_id is null or length(p_user_id) = 0 then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  v_idempotency_key := 'registration_finalized:' || p_challenge_id::text;

  -- Idempotent retry of the same challenge returns the user created by the first attempt.
  select (value->>'user_id') into v_previous_user_id
  from public.warroom_security_kv
  where id = v_idempotency_key;
  if v_previous_user_id is not null then
    return jsonb_build_object('success', true, 'user_id', v_previous_user_id, 'idempotent', true);
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

  if coalesce(v_otp.purpose, 'login') <> 'registration' then
    return jsonb_build_object('success', false, 'error', 'PROOF_PURPOSE_MISMATCH');
  end if;

  if v_otp.pending_id is null or v_otp.pending_id <> p_pending_id then
    return jsonb_build_object('success', false, 'error', 'PENDING_MISMATCH');
  end if;

  select * into v_pending
  from public.warroom_pending_registrations
  where id = p_pending_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'PENDING_NOT_FOUND');
  end if;

  if v_pending.is_verified then
    return jsonb_build_object('success', false, 'error', 'PENDING_ALREADY_VERIFIED');
  end if;

  if v_pending.expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'PENDING_EXPIRED');
  end if;

  if v_pending.password_hash is null or v_pending.password_hash = '' then
    return jsonb_build_object('success', false, 'error', 'PENDING_PASSWORD_MISSING');
  end if;

  -- Never create a duplicate account, and never touch an existing (possibly admin-disabled) one.
  select u.id, u.data into v_existing_id, v_existing_data
  from public.warroom_users u
  where u.data->>'national_code' = v_pending.national_code
  limit 1;

  if v_existing_id is not null then
    if coalesce((v_existing_data->>'is_blocked')::boolean, false)
       or coalesce((v_existing_data->>'is_active')::boolean, true) = false then
      return jsonb_build_object('success', false, 'error', 'ACCOUNT_BLOCKED');
    end if;
    return jsonb_build_object('success', false, 'error', 'USER_ALREADY_EXISTS');
  end if;

  -- Server-controlled user data: role/is_active/is_blocked are forced, never taken from the
  -- request body or the pending payload's authority.
  v_user_data := coalesce(v_pending.user_data, '{}'::jsonb)
    - 'password' - 'password_hash' - 'token' - 'secret' - 'role'
    || jsonb_build_object(
         'role', 'user',
         'is_active', true,
         'is_blocked', false,
         'registration_source', 'pending_registration'
       );

  insert into public.warroom_users (id, data, updated_at)
  values (p_user_id, v_user_data, now());

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'password_hash', v_pending.password_hash,
      'password_algorithm', 'bcrypt',
      'mustChangePassword', false
    ),
    now()
  );

  update public.warroom_pending_registrations
  set is_verified = true,
      password_hash = null,
      attempt_count = attempt_count + 1
  where id = p_pending_id;

  insert into public.warroom_security_kv (id, value, updated_at)
  values (
    v_idempotency_key,
    jsonb_build_object('user_id', p_user_id, 'pending_id', p_pending_id, 'finalized_at', now()),
    now()
  )
  on conflict (id) do nothing;

  return jsonb_build_object('success', true, 'user_id', p_user_id);

exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'USER_ALREADY_EXISTS');
end;
$$;

revoke execute on function public.warroom_finalize_registration(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_finalize_registration(uuid, uuid, text) to service_role;

-- ------------------------------------------------------------------
-- 5. Activation helper may no longer revive administrator-disabled accounts
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
    and used_at > now() - interval '5 minutes'
    and coalesce(purpose, 'login') = 'registration'
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_OTP_PROOF');
  end if;

  select data into v_data from public.warroom_users where id = v_user_id;
  if v_data is null then
    return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  end if;

  -- Only accounts explicitly flagged as waiting for activation by the registration pipeline
  -- may be activated. Accounts disabled by an administrator are never re-enabled here.
  if coalesce(v_data->>'pending_activation', 'false') <> 'true' then
    return jsonb_build_object('success', false, 'error', 'ACTIVATION_FORBIDDEN');
  end if;

  if coalesce((v_data->>'is_blocked')::boolean, false) then
    return jsonb_build_object('success', false, 'error', 'USER_BLOCKED');
  end if;

  update public.warroom_users
  set data = jsonb_set(data - 'pending_activation', '{is_active}', 'true'::jsonb, true),
      updated_at = now()
  where id = v_user_id
  returning data into v_data;

  return jsonb_build_object('success', true, 'user_id', v_user_id);
end;
$$;

revoke execute on function public.warroom_activate_user_after_otp(uuid, text) from public, anon, authenticated;
grant execute on function public.warroom_activate_user_after_otp(uuid, text) to service_role;

-- ------------------------------------------------------------------
-- 6. Service-role-only administrative functions (server resolves the admin from the session)
-- ------------------------------------------------------------------
create or replace function public.warroom_admin_update_user_service(
  p_admin_id text,
  p_user_id text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed_keys text[] := array['first_name','last_name','phone','gender','province','city','school_name','is_active','is_blocked','points','level','avatar_url'];
  v_key text;
  v_existing public.warroom_users%rowtype;
  v_updated jsonb;
begin
  if not public.warroom_is_admin_id(p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;
  if p_user_id is null or p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    return jsonb_build_object('success', false, 'error', 'INVALID_PATCH');
  end if;

  for v_key in select jsonb_object_keys(p_patch) loop
    if not (v_key = any(v_allowed_keys)) then
      return jsonb_build_object('success', false, 'error', 'FORBIDDEN_FIELD', 'field', v_key);
    end if;
  end loop;

  select * into v_existing from public.warroom_users where id = p_user_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  end if;

  -- Never allow an operation to produce an impossible state.
  if coalesce((p_patch->>'is_active')::boolean, false)
     and coalesce((p_patch->>'is_blocked')::boolean, coalesce((v_existing.data->>'is_blocked')::boolean, false)) then
    return jsonb_build_object('success', false, 'error', 'INVALID_STATE');
  end if;

  v_updated := v_existing.data;
  for v_key in select jsonb_object_keys(p_patch) loop
    v_updated := jsonb_set(v_updated, array[v_key], p_patch->v_key, true);
  end loop;

  update public.warroom_users set data = v_updated, updated_at = now() where id = p_user_id;

  return jsonb_build_object('success', true, 'user', jsonb_build_object('id', p_user_id) || (v_updated - 'password' - 'password_hash'));
end;
$$;

create or replace function public.warroom_admin_set_user_password_service(
  p_admin_id text,
  p_user_id text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.warroom_is_admin_id(p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;
  if p_user_id is null or p_new_password is null or length(p_new_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
  end if;
  if not exists (select 1 from public.warroom_users where id = p_user_id) then
    return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  end if;

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'password_hash', crypt(p_new_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', true
    ),
    now()
  )
  on conflict (id) do update set
    data = jsonb_build_object(
      'password_hash', crypt(p_new_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', true
    ),
    updated_at = now();

  perform public.warroom_revoke_user_sessions(p_user_id);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.warroom_admin_create_user_service(
  p_admin_id text,
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
  v_user jsonb;
begin
  if not public.warroom_is_admin_id(p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;
  if p_user_id is null or p_user_data is null or jsonb_typeof(p_user_data) <> 'object'
     or p_password is null or length(p_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'INVALID_REGISTRATION');
  end if;

  v_national_code := p_user_data->>'national_code';
  if v_national_code !~ '^\d{10}$' or coalesce(p_user_data->>'phone', '') !~ '^09\d{9}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_REGISTRATION');
  end if;

  v_user := (p_user_data - 'password' - 'password_hash' - 'role' - 'token' - 'secret')
    || jsonb_build_object('role', 'user', 'is_active', true, 'is_blocked', false);

  insert into public.warroom_users (id, data, updated_at)
  values (p_user_id, v_user, now());

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'password_hash', crypt(p_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', true
    ),
    now()
  );

  return jsonb_build_object('success', true, 'user', jsonb_build_object('id', p_user_id) || v_user);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'DUPLICATE_USER');
end;
$$;

create or replace function public.warroom_admin_list_password_resets_service(
  p_admin_id text,
  p_status text,
  p_query text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requests jsonb;
  v_stats jsonb;
begin
  if not public.warroom_is_admin_id(p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id) || data order by created_at desc), '[]'::jsonb)
  into v_requests
  from public.warroom_password_reset_requests
  where (coalesce(p_status, 'all') = 'all' or data->>'status' = p_status)
    and (
      coalesce(p_query, '') = ''
      or data->>'tracking_code' ilike '%' || p_query || '%'
      or data->>'national_code' ilike '%' || p_query || '%'
      or data->>'full_name' ilike '%' || p_query || '%'
      or data->>'contact_phone' ilike '%' || p_query || '%'
    );

  select jsonb_build_object(
    'pending', count(*) filter (where data->>'status' = 'pending'),
    'contacted', count(*) filter (where data->>'status' = 'contacted'),
    'resolved', count(*) filter (where data->>'status' = 'resolved'),
    'rejected', count(*) filter (where data->>'status' = 'rejected'),
    'all', count(*)
  )
  into v_stats
  from public.warroom_password_reset_requests;

  return jsonb_build_object('success', true, 'requests', coalesce(v_requests, '[]'::jsonb), 'stats', v_stats);
end;
$$;

create or replace function public.warroom_admin_update_password_reset_service(
  p_admin_id text,
  p_request_id text,
  p_action text,
  p_password text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.warroom_password_reset_requests%rowtype;
  v_status text;
  v_user_id text;
  v_data jsonb;
  v_allowed boolean := false;
begin
  if not public.warroom_is_admin_id(p_admin_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;
  if p_request_id is null or p_action is null then
    return jsonb_build_object('success', false, 'error', 'INVALID_INPUT');
  end if;

  select * into v_row from public.warroom_password_reset_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'REQUEST_NOT_FOUND');
  end if;

  v_status := v_row.data->>'status';
  v_user_id := v_row.data->>'user_id';
  v_data := v_row.data;

  if p_action = 'contacted' then
    if v_status <> 'pending' then
      return jsonb_build_object('success', false, 'error', 'INVALID_STATE');
    end if;
    v_data := jsonb_set(v_data, '{status}', '"contacted"', true)
      || jsonb_build_object('admin_note', coalesce(p_note, ''), 'contacted_at', now(), 'handled_by', p_admin_id);
  elsif p_action = 'reject' then
    if v_status = 'resolved' then
      return jsonb_build_object('success', false, 'error', 'INVALID_STATE');
    end if;
    v_data := jsonb_set(v_data, '{status}', '"rejected"', true)
      || jsonb_build_object('admin_note', coalesce(p_note, ''), 'resolved_at', now(), 'handled_by', p_admin_id);
  elsif p_action = 'resolve' then
    if v_status = 'resolved' then
      return jsonb_build_object('success', false, 'error', 'INVALID_STATE');
    end if;
    if p_password is null or length(p_password) < 8 then
      return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
    end if;
    if v_user_id is null or not exists (select 1 from public.warroom_users where id = v_user_id) then
      return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
    end if;

    insert into public.warroom_credentials (id, data, updated_at)
    values (
      v_user_id,
      jsonb_build_object(
        'password_hash', crypt(p_password, gen_salt('bf', 12)),
        'password_algorithm', 'bcrypt',
        'mustChangePassword', true
      ),
      now()
    )
    on conflict (id) do update set
      data = jsonb_build_object(
        'password_hash', crypt(p_password, gen_salt('bf', 12)),
        'password_algorithm', 'bcrypt',
        'mustChangePassword', true
      ),
      updated_at = now();

    perform public.warroom_revoke_user_sessions(v_user_id);

    v_data := jsonb_set(v_data, '{status}', '"resolved"', true)
      || jsonb_build_object('admin_note', coalesce(p_note, ''), 'resolved_at', now(), 'handled_by', p_admin_id);
  else
    return jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  end if;

  update public.warroom_password_reset_requests
  set data = v_data, updated_at = now()
  where id = p_request_id;

  return jsonb_build_object('success', true, 'status', v_data->>'status');
end;
$$;

create or replace function public.warroom_change_password_service(
  p_user_id text,
  p_current_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user public.warroom_users%rowtype;
  v_credential public.warroom_credentials%rowtype;
  v_hash text;
  v_legacy_plain text;
  v_valid boolean := false;
begin
  if p_user_id is null or p_current_password is null or p_new_password is null or length(p_new_password) < 8 then
    return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
  end if;

  select * into v_user from public.warroom_users where id = p_user_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  end if;

  select * into v_credential from public.warroom_credentials where id = p_user_id;
  v_hash := coalesce(v_credential.data->>'password_hash', '');
  v_legacy_plain := coalesce(v_user.data->>'password', '');

  if v_hash like '$2%$%' then
    v_valid := crypt(p_current_password, v_hash) = v_hash;
  elsif v_hash ~ '^[0-9a-fA-F]{64}$' then
    v_valid := encode(digest(p_current_password, 'sha256'), 'hex') = lower(v_hash);
  elsif v_legacy_plain <> '' then
    v_valid := p_current_password = v_legacy_plain;
  end if;

  if not v_valid then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  end if;

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    p_user_id,
    jsonb_build_object(
      'password_hash', crypt(p_new_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', false
    ),
    now()
  )
  on conflict (id) do update set
    data = jsonb_build_object(
      'password_hash', crypt(p_new_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', false
    ),
    updated_at = now();

  -- Any password change invalidates every existing session for that user.
  perform public.warroom_revoke_user_sessions(p_user_id);

  return jsonb_build_object('success', true);
end;
$$;

revoke execute on function public.warroom_admin_update_user_service(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.warroom_admin_set_user_password_service(text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_create_user_service(text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_list_password_resets_service(text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_update_password_reset_service(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_change_password_service(text, text, text) from public, anon, authenticated;

grant execute on function public.warroom_admin_update_user_service(text, text, jsonb) to service_role;
grant execute on function public.warroom_admin_set_user_password_service(text, text, text) to service_role;
grant execute on function public.warroom_admin_create_user_service(text, text, jsonb, text) to service_role;
grant execute on function public.warroom_admin_list_password_resets_service(text, text, text) to service_role;
grant execute on function public.warroom_admin_update_password_reset_service(text, text, text, text, text) to service_role;
grant execute on function public.warroom_change_password_service(text, text, text) to service_role;

-- ------------------------------------------------------------------
-- 7. Remove client (anon/authenticated) access to authentication RPCs
-- ------------------------------------------------------------------
revoke execute on function public.warroom_register_user(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.warroom_verify_login(text, text) from public, anon, authenticated;
revoke execute on function public.warroom_change_password(text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_update_user(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.warroom_admin_revoke_sessions(uuid, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_set_user_password(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_list_password_resets(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_admin_update_password_reset(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_hit_otp_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.warroom_verify_otp(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_consume_otp_proof(uuid, text) from public, anon, authenticated;
revoke execute on function public.warroom_finalize_registration(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.warroom_set_pending_password(uuid, text) from public, anon, authenticated;
revoke execute on function public.warroom_revoke_user_sessions(text) from public, anon, authenticated;
revoke execute on function public.warroom_activate_user_after_otp(uuid, text) from public, anon, authenticated;
revoke execute on function public.warroom_cleanup_expired() from anon;

grant execute on function public.warroom_register_user(text, jsonb, text) to service_role;
grant execute on function public.warroom_verify_login(text, text) to service_role;
grant execute on function public.warroom_change_password(text, text, text) to service_role;
grant execute on function public.warroom_hit_otp_rate_limit(text, integer, integer) to service_role;
grant execute on function public.warroom_verify_otp(uuid, text, text) to service_role;
grant execute on function public.warroom_set_pending_password(uuid, text) to service_role;
grant execute on function public.warroom_revoke_user_sessions(text) to service_role;

-- ------------------------------------------------------------------
-- 8. Sensitive tables: re-assert the least-privilege posture
-- ------------------------------------------------------------------
revoke all on public.warroom_otp_codes from public, anon, authenticated;
revoke all on public.warroom_security_kv from public, anon, authenticated;
revoke all on public.warroom_pending_registrations from public, anon, authenticated;
revoke all on public.warroom_refresh_tokens from public, anon, authenticated;
revoke all on public.warroom_credentials from public, anon, authenticated;
revoke all on public.warroom_otp_rate_limits from public, anon, authenticated;

grant all on public.warroom_otp_codes to service_role;
grant all on public.warroom_security_kv to service_role;
grant all on public.warroom_pending_registrations to service_role;
grant all on public.warroom_refresh_tokens to service_role;
grant all on public.warroom_credentials to service_role;
grant all on public.warroom_otp_rate_limits to service_role;

commit;

-- ============================================================================
-- Verification queries (read-only, safe to run after applying):
--   select proname, proacl from pg_proc where proname in (
--     'warroom_verify_login','warroom_register_user','warroom_consume_otp_proof',
--     'warroom_finalize_registration','warroom_admin_update_user_service');
--   select has_function_privilege('anon','public.warroom_verify_login(text,text)','execute');
--   select column_name from information_schema.columns
--     where table_name = 'warroom_otp_codes' and column_name in ('purpose','pending_id');
-- Behaviours that still require an integration test on a disposable database:
--   * concurrent warroom_consume_otp_proof calls for one challenge,
--   * concurrent warroom_finalize_registration calls for one pending registration,
--   * row-level locks under real Postgres isolation levels.
-- ============================================================================
