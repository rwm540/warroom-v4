begin;

-- Apply after 20261011000000_warroom_schema.sql. Never grant these tables to anon.
do $$
declare
  required_table text;
begin
  foreach required_table in array array[
    'warroom_users',
    'warroom_credentials',
    'warroom_otp_codes',
    'warroom_otp_rate_limits',
    'warroom_refresh_tokens'
  ] loop
    if to_regclass(format('public.%I', required_table)) is null then
      raise exception 'Required table public.% does not exist; apply the baseline migration first.', required_table;
    end if;
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from (
      select data->>'national_code' as national_code
      from public.warroom_users
      where coalesce(data->>'national_code', '') <> ''
      group by data->>'national_code'
      having count(*) > 1
      limit 1
    ) duplicates
  ) then
    raise exception 'Duplicate national_code values must be reconciled before applying auth hardening.';
  end if;
end;
$$;

create unique index if not exists idx_warroom_users_national_code_unique
  on public.warroom_users ((data->>'national_code'))
  where coalesce(data->>'national_code', '') <> '';

alter table public.warroom_credentials enable row level security;
alter table public.warroom_credentials force row level security;
alter table public.warroom_otp_codes enable row level security;
alter table public.warroom_otp_codes force row level security;
alter table public.warroom_otp_rate_limits enable row level security;
alter table public.warroom_otp_rate_limits force row level security;
alter table public.warroom_refresh_tokens enable row level security;
alter table public.warroom_refresh_tokens force row level security;

-- Legacy SMS codes are invalidated and scrubbed in place; no column/table/row is dropped.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warroom_otp_codes' and column_name = 'code'
  ) then
    execute $sql$
      update public.warroom_otp_codes
      set is_used = true,
          used_at = coalesce(used_at, now()),
          code = 'retired'
      where code is not null
    $sql$;
    alter table public.warroom_otp_codes alter column code set default 'retired';
  end if;
end;
$$;

revoke all on public.warroom_credentials from public, anon, authenticated;
revoke all on public.warroom_otp_codes from public, anon, authenticated;
revoke all on public.warroom_otp_rate_limits from public, anon, authenticated;
revoke all on public.warroom_refresh_tokens from public, anon, authenticated;

grant all on public.warroom_credentials to service_role;
grant all on public.warroom_otp_codes to service_role;
grant all on public.warroom_otp_rate_limits to service_role;
grant all on public.warroom_refresh_tokens to service_role;

-- Legacy administrator passwords must not remain usable. Keep rows and accounts.
update public.warroom_credentials as credential
set data = credential.data || jsonb_build_object(
  'password_hash', encode(gen_random_bytes(32), 'hex'),
  'password_algorithm', 'reset-required',
  'mustChangePassword', true
)
where credential.id in (
  select id from public.warroom_users where data->>'role' = 'admin'
)
and coalesce(credential.data->>'password_algorithm', '') <> 'scrypt-v1';

update public.warroom_users
set data = data - 'password' - 'password_hash'
where data->>'role' = 'admin'
  and (data ? 'password' or data ? 'password_hash');

create or replace function public.warroom_hit_otp_rate_limit(
  p_id text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed boolean;
begin
  if p_id is null or p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit_arguments';
  end if;

  insert into public.warroom_otp_rate_limits (id, hit_count, window_end, updated_at)
  values (p_id, 1, now() + make_interval(secs => p_window_seconds), now())
  on conflict (id) do update set
    hit_count = case
      when warroom_otp_rate_limits.window_end <= now() then 1
      else warroom_otp_rate_limits.hit_count + 1
    end,
    window_end = case
      when warroom_otp_rate_limits.window_end <= now()
        then now() + make_interval(secs => p_window_seconds)
      else warroom_otp_rate_limits.window_end
    end,
    updated_at = now()
  returning hit_count <= p_max into v_allowed;

  return v_allowed;
end;
$$;

create or replace function public.warroom_consume_refresh_token(p_token_hash text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
begin
  update public.warroom_refresh_tokens
  set revoked_at = now()
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now()
  returning user_id into v_user_id;
  return v_user_id;
end;
$$;

create or replace function public.warroom_verify_otp(
  p_challenge_id uuid,
  p_national_code text,
  p_code_hash text
)
returns table(result text, user_id text, phone text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_hash text;
  v_user_id text;
  v_phone text;
  v_attempt integer;
  v_max_attempts integer;
  v_difference integer := 0;
  v_match boolean := false;
  v_index integer;
begin
  select code_hash, user_id, phone, attempt_count, max_attempts
  into v_expected_hash, v_user_id, v_phone, v_attempt, v_max_attempts
  from public.warroom_otp_codes
  where challenge_id = p_challenge_id
    and national_code = p_national_code
    and is_used = false
    and expires_at > now()
  for update;

  if not found then
    return query select 'missing'::text, null::text, null::text;
    return;
  end if;

  if length(v_expected_hash) = 64 and length(p_code_hash) = 64 then
    for v_index in 1..64 loop
      v_difference := v_difference | (ascii(substr(v_expected_hash, v_index, 1)) # ascii(substr(p_code_hash, v_index, 1)));
    end loop;
    v_match := v_difference = 0;
  end if;

  update public.warroom_otp_codes
  set attempt_count = v_attempt + 1,
      is_used = v_match or v_attempt + 1 >= v_max_attempts,
      used_at = case when v_match or v_attempt + 1 >= v_max_attempts then now() else used_at end
  where challenge_id = p_challenge_id
    and national_code = p_national_code;

  if v_match then
    return query select 'valid'::text, v_user_id, v_phone;
  elsif v_attempt + 1 >= v_max_attempts then
    return query select 'locked'::text, null::text, null::text;
  else
    return query select 'invalid'::text, null::text, null::text;
  end if;
end;
$$;

create or replace function public.warroom_bootstrap_admin(p_user_id text, p_password_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted boolean;
begin
    if p_user_id is null or p_password_hash is null
      or p_password_hash !~ '^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$' then
    raise exception 'invalid_password_hash_format';
  end if;

  insert into public.warroom_credentials (id, data, updated_at)
  select user_row.id,
    jsonb_build_object(
      'password_hash', p_password_hash,
      'password_algorithm', 'scrypt-v1',
      'mustChangePassword', true
    ),
    now()
  from public.warroom_users user_row
  where user_row.id = p_user_id
    and user_row.data->>'role' = 'admin'
  on conflict (id) do update set
    data = excluded.data,
    updated_at = now()
  where public.warroom_credentials.data->>'password_algorithm' = 'reset-required'
  returning true into v_inserted;

  if not found then return false; end if;
  return v_inserted;
end;
$$;

revoke execute on function public.warroom_hit_otp_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.warroom_consume_refresh_token(text) from public, anon, authenticated;
revoke execute on function public.warroom_verify_otp(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_bootstrap_admin(text, text) from public, anon, authenticated;
grant execute on function public.warroom_hit_otp_rate_limit(text, integer, integer) to service_role;
grant execute on function public.warroom_consume_refresh_token(text) to service_role;
grant execute on function public.warroom_verify_otp(uuid, text, text) to service_role;
grant execute on function public.warroom_bootstrap_admin(text, text) to service_role;

drop policy if exists "policy_credentials_select" on public.warroom_credentials;
drop policy if exists "policy_credentials_insert" on public.warroom_credentials;
drop policy if exists "policy_credentials_update" on public.warroom_credentials;
drop policy if exists "policy_otp_no_client" on public.warroom_otp_codes;
drop policy if exists "policy_otp_rate_no_client" on public.warroom_otp_rate_limits;
drop policy if exists "policy_refresh_no_client" on public.warroom_refresh_tokens;

-- Verification: all anon/authenticated privileges must be false; service_role must be true.
select table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'select') as anon_select,
  has_table_privilege('authenticated', format('public.%I', table_name), 'select') as authenticated_select,
  has_table_privilege('service_role', format('public.%I', table_name), 'select') as service_role_select
from (values
  ('warroom_credentials'),
  ('warroom_otp_codes'),
  ('warroom_otp_rate_limits'),
  ('warroom_refresh_tokens')
) as protected(table_name);

commit;
