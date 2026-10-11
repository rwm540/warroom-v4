import { config } from '../config.js';

function isAccepted(result) {
  return result?.meta?.status === true || Array.isArray(result?.data?.message_outbox_ids);
}

export async function sendOtpSms(e164Phone, otp) {
  if (!config.ippanelKey) {
    const error = new Error('SMS_NOT_CONFIGURED');
    error.status = 500;
    throw error;
  }

  const message = `کد تأیید اتاق جنگ: ${otp}\nاین کد تا ۵ دقیقه معتبر است.`;
  const sender = config.ippanelFrom.replace(/@Web$/i, '');

  try {
    const { createClient } = await import('ippanel-node-sdk');
    const client = createClient(config.ippanelKey);
    const result = await client.sendWebservice(message, sender, [e164Phone]);
    if (isAccepted(result)) {
      return { ok: true, ids: result?.data?.message_outbox_ids || [] };
    }
  } catch {
    // fallback to documented Edge API
  }

  const response = await fetch(config.ippanelUrl, {
    method: 'POST',
    headers: {
      Authorization: config.ippanelKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sending_type: 'webservice',
      from_number: sender,
      message,
      params: { recipients: [e164Phone] },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !isAccepted(payload)) {
    const error = new Error('SMS_SEND_FAILED');
    error.status = 502;
    throw error;
  }

  return { ok: true, ids: payload?.data?.message_outbox_ids || [] };
}
