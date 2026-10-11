import { config } from '../config.js';

const DEFAULT_ENDPOINT = 'https://edge.ippanel.com/v1/api/send';
const REQUEST_TIMEOUT_MS = 15_000;

function smsError(code, status) {
  const error = new Error(code);
  error.status = status;
  error.code = code;
  return error;
}

function isValidMessageId(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0;
  return typeof value === 'string' && /^\d+$/.test(value) && BigInt(value) > 0n;
}

function configuredEndpoint() {
  let endpoint;
  try {
    endpoint = new URL(config.ippanelUrl || DEFAULT_ENDPOINT);
  } catch {
    throw smsError('SMS_CONFIGURATION_INVALID', 503);
  }

  if (
    endpoint.protocol !== 'https:' ||
    endpoint.hostname !== 'edge.ippanel.com' ||
    endpoint.pathname !== '/v1/api/send' ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw smsError('SMS_CONFIGURATION_INVALID', 503);
  }
  return endpoint.toString();
}

function assertSmsConfiguration() {
  if (!config.ippanelKey || !config.ippanelFrom) {
    throw smsError('SMS_NOT_CONFIGURED', 503);
  }
  if (!/^\+[1-9]\d{1,14}$/.test(config.ippanelFrom)) {
    throw smsError('SMS_CONFIGURATION_INVALID', 503);
  }
  return configuredEndpoint();
}

export function isSmsConfigured() {
  try {
    assertSmsConfiguration();
    return true;
  } catch {
    return false;
  }
}

function acceptedMessageIds(payload) {
  if (payload?.meta?.status !== true || !Array.isArray(payload?.data?.message_outbox_ids)) return null;
  const ids = payload.data.message_outbox_ids;
  if (ids.length === 0 || ids.some((id) => !isValidMessageId(id))) return null;
  return ids.map(String);
}

/**
 * Sends one SMS through IPPanel's documented Webservice endpoint.
 * See: https://ippanelcom.github.io/Edge-Document/docs/send/webservice/
 */
export async function sendOtpSms(e164Phone, otp, { issuedAtMs, expiresAtMs } = {}) {
  const endpoint = assertSmsConfiguration();
  if (!/^\+989\d{9}$/.test(String(e164Phone || '')) || !/^\d{6}$/.test(String(otp || ''))) {
    throw smsError('SMS_REQUEST_INVALID', 400);
  }

  const validityMs = Number(expiresAtMs) - Number(issuedAtMs);
  const validitySeconds = validityMs / 1000;
  if (
    !Number.isSafeInteger(Number(issuedAtMs)) ||
    !Number.isSafeInteger(Number(expiresAtMs)) ||
    !Number.isInteger(validitySeconds) ||
    validitySeconds < 1 ||
    expiresAtMs <= Date.now()
  ) {
    throw smsError('OTP_EXPIRY_INVALID', 503);
  }

  const message = `کد تأیید اتاق جنگ: ${otp}\nاعتبار کد: ${validitySeconds} ثانیه از زمان صدور.`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: config.ippanelKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        sending_type: 'webservice',
        from_number: config.ippanelFrom,
        message,
        params: { recipients: [e164Phone] },
      }),
    });
  } catch {
    throw smsError('SMS_SEND_FAILED', 502);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw smsError('SMS_SEND_FAILED', 502);
  }

  const ids = acceptedMessageIds(payload);
  if (!response.ok || !ids) {
    throw smsError('SMS_SEND_FAILED', 502);
  }

  return { ok: true, ids, accepted: true, provider: 'ippanel' };
}
