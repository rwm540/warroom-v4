begin;

-- ============================================================================
--  ایجاد حساب اعضای زیرگروه در لحظهٔ ساخت زیرگروه از داخل چت‌روم
-- ============================================================================
--  مسیر اجرا:
--    GroupChatPanel (دکمهٔ «تشکیل/مدیریت جوخه»)
--      → SquadManagementModal
--        → POST /api/squads            (سرور Node، کلید service_role)
--        → POST /api/squads/:id/members
--          → public.warroom_create_squad()
--          → public.warroom_provision_squad_members()
--
--  هویت سرگروه هرگز از بدنهٔ درخواست خوانده نمی‌شود؛ سرور آن را از «گواهی نشست»
--  (challenge_id همان OTP که هنگام ورود تأیید شده) استخراج می‌کند. leader_id،
--  group_id و role ارسالی کلاینت اعتبار ندارند.
--
--  همهٔ توابع زیر فقط به service_role اعطا می‌شوند؛ کلید عمومی مرورگر هیچ دسترسی
--  اجرایی به آن‌ها ندارد.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ۱) اصلاح تریگر پاک‌سازی دادهٔ کاربر
-- ----------------------------------------------------------------------------
-- مشکل: این تریگر با نقش فراخوان اجرا می‌شد، اما digest() را صدا می‌زد (که
-- در مهاجرت پایه execute آن از public/anon/authenticated لغو شده) و در
-- warroom_credentials می‌نوشت (که دسترسی anon/authenticated به آن کاملاً لغو
-- شده است). نتیجه: هر نوشتن کاربر از مرورگر که فیلد password داشت با خطای
-- 42501 شکست می‌خورد و رکورد عضو هرگز در پایگاه داده ثبت نمی‌شد.
--
-- مشکل دوم: لایهٔ React رمز را پیش‌تر با SHA-256 هش می‌کرد و این تریگر همان
-- هگز را دوباره هش می‌کرد؛ یعنی sha256(sha256(password)) ذخیره می‌شد که
-- warroom_verify_login() هرگز نمی‌توانست آن را تطبیق دهد.
create or replace function public.warroom_sanitize_user_data()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw_pass text;
  v_hash_pass text;
begin
  if new.data is not null then
    v_raw_pass := coalesce(new.data->>'password', new.data->>'rawPassword', '');
    v_hash_pass := coalesce(new.data->>'password_hash', '');

    if v_hash_pass = '' and v_raw_pass <> '' then
      if v_raw_pass ~ '^[0-9a-fA-F]{64}$' then
        -- Already a SHA-256 digest coming from normalizeRowForDb(); store it as-is
        -- so warroom_verify_login() can match it and upgrade it to bcrypt on login.
        v_hash_pass := lower(v_raw_pass);
      else
        v_hash_pass := encode(digest(v_raw_pass, 'sha256'), 'hex');
      end if;
    end if;

    if v_hash_pass <> '' then
      insert into public.warroom_credentials (id, data, updated_at)
      values (
        new.id,
        jsonb_build_object('password_hash', v_hash_pass, 'mustChangePassword', false),
        now()
      )
      on conflict (id) do update set
        data = public.warroom_credentials.data - 'password_algorithm'
               || jsonb_build_object('password_hash', v_hash_pass),
        updated_at = now();
    end if;

    new.data = new.data - 'password' - 'password_hash' - 'token' - 'rawPassword' - 'pass' - 'secret';

    if (new.data->>'role') = 'admin' then
      if auth.jwt() ->> 'role' <> 'service_role' and not exists (
        select 1 from public.warroom_users u
        where (u.auth_user_id = auth.uid() or (auth.uid() is not null and u.id = auth.uid()::text))
          and coalesce(u.data->>'role', '') = 'admin'
      ) then
        new.data = jsonb_set(new.data, '{role}', '"user"'::jsonb, true);
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- ۲) کمکی‌های هویت و اختیار (همه بر پایهٔ «بازیگر»، نه نقش اتصال)
-- ----------------------------------------------------------------------------

-- استخراج بازیگر از گواهی نشست OTP تأییدشده (همان الگوی p_admin_proof توابع مدیریتی).
create or replace function public.warroom_actor_id_from_proof(p_proof uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  -- p_proof is supplied only by Node after validating the HttpOnly session cookie,
  -- and is the opaque primary key of the active server-side session row.
  select s.user_id::text
  from public.warroom_refresh_tokens s
  where s.id = p_proof
    and s.revoked_at is null
    and s.expires_at > now()
  limit 1;
$$;

-- نقش ادمین از روی رکورد خود بازیگر. warroom_is_admin() به نقش اتصال نگاه می‌کند
-- و چون سرور Node همیشه با service_role وصل می‌شود، برای این بررسی بی‌فایده است.
create or replace function public.warroom_actor_is_admin(p_actor_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_actor_id is not null and exists (
    select 1
    from public.warroom_users u
    where u.id = p_actor_id
      and coalesce(u.data->>'role', '') = 'admin'
      and coalesce((u.data->>'is_blocked')::boolean, false) = false
  );
$$;

create or replace function public.warroom_can_manage_squad(p_actor_id text, p_squad_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_actor_id is not null and (
    public.warroom_actor_is_admin(p_actor_id)
    or exists (
      select 1
      from public.warroom_groups g
      where g.id = p_squad_id
        and g.data->>'leader_id' = p_actor_id
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- ۳) ساخت زیرگروه
-- ----------------------------------------------------------------------------
create or replace function public.warroom_create_squad(
  p_proof uuid,
  p_name text,
  p_parent_squad_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id text;
  v_actor jsonb;
  v_allowed boolean;
  v_name text;
  v_parent_id text := nullif(trim(coalesce(p_parent_squad_id, '')), '');
  v_owned integer;
  v_squad_id text;
  v_squad jsonb;
  v_leader_patch jsonb;
begin
  v_actor_id := public.warroom_actor_id_from_proof(p_proof);
  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_PROOF_EXPIRED');
  end if;

  select u.data into v_actor from public.warroom_users u where u.id = v_actor_id;
  if v_actor is null then
    return jsonb_build_object('success', false, 'error', 'ACTOR_NOT_FOUND');
  end if;
  if coalesce((v_actor->>'is_blocked')::boolean, false)
     or coalesce((v_actor->>'is_active')::boolean, true) = false then
    return jsonb_build_object('success', false, 'error', 'ACCOUNT_BLOCKED');
  end if;

  v_name := trim(coalesce(p_name, ''));
  if length(v_name) < 2 or length(v_name) > 60 then
    return jsonb_build_object('success', false, 'error', 'INVALID_SQUAD_NAME');
  end if;

  select public.warroom_hit_otp_rate_limit('squad:create:' || v_actor_id, 10, 3600) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
  end if;

  if v_parent_id is not null then
    if not exists (select 1 from public.warroom_groups p where p.id = v_parent_id) then
      return jsonb_build_object('success', false, 'error', 'PARENT_SQUAD_NOT_FOUND');
    end if;
    if not public.warroom_can_manage_squad(v_actor_id, v_parent_id) then
      return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
    end if;
    if exists (
      select 1 from public.warroom_groups p
      where p.id = v_parent_id and coalesce(p.data->>'status', 'active') = 'merged'
    ) then
      return jsonb_build_object('success', false, 'error', 'PARENT_SQUAD_MERGED');
    end if;
  end if;

  select count(*) into v_owned
  from public.warroom_groups g
  where g.data->>'leader_id' = v_actor_id;
  if v_owned >= 5 and not public.warroom_actor_is_admin(v_actor_id) then
    return jsonb_build_object('success', false, 'error', 'SQUAD_LIMIT_REACHED');
  end if;

  v_squad_id := 'g-' || encode(gen_random_bytes(8), 'hex');

  v_squad := jsonb_build_object(
    'id', v_squad_id,
    'name', v_name,
    -- leader_id is always the authenticated actor; anything sent by the client is ignored.
    'leader_id', v_actor_id,
    'members_count', 1,
    'member_ids', jsonb_build_array(v_actor_id),
    'education_level', coalesce(nullif(trim(coalesce(p_metadata->>'education_level', '')), ''), v_actor->>'education_level', 'متوسطه دوم'),
    'gender', coalesce(nullif(trim(coalesce(p_metadata->>'gender', '')), ''), v_actor->>'gender', 'پسر'),
    'province', coalesce(nullif(trim(coalesce(p_metadata->>'province', '')), ''), v_actor->>'province', 'تهران'),
    'city', coalesce(nullif(trim(coalesce(p_metadata->>'city', '')), ''), v_actor->>'city', 'تهران'),
    'registration_code', 'REG-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 5)),
    'created_at', to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'max_members', least(6, greatest(2, coalesce((p_metadata->>'max_members')::integer, 6))),
    'status', 'active'
  );

  if v_parent_id is not null then
    v_squad := v_squad || jsonb_build_object('parent_group_id', v_parent_id);
  end if;

  insert into public.warroom_groups (id, data, updated_at)
  values (v_squad_id, v_squad, now());

  if v_parent_id is not null then
    insert into public.warroom_squad_hierarchy (child_squad_id, parent_squad_id, status)
    values (v_squad_id, v_parent_id, 'active')
    on conflict (child_squad_id) do update
      set parent_squad_id = excluded.parent_squad_id,
          status = 'active',
          updated_at = now();
  else
    -- Primary squad: the commander now belongs to the squad they just created.
    v_leader_patch := jsonb_build_object(
      'group_id', v_squad_id,
      'is_group_member', false,
      'squad_rank', 'commander'
    );
    if coalesce(v_actor->>'role', '') <> 'admin' then
      v_leader_patch := v_leader_patch || jsonb_build_object('role', 'leader');
    end if;

    update public.warroom_users
      set data = data || v_leader_patch, updated_at = now()
      where id = v_actor_id;
  end if;

  insert into public.warroom_audit_log (id, data, created_at)
  values (
    'audit-' || encode(gen_random_bytes(8), 'hex'),
    jsonb_build_object(
      'event', 'squad.created',
      'level', 'security',
      'source', 'server',
      'actorId', v_actor_id,
      'squadId', v_squad_id,
      'parentSquadId', v_parent_id
    ),
    now()
  );

  return jsonb_build_object('success', true, 'squad', v_squad);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'DUPLICATE_SQUAD');
end;
$$;

-- ----------------------------------------------------------------------------
-- ۴) ساخت حساب اعضای زیرگروه (اتمیک)
-- ----------------------------------------------------------------------------
-- هر عضو یک رکورد مستقل در warroom_users و یک رکورد اعتبارنامهٔ bcrypt در
-- warroom_credentials می‌گیرد. رمز هرگز در warroom_users، لاگ یا خروجی تابع
-- ذخیره/برگردانده نمی‌شود. اگر حتی یک عضو نامعتبر باشد، کل تابع با استثنا
-- برگردانده می‌شود و هیچ حساب ناقصی باقی نمی‌ماند.
create or replace function public.warroom_provision_squad_members(
  p_proof uuid,
  p_squad_id text,
  p_members jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id text;
  v_allowed boolean;
  v_squad_row public.warroom_groups%rowtype;
  v_squad jsonb;
  v_max_members integer;
  v_member_ids jsonb;
  v_index integer;
  v_member jsonb;
  v_plan jsonb := '[]'::jsonb;
  v_results jsonb := '[]'::jsonb;
  v_first_name text;
  v_last_name text;
  v_national_code text;
  v_phone text;
  v_rank text;
  v_password text;
  v_existing_id text;
  v_existing jsonb;
  v_user_id text;
  v_status text;
  v_new_accounts integer := 0;
  v_linked integer := 0;
  v_unchanged integer := 0;
  v_error text;
  v_persian_digits text := '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩';
  v_latin_digits text := '01234567890123456789';
begin
  v_actor_id := public.warroom_actor_id_from_proof(p_proof);
  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_PROOF_EXPIRED');
  end if;

  if jsonb_typeof(p_members) <> 'array' or jsonb_array_length(p_members) = 0 then
    return jsonb_build_object('success', false, 'error', 'NO_MEMBERS');
  end if;
  if jsonb_array_length(p_members) > 6 then
    return jsonb_build_object('success', false, 'error', 'TOO_MANY_MEMBERS');
  end if;

  select public.warroom_hit_otp_rate_limit('squad:provision:' || v_actor_id, 20, 900) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
  end if;

  select * into v_squad_row
  from public.warroom_groups
  where id = p_squad_id
  for update;
  if not found then
    return jsonb_build_object('success', false, 'error', 'SQUAD_NOT_FOUND');
  end if;
  if not public.warroom_can_manage_squad(v_actor_id, p_squad_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;

  v_squad := v_squad_row.data;
  v_max_members := least(6, greatest(2, coalesce((v_squad->>'max_members')::integer, 6)));
  v_member_ids := coalesce(v_squad->'member_ids', '[]'::jsonb);

  -- ------------------------------------------------------------------
  -- فاز ۱: اعتبارسنجی کامل پیش از نوشتن هر رکورد
  -- ------------------------------------------------------------------
  for v_index in 0 .. jsonb_array_length(p_members) - 1 loop
    v_member := p_members->v_index;
    v_first_name := btrim(coalesce(v_member->>'first_name', ''));
    v_last_name := btrim(coalesce(v_member->>'last_name', ''));
    v_national_code := translate(coalesce(v_member->>'national_code', ''), v_persian_digits, v_latin_digits);
    v_phone := translate(coalesce(v_member->>'phone', ''), v_persian_digits, v_latin_digits);
    v_rank := coalesce(nullif(btrim(coalesce(v_member->>'squad_rank', '')), ''), 'soldier');
    v_password := coalesce(v_member->>'password', '');

    if v_first_name = '' or v_last_name = ''
       or length(v_first_name) > 60 or length(v_last_name) > 60 then
      raise exception 'INVALID_MEMBER_NAME:%', v_index;
    end if;
    if v_national_code !~ '^\d{10}$' or v_national_code = '0012345678' then
      raise exception 'INVALID_NATIONAL_CODE:%', v_index;
    end if;
    if v_phone !~ '^09\d{9}$' then
      raise exception 'INVALID_PHONE:%', v_index;
    end if;
    if v_rank not in ('soldier', 'farmando', 'jokhedar', 'commander') then
      raise exception 'INVALID_RANK:%', v_index;
    end if;
    -- Duplicate national codes inside a single submission would race the unique index.
    if v_plan @> jsonb_build_array(jsonb_build_object('national_code', v_national_code)) then
      raise exception 'DUPLICATE_MEMBER_IN_REQUEST:%', v_index;
    end if;

    select id, data into v_existing_id, v_existing
    from public.warroom_users
    where data->>'national_code' = v_national_code
    limit 1;

    if v_existing_id is null then
      -- Brand new account: the Node layer supplies a strong initial password
      -- (generated server-side when the leader leaves the field blank).
      if length(v_password) < 8 or length(v_password) > 128
         or v_password !~ '[A-Za-z]' or v_password !~ '\d' or v_password ~ '\s' then
        raise exception 'WEAK_PASSWORD:%', v_index;
      end if;
      v_new_accounts := v_new_accounts + 1;
      v_status := 'created';
    else
      if coalesce((v_existing->>'is_blocked')::boolean, false) then
        raise exception 'ACCOUNT_BLOCKED:%', v_index;
      end if;
      -- An account already exists: never create a second one and never touch its
      -- password. Only refresh the membership when this actor is allowed to.
      if coalesce(v_existing->>'group_id', '') = p_squad_id
         and coalesce(v_existing->>'squad_rank', 'soldier') = v_rank then
        v_status := 'unchanged';
        v_unchanged := v_unchanged + 1;
      else
        if coalesce(v_existing->>'group_id', '') <> ''
           and not public.warroom_can_manage_squad(v_actor_id, v_existing->>'group_id')
           and not public.warroom_actor_is_admin(v_actor_id) then
          raise exception 'MEMBER_BELONGS_TO_OTHER_SQUAD:%', v_index;
        end if;
        v_status := 'linked';
        v_linked := v_linked + 1;
      end if;
    end if;

    v_plan := v_plan || jsonb_build_object(
      'first_name', v_first_name,
      'last_name', v_last_name,
      'national_code', v_national_code,
      'phone', v_phone,
      'squad_rank', v_rank,
      'birth_date', btrim(coalesce(v_member->>'birth_date', '')),
      'grade', btrim(coalesce(v_member->>'grade', '')),
      'gender', coalesce(nullif(btrim(coalesce(v_member->>'gender', '')), ''), v_squad->>'gender', 'پسر'),
      'status', v_status,
      'existing_user_id', coalesce(v_existing_id, ''),
      'password', case when v_status = 'created' then v_password else '' end
    );
  end loop;

  if jsonb_array_length(v_member_ids) + v_new_accounts + v_linked > v_max_members then
    raise exception 'SQUAD_FULL';
  end if;

  -- ------------------------------------------------------------------
  -- فاز ۲: اعمال تغییرات
  -- ------------------------------------------------------------------
  for v_index in 0 .. jsonb_array_length(v_plan) - 1 loop
    v_member := v_plan->v_index;
    v_status := v_member->>'status';
    v_national_code := v_member->>'national_code';
    v_rank := v_member->>'squad_rank';

    if v_status = 'created' then
      v_user_id := 'u-' || encode(gen_random_bytes(8), 'hex');

      insert into public.warroom_users (id, data, updated_at)
      values (
        v_user_id,
        jsonb_build_object(
          'id', v_user_id,
          'first_name', v_member->>'first_name',
          'last_name', v_member->>'last_name',
          'national_code', v_national_code,
          'phone', v_member->>'phone',
          'birth_date', coalesce(nullif(v_member->>'birth_date', ''), ''),
          'grade', coalesce(nullif(v_member->>'grade', ''), ''),
          'gender', coalesce(nullif(v_member->>'gender', ''), 'پسر'),
          'education_level', coalesce(nullif(v_squad->>'education_level', ''), 'متوسطه دوم'),
          'province', coalesce(v_squad->>'province', ''),
          'city', coalesce(v_squad->>'city', ''),
          'school_name', coalesce(v_squad->>'school_name', ''),
          'personal_code', 'WR-' || lpad((floor(random() * 900000) + 100000)::integer::text, 6, '0'),
          'avatar_url', case
            when coalesce(nullif(v_member->>'gender', ''), 'پسر') = 'دختر'
              then '/images/avatar/woman/woman_1.jpeg'
            else '/images/avatar/male/male_1.jpeg'
          end,
          -- A squad member is never promoted to leader/admin by this path.
          'role', case when v_rank = 'commander' then 'leader'
                       when v_rank = 'soldier' then 'member'
                       else 'user' end,
          'squad_rank', v_rank,
          'group_id', p_squad_id,
          'is_group_member', true,
          'is_active', true,
          'is_blocked', false,
          'level', 1,
          'points', 100,
          'completed_stages', '[]'::jsonb,
          'credentials_status', 'provisioned',
          'provisioned_by', v_actor_id,
          'provisioned_at', to_char((now() at time zone 'utc'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        ),
        now()
      );

      insert into public.warroom_credentials (id, data, updated_at)
      values (
        v_user_id,
        jsonb_build_object(
          'password_hash', crypt(v_member->>'password', gen_salt('bf', 12)),
          'password_algorithm', 'bcrypt',
          'mustChangePassword', true
        ),
        now()
      )
      on conflict (id) do update set data = excluded.data, updated_at = now();
    elsif v_status = 'linked' then
      v_user_id := v_member->>'existing_user_id';
      update public.warroom_users
        set data = data || jsonb_build_object(
              'group_id', p_squad_id,
              'is_group_member', true,
              'squad_rank', v_rank
            ),
            updated_at = now()
        where id = v_user_id;
    else
      v_user_id := v_member->>'existing_user_id';
    end if;

    if not (v_member_ids @> jsonb_build_array(v_user_id)) then
      v_member_ids := v_member_ids || jsonb_build_array(v_user_id);
    end if;

    v_results := v_results || jsonb_build_object(
      'national_code', v_national_code,
      'login_id', v_national_code,
      'user_id', v_user_id,
      'status', v_status,
      'squad_rank', v_rank,
      'must_change_password', (v_status = 'created')
    );
  end loop;

  v_squad := v_squad || jsonb_build_object(
    'member_ids', v_member_ids,
    'members_count', jsonb_array_length(v_member_ids)
  );
  update public.warroom_groups
    set data = v_squad, updated_at = now()
    where id = p_squad_id;

  insert into public.warroom_audit_log (id, data, created_at)
  values (
    'audit-' || encode(gen_random_bytes(8), 'hex'),
    jsonb_build_object(
      'event', 'squad.members_provisioned',
      'level', 'security',
      'source', 'server',
      'actorId', v_actor_id,
      'squadId', p_squad_id,
      'created', v_new_accounts,
      'linked', v_linked,
      'unchanged', v_unchanged
    ),
    now()
  );

  -- The plaintext password is deliberately absent from this payload.
  return jsonb_build_object(
    'success', true,
    'squad', v_squad,
    'members', v_results,
    'summary', jsonb_build_object(
      'created', v_new_accounts,
      'linked', v_linked,
      'unchanged', v_unchanged
    )
  );
exception
  when unique_violation then
    -- Reaching this handler rolls the whole function back, so a rejected member
    -- never leaves a half-created account behind.
    return jsonb_build_object('success', false, 'error', 'DUPLICATE_MEMBER');
  when others then
    v_error := sqlerrm;
    -- Only our own sentinel messages are translated; anything else propagates.
    if v_error ~ '^[A-Z][A-Z_]+(:[0-9]+)?$' then
      return jsonb_build_object(
        'success', false,
        'error', split_part(v_error, ':', 1),
        'index', case when position(':' in v_error) > 0
                      then split_part(v_error, ':', 2)::integer
                      else null end
      );
    end if;
    raise;
end;
$$;

-- ----------------------------------------------------------------------------
-- ۵) تعیین/بازنشانی رمز اولیهٔ عضوی که اعتبارنامهٔ معتبر ندارد
-- ----------------------------------------------------------------------------
-- برای اعضای قدیمی که پیش از این اصلاح فقط در warroom_users نوشته شده بودند.
-- رمز حدس زده نمی‌شود؛ سرگروه (یا ادمین) رمز جدیدی صادر می‌کند و عضو در نخستین
-- ورود ملزم به تغییر آن است.
create or replace function public.warroom_reissue_squad_member_password(
  p_proof uuid,
  p_squad_id text,
  p_national_code text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id text;
  v_allowed boolean;
  v_user_id text;
  v_group_id text;
  v_target_role text;
begin
  v_actor_id := public.warroom_actor_id_from_proof(p_proof);
  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_PROOF_EXPIRED');
  end if;
  if not public.warroom_can_manage_squad(v_actor_id, p_squad_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;
  if p_new_password is null or length(p_new_password) < 12 or length(p_new_password) > 128
     or p_new_password !~ '[A-Za-z]' or p_new_password !~ '\d' or p_new_password ~ '\s' then
    return jsonb_build_object('success', false, 'error', 'WEAK_PASSWORD');
  end if;

  select public.warroom_hit_otp_rate_limit('squad:reissue:' || v_actor_id, 10, 900) into v_allowed;
  if not v_allowed then
    return jsonb_build_object('success', false, 'error', 'RATE_LIMITED');
  end if;

  select id, data->>'group_id', coalesce(data->>'role', 'user') into v_user_id, v_group_id, v_target_role
  from public.warroom_users
  where data->>'national_code' = p_national_code
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'MEMBER_NOT_FOUND');
  end if;
  if coalesce(v_group_id, '') <> p_squad_id then
    return jsonb_build_object('success', false, 'error', 'NOT_A_SQUAD_MEMBER');
  end if;
  -- A squad leader may never hand out a password for a commander/admin account,
  -- including one that ended up inside their squad after a merge.
  if v_target_role in ('admin', 'leader') and not public.warroom_actor_is_admin(v_actor_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    v_user_id,
    jsonb_build_object(
      'password_hash', crypt(p_new_password, gen_salt('bf', 12)),
      'password_algorithm', 'bcrypt',
      'mustChangePassword', true
    ),
    now()
  )
  on conflict (id) do update set data = excluded.data, updated_at = now();

  update public.warroom_users
    set data = data - 'password' - 'password_hash'
               || jsonb_build_object('credentials_status', 'provisioned'),
        updated_at = now()
    where id = v_user_id;

  update public.warroom_refresh_tokens
    set revoked_at = now()
    where user_id = v_user_id and revoked_at is null;

  insert into public.warroom_audit_log (id, data, created_at)
  values (
    'audit-' || encode(gen_random_bytes(8), 'hex'),
    jsonb_build_object(
      'event', 'squad.member_password_reissued',
      'level', 'security',
      'source', 'server',
      'actorId', v_actor_id,
      'squadId', p_squad_id,
      'targetUserId', v_user_id
    ),
    now()
  );

  return jsonb_build_object('success', true, 'user_id', v_user_id);
end;
$$;

-- ----------------------------------------------------------------------------
-- ۶) وضعیت اعتبارنامهٔ اعضای یک زیرگروه (بدون نشت PII اضافی)
-- ----------------------------------------------------------------------------
create or replace function public.warroom_squad_member_credential_status(
  p_proof uuid,
  p_squad_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id text;
  v_members jsonb;
begin
  v_actor_id := public.warroom_actor_id_from_proof(p_proof);
  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error', 'SESSION_PROOF_EXPIRED');
  end if;
  if not public.warroom_can_manage_squad(v_actor_id, p_squad_id) then
    return jsonb_build_object('success', false, 'error', 'FORBIDDEN');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', u.id,
           'login_id', u.data->>'national_code',
           'full_name', trim(coalesce(u.data->>'first_name', '') || ' ' || coalesce(u.data->>'last_name', '')),
           'squad_rank', coalesce(u.data->>'squad_rank', 'soldier'),
           'role', coalesce(u.data->>'role', 'user'),
           'has_credentials', credential_row.id is not null,
           'password_algorithm', credential_row.data->>'password_algorithm',
           'must_change_password', coalesce((credential_row.data->>'mustChangePassword')::boolean, false)
         ) order by u.data->>'last_name'), '[]'::jsonb)
  into v_members
  from public.warroom_users u
  left join public.warroom_credentials credential_row on credential_row.id = u.id
  where u.data->>'group_id' = p_squad_id;

  return jsonb_build_object('success', true, 'members', coalesce(v_members, '[]'::jsonb));
end;
$$;

-- ----------------------------------------------------------------------------
-- ۷) مهاجرت داده‌های قدیمی: فقط نشانه‌گذاری، بدون حذف و بدون حدس رمز
-- ----------------------------------------------------------------------------
-- اعضای ساخته‌شدهٔ پیشین که رکورد اعتبارنامه ندارند علامت می‌خورند تا سرگروه
-- بتواند از مسیر امن «تعیین رمز اولیه» برای آن‌ها رمز صادر کند.
update public.warroom_users u
  set data = u.data || jsonb_build_object('credentials_status', 'legacy_missing_credential'),
      updated_at = now()
  where coalesce(u.data->>'national_code', '') <> ''
    and coalesce(u.data->>'credentials_status', '') not in ('provisioned', 'legacy_missing_credential')
    and not exists (
      select 1 from public.warroom_credentials c
      where c.id = u.id
        and coalesce(c.data->>'password_hash', '') <> ''
    );

update public.warroom_users u
  set data = u.data || jsonb_build_object('credentials_status', 'provisioned'),
      updated_at = now()
  where coalesce(u.data->>'credentials_status', '') = ''
    and exists (
      select 1 from public.warroom_credentials c
      where c.id = u.id
        and coalesce(c.data->>'password_hash', '') <> ''
    );

-- ----------------------------------------------------------------------------
-- ۸) مجوزها: فقط سرور Node (service_role)
-- ----------------------------------------------------------------------------
revoke execute on function public.warroom_actor_id_from_proof(uuid) from public, anon, authenticated;
revoke execute on function public.warroom_actor_is_admin(text) from public, anon, authenticated;
revoke execute on function public.warroom_can_manage_squad(text, text) from public, anon, authenticated;
revoke execute on function public.warroom_create_squad(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.warroom_provision_squad_members(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.warroom_reissue_squad_member_password(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_squad_member_credential_status(uuid, text) from public, anon, authenticated;

grant execute on function public.warroom_create_squad(uuid, text, text, jsonb) to service_role;
grant execute on function public.warroom_provision_squad_members(uuid, text, jsonb) to service_role;
grant execute on function public.warroom_reissue_squad_member_password(uuid, text, text, text) to service_role;
grant execute on function public.warroom_squad_member_credential_status(uuid, text) to service_role;

commit;
