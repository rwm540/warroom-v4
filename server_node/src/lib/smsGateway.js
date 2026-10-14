import { config } from '../config.js';
import { sendOtpSms, isSmsConfigured, fetchSmsDeliveryStatus } from './sms.js';
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
  statusReader = fetchSmsDeliveryStatus,
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

    /**
     * Reads the documented IPPanel delivery report of one accepted message. Only meaningful
     * with a real provider; mock mode has no outbox to report on.
     */
    async deliveryStatus(messageId) {
      if (configured() !== true) {
        throw publicError('SMS_STATUS_UNAVAILABLE', 'بررسی وضعیت تحویل پیامک در دسترس نیست.', 503);
      }
      return statusReader(messageId);
    },
  };
}
