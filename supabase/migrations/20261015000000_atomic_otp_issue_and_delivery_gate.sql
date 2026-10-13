-- Required: the old invalidate-then-insert sequence is two transactions over PostgREST.
-- This RPC serializes issuances per national code and atomically replaces the old challenge.
-- Apply separately after 20261014000000; no new table or browser privileges.
create or replace function public.warroom_issue_otp_challenge(p_row jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_national text := p_row->>'national_code';
  v_challenge uuid;
  v_subject text := p_row->>'user_id';
  v_phone text := p_row->>'phone';
  v_purpose text := p_row->>'purpose';
begin
  if auth.role() <> 'service_role' then raise exception 'not authorized'; end if;
  if v_national is null or v_subject is null or v_phone is null
     or v_purpose not in ('login', 'registration')
     or (p_row->>'code_hash') !~ '^[0-9a-f]{64}$'
     or (p_row->>'max_attempts')::int not between 3 and 10
     or (p_row->>'expires_at')::timestamptz <= now() then
    raise exception 'invalid challenge';
  end if;
  v_challenge := (p_row->>'challenge_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(v_national, 0));
  update public.warroom_otp_codes
    set is_used = true, used_at = now()
    where national_code = v_national and is_used = false;
  insert into public.warroom_otp_codes
    (challenge_id, user_id, national_code, phone, code_hash, attempt_count,
     max_attempts, expires_at, is_used, ip_hash, purpose, pending_id)
  values
    (v_challenge, v_subject, v_national, v_phone, p_row->>'code_hash', 0,
     (p_row->>'max_attempts')::int, (p_row->>'expires_at')::timestamptz,
     false, p_row->>'ip_hash', v_purpose, (p_row->>'pending_id')::uuid);
end;
$$;
revoke all on function public.warroom_issue_otp_challenge(jsonb) from public, anon, authenticated;
grant execute on function public.warroom_issue_otp_challenge(jsonb) to service_role;

-- A delivery that has not received a provider outbox ID must never be verifiable,
-- even if cleanup after an ambiguous network outcome fails.
create or replace function public.warroom_verify_otp(
  p_challenge_id uuid, p_national_code text, p_code_hash text
)
returns table(result text, user_id text, phone text)
language plpgsql security definer set search_path = public, pg_temp as $$
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
  if auth.role() <> 'service_role' then raise exception 'not authorized'; end if;
  select o.code_hash, o.user_id, o.phone, o.attempt_count, o.max_attempts
  into v_expected_hash, v_user_id, v_phone, v_attempt, v_max_attempts
  from public.warroom_otp_codes o
  where o.challenge_id = p_challenge_id
    and o.national_code = p_national_code
    and o.is_used = false
    and o.sms_message_id is not null
    and o.expires_at > now()
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
      verified = v_match,
      used_at = case when v_match or v_attempt + 1 >= v_max_attempts then now() else used_at end
  where challenge_id = p_challenge_id and national_code = p_national_code;
  if v_match then
    return query select 'valid'::text, v_user_id, v_phone;
  elsif v_attempt + 1 >= v_max_attempts then
    return query select 'locked'::text, null::text, null::text;
  else
    return query select 'invalid'::text, null::text, null::text;
  end if;
end;
$$;
revoke all on function public.warroom_verify_otp(uuid, text, text) from public, anon, authenticated;
grant execute on function public.warroom_verify_otp(uuid, text, text) to service_role;
