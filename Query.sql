-- ============================================================================
--  🎖️  پلتفرم «اتاق جنگ» — Query کامل ساخت دیتابیس Supabase
-- ============================================================================
--  راهنمای اجرا:
--    ۱) وارد پروژه خود در https://supabase.com/dashboard شوید
--    ۲) از منوی کنار:  SQL Editor → New query
--    ۳) کل این فایل را Paste کرده و Run کنید
--
--  این فایل «مکمل و جایگزین» فایل supabase/schema.sql است و شامل:
--    • جدول‌های کاربران، گروه‌ها، چت گروهی، محتوا، پرداخت و ثبت‌نام گروهی
--    • 🛡️ ۵ جدول امنیتی سرور (اعتبارنامه‌ها، نشست‌ها، درخواست‌های تغییر رمز،
--      رخدادهای امنیتی، تنظیمات امنیتی) — بدون هیچ سیاست عمومی (RLS بسته)
--    • تریگر به‌روزرسانی خودکار updated_at
--    • ایندکس‌های کمکی روی فیلدهای jsonb
--    • فعال‌سازی RLS (جدول‌های عمومی: سیاست دموی باز / جدول‌های حساس: بدون دسترسی عمومی)
--    • مجوزهای اجرا (Grants)
--    • پروفایل «مدیر کل» فقط با یک ایندکس یکتا (بدون هیچ رمز پیش‌فرض در دیتابیس)
--    • باکت Storage عمومی برای رسانه‌ها (warroom-media)
--
--  🛡️  نکات امنیتی مهم:
--    ۱) هیچ رمز عبوری در این فایل (متن ساده یا هش) قرار ندارد. اعتبارنامه‌ها فقط
--       توسط بک‌اند (server/) با الگوریتم scrypt ذخیره می‌شوند.
--    ۲) رمز نخستین ورود مدیر با متغیر محیطی WARROOM_ADMIN_INITIAL_PASSWORD
--       تعیین می‌شود و سامانه کاربر را به تغییر آن ملزم می‌کند.
--    ۳) جدول‌های امنیتی با RLS فعال و «بدون سیاست» ساخته می‌شوند؛ بنابراین
--       کلید عمومی (anon) هیچ دسترسی خواندن/نوشتن به آن‌ها ندارد و فقط
--       کلید service_role (که صرفاً روی سرور است) به آن‌ها دسترسی دارد.
--    ۴) در کد سرور هیچ کوئری SQL رشته‌ای ساخته نمی‌شود؛ همه دسترسی‌ها از طریق
--       PostgREST (پارامترمحور) با اعتبارسنجی ورودی انجام می‌شود (ضد SQL Injection).
--    ۵) سیاست‌های جدول‌های عمومی برای «حالت دمو» باز هستند؛ پیش از انتشار عمومی،
--       بخش «سیاست‌های سخت‌گیرانه تولیدی» انتهای فایل را اعمال کنید.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ۰) اکستنشن‌ها
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ۱) ساخت جداول (الگوی سند JSONB)
--    ساختار جداول با مدل داده TypeScript برنامه (src/types.ts) یک‌به‌یک هماهنگ است.
-- ----------------------------------------------------------------------------

-- کاربران (رزمنده‌ها و ادمین‌ها)
create table if not exists public.warroom_users (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- جوخه‌ها / گروه‌ها
create table if not exists public.warroom_groups (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ثبت نیروی جوخه با چهار درجه: سرباز، فرمانرو، جوخه‌دار و فرمانده.
-- رمز عبور فقط به‌صورت هش‌شده ذخیره می‌شود؛ فرمانده همان سازنده جوخه است.
create table if not exists public.warroom_squad_enlistments (
  id                  text primary key,
  squad_id            text not null,
  created_by_user_id   text not null,
  target_user_id       text,
  national_code        text not null,
  mobile               text not null,
  password_hash        text not null,
  rank_code            text not null default 'soldier'
    check (rank_code in ('soldier', 'farmando', 'jokhedar', 'commander')),
  status               text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- نگاشت سلسله‌مراتب جوخه‌ها؛ با پذیرش ادغام، target زیرمجموعه source می‌شود.
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

-- دفتر تراکنش‌های مالی/امتیازی (سوابق سیستم).
-- توجه: انتقال کاربر به کاربر از رابط کاربری حذف شده و سامانه به سمت «رسیدهای پرداخت بانکی»
-- (warroom_payment_transactions) هدایت شده است؛ این جدول جهت آرشیو و نگهداری یکپارچگی دفترکل حفظ شده است.
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

-- انتقال امتیاز (آرشیو دفترکل تاریخی)؛ فرم و قابلیت انتقال از UI کلاینت حذف شده است.
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

-- اتاق‌های چت گروهی
create table if not exists public.warroom_group_chat_rooms (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- پیام‌های چت گروهی
create table if not exists public.warroom_group_chat_messages (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- مأموریت‌ها
create table if not exists public.warroom_missions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ارسال‌ها / پاسخ‌های مأموریت
create table if not exists public.warroom_submissions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- آموزش‌ها
create table if not exists public.warroom_trainings (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- مدال‌ها
create table if not exists public.warroom_medals (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- مدال‌های اهداشده به کاربران
create table if not exists public.warroom_user_medals (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- تیکت‌های پشتیبانی
create table if not exists public.warroom_support_tickets (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- پاسخ‌های تیکت‌ها
create table if not exists public.warroom_support_replies (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- اطلاعیه‌های درون‌سامانه
create table if not exists public.warroom_announcements (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- اخبار
create table if not exists public.warroom_news (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- نوتیفیکیشن‌های زنده (Push)
create table if not exists public.warroom_notifications (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- اطلاعیه‌های صفحه اصلی
create table if not exists public.warroom_home_announcements (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- سؤالات متداول (FAQ)
create table if not exists public.warroom_faqs (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- مراحل نقشه بازی (Stages)
create table if not exists public.warroom_stages (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- جوایز و پاداش‌ها (Prizes)
create table if not exists public.warroom_prizes (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 🆕 آثار ویترین (پست‌های نمایش عمومی — ساخته می‌شوند از پنل مدیریت)
create table if not exists public.warroom_vitrin_posts (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 🆕 نظرات و دیدگاه‌های ویترین
create table if not exists public.warroom_vitrin_comments (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 🆕 درگاه‌های بازی / لینک‌دهی (Game Portals)
create table if not exists public.warroom_game_portals (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 🆕 چالش‌های روزانه اتاق جنگ (Daily Challenges)
create table if not exists public.warroom_daily_challenges (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 🆕 موسیقی و رادیو اتاق جنگ (Soundtracks & Radio Tracks)
create table if not exists public.warroom_soundtracks (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- جدول کلید/مقدار برای تنظیمات سراسری سایت
-- (site_settings ،home_stats ،soundtracks ،audio_settings ،saved_posts_<userId> و ...)
create table if not exists public.warroom_kv (
  id         text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 🆕 درخواست‌های تغییر رمز (نسخه محلی/کلاینتی) — فاقد هرگونه رمز عبور
create table if not exists public.warroom_password_reset_requests (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- پرداخت‌ها و تراکنش‌های ثبت‌نام؛ هر تغییر وضعیت در data ثبت و قابل audit است.
create table if not exists public.warroom_payment_transactions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- اعتبارنامه و وضعیت ثبت‌نام گروهی سرگروه؛ سقف پیش‌فرض هر گروه چهار نفر است.
create table if not exists public.warroom_team_registration_sessions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 30. نشست ثبت‌نام تیم / ثبت‌نام‌های گروهی (ساده)
create table if not exists public.warroom_team_registrations (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- درخواست‌های پیوستن یا ادغام گروهی؛ عضویت فقط پس از accepted اعمال می‌شود.
create table if not exists public.warroom_group_join_requests (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- درخواست تفکیک/ادغام جوخه‌ها؛ با پذیرش، جوخه مقصد زیرمجموعه جوخه درخواست‌دهنده می‌شود.
create table if not exists public.warroom_squad_merge_requests (
  id                  text primary key,
  source_squad_id     text not null,
  target_squad_id     text not null,
  requested_by_user_id text not null,
  status              text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  note                text,
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz,
  resolved_by_user_id text,
  check (source_squad_id <> target_squad_id)
);

-- ============================================================================
--  🛡️  جدول‌های امنیتی (فقط برای بک‌اند سرور با کلید service_role)
--      RLS فعال است و هیچ سیاستی برای anon/authenticated ساخته نمی‌شود.
-- ============================================================================

-- Redis-ready sessions metadata: session IDs are stored in Redis, but the DB keeps a
-- signed record for audit and validation purposes.
create table if not exists public.warroom_session_log (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- اعتبارنامه‌ها: فقط هش scrypt + Salt (هرگز متن ساده)
create table if not exists public.warroom_credentials (
  id         text primary key,          -- شناسه کاربر
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- نشست‌های امن: شناسه = هش SHA-256 توکن نشست (توکن خام هرگز ذخیره نمی‌شود)
create table if not exists public.warroom_sessions (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- درخواست‌های تغییر رمز (سرور) — شامل شماره تماس، وضعیت و یادداشت مدیر
create table if not exists public.warroom_password_resets (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- رخدادهای امنیتی (Audit Log): ورود، تلاش ناموفق، محدودسازی نرخ، عملیات مدیر
create table if not exists public.warroom_audit_log (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- تنظیمات امنیتی سرور (قفل حساب‌ها، شمارنده‌ها)
create table if not exists public.warroom_security_kv (
  id         text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ۲) تریگر به‌روزرسانی خودکار updated_at
-- ----------------------------------------------------------------------------
create or replace function public.warroom_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- موجودی امتیاز از دفترکل محاسبه می‌شود و ستون قابل‌دست‌کاری جداگانه ندارد.
create or replace function public.warroom_point_balance(p_user_id text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(
    case
      when transaction_type in ('deposit', 'reward', 'transfer_in', 'adjustment') then amount
      when transaction_type in ('withdrawal', 'transfer_out') then -amount
      else 0
    end
  ), 0)::bigint
  from public.warroom_wallet_transactions
  where user_id = p_user_id and currency = 'points' and status = 'completed';
$$;

-- ثبت نیروی جوخه: احراز اطلاعات اصلی باید در API انجام شود و password_hash هرگز plaintext نیست.
create or replace function public.warroom_register_squad_member(
  p_id text,
  p_squad_id text,
  p_created_by_user_id text,
  p_target_user_id text,
  p_national_code text,
  p_mobile text,
  p_password_hash text,
  p_rank_code text default 'soldier'
)
returns public.warroom_squad_enlistments
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.warroom_squad_enlistments;
begin
  if p_password_hash is null or length(trim(p_password_hash)) < 32 then
    raise exception 'password_hash_required';
  end if;
  if p_rank_code not in ('soldier', 'farmando', 'jokhedar', 'commander') then
    raise exception 'invalid_rank_code';
  end if;
  insert into public.warroom_squad_enlistments
    (id, squad_id, created_by_user_id, target_user_id, national_code, mobile, password_hash, rank_code)
  values
    (p_id, p_squad_id, p_created_by_user_id, nullif(p_target_user_id, ''), p_national_code, p_mobile, p_password_hash, p_rank_code)
  returning * into result;
  return result;
end;
$$;

-- انتقال امتیاز اتمیک: ابتدا موجودی بررسی، سپس دو رکورد دفترکل و یک رکورد انتقال ثبت می‌شود.
create or replace function public.warroom_transfer_points(
  p_transfer_id text,
  p_sender_user_id text,
  p_receiver_user_id text,
  p_amount bigint,
  p_note text default null
)
returns public.warroom_point_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.warroom_point_transfers;
  sender_balance bigint;
begin
  if p_sender_user_id is null or p_receiver_user_id is null or p_sender_user_id = p_receiver_user_id then
    raise exception 'invalid_transfer_parties';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_transfer_amount';
  end if;
  sender_balance := public.warroom_point_balance(p_sender_user_id);
  if sender_balance < p_amount then
    raise exception 'insufficient_points';
  end if;

  insert into public.warroom_point_transfers
    (id, sender_user_id, receiver_user_id, amount, status, note, completed_at)
  values
    (p_transfer_id, p_sender_user_id, p_receiver_user_id, p_amount, 'completed', p_note, now());

  insert into public.warroom_wallet_transactions
    (id, user_id, transaction_type, amount, currency, status, reference_id, description)
  values
    ('wallet_out_' || p_transfer_id, p_sender_user_id, 'transfer_out', p_amount, 'points', 'completed', p_transfer_id, p_note),
    ('wallet_in_' || p_transfer_id, p_receiver_user_id, 'transfer_in', p_amount, 'points', 'completed', p_transfer_id, p_note);

  select * into result from public.warroom_point_transfers where id = p_transfer_id;
  return result;
exception
  when unique_violation then
    raise exception 'transfer_id_already_exists';
end;
$$;

-- پذیرش تفکیک: target زیرمجموعه source می‌شود و اعضای target برای چت مشترک به source منتقل می‌شوند.
create or replace function public.warroom_accept_squad_merge(
  p_request_id text,
  p_resolved_by_user_id text
)
returns public.warroom_squad_merge_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.warroom_squad_merge_requests;
begin
  select * into request_row
  from public.warroom_squad_merge_requests
  where id = p_request_id and status = 'pending'
  for update;
  if not found then raise exception 'merge_request_not_pending'; end if;

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

  -- اعضای هر دو جوخه در اتاق والد قابل مشاهده و گفتگو خواهند بود.
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
  set status = 'accepted', resolved_at = now(), resolved_by_user_id = p_resolved_by_user_id
  where id = request_row.id
  returning * into request_row;
  return request_row;
end;
$$;

-- برای منوی همبرگری چت: ۵ مورد در هر صفحه، حداکثر ۱۰ مورد برای بار اول، و جست‌وجوی نام جوخه.
create or replace function public.warroom_list_chat_rooms(
  p_search text default null,
  p_page integer default 0,
  p_page_size integer default 5
)
returns table (room_id text, room_data jsonb, total_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
    select id, data, count(*) over () as total_count
    from public.warroom_group_chat_rooms
    where nullif(trim(p_search), '') is null
       or lower(coalesce(data->>'name', '')) like '%' || lower(trim(p_search)) || '%'
       or lower(coalesce(data->>'group_id', '')) like '%' || lower(trim(p_search)) || '%'
    order by updated_at desc
    limit least(greatest(coalesce(p_page_size, 5), 1), 10)
    offset greatest(coalesce(p_page, 0), 0) * least(greatest(coalesce(p_page_size, 5), 1), 10)
  )
  select id, data, total_count from filtered;
$$;

revoke execute on function public.warroom_point_balance(text) from public, anon, authenticated;
revoke execute on function public.warroom_register_squad_member(text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.warroom_transfer_points(text, text, text, bigint, text) from public, anon, authenticated;
revoke execute on function public.warroom_accept_squad_merge(text, text) from public, anon, authenticated;
revoke execute on function public.warroom_list_chat_rooms(text, integer, integer) from public, anon, authenticated;
grant execute on function public.warroom_point_balance(text) to service_role;
grant execute on function public.warroom_register_squad_member(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.warroom_transfer_points(text, text, text, bigint, text) to service_role;
grant execute on function public.warroom_accept_squad_merge(text, text) to service_role;
grant execute on function public.warroom_list_chat_rooms(text, integer, integer) to service_role;

-- حذف آبشاری گروهی: اگر سرگروه حذف شد، گروه و داده‌های وابسته‌اش نیز حذف می‌شوند.
-- حذف عضو عادی به این trigger وارد نمی‌شود و گروه را نگه می‌دارد.
create or replace function public.warroom_delete_owned_group_after_user_delete()
returns trigger
language plpgsql
security definer
set search_path = public
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

do $$
declare
  t text;
begin
  foreach t in array array[
    'warroom_users','warroom_groups','warroom_group_chat_rooms','warroom_group_chat_messages','warroom_stages','warroom_prizes','warroom_missions','warroom_submissions',
    'warroom_trainings','warroom_medals','warroom_user_medals',
    'warroom_support_tickets','warroom_support_replies','warroom_announcements',
    'warroom_news','warroom_notifications','warroom_home_announcements','warroom_faqs',
    'warroom_vitrin_posts','warroom_vitrin_comments','warroom_game_portals','warroom_daily_challenges','warroom_soundtracks','warroom_kv',
    'warroom_password_reset_requests','warroom_payment_transactions','warroom_team_registration_sessions','warroom_team_registrations','warroom_group_join_requests',
    'warroom_squad_enlistments','warroom_squad_hierarchy','warroom_wallet_transactions','warroom_point_transfers','warroom_squad_merge_requests',
    'warroom_session_log','warroom_credentials','warroom_sessions',
    'warroom_password_resets','warroom_audit_log','warroom_security_kv'
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
-- ۳) ایندکس‌های کمکی برای جستجوهای رایج روی ستون jsonb
-- ----------------------------------------------------------------------------
create index if not exists idx_warroom_users_national_code on public.warroom_users ((data->>'national_code'));
create index if not exists idx_warroom_users_personal_code on public.warroom_users ((data->>'personal_code'));
create index if not exists idx_warroom_users_role          on public.warroom_users ((data->>'role'));
create index if not exists idx_warroom_users_gender        on public.warroom_users ((data->>'gender'));
create index if not exists idx_warroom_users_group_id      on public.warroom_users ((data->>'group_id'));
create index if not exists idx_warroom_users_squad_rank    on public.warroom_users ((data->>'squad_rank'));
create index if not exists idx_warroom_submissions_user    on public.warroom_submissions ((data->>'personal_code'));
create index if not exists idx_warroom_submissions_mission on public.warroom_submissions ((data->>'mission_id'));
create index if not exists idx_warroom_tickets_status      on public.warroom_support_tickets ((data->>'status'));
create index if not exists idx_warroom_notifications_target on public.warroom_notifications ((data->>'target'));
create index if not exists idx_warroom_vitrin_comments_post on public.warroom_vitrin_comments ((data->>'postId'));
create index if not exists idx_warroom_user_medals_code     on public.warroom_user_medals ((data->>'personal_code'));
-- 🛡️ ایندکس‌های جدول‌های امنیتی (کارایی بالای احراز هویت و صف درخواست‌ها)
create index if not exists idx_warroom_credentials_updated  on public.warroom_credentials (updated_at desc);
create index if not exists idx_warroom_sessions_expires     on public.warroom_sessions ((data->>'expires_at'));
create index if not exists idx_warroom_sessions_user        on public.warroom_sessions ((data->>'user_id'));
create index if not exists idx_warroom_resets_status        on public.warroom_password_resets ((data->>'status'));
create index if not exists idx_warroom_resets_user          on public.warroom_password_resets ((data->>'user_id'));
create index if not exists idx_warroom_resets_code          on public.warroom_password_resets ((data->>'tracking_code'));
create index if not exists idx_warroom_audit_at             on public.warroom_audit_log (updated_at desc);
create index if not exists idx_warroom_payment_user         on public.warroom_payment_transactions ((data->>'user_id'));
create index if not exists idx_warroom_payment_status       on public.warroom_payment_transactions ((data->>'status'));
create index if not exists idx_warroom_payment_created      on public.warroom_payment_transactions ((data->>'created_at'));
create index if not exists idx_warroom_payment_national_code on public.warroom_payment_transactions ((data->>'national_code'));
create index if not exists idx_warroom_payment_ref_id        on public.warroom_payment_transactions ((data->>'ref_id'));
create index if not exists idx_warroom_payment_authority     on public.warroom_payment_transactions ((data->>'authority'));
create index if not exists idx_warroom_game_portals_status   on public.warroom_game_portals ((data->>'status'));
create index if not exists idx_warroom_game_portals_featured on public.warroom_game_portals ((data->>'featured'));
create index if not exists idx_warroom_stages_number         on public.warroom_stages ((data->>'number'));
create index if not exists idx_warroom_prizes_points         on public.warroom_prizes ((data->>'requiredPoints'));
create index if not exists idx_warroom_team_session_username on public.warroom_team_registration_sessions ((data->>'shared_username'));
create index if not exists idx_warroom_team_session_group    on public.warroom_team_registration_sessions ((data->>'group_id'));
create index if not exists idx_warroom_team_session_status   on public.warroom_team_registration_sessions ((data->>'status'));
create index if not exists idx_warroom_join_target           on public.warroom_group_join_requests ((data->>'target_group_id'));
create index if not exists idx_warroom_join_requester        on public.warroom_group_join_requests ((data->>'requester_id'));
create index if not exists idx_warroom_join_status           on public.warroom_group_join_requests ((data->>'status'));
create index if not exists idx_warroom_enlistments_squad     on public.warroom_squad_enlistments (squad_id, status);
create index if not exists idx_warroom_enlistments_national  on public.warroom_squad_enlistments (national_code);
create index if not exists idx_warroom_enlistments_mobile    on public.warroom_squad_enlistments (mobile);
create index if not exists idx_warroom_hierarchy_parent      on public.warroom_squad_hierarchy (parent_squad_id);
create index if not exists idx_warroom_wallet_user_created   on public.warroom_wallet_transactions (user_id, created_at desc);
create index if not exists idx_warroom_wallet_reference     on public.warroom_wallet_transactions (reference_id);
create index if not exists idx_warroom_transfers_sender     on public.warroom_point_transfers (sender_user_id, created_at desc);
create index if not exists idx_warroom_transfers_receiver   on public.warroom_point_transfers (receiver_user_id, created_at desc);
create index if not exists idx_warroom_merge_status         on public.warroom_squad_merge_requests (status, created_at desc);
create index if not exists idx_warroom_daily_challenges_act on public.warroom_daily_challenges ((data->>'isActive'));
create index if not exists idx_warroom_soundtracks_active   on public.warroom_soundtracks ((data->>'is_active'));
create index if not exists idx_warroom_soundtracks_order    on public.warroom_soundtracks ((data->>'order'));

-- 🆕 قاعده «فقط یک ادمین»: ایندکس یکتای شرطی باعث می‌شود در کل دیتابیس
--    فقط یک کاربر با role='admin' وجود داشته باشد (افزودن ادمین دوم خطا می‌دهد).
create unique index if not exists idx_warroom_users_single_admin
  on public.warroom_users ((data->>'role'))
  where (data->>'role') = 'admin';

-- ----------------------------------------------------------------------------
-- ۴) فعال‌سازی RLS و سیاست‌های دسترسی (حالت دمو/توسعه: باز)
-- ----------------------------------------------------------------------------
-- در این حالت کلاینت با کلید anon/publishable اجازه خواندن/نوشتن کامل دارد تا
-- برنامه بدون احراز هویت Supabase Auth نیز سراسری کار کند.
-- ⚠️ قبل از انتشار عمومی، بخش «سیاست‌های سخت‌گیرانه تولیدی» در انتهای فایل را اعمال کنید.

alter table public.warroom_users              enable row level security;
alter table public.warroom_groups             enable row level security;
alter table public.warroom_group_chat_rooms  enable row level security;
alter table public.warroom_group_chat_messages enable row level security;
alter table public.warroom_stages            enable row level security;
alter table public.warroom_prizes            enable row level security;
alter table public.warroom_missions          enable row level security;
alter table public.warroom_submissions       enable row level security;
alter table public.warroom_trainings         enable row level security;
alter table public.warroom_medals            enable row level security;
alter table public.warroom_user_medals       enable row level security;
alter table public.warroom_support_tickets   enable row level security;
alter table public.warroom_support_replies   enable row level security;
alter table public.warroom_announcements     enable row level security;
alter table public.warroom_news              enable row level security;
alter table public.warroom_notifications     enable row level security;
alter table public.warroom_home_announcements enable row level security;
alter table public.warroom_faqs              enable row level security;
alter table public.warroom_vitrin_posts      enable row level security;
alter table public.warroom_vitrin_comments   enable row level security;
alter table public.warroom_game_portals      enable row level security;
alter table public.warroom_daily_challenges  enable row level security;
alter table public.warroom_soundtracks       enable row level security;
alter table public.warroom_kv                enable row level security;
alter table public.warroom_password_reset_requests enable row level security;
alter table public.warroom_payment_transactions enable row level security;
alter table public.warroom_team_registration_sessions enable row level security;
alter table public.warroom_team_registrations enable row level security;
alter table public.warroom_group_join_requests enable row level security;
alter table public.warroom_session_log enable row level security;
alter table public.warroom_squad_enlistments enable row level security;
alter table public.warroom_squad_hierarchy enable row level security;
alter table public.warroom_wallet_transactions enable row level security;
alter table public.warroom_point_transfers enable row level security;
alter table public.warroom_squad_merge_requests enable row level security;

-- 🛡️ جدول‌های حساس: RLS فعال + «بدون سیاست» → هیچ دسترسی عمومی (anon/authenticated)
--    فقط کلید service_role (صرفاً روی سرور) می‌تواند بخواند/بنویسد.
alter table public.warroom_credentials     enable row level security;
alter table public.warroom_sessions        enable row level security;
alter table public.warroom_password_resets enable row level security;
alter table public.warroom_audit_log       enable row level security;
alter table public.warroom_security_kv     enable row level security;

-- Client-side diagnostics may append sanitized events; reading and deleting logs
-- remains restricted to the server/service_role.
drop policy if exists "warroom_audit_append" on public.warroom_audit_log;
create policy "warroom_audit_append" on public.warroom_audit_log
  for insert to anon, authenticated
  with check (
    jsonb_typeof(data) = 'object'
    and length(coalesce(data->>'event', '')) between 1 and 160
    and data ? 'createdAt'
  );

do $$
declare
  t text;
begin
  foreach t in array array[
    'warroom_users','warroom_groups','warroom_group_chat_rooms','warroom_group_chat_messages','warroom_stages','warroom_prizes','warroom_missions','warroom_submissions',
    'warroom_trainings','warroom_medals','warroom_user_medals',
    'warroom_support_tickets','warroom_support_replies','warroom_announcements',
    'warroom_news','warroom_notifications','warroom_home_announcements','warroom_faqs',
    'warroom_vitrin_posts','warroom_vitrin_comments','warroom_game_portals','warroom_daily_challenges','warroom_soundtracks','warroom_kv',
    'warroom_password_reset_requests','warroom_payment_transactions','warroom_team_registration_sessions','warroom_team_registrations','warroom_group_join_requests',
    'warroom_squad_enlistments','warroom_squad_hierarchy','warroom_wallet_transactions','warroom_point_transfers','warroom_squad_merge_requests'
  ]
  loop
    execute format('drop policy if exists "warroom_public_access" on public.%I', t);
    execute format(
      'create policy "warroom_public_access" on public.%I
       for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- ۵) مجوزهای اجرا (Grants)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated;

-- 🛡️ لغو دسترسی عمومی به جدول‌های حساس (حتی در صورت تغییر پیش‌فرض‌های schema)
revoke all on public.warroom_credentials     from anon, authenticated;
revoke all on public.warroom_sessions        from anon, authenticated;
revoke all on public.warroom_password_resets from anon, authenticated;
revoke all on public.warroom_audit_log       from anon, authenticated;
grant insert on public.warroom_audit_log to anon, authenticated;
revoke all on public.warroom_security_kv     from anon, authenticated;
revoke all on public.warroom_session_log     from anon, authenticated;

-- اعطای دسترسی به توابع عمومی پایگاه داده
grant execute on all functions in schema public to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- ۶) داده اولیه: پروفایل «مدیر ارشد عملیات»، چالش روزانه پیش‌فرض و موسیقی اتاق جنگ
-- ----------------------------------------------------------------------------
-- 🔑 کد ملی: 0012345678
-- 🔑 رمز عبور: Admin@123456 (هش SHA-256)
-- 🔑 کد اختصاصی: 900000001
insert into public.warroom_users (id, data) values (
  'u-admin',
  $${"id":"u-admin","first_name":"امیرحسین","last_name":"فرماندهی کل","national_code":"0012345678","phone":"09120000000","role":"admin","education_level":"متوسطه دوم","grade":"دوازدهم","gender":"پسر","province":"تهران","city":"تهران","birth_date":"1384/01/15","school_name":"دبیرستان ماندگار البرز","personal_code":"900000001","address":"ستاد مرکزی اتاق جنگ","password":"ad89b64d66caa8e30e5d5ce4a9763f4ecc205814c412175f3e2c50027471426d"}$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- چالش تاکتیکی روزانه پیش‌فرض
insert into public.warroom_daily_challenges (id, data) values (
  'daily_challenge_main',
  $${"id":"daily_challenge_main","title":"چالش تاکتیکی روزانه","description":"با پاسخ به این تست هوش عمیق، ۱۵۰ امتیاز پاداش دریافت کنید.","badge":"tactical_badge","pointsReward":150,"question":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","questionText":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","options":["داشتن تجهیزات مدرن","اخلاص در نیت و خودسازی فردی","شناخت رقبا","شروع بدون برنامه‌ریزی"],"correctOptionIndex":1,"timeLimitSeconds":10,"isActive":true}$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- ثبت همزمان چالش روزانه در warroom_kv
insert into public.warroom_kv (id, value) values (
  'daily_challenge_config',
  $${"id":"daily_challenge_main","title":"چالش تاکتیکی روزانه","description":"با پاسخ به این تست هوش عمیق، ۱۵۰ امتیاز پاداش دریافت کنید.","badge":"tactical_badge","pointsReward":150,"question":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","questionText":"اولین شرط گام برداشتن در مسیر خادمی شهدایی و نبرد سایبری چیست؟","options":["داشتن تجهیزات مدرن","اخلاص در نیت و خودسازی فردی","شناخت رقبا","شروع بدون برنامه‌ریزی"],"correctOptionIndex":1,"timeLimitSeconds":10,"isActive":true}$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- 🎵 قطعه موسیقی پیش‌فرض اتاق جنگ (رادیو تاکتیکی)
insert into public.warroom_soundtracks (id, data) values (
  'track_epic_march_default',
  $${"id":"track_epic_march_default","title":"مارش حماسی اتاق جنگ","subtitle":"تولید سینت‌سایزر هوشمند فرکانسی","tag":"حماسی / رزمی","color":"from-amber-500 to-yellow-400","sourceType":"synth","synthTrackId":"epic_march","durationSeconds":90,"is_active":true,"order":1}$$::jsonb
)
on conflict (id) do update set data = excluded.data, updated_at = now();

-- ثبت همزمان تنظیمات موسیقی در warroom_kv
insert into public.warroom_kv (id, value) values (
  'soundtracks',
  $${"items":[{"id":"track_epic_march_default","title":"مارش حماسی اتاق جنگ","subtitle":"تولید سینت‌سایزر هوشمند فرکانسی","tag":"حماسی / رزمی","color":"from-amber-500 to-yellow-400","sourceType":"synth","synthTrackId":"epic_march","durationSeconds":90,"is_active":true,"order":1}]}$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- 🎮 درگاه‌های ورود به بازی (Game Portals)
-- درگاه فعال و اصلی: «اتاق جنگ» (پیش‌نیاز انتخاب توسط رزمنده پیش از ورود به پنل کاربری)
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

-- ثبت همزمان لیست درگاه‌های بازی در warroom_kv
insert into public.warroom_kv (id, value) values (
  'warroom_game_portals_list',
  $$[{"id":"warroom","title":"اتاق جنگ","subtitle":"سامانه اصلی رقابت و ارزیابی استراتژیک","description":"حل مأموریت‌های هوشمند، رقابت در جدول برترین‌های کشور، دریافت کریستال‌ها و هدایای ویژه ۵۰ میلیارد ریالی.","status":"active","badgeText":"فعال • در حال برگزاری","badgeColor":"bg-emerald-500/20 text-emerald-300 border-emerald-500/50","link":"/journey","targetAudience":"all","tag":"بازی اصلی رویداد","featured":true},{"id":"galaxy","title":"عملیات کهکشان","subtitle":"نبرد فضایی و تسخیر سیارات دانش‌آموزی","description":"شبیه‌ساز فرماندهی ناوگان فضایی و مدیریت منابع انرژی در قلمروهای دوردست.","status":"coming_soon","badgeText":"به‌زودی • فصل ۲","badgeColor":"bg-amber-500/15 text-amber-300 border-amber-500/40","link":"https://galaxy.warroom.ir","targetAudience":"all","tag":"به‌زودی","featured":false},{"id":"cyber","title":"نبرد سایبری","subtitle":"چالش رمزنگاری و نفوذ هوشمند","description":"مسابقه دفاع سایبری، کشف کدهای نفوذ و تحلیل امنیتی داده‌های استراتژیک.","status":"coming_soon","badgeText":"به‌زودی • فصل ۳","badgeColor":"bg-purple-500/15 text-purple-300 border-purple-500/40","link":"https://cyber.warroom.ir","targetAudience":"all","tag":"به‌زودی","featured":false}]$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- 💳 تنظیمات پیش‌فرض درگاه پرداخت بانکی (زرین‌پال / دستی) در warroom_kv
insert into public.warroom_kv (id, value) values (
  'payment_settings',
  $${"id":"payment_settings","enabled":false,"amount":0,"currency":"IRR","gateway":"zarinpal","api_key":"","redirect_url":"","callback_url":"","description":"هزینه ثبت‌نام مسابقه اتاق جنگ","updated_at":"2026-09-25T12:00:00.000Z"}$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- ⚙️ تنظیمات پایه صفحه اصلی و سامانه در warroom_kv
insert into public.warroom_kv (id, value) values (
  'site_settings',
  $${"siteName":"اتاق جنگ","siteTagline":"سامانه جامع مسابقات، مأموریت‌ها و ارزیابی هوشمند","badgeText":"پرونده ماجراجویی هفت‌خوان","heroTitle":"مأموریت اصلی: مسابقه بزرگ اتاق جنگ","heroProgress":"۷۲٪","heroCountdown":"۰۲:۱۴:۳۹:۱۵","heroButtonText":"ورود و ثبت‌نام","contactPhone":"۰۲۱-۸۸۹۹۷۷۶۶","contactEmail":"info@warroom.ir","telegram":"WarRoom_Support","baleLink":"https://bale.ai/warroom","eitaaLink":"https://eitaa.com/warroom","address":"تهران، بزرگراه شهید همت، ستاد مرکزی قرارگاه فضای مجازی","aboutText":"پلتفرم اتاق جنگ یک سامانه تعاملی، رقابتی و آموزشی است که با هدف پرورش تفکر استراتژیک، افزایش توان تحلیل مسئله و تقویت روحیه کار تیمی در میان نوجوانان و جوانان طراحی شده است.","prizeTitle":"جایزه‌ها و هدایای مسابقه بزرگ","prizeDescription":"کریستال جمع کن و جایزه‌های نفیس اعم از کنسول بازی، تبلت و گوشی برنده شو!"}$$::jsonb
)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- سایر داده‌ها (کاربران، مأموریت‌ها، ویترین و ...) خالی است و از طریق خود
-- برنامه / پنل مدیریت در Supabase ذخیره و همگام می‌شوند.

-- ----------------------------------------------------------------------------
-- ۷) باکت Storage برای رسانه‌ها (آواتار، فایل‌های مأموریت، آثار ویترین)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('warroom-media', 'warroom-media', true)
on conflict (id) do nothing;

drop policy if exists "warroom_media_public_read" on storage.objects;
create policy "warroom_media_public_read" on storage.objects
  for select using (bucket_id = 'warroom-media');

drop policy if exists "warroom_media_public_write" on storage.objects;
create policy "warroom_media_public_write" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'warroom-media');

drop policy if exists "warroom_media_public_update" on storage.objects;
create policy "warroom_media_public_update" on storage.objects
  for update to anon, authenticated using (bucket_id = 'warroom-media');

drop policy if exists "warroom_media_public_delete" on storage.objects;
create policy "warroom_media_public_delete" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'warroom-media');

-- ----------------------------------------------------------------------------
-- ۸) فعال‌سازی انتشار بلادرنگ (Realtime Publications) برای چت و داده‌های زنده
-- ----------------------------------------------------------------------------
do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'warroom_notifications','warroom_support_tickets','warroom_support_replies',
      'warroom_users','warroom_missions','warroom_submissions','warroom_groups',
      'warroom_group_chat_rooms','warroom_group_chat_messages','warroom_stages',
      'warroom_prizes','warroom_trainings','warroom_medals','warroom_user_medals',
      'warroom_announcements','warroom_news','warroom_home_announcements',
      'warroom_faqs','warroom_vitrin_posts','warroom_vitrin_comments',
      'warroom_game_portals','warroom_daily_challenges','warroom_soundtracks','warroom_kv','warroom_password_reset_requests',
      'warroom_payment_transactions','warroom_team_registration_sessions','warroom_team_registrations','warroom_group_join_requests','warroom_wallet_transactions','warroom_point_transfers'
    ]
    loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      exception
        when duplicate_object then null;
        when undefined_table then null;
      end;
    end loop;
  end if;
end;
$$;

-- ============================================================================
-- ۸) سیاست‌های سخت‌گیرانه «حالت تولیدی» (اختیاری — برای انتشار عمومی)
-- ============================================================================
-- اگر می‌خواهید امنیت واقعی داشته باشید:
--   الف) ثبت‌نام/ورود کاربران را به Supabase Auth منتقل کنید (supabase.auth.signUp)
--        و ستون auth_user_id uuid را به warroom_users اضافه نمایید.
--   ب) سیاست‌های باز بالا را حذف و سیاست‌های زیر را جایگزین کنید:
--
-- revoke all on all tables in schema public from anon;
--
-- -- خواندن محتوای عمومی برای همه:
-- create policy "public_read" on public.warroom_missions        for select using (true);
-- create policy "public_read" on public.warroom_trainings       for select using (true);
-- create policy "public_read" on public.warroom_announcements   for select using (true);
-- create policy "public_read" on public.warroom_news            for select using (true);
-- create policy "public_read" on public.warroom_faqs            for select using (true);
-- create policy "public_read" on public.warroom_home_announcements for select using (true);
-- create policy "public_read" on public.warroom_vitrin_posts    for select using (true);
-- create policy "public_read" on public.warroom_vitrin_comments for select using (true);
-- create policy "public_read" on public.warroom_kv              for select using (true);
--
-- -- نمونه سیاست ادمین (دسترسی کامل فقط برای ادمین واردشده):
-- create policy "admin_all" on public.warroom_users for all to authenticated
--   using ( exists (select 1 from public.warroom_users u
--                   where u.id = auth.uid()::text and u.data->>'role' = 'admin') );
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ۹) پرس‌وجوهای صحت‌سنجی (اختیاری — می‌توانید همین‌جا اجرا کنید)
-- ----------------------------------------------------------------------------
-- select count(*) from public.warroom_users;                       -- باید ۱ باشد (فقط ادمین)
-- select id, data->>'role' from public.warroom_users;              -- u-admin | admin
-- select id, data->>'title', data->>'status' from public.warroom_game_portals; -- ۳ درگاه: warroom (فعال)، galaxy (به‌زودی)، cyber (به‌زودی)
-- select count(*) from public.warroom_soundtracks;                 -- ۱ قطعه موسیقی مارش حماسی پیش‌فرض
-- select count(*) from public.warroom_daily_challenges;            -- ۱ چالش روزانه پیش‌فرض
-- select count(*) from public.warroom_payment_transactions;        -- رسیدها و تراکنش‌های بانکی کاربران
-- select id, value->>'gateway' from public.warroom_kv where id = 'payment_settings'; -- تنظیمات درگاه پرداخت
-- select count(*) from public.warroom_vitrin_posts;                -- ابتدا ۰
-- select id from storage.buckets where id = 'warroom-media';       -- warroom-media
-- ============================================================================
