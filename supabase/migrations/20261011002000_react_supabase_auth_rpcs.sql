begin;

-- React calls these Supabase RPCs with the public key. Credentials remain server-side in Postgres.
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
begin
  v_national_code := p_user_data->>'national_code';
  if p_user_id is null or p_user_data is null or jsonb_typeof(p_user_data) <> 'object'
     or p_password is null or length(p_password) < 8
     or v_national_code !~ '^\d{10}$'
     or v_national_code = '0012345678'
     or coalesce(p_user_data->>'phone', '') !~ '^09\d{9}$' then
    return jsonb_build_object('success', false, 'error', 'INVALID_REGISTRATION');
  end if;

  select public.warroom_hit_otp_rate_limit(
    'auth:register:' || encode(digest(v_national_code, 'sha256'), 'hex'), 5, 3600
  ) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
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
  if not found or coalesce((v_user.data->>'is_blocked')::boolean, false) then
    return jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
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

  if v_hash !~ '^\$2[aby]\$' then
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

create or replace function public.warroom_change_password(
  p_national_code text,
  p_current_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_login jsonb;
  v_user_id text;
begin
  if p_new_password is null or length(p_new_password) < 12 then
    return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
  end if;
  v_login := public.warroom_verify_login(p_national_code, p_current_password);
  if coalesce((v_login->>'success')::boolean, false) is not true then
    return jsonb_build_object('success', false, 'error', 'INVALID_CURRENT_PASSWORD');
  end if;
  v_user_id := v_login->'user'->>'id';
  insert into public.warroom_credentials (id, data, updated_at)
  values (
    v_user_id,
    jsonb_build_object(
      'password_hash', crypt(p_new_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', false
    ),
    now()
  )
  on conflict (id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.warroom_admin_set_user_password(
  p_admin_proof uuid,
  p_user_id text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id text;
begin
  if p_new_password is null or length(p_new_password) < 12 then
    return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
  end if;
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
  on conflict (id) do update set data = excluded.data, updated_at = now();

  update public.warroom_refresh_tokens
  set revoked_at = now()
  where user_id = p_user_id and revoked_at is null;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.warroom_admin_list_password_resets(
  p_admin_proof uuid,
  p_status text default 'all',
  p_query text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id text;
  v_requests jsonb;
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
  if v_admin_id is null then return jsonb_build_object('success', false, 'error', 'ADMIN_OTP_REQUIRED'); end if;

  select coalesce(jsonb_agg(request_row.data || jsonb_build_object('id', request_row.id) order by request_row.created_at desc), '[]'::jsonb)
  into v_requests
  from public.warroom_password_reset_requests request_row
  where (p_status is null or p_status = 'all' or request_row.data->>'status' = p_status)
    and (coalesce(p_query, '') = ''
      or request_row.data->>'national_code' ilike '%' || p_query || '%'
      or request_row.data->>'tracking_code' ilike '%' || p_query || '%'
      or request_row.data->>'contact_phone' ilike '%' || p_query || '%');

  return jsonb_build_object(
    'success', true,
    'requests', v_requests,
    'stats', jsonb_build_object(
      'pending', (select count(*) from public.warroom_password_reset_requests where data->>'status' = 'pending'),
      'contacted', (select count(*) from public.warroom_password_reset_requests where data->>'status' = 'contacted'),
      'resolved', (select count(*) from public.warroom_password_reset_requests where data->>'status' = 'resolved'),
      'rejected', (select count(*) from public.warroom_password_reset_requests where data->>'status' = 'rejected')
    )
  );
end;
$$;

create or replace function public.warroom_admin_update_password_reset(
  p_admin_proof uuid,
  p_request_id text,
  p_action text,
  p_password text default '',
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin_id text;
  v_request public.warroom_password_reset_requests%rowtype;
  v_user_id text;
  v_password text := p_password;
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
  if v_admin_id is null then return jsonb_build_object('success', false, 'error', 'ADMIN_OTP_REQUIRED'); end if;

  select * into v_request from public.warroom_password_reset_requests where id = p_request_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'REQUEST_NOT_FOUND'); end if;

  if p_action = 'resolve' then
    if length(v_password) < 8 then return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD'); end if;
    select id into v_user_id from public.warroom_users where data->>'national_code' = v_request.data->>'national_code' limit 1;
    if v_user_id is null then return jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND'); end if;
    insert into public.warroom_credentials (id, data, updated_at)
    values (v_user_id, jsonb_build_object('password_hash', crypt(v_password, gen_salt('bf', 12)), 'password_algorithm', 'bcrypt', 'mustChangePassword', true), now())
    on conflict (id) do update set data = excluded.data, updated_at = now();
    update public.warroom_refresh_tokens set revoked_at = now() where user_id = v_user_id and revoked_at is null;
    v_request.data := v_request.data || jsonb_build_object('status', 'resolved', 'resolved_at', now(), 'admin_note', left(p_note, 500));
    update public.warroom_password_reset_requests set data = v_request.data, updated_at = now() where id = p_request_id;
    return jsonb_build_object('success', true, 'password', v_password, 'status', 'resolved');
  elsif p_action = 'contacted' then
    v_request.data := v_request.data || jsonb_build_object('status', 'contacted', 'contacted_at', now(), 'admin_note', left(p_note, 500));
  elsif p_action = 'reject' then
    v_request.data := v_request.data || jsonb_build_object('status', 'rejected', 'resolved_at', now(), 'rejection_reason', left(p_note, 500));
  else
    return jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  end if;

  update public.warroom_password_reset_requests set data = v_request.data, updated_at = now() where id = p_request_id;
  return jsonb_build_object('success', true, 'status', v_request.data->>'status');
end;
$$;

revoke execute on function public.warroom_register_user(text, jsonb, text) from public, authenticated;
revoke execute on function public.warroom_verify_login(text, text) from public, authenticated;
revoke execute on function public.warroom_change_password(text, text, text) from public, authenticated;
revoke execute on function public.warroom_admin_set_user_password(uuid, text, text) from public, authenticated;
revoke execute on function public.warroom_admin_list_password_resets(uuid, text, text) from public, authenticated;
revoke execute on function public.warroom_admin_update_password_reset(uuid, text, text, text, text) from public, authenticated;
grant execute on function public.warroom_register_user(text, jsonb, text) to anon;
grant execute on function public.warroom_verify_login(text, text) to anon;
grant execute on function public.warroom_change_password(text, text, text) to anon;
grant execute on function public.warroom_admin_set_user_password(uuid, text, text) to anon;
grant execute on function public.warroom_admin_list_password_resets(uuid, text, text) to anon;
grant execute on function public.warroom_admin_update_password_reset(uuid, text, text, text, text) to anon;

commit;
