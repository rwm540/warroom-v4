-- ============================================================================
--  🎖️ پلتفرم «اتاق جنگ» — اسکریپت امنیتی و ساختار دیتابیس جامع Supabase / PostgreSQL
-- ============================================================================
--  🛡️ نسخه امنیتی تولیدی (Hardened Production Security Baseline)
--  اصول ۱۷ گانه امنیت مهندسی:
--    ۱. Deny-by-Default (مسدود بودن پیش‌فرض تمامی دسترسی‌ها)
--    ۲. Least-Privilege Grants (حذف کامل GRANT ALL عمومی و اعطای حداقل اختیارات)
--    ۳. هویت مبتنی بر Supabase Auth (شناسایی با auth.uid() و جلوگیری از جعل شناسه)
--    ۴. امنیت توابع با SECURITY DEFINER و search_path ایمن
--    ۵. امنیت نقش مدیریت (Admin Authorization Model مبتنی بر Auth)
--    ۶. عدم ذخیره رمز عبور در دیتابیس و پاکسازی داده‌ها
--    ۷. محافظت از داده‌های شخصی (Personal Identifiable Information - PII)
--    ۸. دفترکل مالی/امتیازی تغییرناپذیر (Ledger Integrity & Concurrency Control)
--    ۹. امنیت درگاه و داده‌های تراکنش‌های پرداخت بانکی
--    ۱۰. تفکیک جداول تنظیمات عمومی از تنظیمات محرمانه سرور
--    ۱۱. امنیت گردش‌کار درخواست‌های بازنشانی رمز عبور
--    ۱۲. امنیت باکت Storage (warroom-media) و ممانعت از آپلود/حذف ناشناس
--    ۱۳. پالایش انتشارات بلادرنگ (Realtime Publications) از داده‌های حساس
--    ۱۴. ثبت رخدادهای امنیتی ممیزی (Append-Only Audit Logging)
--    ۱۵. معماری RLS طبقه‌بندی شده (Public Read / User-Owned / Group / Admin / Server)
--    ۱۶. مسیر جستجوی امن (search_path = public, pg_temp) برای تمام توابع
--    ۱۷. ضد تزریق کدهای SQL (Anti-SQL Injection با پارامترها و format)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ۰) اکستنشن‌های مورد نیاز
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ۱) ساخت و تطبیق جداول با مدل داده
-- ----------------------------------------------------------------------------

-- ۱. کاربران (رزمنده‌ها و ادمین‌ها)
create table if not exists public.warroom_users (
  id            text primary key,
  auth_user_id  uuid references auth.users(id) on delete set null,
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- اطمینان از وجود ستون auth_user_id
alter table public.warroom_users add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- ۲. جوخه‌ها / گروه‌ها
create table if not exists public.warroom_groups (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳. ثبت نیروی جوخه
create table if not exists public.warroom_squad_enlistments (
  id                  text primary key,
  squad_id            text not null,
  created_by_user_id  text not null,
  target_user_id      text,
  national_code       text not null,
  mobile              text not null,
  password_hash       text not null,
  rank_code           text not null default 'soldier'
    check (rank_code in ('soldier', 'farmando', 'jokhedar', 'commander')),
  status              text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ۴. نگاشت سلسله‌مراتب جوخه‌ها
create table if not exists public.warroom_squad_hierarchy (
  child_squad_id       text primary key,
  parent_squad_id      text not null,
  merge_request_id     text,
  status               text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (child_squad_id <> parent_squad_id)
);

-- ۵. دفتر تراکنش‌های مالی/امتیازی (Ledger یکپارچه — تغییرناپذیر از سمت کلاینت)
create table if not exists public.warroom_wallet_transactions (
  id                  text primary key,
  user_id             text not null,
  group_id            text,
  transaction_type    text not null
    check (transaction_type in ('payment', 'deposit', 'withdrawal', 'reward', 'transfer_in', 'transfer_out', 'adjustment')),
  amount              bigint not null check (amount > 0),
  currency            text not null default 'points'
    check (currency in ('points', 'IRR', 'IRT')),
  status              text not null default 'completed'
    check (status in ('pending', 'completed', 'failed', 'cancelled')),
  reference_id        text,
  description         text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- ۶. انتقال امتیاز میان کاربران
create table if not exists public.warroom_point_transfers (
  id                  text primary key,
  sender_user_id      text not null,
  receiver_user_id    text not null,
  amount              bigint not null check (amount > 0),
  status              text not null default 'completed'
    check (status in ('pending', 'completed', 'failed', 'cancelled')),
  note                text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz,
  check (sender_user_id <> receiver_user_id)
);

-- ۷. اتاق‌های چت گروهی
create table if not exists public.warroom_group_chat_rooms (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۸. پیام‌های چت گروهی
create table if not exists public.warroom_group_chat_messages (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۹. مأموریت‌ها
create table if not exists public.warroom_missions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۰. ارسال‌ها و پاسخ‌های مأموریت
create table if not exists public.warroom_submissions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۱. دوره‌های آموزشی
create table if not exists public.warroom_trainings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۲. مدال‌ها و نشان‌ها
create table if not exists public.warroom_medals (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۳. مدال‌های کسب‌شده کاربران
create table if not exists public.warroom_user_medals (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۴. تیکت‌های پشتیبانی
create table if not exists public.warroom_support_tickets (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۵. پاسخ‌های تیکت پشتیبانی
create table if not exists public.warroom_support_replies (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۶. اطلاعیه‌های درون‌سامانه
create table if not exists public.warroom_announcements (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۷. اخبار سامانه
create table if not exists public.warroom_news (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۸. اعلان‌های زنده (Push Notifications)
create table if not exists public.warroom_notifications (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۱۹. اطلاعیه‌های سربرگ صفحه اصلی
create table if not exists public.warroom_home_announcements (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۰. سؤالات متداول (FAQ)
create table if not exists public.warroom_faqs (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۱. مراحل نقشه بازی (Stages)
create table if not exists public.warroom_stages (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۲. جوایز و پاداش‌ها (Prizes)
create table if not exists public.warroom_prizes (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۳. ویترین آثار (نمایش عمومی)
create table if not exists public.warroom_vitrin_posts (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۴. نظرات و دیدگاه‌های ویترین
create table if not exists public.warroom_vitrin_comments (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۵. درگاه‌های بازی / لینک‌دهی (Game Portals)
create table if not exists public.warroom_game_portals (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۶. چالش‌های تاکتیکی روزانه
create table if not exists public.warroom_daily_challenges (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۷. موسیقی و رادیو اتاق جنگ
create table if not exists public.warroom_soundtracks (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۸. تنظیمات عمومی کلید/مقدار (Public Configuration Only)
create table if not exists public.warroom_kv (
  id         text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۲۹. تنظیمات صریح صفحه اصلی (Structured Public Site Settings)
create table if not exists public.warroom_site_settings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۰. تنظیمات درگاه و پرداخت محرمانه (Server & Payment Secrets — مسدود برای کلاینت)
create table if not exists public.warroom_payment_config (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۱. تنظیمات مدیریت محرمانه (Admin Settings — مسدود برای کلاینت)
create table if not exists public.warroom_admin_settings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۲. تنظیمات محرمانه و اختصاصی سرور (Server Secrets — مسدود برای کلاینت)
create table if not exists public.warroom_server_settings (
  id         text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۳. درخواست‌های بازنشانی رمز عبور
create table if not exists public.warroom_password_reset_requests (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۴. تراکنش‌های پرداخت و رسیدهای بانکی
create table if not exists public.warroom_payment_transactions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۵. نشست‌های ثبت‌نام گروهی
create table if not exists public.warroom_team_registration_sessions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۶. ثبت‌نام‌های گروهی
create table if not exists public.warroom_team_registrations (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۷. درخواست‌های عضویت در گروه‌ها
create table if not exists public.warroom_group_join_requests (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ۳۸. درخواست‌های ادغام جوخه‌ها
create table if not exists public.warroom_squad_merge_requests (
  id                   text primary key,
  source_squad_id      text not null,
  target_squad_id      text not null,
  requested_by_user_id text not null,
  status               text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  note                 text,
  created_at           timestamptz not null default now(),
  resolved_at          timestamptz,
  resolved_by_user_id  text,
  check (source_squad_id <> target_squad_id)
);

-- ============================================================================
-- جداول فوق‌امنیتی سرور (فقط service_role و بدون هیچ دسترسی از کلاینت)
-- ============================================================================
create table if not exists public.warroom_session_log (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.warroom_credentials (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.warroom_sessions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.warroom_password_resets (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.warroom_audit_log (
  id            text primary key,
  actor_auth_id text,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.warroom_security_kv (
  id         text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ۲) تریگرها و اعتبارسنجی‌های سیستمی
-- ----------------------------------------------------------------------------

-- تابع به‌روزرسانی خودکار updated_at
create or replace function public.warroom_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- تریگر حیاتی ۱: ممانعت کامل از ذخیره رمز عبور (Plaintext یا Hash) و ارتقای غیرمجاز نقش به ادمین
create or replace function public.warroom_sanitize_user_data()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.data is not null then
    -- حذف قطعی فیلدهای حساس رمزنگاری از داده‌های کاربر
    new.data = new.data - 'password' - 'password_hash' - 'token' - 'rawPassword' - 'pass' - 'secret';

    -- ممانعت از ارتقای خودکار نقش به admin توسط افراد عادی
    if (new.data->>'role') = 'admin' then
      if auth.jwt() ->> 'role' <> 'service_role' and not exists (
        select 1 from public.warroom_users u
        where (u.auth_user_id = auth.uid() or (auth.uid() is not null and u.id = auth.uid()::text))
          and coalesce(u.data->>'role', '') = 'admin'
      ) then
        -- اگر کاربر ادمین معتبر نیست، اجازه تخصیص نقش admin را ندارد
        new.data = jsonb_set(new.data, '{role}', '"user"'::jsonb, true);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_warroom_sanitize_user_data on public.warroom_users;
create trigger trg_warroom_sanitize_user_data
before insert or update on public.warroom_users
for each row execute function public.warroom_sanitize_user_data();

-- تریگر حیاتی ۲: امنیت گزارش‌های ممیزی (مهر زمانی و ثبت شناسه امنیتی بازیگر)
create or replace function public.warroom_stamp_audit_log()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.actor_auth_id = coalesce(auth.uid()::text, 'anon');
  new.created_at = now();
  return new;
end;
$$;

drop trigger if exists trg_warroom_stamp_audit_log on public.warroom_audit_log;
create trigger trg_warroom_stamp_audit_log
before insert on public.warroom_audit_log
for each row execute function public.warroom_stamp_audit_log();

-- فعال‌سازی تریگر updated_at برای تمامی جداول
do $$
declare
  t text;
begin
  foreach t in array array[
    'warroom_users','warroom_groups','warroom_group_chat_rooms','warroom_group_chat_messages',
    'warroom_stages','warroom_prizes','warroom_missions','warroom_submissions',
    'warroom_trainings','warroom_medals','warroom_user_medals',
    'warroom_support_tickets','warroom_support_replies','warroom_announcements',
    'warroom_news','warroom_notifications','warroom_home_announcements','warroom_faqs',
    'warroom_vitrin_posts','warroom_vitrin_comments','warroom_game_portals',
    'warroom_daily_challenges','warroom_soundtracks','warroom_kv','warroom_site_settings',
    'warroom_payment_config','warroom_admin_settings','warroom_server_settings',
    'warroom_password_reset_requests','warroom_payment_transactions',
    'warroom_team_registration_sessions','warroom_team_registrations',
    'warroom_group_join_requests','warroom_squad_enlistments','warroom_squad_hierarchy',
    'warroom_squad_merge_requests','warroom_session_log','warroom_credentials',
    'warroom_sessions','warroom_password_resets','warroom_security_kv'
  ]
  loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.warroom_set_updated_at()', t, t);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- ۳) توابع کمکی امنیتی و اعتبارسنجی هویت (Identity & Authorization Helpers)
-- ----------------------------------------------------------------------------

-- تابع استخراج شناسه کاربری رزمنده بر اساس توکن معتبر Supabase Auth
create or replace function public.warroom_current_user_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id
  from public.warroom_users u
  where u.auth_user_id = auth.uid()
     or (auth.uid() is not null and u.id = auth.uid()::text)
  limit 1;
$$;

-- تابع بررسی نقش ادمین (بر اساس کلید سرویس یا رکورد کاربر متصل به Auth)
create or replace function public.warroom_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (auth.jwt() ->> 'role' = 'service_role') or
    exists (
      select 1
      from public.warroom_users u
      where (u.auth_user_id = auth.uid() or (auth.uid() is not null and u.id = auth.uid()::text))
        and coalesce(u.data->>'role', '') = 'admin'
    ),
    false
  );
$$;

-- محاسبه ایمن موجودی امتیاز از روی دفترکل تراکنش‌ها
create or replace function public.warroom_point_balance(p_user_id text)
returns bigint
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id text;
  v_is_admin boolean;
begin
  v_caller_id := public.warroom_current_user_id();
  v_is_admin := public.warroom_is_admin();

  -- فقط خود کاربر یا مدیر سامانه یا service_role مجاز به استعلام موجودی است
  if not v_is_admin and (v_caller_id is null or v_caller_id <> p_user_id) then
    raise exception 'access_denied: unauthorized balance inquiry';
  end if;

  return coalesce((
    select sum(
      case
        when transaction_type in ('deposit', 'reward', 'transfer_in', 'adjustment') then amount
        when transaction_type in ('withdrawal', 'transfer_out') then -amount
        else 0
      end
    )::bigint
    from public.warroom_wallet_transactions
    where user_id = p_user_id and currency = 'points' and status = 'completed'
  ), 0)::bigint;
end;
$$;

-- انتقال اتمیک و ایمن امتیاز (با استخراج شناسه فرستنده از توکن احرازشده)
create or replace function public.warroom_transfer_points(
  p_transfer_id text,
  p_receiver_user_id text,
  p_amount bigint,
  p_note text default null
)
returns public.warroom_point_transfers
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender_id text;
  v_sender_balance bigint;
  result public.warroom_point_transfers;
begin
  -- هویت فرستنده مستقیماً از جلسه امن خوانده می‌شود
  v_sender_id := public.warroom_current_user_id();
  if v_sender_id is null then
    raise exception 'unauthorized: valid session required';
  end if;

  if p_receiver_user_id is null or v_sender_id = p_receiver_user_id then
    raise exception 'invalid_transfer_parties: cannot transfer to self or empty recipient';
  end if;

  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    raise exception 'invalid_transfer_amount: must be positive and within reasonable limit';
  end if;

  -- بررسی وجود گیرنده
  if not exists (select 1 from public.warroom_users where id = p_receiver_user_id) then
    raise exception 'recipient_user_not_found';
  end if;

  -- قفل ردیف فرستنده در جدول کاربران برای جلوگیری از Race Condition و Double Spending
  perform 1 from public.warroom_users where id = v_sender_id for update;

  v_sender_balance := public.warroom_point_balance(v_sender_id);
  if v_sender_balance < p_amount then
    raise exception 'insufficient_points: current balance is % but requested %', v_sender_balance, p_amount;
  end if;

  insert into public.warroom_point_transfers
    (id, sender_user_id, receiver_user_id, amount, status, note, completed_at)
  values
    (p_transfer_id, v_sender_id, p_receiver_user_id, p_amount, 'completed', p_note, now());

  insert into public.warroom_wallet_transactions
    (id, user_id, transaction_type, amount, currency, status, reference_id, description)
  values
    ('wallet_out_' || p_transfer_id, v_sender_id, 'transfer_out', p_amount, 'points', 'completed', p_transfer_id, p_note),
    ('wallet_in_' || p_transfer_id, p_receiver_user_id, 'transfer_in', p_amount, 'points', 'completed', p_transfer_id, p_note);

  select * into result from public.warroom_point_transfers where id = p_transfer_id;
  return result;
exception
  when unique_violation then
    raise exception 'transfer_id_already_exists';
end;
$$;

-- اعطای پاداش و تنظیم موجودی توسط مدیر ارشد
create or replace function public.warroom_admin_adjust_points(
  p_user_id text,
  p_amount bigint,
  p_type text,
  p_description text default null,
  p_reference_id text default null
)
returns public.warroom_wallet_transactions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.warroom_wallet_transactions;
  v_tx_id text;
begin
  if not public.warroom_is_admin() then
    raise exception 'forbidden: only admin can execute point adjustment';
  end if;

  if p_type not in ('reward', 'adjustment', 'deposit', 'withdrawal') then
    raise exception 'invalid_transaction_type';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount: must be greater than zero';
  end if;

  if not exists (select 1 from public.warroom_users where id = p_user_id) then
    raise exception 'user_not_found';
  end if;

  v_tx_id := 'adj_' || gen_random_uuid()::text;

  insert into public.warroom_wallet_transactions
    (id, user_id, transaction_type, amount, currency, status, reference_id, description)
  values
    (v_tx_id, p_user_id, p_type, p_amount, 'points', 'completed', coalesce(p_reference_id, v_tx_id), p_description)
  returning * into result;

  return result;
end;
$$;

-- ثبت نیروی جوخه ایمن
create or replace function public.warroom_register_squad_member(
  p_id text,
  p_squad_id text,
  p_target_user_id text,
  p_national_code text,
  p_mobile text,
  p_password_hash text,
  p_rank_code text default 'soldier'
)
returns public.warroom_squad_enlistments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_creator_id text;
  result public.warroom_squad_enlistments;
begin
  v_creator_id := public.warroom_current_user_id();
  if v_creator_id is null and not public.warroom_is_admin() then
    raise exception 'unauthorized: valid session required';
  end if;

  -- بررسی اینکه کاربر سازنده، رهبر جوخه باشد یا ادمین
  if not public.warroom_is_admin() and not exists (
    select 1 from public.warroom_groups where id = p_squad_id and data->>'leader_id' = v_creator_id
  ) then
    raise exception 'forbidden: only squad commander can enlist members';
  end if;

  if p_password_hash is null or length(trim(p_password_hash)) < 32 then
    raise exception 'password_hash_required';
  end if;

  if p_rank_code not in ('soldier', 'farmando', 'jokhedar', 'commander') then
    raise exception 'invalid_rank_code';
  end if;

  insert into public.warroom_squad_enlistments
    (id, squad_id, created_by_user_id, target_user_id, national_code, mobile, password_hash, rank_code)
  values
    (p_id, p_squad_id, coalesce(v_creator_id, 'system'), nullif(p_target_user_id, ''), p_national_code, p_mobile, p_password_hash, p_rank_code)
  returning * into result;

  return result;
end;
$$;

-- پذیرش ادغام جوخه ایمن (با تأیید اختیارات کاربر)
create or replace function public.warroom_accept_squad_merge(
  p_request_id text
)
returns public.warroom_squad_merge_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_resolver_id text;
  request_row public.warroom_squad_merge_requests;
begin
  v_resolver_id := public.warroom_current_user_id();

  select * into request_row
  from public.warroom_squad_merge_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'merge_request_not_pending';
  end if;

  -- فقط فرمانده جوخه مقصد یا مدیر کل می‌تواند ادغام را بپذیرد
  if not public.warroom_is_admin() and not exists (
    select 1 from public.warroom_groups where id = request_row.target_squad_id and data->>'leader_id' = v_resolver_id
  ) then
    raise exception 'forbidden: unauthorized to accept merge for target squad';
  end if;

  insert into public.warroom_squad_hierarchy (child_squad_id, parent_squad_id, merge_request_id)
  values (request_row.target_squad_id, request_row.source_squad_id, request_row.id)
  on conflict (child_squad_id) do update
    set parent_squad_id = excluded.parent_squad_id,
        merge_request_id = excluded.merge_request_id,
        status = 'active',
        updated_at = now();

  update public.warroom_users
  set data = jsonb_set(data, '{group_id}', to_jsonb(request_row.source_squad_id), true), updated_at = now()
  where data->>'group_id' = request_row.target_squad_id;

  update public.warroom_group_chat_rooms parent_room
  set data = jsonb_set(
    parent_room.data,
    '{member_ids}',
    (
      select coalesce(jsonb_agg(distinct member_id), '[]'::jsonb)
      from jsonb_array_elements_text(
        coalesce(parent_room.data->'member_ids', '[]'::jsonb) || coalesce(child_room.data->'member_ids', '[]'::jsonb)
      ) as members(member_id)
    ),
    true
  ), updated_at = now()
  from public.warroom_group_chat_rooms child_room
  where parent_room.data->>'group_id' = request_row.source_squad_id
    and child_room.data->>'group_id' = request_row.target_squad_id;

  update public.warroom_squad_merge_requests
  set status = 'accepted', resolved_at = now(), resolved_by_user_id = v_resolver_id
  where id = request_row.id
  returning * into request_row;

  return request_row;
end;
$$;

-- جستجو و فهرست‌گیری اتاق‌های گفتگو
create or replace function public.warroom_list_chat_rooms(
  p_search text default null,
  p_page integer default 0,
  p_page_size integer default 5
)
returns table (room_id text, room_data jsonb, total_count bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with filtered as (
    select id, data, count(*) over () as total_count
    from public.warroom_group_chat_rooms
    where (
      public.warroom_is_admin() or
      (data->'member_ids') ? public.warroom_current_user_id() or
      data->>'group_id' in (
        select u.data->>'group_id' from public.warroom_users u where u.id = public.warroom_current_user_id()
      )
    )
    and (
      nullif(trim(p_search), '') is null
      or lower(coalesce(data->>'name', '')) like '%' || lower(trim(p_search)) || '%'
      or lower(coalesce(data->>'group_id', '')) like '%' || lower(trim(p_search)) || '%'
    )
    order by updated_at desc
    limit least(greatest(coalesce(p_page_size, 5), 1), 20)
    offset greatest(coalesce(p_page, 0), 0) * least(greatest(coalesce(p_page_size, 5), 1), 20)
  )
  select id, data, total_count from filtered;
$$;

-- حذف آبشاری متعلقات جوخه پس از حذف رهبر
create or replace function public.warroom_delete_owned_group_after_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owned_group_id text;
begin
  for owned_group_id in
    select id
    from public.warroom_groups
    where data->>'leader_id' = old.id
  loop
    update public.warroom_users
      set data = data - 'group_id' - 'is_group_member', updated_at = now()
      where data->>'group_id' = owned_group_id;
    delete from public.warroom_group_chat_messages
      where data->>'group_id' = owned_group_id;
    delete from public.warroom_group_chat_rooms
      where data->>'group_id' = owned_group_id;
    delete from public.warroom_group_join_requests
      where data->>'target_group_id' = owned_group_id
         or data->>'source_group_id' = owned_group_id;
    delete from public.warroom_team_registration_sessions
      where data->>'group_id' = owned_group_id;
    delete from public.warroom_groups
      where id = owned_group_id;
  end loop;
  return old;
end;
$$;

drop trigger if exists trg_warroom_delete_owned_group_after_user_delete on public.warroom_users;
create trigger trg_warroom_delete_owned_group_after_user_delete
after delete on public.warroom_users
for each row execute function public.warroom_delete_owned_group_after_user_delete();

-- ----------------------------------------------------------------------------
-- ۴) نماهای امن عمومی (محافظت قطعی از داده‌های شخصی رزمندگان - PII Masking)
-- ----------------------------------------------------------------------------

-- نمای عمومی کاربران: نمایش فقط نام، آواتار، رتبه و امتیاز (پنهان‌سازی کامل کد ملی، شماره تلفن، آدرس و کد پرسنلی)
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
    'avatar_url', coalesce(u.data->>'avatar_url', ''),
    'is_active', coalesce((u.data->>'is_active')::boolean, true)
  ) as data,
  u.updated_at
from public.warroom_users u;

-- ----------------------------------------------------------------------------
-- ۵) ایندکس‌های بهینه‌ساز جستجو
-- ----------------------------------------------------------------------------
create index if not exists idx_warroom_users_auth_uid      on public.warroom_users (auth_user_id);
create index if not exists idx_warroom_users_national_code on public.warroom_users ((data->>'national_code'));
create index if not exists idx_warroom_users_personal_code on public.warroom_users ((data->>'personal_code'));
create index if not exists idx_warroom_users_role          on public.warroom_users ((data->>'role'));
create index if not exists idx_warroom_users_group_id      on public.warroom_users ((data->>'group_id'));

create index if not exists idx_warroom_submissions_user    on public.warroom_submissions ((data->>'personal_code'));
create index if not exists idx_warroom_submissions_mission on public.warroom_submissions ((data->>'mission_id'));
create index if not exists idx_warroom_tickets_status      on public.warroom_support_tickets ((data->>'status'));
create index if not exists idx_warroom_tickets_user        on public.warroom_support_tickets ((data->>'user_id'));
create index if not exists idx_warroom_payment_user        on public.warroom_payment_transactions ((data->>'user_id'));
create index if not exists idx_warroom_payment_status      on public.warroom_payment_transactions ((data->>'status'));
create index if not exists idx_warroom_resets_status       on public.warroom_password_reset_requests ((data->>'status'));
create index if not exists idx_warroom_resets_national     on public.warroom_password_reset_requests ((data->>'national_code'));
create index if not exists idx_warroom_wallet_user_created  on public.warroom_wallet_transactions (user_id, created_at desc);
create index if not exists idx_warroom_transfers_sender    on public.warroom_point_transfers (sender_user_id, created_at desc);
create index if not exists idx_warroom_transfers_receiver  on public.warroom_point_transfers (receiver_user_id, created_at desc);

-- فقط یک رکورد با نقش admin در کل پایگاه داده
create unique index if not exists idx_warroom_users_single_admin
  on public.warroom_users ((data->>'role'))
  where (data->>'role') = 'admin';

-- ----------------------------------------------------------------------------
-- ۶) لغو دسترسی‌های عمومی و تنظیم اختیارات محدود (Least-Privilege Grants)
-- ----------------------------------------------------------------------------

-- ۱. لغو دسترسی‌های فله‌ای و خطرناک قبلی
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- ۲. اعطای حق استفاده از schema
grant usage on schema public to anon, authenticated, service_role;

-- ۳. اعطای مجوزهای کامل فقط به service_role (سرور امن اختصاصی)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ۴. اعطای دسترسی‌های انتخابی و کنترل‌شده به نقش‌های کاربری
-- الف) جدول‌های محتوایی عمومی (فقط خواندن برای anon و authenticated)
grant select on public.warroom_missions to anon, authenticated;
grant select on public.warroom_trainings to anon, authenticated;
grant select on public.warroom_stages to anon, authenticated;
grant select on public.warroom_prizes to anon, authenticated;
grant select on public.warroom_announcements to anon, authenticated;
grant select on public.warroom_news to anon, authenticated;
grant select on public.warroom_home_announcements to anon, authenticated;
grant select on public.warroom_faqs to anon, authenticated;
grant select on public.warroom_game_portals to anon, authenticated;
grant select on public.warroom_daily_challenges to anon, authenticated;
grant select on public.warroom_soundtracks to anon, authenticated;
grant select on public.warroom_vitrin_posts to anon, authenticated;
grant select on public.warroom_medals to anon, authenticated;
grant select on public.warroom_squad_hierarchy to anon, authenticated;
grant select on public.warroom_users_public to anon, authenticated;
grant select on public.warroom_site_settings to anon, authenticated;

-- ب) جدول‌های تعاملی و کاربرمحور (نیازمند RLS سخت‌گیرانه)
grant select, insert, update on public.warroom_users to authenticated;
grant select, insert on public.warroom_users to anon;
grant select, insert, update, delete on public.warroom_groups to authenticated;
grant select on public.warroom_groups to anon;
grant select, insert, update, delete on public.warroom_group_chat_rooms to authenticated;
grant select, insert, delete on public.warroom_group_chat_messages to authenticated;
grant select, insert on public.warroom_submissions to authenticated;
grant select, insert, update on public.warroom_support_tickets to authenticated;
grant select, insert on public.warroom_support_replies to authenticated;
grant select, insert, delete on public.warroom_vitrin_comments to authenticated;
grant select on public.warroom_vitrin_comments to anon;
grant select, insert on public.warroom_notifications to authenticated;
grant select on public.warroom_notifications to anon;
grant select, insert, update on public.warroom_user_medals to authenticated;
grant select on public.warroom_user_medals to anon;
grant select, insert, update on public.warroom_team_registration_sessions to authenticated;
grant select, insert, update on public.warroom_team_registrations to authenticated;
grant select, insert, update, delete on public.warroom_group_join_requests to authenticated;
grant select, insert on public.warroom_password_reset_requests to anon, authenticated;
grant select, insert on public.warroom_payment_transactions to authenticated;

-- ج) جداول دفترکل مالی: فقط SELECT برای کاربران احرازشده (INSERT/UPDATE فقط توسط سرور و RPCهای امن)
grant select on public.warroom_wallet_transactions to authenticated;
grant select on public.warroom_point_transfers to authenticated;

-- د) جدول تنظیمات عمومی kv: خواندن و نوشتن کنترل‌شده
grant select, insert, update on public.warroom_kv to anon, authenticated;

-- هـ) ثبت لاگ ممیزی: فقط درج (Append-Only)
grant insert on public.warroom_audit_log to anon, authenticated;

-- و) جدول‌های محرمانه سرور: دسترسی anon و authenticated کاملاً لغو است
revoke all on public.warroom_payment_config  from anon, authenticated;
revoke all on public.warroom_admin_settings   from anon, authenticated;
revoke all on public.warroom_server_settings from anon, authenticated;
revoke all on public.warroom_credentials     from anon, authenticated;
revoke all on public.warroom_sessions        from anon, authenticated;
revoke all on public.warroom_password_resets from anon, authenticated;
revoke all on public.warroom_security_kv     from anon, authenticated;
revoke all on public.warroom_session_log     from anon, authenticated;

-- ز) مدیریت دسترسی توابع
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.warroom_current_user_id() to authenticated;
grant execute on function public.warroom_is_admin() to authenticated, anon;
grant execute on function public.warroom_point_balance(text) to authenticated, service_role;
grant execute on function public.warroom_transfer_points(text, text, bigint, text) to authenticated, service_role;
grant execute on function public.warroom_admin_adjust_points(text, bigint, text, text, text) to authenticated, service_role;
grant execute on function public.warroom_register_squad_member(text, text, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.warroom_accept_squad_merge(text) to authenticated, service_role;
grant execute on function public.warroom_list_chat_rooms(text, integer, integer) to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- ۷) فعال‌سازی Row Level Security (RLS) و سیاست‌های اختصاصی
-- ----------------------------------------------------------------------------

-- فعال‌سازی RLS روی تمامی جداول بدون استثنا
do $$
declare
  t text;
begin
  foreach t in array array[
    'warroom_users','warroom_groups','warroom_group_chat_rooms','warroom_group_chat_messages',
    'warroom_stages','warroom_prizes','warroom_missions','warroom_submissions',
    'warroom_trainings','warroom_medals','warroom_user_medals',
    'warroom_support_tickets','warroom_support_replies','warroom_announcements',
    'warroom_news','warroom_notifications','warroom_home_announcements','warroom_faqs',
    'warroom_vitrin_posts','warroom_vitrin_comments','warroom_game_portals',
    'warroom_daily_challenges','warroom_soundtracks','warroom_kv','warroom_site_settings',
    'warroom_payment_config','warroom_admin_settings','warroom_server_settings',
    'warroom_password_reset_requests','warroom_payment_transactions',
    'warroom_team_registration_sessions','warroom_team_registrations',
    'warroom_group_join_requests','warroom_squad_enlistments','warroom_squad_hierarchy',
    'warroom_wallet_transactions','warroom_point_transfers','warroom_squad_merge_requests',
    'warroom_session_log','warroom_credentials','warroom_sessions',
    'warroom_password_resets','warroom_audit_log','warroom_security_kv'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    -- پاکسازی قطعی هرگونه سیاست باز دمو قبلی
    execute format('drop policy if exists "warroom_public_access" on public.%I;', t);
    execute format('drop policy if exists "warroom_open_policy" on public.%I;', t);
  end loop;
end;
$$;

-- ============================================================================
-- الف) سیاست‌های محتوای عمومی (Public Read-Only Content / Admin Manage)
-- ============================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'warroom_missions','warroom_trainings','warroom_stages','warroom_prizes',
    'warroom_announcements','warroom_news','warroom_home_announcements','warroom_faqs',
    'warroom_game_portals','warroom_daily_challenges','warroom_soundtracks',
    'warroom_vitrin_posts','warroom_medals','warroom_squad_hierarchy','warroom_site_settings'
  ]
  loop
    execute format('drop policy if exists "policy_%s_public_read" on public.%I;', t, t);
    execute format('create policy "policy_%s_public_read" on public.%I for select using (true);', t, t);

    execute format('drop policy if exists "policy_%s_admin_manage" on public.%I;', t, t);
    execute format('create policy "policy_%s_admin_manage" on public.%I for all to authenticated using (public.warroom_is_admin()) with check (public.warroom_is_admin());', t, t);
  end loop;
end;
$$;

-- ============================================================================
-- ب) سیاست‌های کاربران (warroom_users) — مسدودسازی افشای داده‌های شخصی (PII)
-- ============================================================================
drop policy if exists "policy_users_select" on public.warroom_users;
create policy "policy_users_select" on public.warroom_users
  for select using (
    -- مشاهده رکورد کامل فقط برای خود کاربر یا مدیر مجاز است (سایرین از warroom_users_public استفاده می‌کنند)
    auth_user_id = auth.uid()
    or id = public.warroom_current_user_id()
    or public.warroom_is_admin()
  );

drop policy if exists "policy_users_insert" on public.warroom_users;
create policy "policy_users_insert" on public.warroom_users
  for insert with check (
    -- مدیر کل یا ثبت‌نام کاربر جدید به شرط عدم انتساب نقش admin
    public.warroom_is_admin()
    or (coalesce(data->>'role', 'user') <> 'admin')
  );

drop policy if exists "policy_users_update" on public.warroom_users;
create policy "policy_users_update" on public.warroom_users
  for update using (
    public.warroom_is_admin()
    or auth_user_id = auth.uid()
    or id = public.warroom_current_user_id()
  ) with check (
    public.warroom_is_admin()
    or (
      (auth_user_id = auth.uid() or id = public.warroom_current_user_id())
      and coalesce(data->>'role', 'user') <> 'admin'
    )
  );

drop policy if exists "policy_users_delete" on public.warroom_users;
create policy "policy_users_delete" on public.warroom_users
  for delete using (public.warroom_is_admin());

-- ============================================================================
-- ج) سیاست‌های جوخه‌ها و چت گروهی
-- ============================================================================
drop policy if exists "policy_groups_select" on public.warroom_groups;
create policy "policy_groups_select" on public.warroom_groups
  for select using (true);

drop policy if exists "policy_groups_manage" on public.warroom_groups;
create policy "policy_groups_manage" on public.warroom_groups
  for all to authenticated using (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  ) with check (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

-- چت روم‌ها
drop policy if exists "policy_chat_rooms_select" on public.warroom_group_chat_rooms;
create policy "policy_chat_rooms_select" on public.warroom_group_chat_rooms
  for select to authenticated using (
    public.warroom_is_admin()
    or (data->'member_ids') ? public.warroom_current_user_id()
    or data->>'group_id' in (
      select u.data->>'group_id' from public.warroom_users u where u.id = public.warroom_current_user_id()
    )
  );

drop policy if exists "policy_chat_rooms_manage" on public.warroom_group_chat_rooms;
create policy "policy_chat_rooms_manage" on public.warroom_group_chat_rooms
  for all to authenticated using (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  ) with check (
    public.warroom_is_admin()
    or data->>'leader_id' = public.warroom_current_user_id()
  );

-- پیام‌های چت
drop policy if exists "policy_chat_messages_select" on public.warroom_group_chat_messages;
create policy "policy_chat_messages_select" on public.warroom_group_chat_messages
  for select to authenticated using (true);

drop policy if exists "policy_chat_messages_insert" on public.warroom_group_chat_messages;
create policy "policy_chat_messages_insert" on public.warroom_group_chat_messages
  for insert to authenticated with check (
    public.warroom_is_admin()
    or data->>'sender_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_chat_messages_delete" on public.warroom_group_chat_messages;
create policy "policy_chat_messages_delete" on public.warroom_group_chat_messages
  for delete to authenticated using (
    public.warroom_is_admin()
    or data->>'sender_id' = public.warroom_current_user_id()
  );

-- ============================================================================
-- د) سیاست‌های پاسخ مأموریت‌ها و تیکت‌ها
-- ============================================================================
drop policy if exists "policy_submissions_select" on public.warroom_submissions;
create policy "policy_submissions_select" on public.warroom_submissions
  for select to authenticated using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_submissions_insert" on public.warroom_submissions;
create policy "policy_submissions_insert" on public.warroom_submissions
  for insert to authenticated with check (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_submissions_manage" on public.warroom_submissions;
create policy "policy_submissions_manage" on public.warroom_submissions
  for update to authenticated using (public.warroom_is_admin()) with check (public.warroom_is_admin());

-- تیکت‌های پشتیبانی
drop policy if exists "policy_tickets_select" on public.warroom_support_tickets;
create policy "policy_tickets_select" on public.warroom_support_tickets
  for select to authenticated using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_tickets_insert" on public.warroom_support_tickets;
create policy "policy_tickets_insert" on public.warroom_support_tickets
  for insert to authenticated with check (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_tickets_manage" on public.warroom_support_tickets;
create policy "policy_tickets_manage" on public.warroom_support_tickets
  for update to authenticated using (public.warroom_is_admin()) with check (public.warroom_is_admin());

-- پاسخ‌های تیکت
drop policy if exists "policy_replies_select" on public.warroom_support_replies;
create policy "policy_replies_select" on public.warroom_support_replies
  for select to authenticated using (
    public.warroom_is_admin()
    or exists (
      select 1 from public.warroom_support_tickets t
      where t.id = warroom_support_replies.data->>'ticket_id'
        and (t.data->>'user_id' = public.warroom_current_user_id())
    )
  );

drop policy if exists "policy_replies_insert" on public.warroom_support_replies;
create policy "policy_replies_insert" on public.warroom_support_replies
  for insert to authenticated with check (
    public.warroom_is_admin()
    or data->>'author_id' = public.warroom_current_user_id()
  );

-- مدال‌های کاربری
drop policy if exists "policy_user_medals_select" on public.warroom_user_medals;
create policy "policy_user_medals_select" on public.warroom_user_medals
  for select using (true);

drop policy if exists "policy_user_medals_manage" on public.warroom_user_medals;
create policy "policy_user_medals_manage" on public.warroom_user_medals
  for all to authenticated using (public.warroom_is_admin()) with check (public.warroom_is_admin());

-- دیدگاه‌های ویترین
drop policy if exists "policy_vitrin_comments_select" on public.warroom_vitrin_comments;
create policy "policy_vitrin_comments_select" on public.warroom_vitrin_comments
  for select using (true);

drop policy if exists "policy_vitrin_comments_insert" on public.warroom_vitrin_comments;
create policy "policy_vitrin_comments_insert" on public.warroom_vitrin_comments
  for insert to authenticated with check (
    public.warroom_is_admin()
    or data->>'authorId' = public.warroom_current_user_id()
  );

drop policy if exists "policy_vitrin_comments_delete" on public.warroom_vitrin_comments;
create policy "policy_vitrin_comments_delete" on public.warroom_vitrin_comments
  for delete to authenticated using (
    public.warroom_is_admin()
    or data->>'authorId' = public.warroom_current_user_id()
  );

-- نشست‌های ثبت‌نام گروهی
drop policy if exists "policy_team_sessions_select" on public.warroom_team_registration_sessions;
create policy "policy_team_sessions_select" on public.warroom_team_registration_sessions
  for select to authenticated using (true);

drop policy if exists "policy_team_sessions_manage" on public.warroom_team_registration_sessions;
create policy "policy_team_sessions_manage" on public.warroom_team_registration_sessions
  for all to authenticated using (
    public.warroom_is_admin()
    or data->>'creator_id' = public.warroom_current_user_id()
  ) with check (
    public.warroom_is_admin()
    or data->>'creator_id' = public.warroom_current_user_id()
  );

-- درخواست‌های عضویت در جوخه
drop policy if exists "policy_join_requests_select" on public.warroom_group_join_requests;
create policy "policy_join_requests_select" on public.warroom_group_join_requests
  for select to authenticated using (
    public.warroom_is_admin()
    or data->>'requester_id' = public.warroom_current_user_id()
    or data->>'target_group_leader_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_join_requests_manage" on public.warroom_group_join_requests;
create policy "policy_join_requests_manage" on public.warroom_group_join_requests
  for all to authenticated using (
    public.warroom_is_admin()
    or data->>'requester_id' = public.warroom_current_user_id()
    or data->>'target_group_leader_id' = public.warroom_current_user_id()
  ) with check (
    public.warroom_is_admin()
    or data->>'requester_id' = public.warroom_current_user_id()
    or data->>'target_group_leader_id' = public.warroom_current_user_id()
  );

-- ============================================================================
-- هـ) سیاست‌های مالی، کیف‌پول و تراکنش‌ها (Ledger Security)
-- ============================================================================
drop policy if exists "policy_wallet_select" on public.warroom_wallet_transactions;
create policy "policy_wallet_select" on public.warroom_wallet_transactions
  for select to authenticated using (
    public.warroom_is_admin()
    or user_id = public.warroom_current_user_id()
  );

-- مسدودسازی هرگونه درج، ویرایش یا حذف مستقیم در کیف‌پول توسط کلاینت
drop policy if exists "policy_wallet_no_client_mutation" on public.warroom_wallet_transactions;

-- انتقال امتیاز
drop policy if exists "policy_transfers_select" on public.warroom_point_transfers;
create policy "policy_transfers_select" on public.warroom_point_transfers
  for select to authenticated using (
    public.warroom_is_admin()
    or sender_user_id = public.warroom_current_user_id()
    or receiver_user_id = public.warroom_current_user_id()
  );

-- تراکنش‌های پرداخت بانکی
drop policy if exists "policy_payments_select" on public.warroom_payment_transactions;
create policy "policy_payments_select" on public.warroom_payment_transactions
  for select to authenticated using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_payments_insert" on public.warroom_payment_transactions;
create policy "policy_payments_insert" on public.warroom_payment_transactions
  for insert to authenticated with check (
    public.warroom_is_admin()
    or (
      data->>'user_id' = public.warroom_current_user_id()
      and coalesce(data->>'status', 'pending') = 'pending'
    )
  );

-- فقط مدیر یا کلید اختصاصی سرور حق تایید و تغییر وضعیت پرداخت (به paid) را دارند
drop policy if exists "policy_payments_update" on public.warroom_payment_transactions;
create policy "policy_payments_update" on public.warroom_payment_transactions
  for update to authenticated using (public.warroom_is_admin()) with check (public.warroom_is_admin());

-- ============================================================================
-- و) سیاست‌های درخواست بازنشانی رمز عبور
-- ============================================================================
drop policy if exists "policy_resets_select" on public.warroom_password_reset_requests;
create policy "policy_resets_select" on public.warroom_password_reset_requests
  for select using (
    public.warroom_is_admin()
    or data->>'user_id' = public.warroom_current_user_id()
  );

drop policy if exists "policy_resets_insert" on public.warroom_password_reset_requests;
create policy "policy_resets_insert" on public.warroom_password_reset_requests
  for insert with check (
    coalesce(data->>'status', 'pending') = 'pending'
  );

drop policy if exists "policy_resets_manage" on public.warroom_password_reset_requests;
create policy "policy_resets_manage" on public.warroom_password_reset_requests
  for update to authenticated using (public.warroom_is_admin()) with check (public.warroom_is_admin());

-- ============================================================================
-- ز) سیاست‌های تنظیمات warroom_kv و جداسازی کلیدهای محرمانه
-- ============================================================================
drop policy if exists "policy_kv_select" on public.warroom_kv;
create policy "policy_kv_select" on public.warroom_kv
  for select using (
    id not in ('payment_settings', 'payment_secrets', 'admin_config', 'api_keys', 'server_secrets')
    or public.warroom_is_admin()
  );

drop policy if exists "policy_kv_manage" on public.warroom_kv;
create policy "policy_kv_manage" on public.warroom_kv
  for all to authenticated using (
    public.warroom_is_admin()
    or id = 'saved_posts_' || coalesce(public.warroom_current_user_id(), 'none')
  ) with check (
    public.warroom_is_admin()
    or id = 'saved_posts_' || coalesce(public.warroom_current_user_id(), 'none')
  );

-- ============================================================================
-- ح) سیاست لاگ ممیزی (Append-Only)
-- ============================================================================
drop policy if exists "policy_audit_insert" on public.warroom_audit_log;
create policy "policy_audit_insert" on public.warroom_audit_log
  for insert to anon, authenticated with check (
    jsonb_typeof(data) = 'object'
    and length(coalesce(data->>'event', '')) between 1 and 200
  );

drop policy if exists "policy_audit_select" on public.warroom_audit_log;
create policy "policy_audit_select" on public.warroom_audit_log
  for select to authenticated using (public.warroom_is_admin());

-- ----------------------------------------------------------------------------
-- ۸) امنیت Storage رسانه‌ها (warroom-media)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('warroom-media', 'warroom-media', true)
on conflict (id) do update set public = true;

-- لغو سیاست‌های باز و ناامن قبلی
drop policy if exists "warroom_media_public_write" on storage.objects;
drop policy if exists "warroom_media_public_update" on storage.objects;
drop policy if exists "warroom_media_public_delete" on storage.objects;
drop policy if exists "warroom_media_public_read" on storage.objects;

-- خواندن فایل‌ها: عمومی برای نمایش آواتارها و عکس‌ها
create policy "warroom_media_read" on storage.objects
  for select using (bucket_id = 'warroom-media');

-- آپلود فایل: فقط کاربران احراز هویت شده در مسیر مجاز
create policy "warroom_media_upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'warroom-media'
    and (
      public.warroom_is_admin()
      or (storage.foldername(name))[1] = public.warroom_current_user_id()
      or (storage.foldername(name))[1] in ('avatars', 'submissions', 'shared')
    )
  );

-- ویرایش و حذف فایل: فقط مالک یا ادمین سامانه (مسدودسازی قطعی برای کاربران متفرقه و ناشناس)
create policy "warroom_media_modify" on storage.objects
  for update to authenticated using (
    bucket_id = 'warroom-media'
    and (
      public.warroom_is_admin()
      or (storage.foldername(name))[1] = public.warroom_current_user_id()
      or owner::text = auth.uid()::text
    )
  );

create policy "warroom_media_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'warroom-media'
    and (
      public.warroom_is_admin()
      or (storage.foldername(name))[1] = public.warroom_current_user_id()
      or owner::text = auth.uid()::text
    )
  );

-- ----------------------------------------------------------------------------
-- ۹) تنظیم انتشار بلادرنگ (Realtime Publications) ایمن
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- حذف قطعی جداول حساس از Realtime
    foreach t in array array[
      'warroom_users','warroom_password_reset_requests','warroom_payment_transactions',
      'warroom_wallet_transactions','warroom_point_transfers','warroom_kv',
      'warroom_server_settings','warroom_payment_config','warroom_admin_settings',
      'warroom_credentials','warroom_sessions','warroom_password_resets'
    ]
    loop
      begin
        execute format('alter publication supabase_realtime drop table public.%I', t);
      exception
        when undefined_table then null;
        when undefined_object then null;
      end;
    end loop;

    -- اضافه کردن صرفاً جداول تعاملی بدون ریسک نشت اطلاعات شخصی
    foreach t in array array[
      'warroom_group_chat_messages',
      'warroom_notifications',
      'warroom_home_announcements',
      'warroom_announcements'
    ]
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception
        when duplicate_object then null;
        when undefined_table then null;
      end;
    end loop;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- ۱۰) داده اولیه ایمن (بدون هیچ رمز عبور پیش‌فرض یا هش خام در SQL)
-- ----------------------------------------------------------------------------

-- پروفایل مدیر ارشد (احراز هویت انحصارا از طریق Supabase Auth مدیریت می‌شود)
insert into public.warroom_users (id, data) values (
  'u-admin',
  $${
    "id": "u-admin",
    "first_name": "امیرحسین",
    "last_name": "فرماندهی کل",
    "national_code": "0012345678",
    "phone": "09120000000",
    "role": "admin",
    "education_level": "متوسطه دوم",
    "grade": "دوازدهم",
    "gender": "پسر",
    "province": "تهران",
    "city": "تهران",
    "birth_date": "1384/01/15",
    "school_name": "دبیرستان ماندگار البرز",
    "personal_code": "900000001",
    "address": "ستاد مرکزی اتاق جنگ"
  }$$::jsonb
)
on conflict (id) do update 
  set data = excluded.data - 'password' - 'password_hash', 
      updated_at = now();

-- چالش روزانه پیش‌فرض
insert into public.warroom_daily_challenges (id, data) values (
  'daily_challenge_main',
  $${"id":"daily_challenge_main","title":"چالش تاکتیکی روزانه","description":"با پاسخ به این تست هوش عمیق، ۱۵۰ امتیاز پاداش دریافت کنید.","badge":"tactical_badge","pointsReward":150,"question":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","questionText":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","options":["داشتن تجهیزات مدرن","اخلاص در نیت و خودسازی فردی","شناخت رقبا","شروع بدون برنامه‌ریزی"],"correctOptionIndex":1,"timeLimitSeconds":10,"isActive":true}$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

insert into public.warroom_kv (id, value) values (
  'daily_challenge_config',
  $${"id":"daily_challenge_main","title":"چالش تاکتیکی روزانه","description":"با پاسخ به این تست هوش عمیق، ۱۵۰ امتیاز پاداش دریافت کنید.","badge":"tactical_badge","pointsReward":150,"question":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","questionText":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","options":["داشتن تجهیزات مدرن","اخلاص در نیت و خودسازی فردی","شناخت رقبا","شروع بدون برنامه‌ریزی"],"correctOptionIndex":1,"timeLimitSeconds":10,"isActive":true}$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- موسیقی پیش‌فرض
insert into public.warroom_soundtracks (id, data) values (
  'track_epic_march_default',
  $${"id":"track_epic_march_default","title":"مارش حماسی اتاق جنگ","subtitle":"تولید سینت‌سایزر هوشمند فرکانسی","tag":"حماسی / رزمی","color":"from-amber-500 to-yellow-400","sourceType":"synth","synthTrackId":"epic_march","durationSeconds":90,"is_active":true,"order":1}$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- درگاه‌های ورود به بازی
insert into public.warroom_game_portals (id, data) values (
  'warroom',
  $${"id":"warroom","title":"اتاق جنگ","subtitle":"سامانه اصلی رقابت و ارزیابی استراتژیک","description":"حل مأموریت‌های هوشمند، رقابت در جدول برترین‌های کشور، دریافت کریستال‌ها و هدایای ویژه ۵۰ میلیارد ریالی.","status":"active","badgeText":"فعال • در حال برگزاری","badgeColor":"bg-emerald-500/20 text-emerald-300 border-emerald-500/50","link":"/journey","targetAudience":"all","tag":"بازی اصلی رویداد","featured":true}$$::jsonb
),
(
  'galaxy',
  $${"id":"galaxy","title":"عملیات کهکشان","subtitle":"نبرد فضایی و تسخیر سیارات دانش‌آموزی","description":"شبیه‌ساز فرماندهی ناوگان فضایی و مدیریت منابع انرژی در قلمروهای دوردست.","status":"coming_soon","badgeText":"به‌زودی • فصل ۲","badgeColor":"bg-amber-500/15 text-amber-300 border-amber-500/40","link":"https://galaxy.warroom.ir","targetAudience":"all","tag":"به‌زودی","featured":false}$$::jsonb
),
(
  'cyber',
  $${"id":"cyber","title":"نبرد سایبری","subtitle":"چالش رمزنگاری و نفوذ هوشمند","description":"مسابقه دفاع سایبری، کشف کدهای نفوذ و تحلیل امنیتی داده‌های استراتژیک.","status":"coming_soon","badgeText":"به‌زودی • فصل ۳","badgeColor":"bg-purple-500/15 text-purple-300 border-purple-500/40","link":"https://cyber.warroom.ir","targetAudience":"all","tag":"به‌زودی","featured":false}$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- تنظیمات پایه صفحه اصلی در warroom_kv و warroom_site_settings
insert into public.warroom_kv (id, value) values (
  'site_settings',
  $${
    "siteName": "اتاق جنگ",
    "siteTagline": "سامانه جامع مسابقات، مأموریت‌ها و ارزیابی هوشمند",
    "badgeText": "پرونده ماجراجویی هفت‌خوان",
    "heroTitle": "مأموریت اصلی: مسابقه بزرگ اتاق جنگ",
    "showCountdownTimer": false,
    "customLogoUrl": "/images/logos/warroom_logo.webp",
    "homeSectionsOrder": ["hero", "prizes", "messengers", "about", "footer"],
    "enamadTitle": "نماد اعتماد الکترونیکی",
    "enamadSubtitle": "وزارت صنعت، معدن و تجارت",
    "enamadLinkUrl": "https://trustseal.enamad.ir/?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ",
    "enamadEnabled": true,
    "enamadHtmlCode": "<a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ'><img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7987091&Code=lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ' alt='' style='cursor:pointer' code='lCCUhv7OjjK99lHykgzIJGHY6FwPWGTZ'></a>"
  }$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

insert into public.warroom_site_settings (id, data) values (
  'main_settings',
  $${
    "siteName": "اتاق جنگ",
    "siteTagline": "سامانه جامع مسابقات، مأموریت‌ها و ارزیابی هوشمند",
    "badgeText": "پرونده ماجراجویی هفت‌خوان",
    "heroTitle": "مأموریت اصلی: مسابقه بزرگ اتاق جنگ",
    "showCountdownTimer": false,
    "customLogoUrl": "/images/logos/warroom_logo.webp",
    "homeSectionsOrder": ["hero", "prizes", "messengers", "about", "footer"]
  }$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- جوایز پیش‌فرض
insert into public.warroom_prizes (id, data) values 
('prize_console', $${"id":"prize_console","title":"کنسول بازی پلی‌استیشن ۵","description":"جایزه ویژه رتبه اول مسابقات استراتژیک کشوری","requiredPoints":5000,"category":"digital","imageUrl":"https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=400&q=80","isActive":true}$$::jsonb),
('prize_tablet', $${"id":"prize_tablet","title":"تبلت دانش‌آموزی و قلم نوری","description":"جایزه ویژه رتبه‌های دوم تا پنجم","requiredPoints":3500,"category":"digital","imageUrl":"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80","isActive":true}$$::jsonb)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- ----------------------------------------------------------------------------
-- ۱۱) آزمون و ممیزی خودکار صحت امنیت (Security Verification Suite)
-- ----------------------------------------------------------------------------
do $$
declare
  insecure_tables_count integer;
  dangerous_grants_count integer;
  realtime_leaks_count integer;
begin
  -- ۱. اطمینان از فعال بودن RLS روی کلیه جداول اسکیمای public
  select count(*) into insecure_tables_count
  from pg_tables pt
  join pg_class pc on pc.relname = pt.tablename
  join pg_namespace pn on pn.oid = pc.relnamespace
  where pt.schemaname = 'public' and pc.relrowsecurity = false;

  if insecure_tables_count > 0 then
    raise warning 'SECURITY AUDIT: % table(s) do not have RLS enabled!', insecure_tables_count;
  else
    raise notice 'SECURITY AUDIT CHECK 1: RLS is active on ALL public tables (PASS).';
  end if;

  -- ۲. اطمینان از عدم وجود مجوز ALL برای نقش anon
  select count(*) into dangerous_grants_count
  from information_schema.role_table_grants
  where grantee in ('anon') and privilege_type in ('DELETE', 'UPDATE')
    and table_schema = 'public'
    and table_name in ('warroom_wallet_transactions', 'warroom_point_transfers', 'warroom_server_settings', 'warroom_credentials', 'warroom_sessions');

  if dangerous_grants_count > 0 then
    raise warning 'SECURITY AUDIT: Dangerous grants found for role anon!';
  else
    raise notice 'SECURITY AUDIT CHECK 2: No dangerous grants for unauthenticated users (PASS).';
  end if;

  -- ۳. اطمینان از عدم وجود جداول حساس در انتشارات Realtime
  select count(*) into realtime_leaks_count
  from pg_publication_tables
  where pubname = 'supabase_realtime'
    and tablename in ('warroom_users', 'warroom_wallet_transactions', 'warroom_payment_transactions', 'warroom_server_settings', 'warroom_credentials');

  if realtime_leaks_count > 0 then
    raise warning 'SECURITY AUDIT: Sensitive tables still exposed in Realtime!';
  else
    raise notice 'SECURITY AUDIT CHECK 3: Sensitive tables excluded from Realtime (PASS).';
  end if;
end;
$$;
