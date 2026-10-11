import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

function requiredSecret(name, min = 32) {
  const value = String(process.env[name] || '').trim();
  if (value.length >= min) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set and at least ${min} characters`);
  }
  return randomBytes(32).toString('hex');
}

export const config = {
  port: Number(process.env.PORT || 4010),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: String(process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  supabaseUrl: String(process.env.SUPABASE_URL || '').trim(),
  supabaseServiceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  supabaseAnonKey: String(process.env.SUPABASE_ANON_KEY || '').trim(),
  jwtSecret: requiredSecret('JWT_SECRET'),
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  otpSecret: requiredSecret('OTP_SECRET'),
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS || 300),
  otpMaxSend: Number(process.env.OTP_MAX_SEND_PER_15MIN || 3),
  otpResendCooldown: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
  otpMaxAttempts: Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5),
  ippanelKey: String(process.env.IPPANEL_API_KEY || '').trim(),
  ippanelFrom: String(process.env.IPPANEL_FROM_NUMBER || '+9890004939').trim(),
  ippanelUrl: String(process.env.IPPANEL_API_URL || 'https://edge.ippanel.com/v1/api/send').trim(),
};
