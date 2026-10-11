import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, assertRequiredSecrets } from './config.js';
import { supabaseAdmin } from './lib/supabase.js';
import { isSmsConfigured } from './lib/sms.js';
import otpRouter from './routes/otp.js';
import passwordResetRouter from './routes/passwordReset.js';
import registrationRouter from './routes/registration.js';
import sessionRouter from './routes/session.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

// CORS - only allow known origins, with credentials for HttpOnly cookies
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3100',
  'http://127.0.0.1:3100',
  'https://warroom-v4.vercel.app',
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  // For same-origin via Nginx proxy, no CORS needed
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  next();
});

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

// Global rate limiter - per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
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
  }
}

app.get('/api/health', async (_req, res) => {
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
      },
    },
  });
});

app.use('/api/otp', otpRouter);
app.use('/api/password-reset', passwordResetRouter);
app.use('/api/registration', registrationRouter);
app.use('/api/session', sessionRouter);

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
  RATE_LIMIT_STORE_FAILED: 'محدودیت امنیتی موقتاً در دسترس نیست.',
};

app.use((err, _req, res, _next) => {
  const status = Number(err.status || 500);
  const code = String(err.code || 'REQUEST_FAILED');
  const safeMessage = status >= 500
    ? (SAFE_ERROR_MESSAGES[code] || 'خطای داخلی سرور.')
    : (err.message || 'درخواست نامعتبر است.');

  if (status >= 500) {
    console.error(`[warroom-otp-api] ${code} status=${status}`);
  }

  res.status(status).json({
    success: false,
    error: code,
    message: safeMessage,
  });
});

// Graceful shutdown
const server = app.listen(config.port, config.host, () => {
  console.info(`[warroom-otp-api] listening on ${config.host}:${config.port} trustProxy=${config.trustProxy} env=${config.nodeEnv}`);
});

async function gracefulShutdown(signal) {
  console.info(`[warroom-otp-api] ${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      const { closeRedis } = await import('./lib/redis.js');
      await closeRedis();
    } catch {}
    process.exit(0);
  });
  // Force shutdown after 10s
  setTimeout(() => {
    console.error('[warroom-otp-api] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
