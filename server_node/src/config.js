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

export const config = {
  port: Number(process.env.PORT || 4010),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: configuredUrl('SUPABASE_URL'),
  supabaseServiceRoleKey: secretValue('SUPABASE_SERVICE_ROLE_KEY'),
  otpChallengeSecret: secretValue('OTP_CHALLENGE_SECRET'),
  otpSecret: secretValue('OTP_SECRET'),
  otpTtlSeconds: Number(process.env.OTP_TTL_SECONDS || 300),
  otpMaxSend: Number(process.env.OTP_MAX_SEND_PER_15MIN || 3),
  otpResendCooldown: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
  otpMaxAttempts: Number(process.env.OTP_MAX_VERIFY_ATTEMPTS || 5),
  ippanelKey: secretValue('IPPANEL_API_KEY'),
  ippanelFrom: String(process.env.IPPANEL_FROM_NUMBER || '').trim(),
  ippanelUrl: String(process.env.IPPANEL_API_URL || 'https://edge.ippanel.com/v1/api/send').trim(),
};
