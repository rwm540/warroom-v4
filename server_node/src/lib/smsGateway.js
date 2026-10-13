import { config } from '../config.js';
import { sendOtpSms, isSmsConfigured, fetchSmsDeliveryStatus } from './sms.js';
import { publicError } from './errors.js';
import { maskPhone } from './identity.js';

/**
 * SMS gateway used by the OTP routes.
 *
 * - Production: real provider only. A missing provider is a hard error (fail closed).
 * - Development/test: a mock sender may be injected so no real SMS is ever sent.
 * The OTP code itself is never logged.
 */
export function createSmsGateway({
  allowMock = config.allowMockSms,
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
        return configured() === true ? 'ippanel' : (allowMock ? 'mock' : 'none');
      } catch {
        return allowMock ? 'mock' : 'none';
      }
    },
    async send(phoneE164, otp, meta) {
      if (configured() === true) {
        return sender(phoneE164, otp, meta);
      }
      if (allowMock) {
        console.info(
          `[sms:mock] simulated OTP delivery to ${maskPhone(phoneE164)} provider=mock (code intentionally not logged)`,
        );
        return { ok: true, ids: [`mock-${Date.now()}`], accepted: true, provider: 'mock' };
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
