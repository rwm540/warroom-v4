import { config } from '../config.js';

function isAccepted(result) {
  return result?.meta?.status === true
    && Array.isArray(result?.data?.message_outbox_ids)
    && result.data.message_outbox_ids.length > 0;
}

export async function sendOtpSms(e164Phone, otp) {
  if (!config.ippanelKey || !config.ippanelFrom) {
    const error = new Error('SMS_NOT_CONFIGURED');
    error.status = 500;
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }

  const message = `کد تأیید اتاق جنگ: ${otp}\nاین کد تا ${Math.ceil(config.otpTtlSeconds / 60)} دقیقه معتبر است.`;
  const sender = config.ippanelFrom.replace(/@Web$/i, '');

  let response;
  try {
    response = await fetch(config.ippanelUrl, {
      method: 'POST',
      headers: {
        Authorization: config.ippanelKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        sending_type: 'webservice',
        from_number: sender,
        message,
        params: { recipients: [e164Phone] },
      }),
    });
  } catch {
    const error = new Error('SMS_SEND_FAILED');
    error.status = 502;
    error.code = 'SMS_SEND_FAILED';
    throw error;
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !isAccepted(payload)) {
    const error = new Error('SMS_SEND_FAILED');
    error.status = 502;
    error.code = 'SMS_SEND_FAILED';
    throw error;
  }

  return { ok: true, ids: payload?.data?.message_outbox_ids || [], accepted: true };
}
