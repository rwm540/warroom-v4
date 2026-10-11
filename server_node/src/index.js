import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, assertRequiredSecrets } from './config.js';
import { supabaseAdmin } from './lib/supabase.js';
import { isSmsConfigured } from './lib/sms.js';
import otpRouter from './routes/otp.js';
import passwordResetRouter from './routes/passwordReset.js';
import registrationRouter from './routes/registration.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: config.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// Global rate limiter - per IP, resistant to restart via DB limiter for sensitive routes
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use forwarded IP safely - trust proxy is limited to 1
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return ip;
  },
  message: { success: false, error: 'RATE_LIMITED', message: 'درخواست‌های زیادی ارسال شده است. لطفاً چند دقیقه بعد تلاش کنید.' },
}));

// Fail fast in production if secrets missing
if (config.nodeEnv === 'production') {
  try {
    assertRequiredSecrets();
  } catch (e) {
    console.error('[warroom-otp-api] FATAL: missing secrets in production', e.message);
    // Still start to allow health check, but will return 503 on OTP routes
  }
}

app.get('/api/health', async (_req, res) => {
  // Minimal info, no secrets, no stack traces
  // Check Redis health without exposing connection details
  let redisStatus = { configured: false, available: false };
  try {
    const { checkRedisHealth } = await import('./lib/redis.js');
    redisStatus = await checkRedisHealth();
  } catch {
    redisStatus = { configured: Boolean(config.redisUrl), available: false };
  }

  res.json({
    ok: true,
    service: 'warroom-otp-api',
    version: '1.0.0',
    env: config.nodeEnv === 'production' ? 'production' : 'development',
    dependencies: {
      database: { configured: Boolean(supabaseAdmin), connectivity: 'not_checked' },
      ippanel: {
        configured: isSmsConfigured(),
        connectivity: 'not_checked',
      },
      redis: {
        configured: redisStatus.configured,
        available: redisStatus.available,
        // Never expose URL, password, or connection details
      },
    },
  });
});

app.use('/api/otp', otpRouter);
app.use('/api/password-reset', passwordResetRouter);
app.use('/api/registration', registrationRouter);

const SAFE_ERROR_MESSAGES = {
  SMS_NOT_CONFIGURED: 'سرویس پیامک پیکربندی نشده است.',
  SMS_CONFIGURATION_INVALID: 'تنظیمات سرویس پیامک معتبر نیست.',
  SMS_SEND_FAILED: 'ارسال پیامک از سرویس ارائه‌دهنده ناموفق بود.',
  DATABASE_NOT_CONFIGURED: 'اتصال خصوصی پایگاه داده پیکربندی نشده است.',
  AUTH_SECRETS_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_CHALLENGE_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_CLEANUP_FAILED: 'پاک‌سازی درخواست OTP ناموفق بود؛ با پشتیبانی تماس بگیرید.',
  INVALID_NATIONAL_CODE: 'کد ملی معتبر نیست.',
  INVALID_PHONE: 'شماره موبایل معتبر نیست.',
  RATE_LIMITED: 'تعداد درخواست‌ها زیاد است؛ بعداً تلاش کنید.',
};

app.use((err, _req, res, _next) => {
  // Never leak stack, SQL, or secrets
  const status = Number(err.status || 500);
  const code = String(err.code || 'REQUEST_FAILED');
  const safeMessage = status >= 500
    ? (SAFE_ERROR_MESSAGES[code] || 'خطای داخلی سرور.')
    : (err.message || 'درخواست نامعتبر است.');

  // Log internally without PII
  if (status >= 500) {
    console.error(`[warroom-otp-api] ${code} status=${status}`);
  }

  res.status(status).json({
    success: false,
    error: code,
    message: safeMessage,
  });
});

app.listen(config.port, config.host, () => {
  console.info(`[warroom-otp-api] listening on ${config.host}:${config.port} trustProxy=${config.trustProxy} env=${config.nodeEnv}`);
});
