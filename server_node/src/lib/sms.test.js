import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { sendOtpSms } from './sms.js';

test('SMS adapter fails explicitly when IPPanel is not configured', async () => {
  const originalKey = config.ippanelKey;
  config.ippanelKey = '';
  await assert.rejects(sendOtpSms('+989120000000', '123456'), (error) => error.code === 'SMS_NOT_CONFIGURED');
  config.ippanelKey = originalKey;
});

test('SMS adapter accepts only a successful provider response with an outbox ID', async () => {
  const original = {
    key: config.ippanelKey,
    from: config.ippanelFrom,
    url: config.ippanelUrl,
    fetch: globalThis.fetch,
  };
  config.ippanelKey = 'test-key-not-a-secret';
  config.ippanelFrom = '+989000000000';
  config.ippanelUrl = 'https://ippanel.invalid/test';
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ meta: { status: true }, data: { message_outbox_ids: ['mock-message-id'] } }), { status: 200 });
    assert.deepEqual(await sendOtpSms('+989120000000', '123456'), { ok: true, ids: ['mock-message-id'], accepted: true });

    globalThis.fetch = async () => new Response(JSON.stringify({ meta: { status: false }, data: { message_outbox_ids: [] } }), { status: 200 });
    await assert.rejects(sendOtpSms('+989120000000', '123456'), (error) => error.code === 'SMS_SEND_FAILED');
  } finally {
    config.ippanelKey = original.key;
    config.ippanelFrom = original.from;
    config.ippanelUrl = original.url;
    globalThis.fetch = original.fetch;
  }
});
