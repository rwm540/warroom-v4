import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import { sendOtpSms } from './sms.js';

test('SMS adapter fails explicitly when IPPanel is not configured', async () => {
  const originalKey = config.ippanelKey;
  const originalFrom = config.ippanelFrom;
  const originalPattern = config.ippanelPatternCode;
  config.ippanelKey = '';
  config.ippanelFrom = '';
  config.ippanelPatternCode = '';
  try {
    await assert.rejects(
      sendOtpSms('+989120000000', '123456', { issuedAtMs: Date.now(), expiresAtMs: Date.now() + 300_000 }),
      (error) => error.code === 'SMS_NOT_CONFIGURED',
    );
  } finally {
    config.ippanelKey = originalKey;
    config.ippanelFrom = originalFrom;
    config.ippanelPatternCode = originalPattern;
  }
});

test('SMS adapter sends the documented payload and accepts only a successful response with an outbox ID', async () => {
  const original = {
    key: config.ippanelKey,
    from: config.ippanelFrom,
    url: config.ippanelUrl,
    pattern: config.ippanelPatternCode,
    fetch: globalThis.fetch,
  };
  config.ippanelKey = 'test-key-not-a-secret';
  config.ippanelFrom = '+983000505';
  config.ippanelPatternCode = 'mf31w8ng9vnoqy5';
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
      sending_type: 'pattern',
      from_number: '+983000505',
      code: 'mf31w8ng9vnoqy5',
      recipients: ['+989120000000'],
      params: { code: '123456' },
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
    config.ippanelPatternCode = original.pattern;
    globalThis.fetch = original.fetch;
  }
});

test('pattern sender preserves leading zero and rejects missing pattern, malformed response and network failure without retry', async () => {
  const before = { key: config.ippanelKey, from: config.ippanelFrom, pattern: config.ippanelPatternCode, fetch: globalThis.fetch };
  let calls = 0;
  try {
    config.ippanelKey = 'unit-test-token';
    config.ippanelFrom = '+983000505';
    config.ippanelPatternCode = '';
    globalThis.fetch = async () => { calls++; throw new Error('should not fetch'); };
    await assert.rejects(sendOtpSms('+989121112233', '004217', { issuedAtMs: Date.now(), expiresAtMs: Date.now() + 120_000 }), e => e.code === 'SMS_NOT_CONFIGURED');
    assert.equal(calls, 0);
    config.ippanelPatternCode = 'mf31w8ng9vnoqy5';
    globalThis.fetch = async (_url, options) => {
      calls++;
      const body = JSON.parse(options.body);
      assert.equal(body.params.code, '004217');
      assert.equal(body.code, config.ippanelPatternCode);
      assert.equal(body.sending_type, 'pattern');
      return new Response('not json', { status: 200 });
    };
    await assert.rejects(sendOtpSms('+989121112233', '004217', { issuedAtMs: Date.now(), expiresAtMs: Date.now() + 120_000 }), e => e.code === 'SMS_SEND_FAILED' && !e.message.includes('004217'));
    assert.equal(calls, 1);
    globalThis.fetch = async () => { calls++; throw new Error('network with private token'); };
    await assert.rejects(sendOtpSms('+989121112233', '004217', { issuedAtMs: Date.now(), expiresAtMs: Date.now() + 120_000 }), e => e.code === 'SMS_SEND_FAILED' && !e.message.includes('token'));
    assert.equal(calls, 2, 'no automatic retry on ambiguous delivery');
  } finally {
    config.ippanelKey = before.key;
    config.ippanelFrom = before.from;
    config.ippanelPatternCode = before.pattern;
    globalThis.fetch = before.fetch;
  }
});

test('approved pattern text is 28 Unicode code points, not within a 25-character product limit', () => {
  const sample = 'کد ورود هیئت نوالهدا: %code%'.replace('%code%', '123456');
  assert.equal([...sample].length, 28);
  assert.equal([...sample].length <= 25, false);
});
