import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { sendOtpSms } from './sms.js';

test('SMS adapter fails explicitly when IPPanel is not configured', async () => {
  const originalKey = config.ippanelKey;
  const originalFrom = config.ippanelFrom;
  config.ippanelKey = '';
  config.ippanelFrom = '';
  try {
    await assert.rejects(
      sendOtpSms('+989120000000', '123456', { issuedAtMs: Date.now(), expiresAtMs: Date.now() + 300_000 }),
      (error) => error.code === 'SMS_NOT_CONFIGURED',
    );
  } finally {
    config.ippanelKey = originalKey;
    config.ippanelFrom = originalFrom;
  }
});

test('SMS adapter sends the documented payload and accepts only a successful response with an outbox ID', async () => {
  const original = {
    key: config.ippanelKey,
    from: config.ippanelFrom,
    url: config.ippanelUrl,
    fetch: globalThis.fetch,
  };
  config.ippanelKey = 'test-key-not-a-secret';
  config.ippanelFrom = '+983000505';
  config.ippanelUrl = 'https://edge.ippanel.com/v1/api/send';

  try {
    let requestUrl;
    let requestOptions;
    globalThis.fetch = async (url, options) => {
      requestUrl = String(url);
      requestOptions = options;
      return new Response(JSON.stringify({
        data: { message_outbox_ids: [1123544244] },
        meta: { status: true, message_code: '200-1' },
      }), { status: 200 });
    };

    const issuedAtMs = Date.now();
    const expiresAtMs = issuedAtMs + 300_000;
    const result = await sendOtpSms('+989120000000', '123456', { issuedAtMs, expiresAtMs });
    assert.deepEqual(result, { ok: true, ids: ['1123544244'], accepted: true, provider: 'ippanel' });
    assert.equal(requestUrl, 'https://edge.ippanel.com/v1/api/send');
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers.Authorization, 'test-key-not-a-secret');
    assert.ok(requestOptions.signal);

    const body = JSON.parse(requestOptions.body);
    assert.deepEqual(body, {
      sending_type: 'webservice',
      from_number: '+983000505',
      message: 'کد تأیید اتاق جنگ: 123456\nاعتبار کد: 300 ثانیه از زمان صدور.',
      params: { recipients: ['+989120000000'] },
    });

    globalThis.fetch = async () => new Response(JSON.stringify({
      data: { message_outbox_ids: [1123544244] },
      meta: { status: false, message_code: '400-2' },
    }), { status: 200 });
    await assert.rejects(
      sendOtpSms('+989120000000', '123456', { issuedAtMs: Date.now(), expiresAtMs: Date.now() + 300_000 }),
      (error) => error.code === 'SMS_SEND_FAILED',
    );
  } finally {
    config.ippanelKey = original.key;
    config.ippanelFrom = original.from;
    config.ippanelUrl = original.url;
    globalThis.fetch = original.fetch;
  }
});
