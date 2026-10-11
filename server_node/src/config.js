import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

function secretValue(name) {
  const value = String(process.env[name] || '').trim();
  return /^(replace_|your_|change_me|unset_)/i.test(value) ? '' : value;
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

export const config = {
  port: intEnv('PORT', 4010, 1, 65535),
  host: String(process.env.HOST || '0.0.0.0').trim() || '0.0.0.0',
  nodeEnv: String(process.env.NODE_ENV || 'development').trim() || 'development',
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
  otpTtlSeconds: intEnv('OTP_TTL_SECONDS', 300, 60, 900),
  otpMaxSend: intEnv('OTP_MAX_SEND_PER_15MIN', 3, 1, 10),
  otpResendCooldown: intEnv('OTP_RESEND_COOLDOWN_SECONDS', 60, 10, 600),
  otpMaxAttempts: intEnv('OTP_MAX_VERIFY_ATTEMPTS', 5, 3, 10),
  ippanelKey: secretValue('IPPANEL_API_KEY'),
  ippanelFrom: String(process.env.IPPANEL_FROM_NUMBER || '').trim(),
  ippanelUrl: String(process.env.IPPANEL_API_URL || 'https://edge.ippanel.com/v1/api/send').trim(),
  passwordResetRateLimitPerHour: intEnv('PASSWORD_RESET_RATE_LIMIT_PER_HOUR', 3, 1, 20),
  registrationRateLimitPerHour: intEnv('REGISTRATION_RATE_LIMIT_PER_HOUR', 5, 1, 20),
};

export function assertRequiredSecrets() {
  const missing = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.otpChallengeSecret || config.otpChallengeSecret.length < 32) missing.push('OTP_CHALLENGE_SECRET>=32');
  if (!config.otpSecret || config.otpSecret.length < 32) missing.push('OTP_SECRET>=32');
  if (config.otpSecret && config.otpChallengeSecret && config.otpSecret === config.otpChallengeSecret) {
    missing.push('OTP_SECRET!=OTP_CHALLENGE_SECRET');
  }
  if (missing.length > 0) {
    const err = new Error(`Missing or invalid required secrets: ${missing.join(', ')}`);
    err.code = 'AUTH_SECRETS_NOT_CONFIGURED';
    err.status = 503;
    throw err;
  }
}
