import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { supabaseAdmin } from './lib/supabase.js';
import { isSmsConfigured } from './lib/sms.js';
import otpRouter from './routes/otp.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '16kb' }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMITED', message: 'درخواست‌های زیادی ارسال شده است.' },
}));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'warroom-otp-api',
    dependencies: {
      database: { configured: Boolean(supabaseAdmin), connectivity: 'not_checked' },
      ippanel: {
        configured: isSmsConfigured(),
        connectivity: 'not_checked',
      },
    },
  });
});

app.use('/api/otp', otpRouter);

const SAFE_ERROR_MESSAGES = {
  SMS_NOT_CONFIGURED: 'سرویس پیامک پیکربندی نشده است.',
  SMS_CONFIGURATION_INVALID: 'تنظیمات سرویس پیامک معتبر نیست.',
  SMS_SEND_FAILED: 'ارسال پیامک از سرویس ارائه‌دهنده ناموفق بود.',
  DATABASE_NOT_CONFIGURED: 'اتصال خصوصی پایگاه داده پیکربندی نشده است.',
  AUTH_SECRETS_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_CHALLENGE_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_CLEANUP_FAILED: 'پاک‌سازی درخواست OTP ناموفق بود؛ با پشتیبانی تماس بگیرید.',
};

app.use((err, _req, res, _next) => {
  const status = Number(err.status || 500);
  const code = String(err.code || 'REQUEST_FAILED');
  const safeMessage = status >= 500
    ? (SAFE_ERROR_MESSAGES[code] || 'خطای داخلی سرور.')
    : (err.message || 'درخواست نامعتبر است.');

  res.status(status).json({
    success: false,
    error: code,
    message: safeMessage,
  });
});

app.listen(config.port, config.host, () => {
  console.info(`[warroom-otp-api] listening on ${config.host}:${config.port}`);
});
