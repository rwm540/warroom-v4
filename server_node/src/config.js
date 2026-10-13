import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

const PLACEHOLDER_PATTERN = /^(replace_|your_|change_me|unset_|dummy_|example_)/i;
const INSECURE_LITERALS = new Set([
  'warroom_local_redis_pass',
  'fallback-not-secure',
  'password',
  'changeme',
  'secret',
]);

function secretValue(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) return '';
  if (PLACEHOLDER_PATTERN.test(value)) return '';
  if (INSECURE_LITERALS.has(value.toLowerCase())) return '';
  return value;
}

function configuredUrl(name) {
  const value = String(process.env[name] || '').trim();
  return /^https:\/\/your-project\./i.test(value) ? '' : value;
}

function intEnv(name, def, min, max) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return def;
  return n;
}

function boolEnv(name, def) {
  const raw = String(process.env[name] ?? '').trim();
  if (!raw) return def;
  return !['false', '0', 'no', 'off'].includes(raw.toLowerCase());
}

export const SESSION_COOKIE_NAME = 'warroom_session';
export const CSRF_COOKIE_NAME = 'warroom_csrf';

const nodeEnv = String(process.env.NODE_ENV || 'development').trim() || 'development';
const isProduction = nodeEnv === 'production';

function parseAllowedOrigins() {
  const raw = String(process.env.ALLOWED_ORIGINS || '').trim();
  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3100',
    'http://127.0.0.1:3100',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'https://warroom-v4.vercel.app',
  ];
  const extra = raw
    ? raw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];
  const cleaned = [];
  for (const origin of [...defaults, ...extra]) {
    try {
      const url = new URL(origin);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        cleaned.push(url.origin);
      }
    } catch {
      // Ignore malformed origins instead of trusting them
    }
  }
  return Array.from(new Set(cleaned));
}

/**
 * IPPanel sending type. Unknown values are reported as invalid instead of silently falling
 * back to free text, because a silent fallback would send a different message than configured.
 */
export function parseIppanelSendingType(raw) {
  const value = String(raw ?? '').trim().toLowerCase();
  if (value === '' || value === 'webservice') return { value: 'webservice', valid: true };
  if (value === 'pattern') return { value: 'pattern', valid: true };
  return { value: 'invalid', valid: false };
}

/**
 * Returns the pattern code when it has the shape of an identifier, or '' otherwise.
 * Placeholders such as "replace_me" or "your_pattern" are rejected so they cannot reach the API.
 */
export function parseIppanelPatternCode(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (PLACEHOLDER_PATTERN.test(value)) return '';
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(value)) return '';
  return value;
}

export const config = {
  port: intEnv('PORT', 4010, 1, 65535),
  host: String(process.env.HOST || '0.0.0.0').trim() || '0.0.0.0',
  nodeEnv,
  isProduction,
  trustProxy: (() => {
    const v = String(process.env.TRUST_PROXY || '1').trim();
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= 2) return n;
    return 1;
  })(),
  supabaseUrl: configuredUrl('SUPABASE_URL'),
  supabaseServiceRoleKey: secretValue('SUPABASE_SERVICE_ROLE_KEY'),
  otpChallengeSecret: secretValue('OTP_CHALLENGE_SECRET'),
  otpSecret: secretValue('OTP_SECRET'),
  // Sessions must never be signed with an OTP secret - dedicated secret required.
  sessionSecret: secretValue('SESSION_SECRET'),
  sessionTtlSeconds: intEnv('SESSION_TTL_SECONDS', 24 * 60 * 60, 300, 30 * 24 * 60 * 60),
  // 120 seconds: one absolute deadline drives the Supabase `expires_at`, the challenge JWT
  // `exp`, the SMS text and the browser countdown (see routes/otp.js).
  otpTtlSeconds: intEnv('OTP_TTL_SECONDS', 120, 60, 900),
  otpProofMaxAgeSeconds: intEnv('OTP_PROOF_MAX_AGE_SECONDS', 300, 60, 900),
  otpMaxSend: intEnv('OTP_MAX_SEND_PER_15MIN', 3, 1, 10),
  // Same 120 seconds as the code itself: a new code is only available once the previous one has
  // expired, so the UI never shows two overlapping timers.
  otpResendCooldown: intEnv('OTP_RESEND_COOLDOWN_SECONDS', 120, 10, 600),
  otpMaxAttempts: intEnv('OTP_MAX_VERIFY_ATTEMPTS', 5, 3, 10),
  ippanelKey: secretValue('IPPANEL_API_KEY'),
  ippanelFrom: String(process.env.IPPANEL_FROM_NUMBER || '').trim(),
  ippanelUrl: String(process.env.IPPANEL_API_URL || 'https://edge.ippanel.com/v1/api/send').trim(),
  // 'webservice' (free text, default) or 'pattern' (approved template). See parseIppanelSendingType.
  ippanelSendingType: parseIppanelSendingType(process.env.IPPANEL_SENDING_TYPE).value,
  // Pattern code from the IPPanel panel (Edge "code" field). Never hardcoded.
  ippanelPatternCode: parseIppanelPatternCode(process.env.IPPANEL_PATTERN_CODE),
  // Mock SMS is only permitted outside production.
  allowMockSms: !isProduction && boolEnv('ALLOW_MOCK_SMS', true),
  passwordResetRateLimitPerHour: intEnv('PASSWORD_RESET_RATE_LIMIT_PER_HOUR', 3, 1, 20),
  registrationRateLimitPerHour: intEnv('REGISTRATION_RATE_LIMIT_PER_HOUR', 5, 1, 20),
  // Destructive admin operations require a fresh, operation-bound admin OTP proof.
  adminOtpRequiredForDestructiveOps: boolEnv('ADMIN_OTP_REQUIRED_FOR_DESTRUCTIVE_OPS', true),
  redisUrl: (() => {
    const v = String(process.env.REDIS_URL || '').trim();
    if (!v) return '';
    if (PLACEHOLDER_PATTERN.test(v)) return '';
    if (!v.startsWith('redis://') && !v.startsWith('rediss://')) return '';
    if (v.includes('replace_with')) return '';
    return v;
  })(),
  redisPassword: (() => {
    const v = String(process.env.REDIS_PASSWORD || '').trim();
    if (!v) return '';
    if (PLACEHOLDER_PATTERN.test(v)) return '';
    if (INSECURE_LITERALS.has(v.toLowerCase())) return '';
    return v;
  })(),
  cookieSecure: boolEnv('COOKIE_SECURE', isProduction),
  cookieSameSite: (() => {
    const raw = String(process.env.COOKIE_SAMESITE || (isProduction ? 'Strict' : 'Lax')).trim().toLowerCase();
    if (raw === 'strict') return 'Strict';
    if (raw === 'none') return 'None';
    return 'Lax';
  })(),
  allowedOrigins: parseAllowedOrigins(),
};

/**
 * Collects every configuration problem that makes privileged/auth flows unsafe.
 * Never throws: callers decide whether the process may continue.
 */
export function collectConfigProblems() {
  const problems = [];
  if (!config.supabaseUrl) problems.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) problems.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.otpChallengeSecret || config.otpChallengeSecret.length < 32) problems.push('OTP_CHALLENGE_SECRET>=32');
  if (!config.otpSecret || config.otpSecret.length < 32) problems.push('OTP_SECRET>=32');
  if (config.otpSecret && config.otpChallengeSecret && config.otpSecret === config.otpChallengeSecret) {
    problems.push('OTP_SECRET!=OTP_CHALLENGE_SECRET');
  }
  if (!config.sessionSecret || config.sessionSecret.length < 32) problems.push('SESSION_SECRET>=32');
  if (config.sessionSecret && (config.sessionSecret === config.otpSecret || config.sessionSecret === config.otpChallengeSecret)) {
    problems.push('SESSION_SECRET!=OTP_SECRET');
  }
  if (config.isProduction && config.cookieSecure === false) problems.push('COOKIE_SECURE=true in production');
  if (config.isProduction && !config.allowMockSms && !config.ippanelKey) {
    // SMS is required in production because OTP delivery is the only login factor.
    problems.push('IPPANEL_API_KEY');
  }
  if (config.isProduction && !config.allowMockSms && !config.ippanelFrom) {
    problems.push('IPPANEL_FROM_NUMBER');
  }
  if (!parseIppanelSendingType(process.env.IPPANEL_SENDING_TYPE).valid) {
    problems.push('IPPANEL_SENDING_TYPE(webservice|pattern)');
  }
  if (config.isProduction && config.ippanelSendingType === 'pattern' && !config.ippanelPatternCode) {
    // Pattern mode without an approved code would otherwise fail on every login.
    problems.push('IPPANEL_PATTERN_CODE');
  }
  if (config.ippanelFrom && !/^\+[1-9]\d{1,14}$/.test(config.ippanelFrom)) {
    // A malformed sender would otherwise only surface as a send-time failure.
    problems.push('IPPANEL_FROM_NUMBER(E.164)');
  }
  if (config.nodeEnv === 'production' && config.redisUrl && !config.redisPassword) {
    problems.push('REDIS_PASSWORD required when REDIS_URL is set in production');
  }
  if (config.redisPassword && config.redisPassword.length < 8) {
    problems.push('REDIS_PASSWORD>=8');
  }
  return problems;
}

export function assertRequiredSecrets() {
  const problems = collectConfigProblems();
  if (problems.length > 0) {
    const err = new Error(`Missing or invalid required secrets: ${problems.join(', ')}`);
    err.code = 'AUTH_SECRETS_NOT_CONFIGURED';
    err.status = 503;
    err.problems = problems;
    throw err;
  }
}
