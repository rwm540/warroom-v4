// Test environment. Imported before any src module so config.js sees it.
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret-0123456789-0123456789';
process.env.OTP_SECRET = 'test-otp-secret-0123456789-0123456789-abcd';
process.env.OTP_CHALLENGE_SECRET = 'test-challenge-secret-0123456789-0123456789';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-not-a-real-secret';
process.env.COOKIE_SECURE = 'false';
process.env.ALLOW_MOCK_SMS = 'true';
delete process.env.REDIS_URL;
delete process.env.REDIS_PASSWORD;
