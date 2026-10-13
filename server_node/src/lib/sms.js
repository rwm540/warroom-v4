import { config } from '../config.js';
import { maskPhone } from './identity.js';

/**
 * IPPanel Edge adapter.
 *
 * Send contract (documented at https://ippanelcom.github.io/Edge-Document/docs/send/webservice/):
 *   POST https://edge.ippanel.com/v1/api/send
 *   Authorization: <raw API token>   Content-Type: application/json
 *   { sending_type, from_number, message, params: { recipients: [...] } }
 *   -> 200 { data: { message_outbox_ids: [1123544244] }, meta: { status: true, message_code: '200-1' } }
 *
 * A successful answer only means IPPanel *accepted* the request. It never proves that the
 * message reached the handset. Delivery is checked with the documented report endpoints:
 *   GET /v1/api/report/by_bulk?messages_outbox_id=<id>          (bulk state)
 *   GET /v1/api/report/recipients?bulk_id=<id>&page=1&per_page= (per-recipient message_status:
 *       0 sent to operator, 1 operator received, 2 delivered, 3 not delivered, 4 blacklisted)
 *
 * Logging rules: provider response bodies, the API key, OTP codes, passwords and full phone
 * numbers are never logged. Only error codes, HTTP statuses and masked phone numbers are.
 */

const DEFAULT_SEND_URL = 'https://edge.ippanel.com/v1/api/send';
const IPPANEL_HOST = 'edge.ippanel.com';
const SEND_PATH = '/v1/api/send';
const REPORT_PATHS = {
  bulk: '/api/report/by_bulk',
  recipients: '/api/report/recipients',
};
const REQUEST_TIMEOUT_MS = 15_000;
const RECIPIENTS_PER_PAGE = 30;

export const SMS_STATUS_LABELS = {
  0: 'sent_to_operator',
  1: 'operator_received',
  2: 'delivered',
  3: 'not_delivered',
  4: 'blacklisted',
};

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

function normalizeMessageId(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  const raw = String(value ?? '').trim();
  return /^\d{1,32}$/.test(raw) && BigInt(raw) > 0n ? raw : null;
}

function configuredSendUrl() {
  let endpoint;
  try {
    endpoint = new URL(config.ippanelUrl || DEFAULT_SEND_URL);
  } catch {
    throw smsError('SMS_CONFIGURATION_INVALID', 503);
  }

  if (
    endpoint.protocol !== 'https:' ||
    endpoint.hostname !== IPPANEL_HOST ||
    endpoint.pathname !== SEND_PATH ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw smsError('SMS_CONFIGURATION_INVALID', 503);
  }
  return endpoint.toString();
}

function configuredBaseUrl() {
  configuredSendUrl();
  return `https://${IPPANEL_HOST}/v1`;
}

function reportUrl(kind, params) {
  const baseUrl = configuredBaseUrl();
  const path = REPORT_PATHS[kind];
  if (!path) throw smsError('SMS_STATUS_UNAVAILABLE', 503);
  const expectedPath = `/v1${path}`;
  const url = new URL(`${baseUrl}${path}`);
  if (url.protocol !== 'https:' || url.hostname !== IPPANEL_HOST || url.pathname !== expectedPath) {
    throw smsError('SMS_CONFIGURATION_INVALID', 503);
  }
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function assertSmsConfiguration() {
  if (!config.ippanelKey || !config.ippanelFrom) {
    throw smsError('SMS_NOT_CONFIGURED', 503);
  }
  if (!/^\+[1-9]\d{1,14}$/.test(config.ippanelFrom)) {
    throw smsError('SMS_SENDER_INVALID', 503);
  }
  // Pattern mode without an approved code is not a configured provider (readiness reports it).
  if (config.ippanelSendingType === 'pattern' && !config.ippanelPatternCode) {
    throw smsError('SMS_PATTERN_NOT_CONFIGURED', 503);
  }
  return configuredSendUrl();
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

/** Keeps error *field names* (never values) so failures can be classified without leaking data. */
function providerErrorFields(payload) {
  const errors = payload?.meta?.errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return [];
  return Object.keys(errors).filter((key) => /^[a-z_]{1,32}$/i.test(key)).slice(0, 10);
}

function classifyProviderFailure({ httpStatus, providerCode, errorFields, sendingType = 'webservice' }) {
  const code = typeof providerCode === 'string' ? providerCode.slice(0, 16) : '';
  if (httpStatus === 401 || httpStatus === 403 || code === '400-1') {
    return { code: 'SMS_AUTH_REJECTED', status: 502 };
  }
  if (httpStatus === 429) return { code: 'SMS_PROVIDER_RATE_LIMITED', status: 429 };
  if (httpStatus >= 500) return { code: 'SMS_PROVIDER_UNAVAILABLE', status: 503 };
  if (errorFields.some((field) => /^(from_number|sender|source)$/i.test(field))) {
    return { code: 'SMS_SENDER_REJECTED', status: 502 };
  }
  if (sendingType === 'pattern' && errorFields.some((field) => /^(code|pattern|params)$/i.test(field))) {
    // The panel rejected the pattern code or its variables (typically: not approved, or the
    // placeholder name does not match). Reported distinctly so it is never mistaken for a
    // free-text failure. The caller never falls back to free text.
    return { code: 'SMS_PATTERN_REJECTED', status: 502 };
  }
  if (errorFields.some((field) => /^(recipients?|params)$/i.test(field))) {
    return { code: 'SMS_RECIPIENT_REJECTED', status: 400 };
  }
  if (errorFields.some((field) => /^(message|sending_type)$/i.test(field))) {
    return { code: 'SMS_MESSAGE_REJECTED', status: 502 };
  }
  if (code.startsWith('400-')) return { code: 'SMS_PROVIDER_REJECTED', status: 502 };
  return { code: 'SMS_SEND_FAILED', status: 502 };
}

function safePhoneLabel(phone) {
  try {
    return maskPhone(String(phone || ''));
  } catch {
    return 'unknown';
  }
}

/**
 * Free-text OTP message (webservice mode).
 *
 * Counting method (documented in docs/otp-sms-delivery.md): the length is measured on the final
 * text after substitution, in Unicode code points (what a user sees) and in UTF-16 code units
 * (what a naive counter sees). Both must stay at most OTP_SMS_MAX_CHARACTERS. The text contains
 * no validity period, link, advertising or extra wording by design.
 */
export const OTP_SMS_MAX_CHARACTERS = 25;
const OTP_SMS_TEMPLATE = 'کد اتاق جنگ: %code%';

export function buildOtpSmsMessage(otp) {
  if (!/^\d{6}$/.test(String(otp || ''))) throw smsError('SMS_REQUEST_INVALID', 400);
  return OTP_SMS_TEMPLATE.replace('%code%', String(otp));
}

/**
 * Request body for the configured sending type. Exported for unit tests (no network).
 *
 * - webservice: { sending_type, from_number, message, params: { recipients: [phone] } }
 * - pattern:    { sending_type, from_number, code: <pattern code string>, recipients: [phone],
 *                 params: { code: <otp as a string> } }
 *   The placeholder key `code` must equal the variable name of the approved pattern in the panel.
 *   Pattern mode never falls back to the webservice body.
 */
export function buildSendBody({ sendingType, fromNumber, patternCode, e164Phone, otp }) {
  if (sendingType === 'pattern') {
    if (!patternCode) throw smsError('SMS_PATTERN_NOT_CONFIGURED', 503);
    return {
      sending_type: 'pattern',
      from_number: fromNumber,
      code: String(patternCode),
      recipients: [e164Phone],
      params: { code: String(otp) },
    };
  }
  return {
    sending_type: 'webservice',
    from_number: fromNumber,
    message: buildOtpSmsMessage(otp),
    params: { recipients: [e164Phone] },
  };
}

/**
 * Sends one OTP SMS through IPPanel's documented Edge send endpoint.
 * Webservice: https://ippanelcom.github.io/Edge-Document/docs/send/webservice/
 * Pattern:    https://ippanelcom.github.io/Edge-Document/docs/send/pattern/
 */
export async function sendOtpSms(e164Phone, otp, { issuedAtMs, expiresAtMs } = {}) {
  const endpoint = assertSmsConfiguration();
  const sendingType = config.ippanelSendingType === 'pattern' ? 'pattern' : 'webservice';
  if (sendingType === 'pattern' && !config.ippanelPatternCode) {
    throw smsError('SMS_PATTERN_NOT_CONFIGURED', 503);
  }
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

  const body = buildSendBody({
    sendingType,
    fromNumber: config.ippanelFrom,
    patternCode: config.ippanelPatternCode,
    e164Phone,
    otp,
  });
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
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Never log the request body (it contains the OTP) or the API key.
    console.warn(
      `[sms] transport failure provider=ippanel code=SMS_NETWORK_FAILED reason=${String(error?.name || 'fetch_error').slice(0, 32)} phone=${safePhoneLabel(e164Phone)}`,
    );
    throw smsError('SMS_NETWORK_FAILED', 502);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    console.warn(
      `[sms] unparsable response provider=ippanel code=SMS_SEND_FAILED httpStatus=${response.status} phone=${safePhoneLabel(e164Phone)}`,
    );
    throw smsError('SMS_SEND_FAILED', 502);
  }

  const ids = acceptedMessageIds(payload);
  if (!response.ok || !ids) {
    const providerCode = typeof payload?.meta?.message_code === 'string' ? payload.meta.message_code : '';
    const classification = classifyProviderFailure({
      httpStatus: response.status,
      providerCode,
      errorFields: providerErrorFields(payload),
      sendingType,
    });
    console.warn(
      `[sms] rejected provider=ippanel code=${classification.code} httpStatus=${response.status} providerCode=${providerCode || 'none'} phone=${safePhoneLabel(e164Phone)}`,
    );
    throw smsError(classification.code, classification.status);
  }

  // Safe success record: the provider message id (already persisted on the challenge row) and
  // a masked phone number. The OTP code itself is never logged.
  console.info(
    `[sms] accepted provider=ippanel messageId=${ids[0]} validitySeconds=${validitySeconds} phone=${safePhoneLabel(e164Phone)}`,
  );

  return { ok: true, ids, accepted: true, provider: 'ippanel' };
}

async function fetchReportJson(url) {
  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'error',
      headers: {
        Authorization: config.ippanelKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw smsError('SMS_NETWORK_FAILED', 502);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw smsError('SMS_SEND_FAILED', 502);
  }

  if (!response.ok || payload?.meta?.status !== true) {
    const classification = classifyProviderFailure({
      httpStatus: response.status,
      providerCode: payload?.meta?.message_code,
      errorFields: providerErrorFields(payload),
    });
    // Report endpoints never carry an OTP, so only the error code is logged - never the body.
    console.warn(`[sms] report rejected code=${classification.code} httpStatus=${response.status}`);
    throw smsError(classification.code, classification.status);
  }
  return payload;
}

function sanitizeState(value) {
  const text = typeof value === 'string' ? value.trim().slice(0, 32) : '';
  return /^[a-z_]+$/i.test(text) ? text.toLowerCase() : 'unknown';
}

function maskRecipientRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, RECIPIENTS_PER_PAGE).map((row) => {
    const status = Number(row?.message_status);
    return {
      // Recipient numbers are masked: a delivery check must never expose full phone numbers.
      phone: safePhoneLabel(row?.recipient),
      status: Number.isInteger(status) ? status : null,
      state: Number.isInteger(status) ? SMS_STATUS_LABELS[status] || 'unknown' : 'unknown',
      parts: /^\d{1,3}$/.test(String(row?.msg_parts ?? '')) ? Number(row.msg_parts) : null,
    };
  });
}

/**
 * Reads the documented delivery report of one already-accepted message.
 *
 * Returns only sanitized fields: the bulk state, per-recipient delivery states with masked
 * phone numbers and counters. Provider free-text fields and raw response bodies are dropped.
 *
 * @param {string|number} messageId value previously persisted as `sms_message_id`
 */
export async function fetchSmsDeliveryStatus(messageId) {
  assertSmsConfiguration();
  const id = normalizeMessageId(messageId);
  if (!id) throw smsError('SMS_REQUEST_INVALID', 400);

  const bulk = await fetchReportJson(reportUrl('bulk', { messages_outbox_id: id }));
  const recipientsResponse = await fetchReportJson(
    reportUrl('recipients', { bulk_id: id, page: 1, per_page: RECIPIENTS_PER_PAGE }),
  );

  const recipients = maskRecipientRows(recipientsResponse?.data);
  const delivered = recipients.filter((row) => row.state === 'delivered').length;
  const notDelivered = recipients.filter((row) => row.state === 'not_delivered').length;
  const blacklisted = recipients.filter((row) => row.state === 'blacklisted').length;
  const inProgress = recipients.filter((row) => row.state === 'sent_to_operator' || row.state === 'operator_received').length;

  return {
    messageId: id,
    provider: 'ippanel',
    state: sanitizeState(bulk?.data?.state),
    recipientsCount: Number.isSafeInteger(Number(bulk?.data?.rcpts_count)) ? Number(bulk.data.rcpts_count) : recipients.length,
    counts: { delivered, notDelivered, blacklisted, inProgress },
    delivered: delivered > 0 && notDelivered === 0 && inProgress === 0,
    recipients,
  };
}
