import { config } from '../config.js';
import { sendOtpSms, isSmsConfigured } from './sms.js';
import { publicError } from './errors.js';

/**
 * SMS gateway used by the OTP routes.
 *
 * - Production: real provider only. A missing provider is a hard error (fail closed).
 * - Tests explicitly inject a fake gateway; missing configuration never simulates delivery.
 * The OTP code itself is never logged.
 */
export function createSmsGateway({
  sender = sendOtpSms,
  configured = isSmsConfigured,
} = {}) {
  return {
    configured: () => {
      try {
        return configured() === true;
      } catch {
        return false;
      }
    },
    providerName() {
      try {
        return configured() === true ? 'ippanel' : 'none';
      } catch {
        return 'none';
      }
    },
    async send(phoneE164, otp, meta) {
      if (configured() === true) {
        return sender(phoneE164, otp, meta);
      }
      throw publicError('SMS_NOT_CONFIGURED', 'سرویس پیامک پیکربندی نشده است.', 503);
    },
  };
}
