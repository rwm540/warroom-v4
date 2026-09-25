-- =====================================================================
-- WarRoom Supabase Database & Realtime Setup (Query.sql)
-- اجرای این اسکریپت در SQL Editor در پنل Supabase تمامی جداول، امنیت (RLS)
-- و قابلیت بلادرنگ (Realtime) برای چت‌های روم کاربری و پنل ادمین را فعال می‌کند.
-- =====================================================================

-- ۱. ایجاد جدول پیام‌های چت گروهی و روم‌ها
CREATE TABLE IF NOT EXISTS warroom_group_chat_rooms (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_group_chat_messages (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ۲. ایجاد جدول کاربران و گروه‌ها
CREATE TABLE IF NOT EXISTS warroom_users (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_groups (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ۳. ایجاد جدول تیکت‌های پشتیبانی و پاسخ‌ها
CREATE TABLE IF NOT EXISTS warroom_support_tickets (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_support_replies (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ۴. سایر جداول سیستم (تنظیمات، لاگ‌ها، چالش‌ها، آهنگ‌ها و درخواست‌های بازیابی رمز)
CREATE TABLE IF NOT EXISTS warroom_kv (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_audit_log (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_password_reset_requests (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_soundtracks (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS warroom_daily_challenges (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ۵. فعال‌سازی Row Level Security (RLS) برای تمامی جداول
ALTER TABLE warroom_group_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_support_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_kv ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_soundtracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE warroom_daily_challenges ENABLE ROW LEVEL SECURITY;

-- ۶. ایجاد سیاست‌های دسترسی عمومی/احراز هویت شده (Allow all operations for app users)
CREATE POLICY "Enable all access for warroom_group_chat_rooms" ON warroom_group_chat_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_group_chat_messages" ON warroom_group_chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_users" ON warroom_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_groups" ON warroom_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_support_tickets" ON warroom_support_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_support_replies" ON warroom_support_replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_kv" ON warroom_kv FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_audit_log" ON warroom_audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_password_reset_requests" ON warroom_password_reset_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_soundtracks" ON warroom_soundtracks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for warroom_daily_challenges" ON warroom_daily_challenges FOR ALL USING (true) WITH CHECK (true);

-- ۷. بسیار مهم: فعال‌سازی Realtime Publication برای جداول چت و پیام‌رسانی
-- این دستور تضمین می‌کند که تغییرات به‌صورت بلادرنگ در پنل کاربری و پنل ادمین همگام شوند.
BEGIN;
  -- بررسی و افزودن جداول به پابلییکیشن ریل‌تایم
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'warroom_group_chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE warroom_group_chat_messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'warroom_group_chat_rooms'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE warroom_group_chat_rooms;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'warroom_support_tickets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE warroom_support_tickets;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'warroom_support_replies'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE warroom_support_replies;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'warroom_users'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE warroom_users;
    END IF;
  END
  $$;
COMMIT;
