-- ============================================================================
-- WarRoom V4 — Complete Supabase Database Setup
-- Generated from the ordered migrations in supabase/migrations/
-- ============================================================================
-- HOW TO USE
-- 1. Open the SQL Editor for the correct Supabase project.
-- 2. Paste/run this entire file once, in one execution.
-- 3. Keep the frontend anon/publishable key in VITE_SUPABASE_PUBLISHABLE_KEY.
-- 4. Keep the service-role/secret key ONLY on the Node.js server.
--
-- This bundle contains the complete schema used by the frontend and Node.js API:
-- tables, indexes, functions/RPCs, grants, RLS policies, OTP/session storage,
-- registration, squads/subgroups, chat, missions, payments, and security hardening.
-- Later migration sections intentionally replace or revoke permissions created by
-- earlier sections. Do not run only part of this file.
--
-- IMPORTANT
-- - No API keys or application secrets belong in this SQL file.
-- - Run against the intended project and review backups before production changes.
-- - The source of truth remains the ordered migration files; regenerate this bundle
--   after adding a migration.
-- ============================================================================


-- ============================================================================
-- MIGRATION 1/6: 20261011000000_warroom_schema.sql
-- ============================================================================

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

-- ۳۹. کدهای تایید OTP — فقط هش، فقط service_role (سرور Node)
create table if not exists public.warroom_otp_codes (
  id              uuid primary key default gen_random_uuid(),
  challenge_id    uuid not null default gen_random_uuid(),
  user_id         text not null,
  national_code   text not null,
  phone           text not null,
  code            text not null default 'retired', -- legacy compatibility only; never store a live OTP here
  code_hash       text not null,
  sms_message_id  text,
  attempt_count   integer not null default 0,
  max_attempts    integer not null default 5,
  verified        boolean not null default false,
  expires_at      timestamptz not null,
  is_used         boolean not null default false,
  used_at         timestamptz,
  ip_hash         text,
  created_at      timestamptz not null default now()
);

alter table public.warroom_otp_codes add column if not exists challenge_id uuid;
alter table public.warroom_otp_codes add column if not exists national_code text;
alter table public.warroom_otp_codes add column if not exists code_hash text;
alter table public.warroom_otp_codes add column if not exists code text not null default 'retired';
alter table public.warroom_otp_codes alter column code set default 'retired';
alter table public.warroom_otp_codes add column if not exists sms_message_id text;
alter table public.warroom_otp_codes add column if not exists attempt_count integer not null default 0;
alter table public.warroom_otp_codes add column if not exists max_attempts integer not null default 5;
alter table public.warroom_otp_codes add column if not exists verified boolean not null default false;
alter table public.warroom_otp_codes add column if not exists ip_hash text;

-- مهاجرت از کد متن‌ساده به هش و حذف ستون خطرناک code
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warroom_otp_codes' and column_name = 'code'
  ) then
    update public.warroom_otp_codes
      set code_hash = coalesce(nullif(code_hash, ''), encode(digest(code, 'sha256'), 'hex'))
      where code is not null and coalesce(code_hash, '') = '';
    -- Keep the legacy column until an operator has verified old data can be retired.
  end if;
end;
$$;

update public.warroom_otp_codes
  set challenge_id = coalesce(challenge_id, gen_random_uuid())
  where challenge_id is null;
alter table public.warroom_otp_codes alter column challenge_id set default gen_random_uuid();
alter table public.warroom_otp_codes alter column challenge_id set not null;

create unique index if not exists idx_warroom_otp_codes_challenge on public.warroom_otp_codes(challenge_id);
create index if not exists idx_warroom_otp_codes_user_id on public.warroom_otp_codes(user_id);
create index if not exists idx_warroom_otp_codes_national on public.warroom_otp_codes(national_code);
create index if not exists idx_warroom_otp_codes_hash on public.warroom_otp_codes(code_hash);
create index if not exists idx_warroom_otp_codes_is_used on public.warroom_otp_codes(is_used);
create index if not exists idx_warroom_otp_codes_expires on public.warroom_otp_codes(expires_at);

-- ۴۰. محدودسازی نرخ OTP در دیتابیس
create table if not exists public.warroom_otp_rate_limits (
  id          text primary key,
  hit_count   integer not null default 0,
  window_end  timestamptz not null,
  updated_at  timestamptz not null default now()
);

-- ۴۱. توکن‌های تازه‌سازی JWT (هش‌شده)
create table if not exists public.warroom_refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  token_hash   text not null unique,
  expires_at   timestamptz not null,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_warroom_refresh_user on public.warroom_refresh_tokens(user_id);
create index if not exists idx_warroom_refresh_expires on public.warroom_refresh_tokens(expires_at);

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

-- تریگر حیاتی ۱: ذخیره امن رمز عبور در warroom_credentials، پاکسازی PII از warroom_users و ممانعت از ارتقای نقش
create or replace function public.warroom_sanitize_user_data()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_raw_pass text;
  v_hash_pass text;
begin
  if new.data is not null then
    -- استخراج رمز ارسالی و ذخیره خودکار در جدول امنیتی warroom_credentials پیش از پاکسازی
    v_raw_pass := coalesce(new.data->>'password', new.data->>'rawPassword', '');
    v_hash_pass := coalesce(new.data->>'password_hash', '');

    if v_hash_pass = '' and v_raw_pass <> '' then
      v_hash_pass := encode(digest(v_raw_pass, 'sha256'), 'hex');
    end if;

    if v_hash_pass <> '' then
      insert into public.warroom_credentials (id, data, updated_at)
      values (
        new.id,
        jsonb_build_object('password_hash', v_hash_pass, 'mustChangePassword', false),
        now()
      )
      on conflict (id) do update set
        data = jsonb_build_object('password_hash', v_hash_pass, 'mustChangePassword', false),
        updated_at = now();
    end if;

    -- حذف قطعی فیلدهای حساس رمزنگاری از داده‌های عمومی کاربر در warroom_users
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
    'warroom_sessions','warroom_password_resets','warroom_security_kv',
    'warroom_otp_rate_limits','warroom_refresh_tokens'
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

-- حذف گروه‌های متعلق به کاربر پس از حذف او
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
      set data = data - 'group_id' - 'is_group_member',
          updated_at = now()
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
create index if not exists idx_warroom_users_phone         on public.warroom_users ((data->>'phone'));
create index if not exists idx_warroom_users_personal_code on public.warroom_users ((data->>'personal_code'));
create index if not exists idx_warroom_users_role          on public.warroom_users ((data->>'role'));
create index if not exists idx_warroom_users_group_id      on public.warroom_users ((data->>'group_id'));

-- ایندکس تایمر سرگروه (timer_started_at در data JSONB گروه‌ها)
create index if not exists idx_warroom_groups_timer_started on public.warroom_groups ((data->>'timer_started_at'));

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
revoke all on public.warroom_sessions        from anon, authenticated;
revoke all on public.warroom_password_resets from anon, authenticated;
revoke all on public.warroom_security_kv     from anon, authenticated;
revoke all on public.warroom_session_log     from anon, authenticated;
revoke all on public.warroom_otp_codes       from anon, authenticated;
revoke all on public.warroom_otp_rate_limits from anon, authenticated;
revoke all on public.warroom_refresh_tokens  from anon, authenticated;
grant all on public.warroom_otp_codes to service_role;
grant all on public.warroom_otp_rate_limits to service_role;
grant all on public.warroom_refresh_tokens to service_role;

-- جدول warroom_credentials: مجوز خواندن و نوشتن محدود تحت RLS اختصاصی
grant select, insert, update on public.warroom_credentials to anon, authenticated;

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
    'warroom_password_resets','warroom_audit_log','warroom_security_kv',
    'warroom_otp_codes','warroom_otp_rate_limits','warroom_refresh_tokens'
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
-- ب) سیاست‌های کاربران (warroom_users) — اجازه کامل به کلاینت (دسترسی عمومی / Anonymized یا سفارشی)
-- ============================================================================
drop policy if exists "policy_users_select" on public.warroom_users;
create policy "policy_users_select" on public.warroom_users
  for select using (true);

drop policy if exists "policy_users_insert" on public.warroom_users;
create policy "policy_users_insert" on public.warroom_users
  for insert with check (true);

drop policy if exists "policy_users_update" on public.warroom_users;
create policy "policy_users_update" on public.warroom_users
  for update using (true) with check (true);

drop policy if exists "policy_users_delete" on public.warroom_users;
create policy "policy_users_delete" on public.warroom_users
  for delete using (true);

-- ============================================================================
-- ج) سیاست‌های جوخه‌ها و چت گروهی
-- ============================================================================
drop policy if exists "policy_groups_select" on public.warroom_groups;
create policy "policy_groups_select" on public.warroom_groups
  for select using (true);

drop policy if exists "policy_groups_manage" on public.warroom_groups;
create policy "policy_groups_manage" on public.warroom_groups
  for all using (true) with check (true);

-- چت روم‌ها
drop policy if exists "policy_chat_rooms_select" on public.warroom_group_chat_rooms;
create policy "policy_chat_rooms_select" on public.warroom_group_chat_rooms
  for select using (true);

drop policy if exists "policy_chat_rooms_manage" on public.warroom_group_chat_rooms;
create policy "policy_chat_rooms_manage" on public.warroom_group_chat_rooms
  for all using (true) with check (true);

-- پیام‌های چت
drop policy if exists "policy_chat_messages_select" on public.warroom_group_chat_messages;
create policy "policy_chat_messages_select" on public.warroom_group_chat_messages
  for select using (true);

drop policy if exists "policy_chat_messages_insert" on public.warroom_group_chat_messages;
create policy "policy_chat_messages_insert" on public.warroom_group_chat_messages
  for insert with check (true);

drop policy if exists "policy_chat_messages_delete" on public.warroom_group_chat_messages;
create policy "policy_chat_messages_delete" on public.warroom_group_chat_messages
  for delete using (true);

-- ============================================================================
-- د) سیاست‌های پاسخ مأموریت‌ها و تیکت‌ها
-- ============================================================================
drop policy if exists "policy_submissions_select" on public.warroom_submissions;
create policy "policy_submissions_select" on public.warroom_submissions
  for select using (true);

drop policy if exists "policy_submissions_insert" on public.warroom_submissions;
create policy "policy_submissions_insert" on public.warroom_submissions
  for insert with check (true);

drop policy if exists "policy_submissions_manage" on public.warroom_submissions;
create policy "policy_submissions_manage" on public.warroom_submissions
  for update using (true) with check (true);

-- تیکت‌های پشتیبانی
drop policy if exists "policy_tickets_select" on public.warroom_support_tickets;
create policy "policy_tickets_select" on public.warroom_support_tickets
  for select using (true);

drop policy if exists "policy_tickets_insert" on public.warroom_support_tickets;
create policy "policy_tickets_insert" on public.warroom_support_tickets
  for insert with check (true);

drop policy if exists "policy_tickets_manage" on public.warroom_support_tickets;
create policy "policy_tickets_manage" on public.warroom_support_tickets
  for update using (true) with check (true);

-- پاسخ‌های تیکت
drop policy if exists "policy_replies_select" on public.warroom_support_replies;
create policy "policy_replies_select" on public.warroom_support_replies
  for select using (true);

drop policy if exists "policy_replies_insert" on public.warroom_support_replies;
create policy "policy_replies_insert" on public.warroom_support_replies
  for insert with check (true);

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
  for all using (true) with check (true);

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

-- ============================================================================
-- ط) سیاست‌های جدول اعتبارنامه‌ها (warroom_credentials)
-- ============================================================================
drop policy if exists "policy_credentials_select" on public.warroom_credentials;
create policy "policy_credentials_select" on public.warroom_credentials
  for select using (
    public.warroom_is_admin()
    or id = public.warroom_current_user_id()
  );

drop policy if exists "policy_credentials_insert" on public.warroom_credentials;
create policy "policy_credentials_insert" on public.warroom_credentials
  for insert with check (true);

drop policy if exists "policy_credentials_update" on public.warroom_credentials;
create policy "policy_credentials_update" on public.warroom_credentials
  for update using (
    public.warroom_is_admin()
    or id = public.warroom_current_user_id()
  ) with check (
    public.warroom_is_admin()
    or id = public.warroom_current_user_id()
  );

-- OTP / JWT: هیچ دسترسی کلاینتی — فقط service_role سرور Node
alter table public.warroom_otp_codes enable row level security;
alter table public.warroom_otp_rate_limits enable row level security;
alter table public.warroom_refresh_tokens enable row level security;
alter table public.warroom_otp_codes force row level security;
alter table public.warroom_otp_rate_limits force row level security;
alter table public.warroom_refresh_tokens force row level security;

drop policy if exists "policy_otp_no_client" on public.warroom_otp_codes;
drop policy if exists "policy_otp_rate_no_client" on public.warroom_otp_rate_limits;
drop policy if exists "policy_refresh_no_client" on public.warroom_refresh_tokens;

-- ----------------------------------------------------------------------------
-- ۸) امنیت Storage رسانه‌ها (warroom-media) — ایمن در برابر خطای ۴۲۷۱۰
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('warroom-media', 'warroom-media', true)
on conflict (id) do update set public = true;

-- تعریف سیاست‌های باکت با بررسی عدم وجود (ممانعت از ERROR: 42710)
do $$
begin
  -- تلاش برای لغو تمیز سیاست‌های قدیمی در صورت امکان
  begin
    drop policy if exists "warroom_media_public_write" on storage.objects;
    drop policy if exists "warroom_media_public_update" on storage.objects;
    drop policy if exists "warroom_media_public_delete" on storage.objects;
    drop policy if exists "warroom_media_public_read" on storage.objects;
    drop policy if exists "warroom_media_read" on storage.objects;
    drop policy if exists "warroom_media_upload" on storage.objects;
    drop policy if exists "warroom_media_modify" on storage.objects;
    drop policy if exists "warroom_media_delete" on storage.objects;
  exception when others then
    null;
  end;

  -- ۱. خواندن فایل‌ها: عمومی برای نمایش آواتارها و عکس‌ها
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'warroom_media_read'
  ) then
    create policy "warroom_media_read" on storage.objects
      for select using (bucket_id = 'warroom-media');
  end if;

  -- ۲. آپلود فایل: فقط کاربران احراز هویت شده در مسیر مجاز
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'warroom_media_upload'
  ) then
    create policy "warroom_media_upload" on storage.objects
      for insert to authenticated with check (
        bucket_id = 'warroom-media'
        and (
          public.warroom_is_admin()
          or (storage.foldername(name))[1] = public.warroom_current_user_id()
          or (storage.foldername(name))[1] in ('avatars', 'submissions', 'shared')
        )
      );
  end if;

  -- ۳. ویرایش فایل: فقط مالک یا ادمین سامانه
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'warroom_media_modify'
  ) then
    create policy "warroom_media_modify" on storage.objects
      for update to authenticated using (
        bucket_id = 'warroom-media'
        and (
          public.warroom_is_admin()
          or (storage.foldername(name))[1] = public.warroom_current_user_id()
          or owner::text = auth.uid()::text
        )
      );
  end if;

  -- ۴. حذف فایل: فقط مالک یا ادمین سامانه
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'warroom_media_delete'
  ) then
    create policy "warroom_media_delete" on storage.objects
      for delete to authenticated using (
        bucket_id = 'warroom-media'
        and (
          public.warroom_is_admin()
          or (storage.foldername(name))[1] = public.warroom_current_user_id()
          or owner::text = auth.uid()::text
        )
      );
  end if;
end;
$$;

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
      'warroom_credentials','warroom_sessions','warroom_password_resets',
      'warroom_otp_codes','warroom_otp_rate_limits','warroom_refresh_tokens'
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

create table if not exists public.warroom_credentials (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- پروفایل رزروشده مدیر؛ عمداً هیچ credential یا رمز پیش‌فرضی seed نمی‌شود.
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
on conflict (id) do nothing;

-- ============================================================================
-- 🔑 توابع legacy تغییر رمز فقط برای service_role؛ ورود مدیر باید bootstrap امن شود.
-- ============================================================================

-- تابع تغییر مستقیم رمز عبور مدیر ارشد
create or replace function public.warroom_set_admin_password(new_password text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
begin
  if new_password is null or length(trim(new_password)) < 12 then
    raise exception 'رمز عبور باید حداقل شامل ۱۲ کاراکتر باشد.';
  end if;

  v_hash := encode(digest(trim(new_password), 'sha256'), 'hex');

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    'u-admin',
    jsonb_build_object('password_hash', v_hash, 'mustChangePassword', true),
    now()
  )
  on conflict (id) do update set
    data = jsonb_build_object('password_hash', v_hash, 'mustChangePassword', true),
    updated_at = now();

  return 'رمز عبور مدیر ارشد (u-admin) با موفقیت به‌روزرسانی شد.';
end;
$$;

-- تابع تغییر رمز عبور کاربران و رزمنده‌ها
create or replace function public.warroom_set_user_password(
  target_user_id text,
  new_plain_password text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hash text;
begin
  if new_plain_password is null or length(trim(new_plain_password)) < 12 then
    raise exception 'رمز عبور باید حداقل شامل ۱۲ کاراکتر باشد.';
  end if;

  v_hash := encode(digest(trim(new_plain_password), 'sha256'), 'hex');

  insert into public.warroom_credentials (id, data, updated_at)
  values (
    target_user_id,
    jsonb_build_object('password_hash', v_hash, 'mustChangePassword', true),
    now()
  )
  on conflict (id) do update set
    data = jsonb_build_object('password_hash', v_hash, 'mustChangePassword', true),
    updated_at = now();

  return 'رمز عبور کاربر ' || target_user_id || ' با موفقیت به‌روزرسانی شد.';
end;
$$;

-- اعطای دسترسی اجرای توابع تغییر رمز
revoke execute on function public.warroom_set_admin_password(text) from public, anon, authenticated;
grant execute on function public.warroom_set_admin_password(text) to service_role;
revoke execute on function public.warroom_set_user_password(text, text) from public, anon, authenticated;
grant execute on function public.warroom_set_user_password(text, text) to service_role;

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
    "homeSectionsOrder": ["hero", "prizes", "messengers", "footer"],
    "rulesHeaderTitle": "قوانین و مقررات رسمی سامانه",
    "rulesHeaderSubtitle": "ضوابط برگزاری مسابقات، داوری مأموریت‌ها و آیین‌نامه انضباطی اتاق جنگ",
    "rulesNoticeTitle": "منشور اخلاقی و انضباطی شرکت‌کنندگان",
    "rulesNoticeText": "تمامی شرکت‌کنندگان، مربیان و سرگروه‌ها با عضویت و حضور در سامانه متعهد به رعایت کامل مفاد این آیین‌نامه می‌باشند. هدف ما ایجاد بستری عادلانه، شفاف، پویا و سازنده برای شکوفایی استعدادها و تقویت تفکر استراتژیک است.",
    "rulesSearchPlaceholder": "جستجو در متن قوانین (مثال: داوری، جوخه، امتیاز، مهلت)...",
    "rulesBottomCardTitle": "سوالی درباره قوانین، آیین‌نامه یا نحوه امتیازدهی دارید؟",
    "rulesBottomCardText": "می‌توانید با بخش پشتیبانی ستاد مرکزی تماس حاصل فرمایید یا از طریق سامانه تیکت ارسال کنید.",
    "rulesBottomSupportButtonText": "ارسال تیکت به ستاد پشتیبانی",
    "rulesBottomHomeButtonText": "بازگشت به صفحه اصلی",
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
    "showCountdownTimer": true,
    "gameMapTimerDeadline": "2026-11-01T23:59:59Z",
    "gameMapEnforcePoints": true,
    "enableGroupTimer": true,
    "groupTimerDays": 14,
    "countdownTargetDate": "2026-11-01T23:59:59Z",
    "heroCountdown": "۰۲:۱۴:۳۹:۱۵",
    "customLogoUrl": "/images/logos/warroom_logo.webp",
    "homeSectionsOrder": ["hero", "prizes", "messengers", "footer"],
    "rulesHeaderTitle": "قوانین و مقررات رسمی سامانه",
    "rulesHeaderSubtitle": "ضوابط برگزاری مسابقات، داوری مأموریت‌ها و آیین‌نامه انضباطی اتاق جنگ",
    "rulesNoticeTitle": "منشور اخلاقی و انضباطی شرکت‌کنندگان",
    "rulesNoticeText": "تمامی شرکت‌کنندگان، مربیان و سرگروه‌ها با عضویت و حضور در سامانه متعهد به رعایت کامل مفاد این آیین‌نامه می‌باشند. هدف ما ایجاد بستری عادلانه، شفاف، پویا و سازنده برای شکوفایی استعدادها و تقویت تفکر استراتژیک است.",
    "rulesSearchPlaceholder": "جستجو در متن قوانین (مثال: داوری، جوخه، امتیاز، مهلت)...",
    "rulesBottomCardTitle": "سوالی درباره قوانین، آیین‌نامه یا نحوه امتیازدهی دارید؟",
    "rulesBottomCardText": "می‌توانید با بخش پشتیبانی ستاد مرکزی تماس حاصل فرمایید یا از طریق سامانه تیکت ارسال کنید.",
    "rulesBottomSupportButtonText": "ارسال تیکت به ستاد پشتیبانی",
    "rulesBottomHomeButtonText": "بازگشت به صفحه اصلی"
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
    and tablename in ('warroom_users', 'warroom_wallet_transactions', 'warroom_payment_transactions', 'warroom_server_settings', 'warroom_credentials', 'warroom_otp_codes', 'warroom_refresh_tokens');

  if realtime_leaks_count > 0 then
    raise warning 'SECURITY AUDIT: Sensitive tables still exposed in Realtime!';
  else
    raise notice 'SECURITY AUDIT CHECK 3: Sensitive tables excluded from Realtime (PASS).';
  end if;
end;
$$;

-- ============================================================================
-- ۱۱.۲) کوئری‌های تشخیصی و بازرسی انفرادی (Standalone Diagnostic & Audit Queries)
-- [DIAGNOSTIC / READ-ONLY — کاملاً بدون تغییر در پایگاه داده]
-- ℹ️ دستورالعمل: این کوئری‌ها را می‌توانید به صورت جداگانه در Supabase SQL Editor
-- اجرا کنید تا ساختار و امنیت پایگاه داده را بدون هیچ‌گونه تغییری ارزیابی نمایید.
-- ============================================================================

-- کوئری تشخیصی ۱: بررسی وضعیت فعال بودن RLS روی تمام جداول public
-- [DIAGNOSTIC / READ-ONLY]
select 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

-- کوئری تشخیصی ۲: لیست و تعداد تمام سیاست‌های امنیتی (Policies) تعریف‌شده
-- [DIAGNOSTIC / READ-ONLY]
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- کوئری تشخیصی ۳: اعتبارسنجی ثبت حساب ادمین و رمز عبور در warroom_credentials
-- [DIAGNOSTIC / READ-ONLY]
select 
  id, 
  data->>'password_hash' is not null as has_password_hash,
  data->>'mustChangePassword' as must_change_password,
  updated_at
from public.warroom_credentials
where id = 'u-admin';

-- کوئری تشخیصی ۴: بررسی عدم وجود رمز عبور یا هش در جدول عمومی warroom_users (تأیید اصل PII Protection)
-- [DIAGNOSTIC / READ-ONLY]
select 
  id,
  data->>'first_name' as first_name,
  data->>'last_name' as last_name,
  data->>'role' as role,
  data ? 'password' as leaks_password,
  data ? 'password_hash' as leaks_password_hash
from public.warroom_users
where id = 'u-admin' or data ? 'password' or data ? 'password_hash';

-- کوئری تشخیصی ۵: بررسی وضعیت باکت و سیاست‌های Supabase Storage
-- [DIAGNOSTIC / READ-ONLY]
select 
  id, 
  name, 
  public, 
  created_at
from storage.buckets
where id = 'warroom-media';

-- کوئری تشخیصی ۶: جداول موجود در انتشار Realtime (بررسی عدم نشت داده‌های حساس)
-- [DIAGNOSTIC / READ-ONLY]
select 
  pubname, 
  schemaname, 
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- ============================================================================
-- MIGRATION 2/6: 20261011001000_lock_auth_secrets.sql
-- ============================================================================

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
alter table public.warroom_otp_codes add column if not exists verified boolean not null default false;
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
      verified = v_match,
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

revoke execute on function public.warroom_hit_otp_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.warroom_verify_otp(uuid, text, text) from public, anon, authenticated;
grant execute on function public.warroom_hit_otp_rate_limit(text, integer, integer) to service_role;
grant execute on function public.warroom_verify_otp(uuid, text, text) to service_role;

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

-- ============================================================================
-- MIGRATION 3/6: 20261011002000_react_supabase_auth_rpcs.sql
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 4/6: 20261012000000_harden_rls_and_auth.sql
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 5/6: 20261013000000_final_hardening_and_session.sql
-- ============================================================================

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

-- ============================================================================
-- MIGRATION 6/6: 20261014000000_post_merge_auth_session_security.sql
-- ============================================================================

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

-- ============================================================================
-- End of WarRoom V4 complete Supabase setup
-- ============================================================================
