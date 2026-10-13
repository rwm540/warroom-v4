import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { createAuthMiddleware } from './lib/auth-middleware.js';
import { createRateLimiter } from './lib/rateLimit.js';
import { publicError } from './lib/errors.js';
import { createSessionRouter } from './routes/session.js';
import { createOtpRouter } from './routes/otp.js';
import { createRegistrationRouter } from './routes/registration.js';
import { createPasswordResetRouter } from './routes/passwordReset.js';
import { createAdminRouter } from './routes/admin.js';

// Safe, provider-independent Persian messages. Provider response bodies never reach the client.
const SAFE_ERROR_MESSAGES = {
  SMS_NOT_CONFIGURED: 'سرویس پیامک پیکربندی نشده است.',
  SMS_CONFIGURATION_INVALID: 'تنظیمات سرویس پیامک معتبر نیست.',
  SMS_SEND_FAILED: 'ارسال پیامک از سرویس ارائه‌دهنده ناموفق بود.',
  SMS_REQUEST_INVALID: 'درخواست ارسال پیامک معتبر نیست.',
  SMS_SENDER_INVALID: 'شماره فرستنده پیامک در تنظیمات سرویس معتبر نیست.',
  SMS_AUTH_REJECTED: 'کلید سرویس پیامک پذیرفته نشد؛ تنظیمات سرویس را بررسی کنید.',
  SMS_SENDER_REJECTED: 'شماره فرستنده برای این حساب سرویس پیامک تأیید نشده است.',
  SMS_RECIPIENT_REJECTED: 'شماره موبایل مقصد برای دریافت پیامک معتبر نیست.',
  SMS_MESSAGE_REJECTED: 'متن پیامک توسط سرویس پیامک پذیرفته نشد.',
  SMS_PROVIDER_REJECTED: 'سرویس پیامک این درخواست را نپذیرفت.',
  SMS_PATTERN_NOT_CONFIGURED: 'قالب پیامک تأیید پیکربندی نشده است؛ با پشتیبانی تماس بگیرید.',
  SMS_PATTERN_REJECTED: 'قالب پیامک تأیید توسط سرویس پیامک پذیرفته نشد؛ با پشتیبانی تماس بگیرید.',
  SMS_PROVIDER_RATE_LIMITED: 'سرویس پیامک موقتاً درخواست‌ها را محدود کرده است؛ کمی بعد تلاش کنید.',
  SMS_PROVIDER_UNAVAILABLE: 'سرویس پیامک موقتاً در دسترس نیست؛ کمی بعد تلاش کنید.',
  SMS_NETWORK_FAILED: 'ارتباط با سرویس پیامک برقرار نشد؛ کمی بعد تلاش کنید.',
  SMS_STATUS_UNAVAILABLE: 'بررسی وضعیت تحویل پیامک در حال حاضر ممکن نیست.',
  DATABASE_NOT_CONFIGURED: 'اتصال خصوصی پایگاه داده پیکربندی نشده است.',
  AUTH_SECRETS_NOT_CONFIGURED: 'تنظیمات امنیتی سرویس کامل نیست.',
  OTP_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  OTP_CHALLENGE_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی OTP کامل نیست.',
  SESSION_SECRET_NOT_CONFIGURED: 'تنظیمات امنیتی نشست کامل نیست.',
  OTP_CLEANUP_FAILED: 'پاک‌سازی درخواست OTP ناموفق بود؛ با پشتیبانی تماس بگیرید.',
  DB_ERROR: 'ارتباط با پایگاه داده ممکن نشد.',
  RATE_LIMIT_STORE_FAILED: 'محدودیت امنیتی موقتاً در دسترس نیست.',
};

/**
 * Builds the Express application. All external dependencies (database store, SMS gateway,
 * Redis helper) are injected so tests can run the real HTTP routes against in-memory
 * doubles without ever touching production data or sending a real SMS.
 */
export function createApp({ store, sms, redis } = {}) {
  if (!store) throw new Error('createApp requires a store');
  if (!sms) throw new Error('createApp requires an sms gateway');

  const limiter = createRateLimiter({ store, redis });
  const auth = createAuthMiddleware({ store });
  const deps = { store, sms, limiter, auth, config };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.locals.deps = deps;

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
      res.setHeader('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    return next();
  });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
  }));

  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));

  // Every state-changing request that carries an Origin/Referer must come from an allowed origin.
  app.use(auth.enforceOrigin);

  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => String(req.ip || req.socket?.remoteAddress || 'unknown'),
    message: { success: false, error: 'RATE_LIMITED', message: 'درخواست‌های زیادی ارسال شده است. لطفاً چند دقیقه بعد تلاش کنید.' },
  }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'warroom-otp-api', version: '2.0.0', env: config.isProduction ? 'production' : 'development' });
  });

  app.get('/api/ready', async (_req, res) => {
    const smsConfigured = typeof sms.configured === 'function' ? sms.configured() === true : false;
    const dependencies = {
      database: { configured: true, reachable: false },
      redis: { configured: Boolean(config.redisUrl), available: false },
      // Reported from the real gateway: 'ippanel' only when key, sender and URL are all valid.
      sms: {
        configured: smsConfigured,
        provider: typeof sms.providerName === 'function' ? sms.providerName() : 'unknown',
        mockAllowed: config.allowMockSms,
      },
      secrets: { valid: true },
      schema: { ready: false },
    };

    if (config.redisUrl) {
      try {
        const { checkRedisHealth } = await import('./lib/redis.js');
        const health = await checkRedisHealth();
        dependencies.redis.available = health.available;
      } catch {
        dependencies.redis.available = false;
      }
    }

    let notes = [];
    try {
      await store.ping();
      dependencies.database.reachable = true;
    } catch {
      dependencies.database.reachable = false;
      notes.push('database unreachable');
    }

    if (dependencies.database.reachable && typeof store.checkSchema === 'function') {
      try {
        const schema = await store.checkSchema();
        dependencies.schema.ready = schema.ok === true;
        if (!schema.ok) notes.push('schema not migrated');
      } catch {
        dependencies.schema.ready = false;
        notes.push('schema probe failed');
      }
    }

    // Without a usable SMS path nobody can complete an OTP login, so readiness requires it.
    const ready = dependencies.database.reachable
      && dependencies.schema.ready
      && smsConfigured
      && configMissingForReady().length === 0;
    if (!smsConfigured) notes.push('sms provider not configured');
    if (!ready) notes.push('service not ready');
    res.status(ready ? 200 : 503).json({
      ready,
      service: 'warroom-otp-api',
      env: config.isProduction ? 'production' : 'development',
      dependencies,
      notes,
    });
  });

  app.use('/api/otp', createOtpRouter(deps));
  app.use('/api/registration', createRegistrationRouter(deps));
  app.use('/api/session', createSessionRouter(deps));
  app.use('/api/password-reset', createPasswordResetRouter(deps));
  app.use('/api/admin', createAdminRouter(deps));

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'مسیر یافت نشد.' });
  });

  // Central error handler. Never logs request bodies, OTP codes, passwords or tokens.
  app.use((err, req, res, _next) => {
    const isPublic = err?.isPublic === true;
    const status = Number(isPublic ? err.status || 400 : err?.status || 500);
    const code = String(isPublic ? err.code || 'REQUEST_FAILED' : err?.code || 'REQUEST_FAILED');
    const message = isPublic
      ? (err.message || 'درخواست نامعتبر است.')
      : (SAFE_ERROR_MESSAGES[code] || 'خطای داخلی سرور.');

    if (status >= 500) {
      console.error(`[warroom-otp-api] ${code} status=${status} path=${String(req.path || '').slice(0, 80)}`);
    }

    if (res.headersSent) return;
    const body = { success: false, error: code, message };
    // A cooldown answer carries an actionable Retry-After hint; nothing else is added here.
    const retryAfterSeconds = Number(err?.retryAfterSeconds);
    if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0 && retryAfterSeconds <= 3600) {
      body.retryAfterSeconds = retryAfterSeconds;
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }
    res.status(status).json(body);
  });

  return app;
}

function configMissingForReady() {
  // Reuse the strict startup checks without throwing.
  const problems = [];
  if (!config.supabaseUrl) problems.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) problems.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.otpSecret || config.otpSecret.length < 32) problems.push('OTP_SECRET');
  if (!config.otpChallengeSecret || config.otpChallengeSecret.length < 32) problems.push('OTP_CHALLENGE_SECRET');
  if (!config.sessionSecret || config.sessionSecret.length < 32) problems.push('SESSION_SECRET');
  return problems;
}

export { publicError };
