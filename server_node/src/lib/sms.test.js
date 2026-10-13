import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.js';
import {
  sendOtpSms,
  fetchSmsDeliveryStatus,
  isSmsConfigured,
  buildOtpSmsMessage,
  buildSendBody,
  OTP_SMS_MAX_CHARACTERS,
} from './sms.js';
import { parseIppanelPatternCode, parseIppanelSendingType } from '../config.js';
import { createSmsGateway } from './smsGateway.js';

const SEND_URL = 'https://edge.ippanel.com/v1/api/send';
const BULK_URL = 'https://edge.ippanel.com/v1/api/report/by_bulk';
const RECIPIENTS_URL = 'https://edge.ippanel.com/v1/api/report/recipients';
const TEST_KEY = 'test-key-not-a-secret';
const RECIPIENT = '+989120000000';

/** Runs a test against a fake, fully configured IPPanel account and always restores state. */
async function withSmsConfig(run) {
  const original = {
    key: config.ippanelKey,
    from: config.ippanelFrom,
    url: config.ippanelUrl,
    fetch: globalThis.fetch,
  };
  config.ippanelKey = TEST_KEY;
  config.ippanelFrom = '+983000505';
  config.ippanelUrl = SEND_URL;
  try {
    return await run();
  } finally {
    config.ippanelKey = original.key;
    config.ippanelFrom = original.from;
    config.ippanelUrl = original.url;
    globalThis.fetch = original.fetch;
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function otpWindow() {
  const issuedAtMs = Date.now();
  return { issuedAtMs, expiresAtMs: issuedAtMs + config.otpTtlSeconds * 1000 };
}

async function expectSmsError(promise, code) {
  await assert.rejects(promise, (error) => error.code === code);
}

test('SMS adapter fails explicitly when IPPanel is not configured', async () => {
  const originalKey = config.ippanelKey;
  const originalFrom = config.ippanelFrom;
  config.ippanelKey = '';
  config.ippanelFrom = '';
  assert.equal(isSmsConfigured(), false);
  try {
    await expectSmsError(
      sendOtpSms(RECIPIENT, '123456', otpWindow()),
      'SMS_NOT_CONFIGURED',
    );
  } finally {
    config.ippanelKey = originalKey;
    config.ippanelFrom = originalFrom;
  }
});

test('a malformed sender number is reported as a sender configuration problem', async () => {
  await withSmsConfig(async () => {
    const originalFrom = config.ippanelFrom;
    config.ippanelFrom = 'not-a-phone';
    try {
      await expectSmsError(sendOtpSms(RECIPIENT, '123456', otpWindow()), 'SMS_SENDER_INVALID');
    } finally {
      config.ippanelFrom = originalFrom;
    }
  });
});

test('SMS adapter sends the documented payload and accepts only a successful response with an outbox ID', async () => {
  await withSmsConfig(async () => {
    let requestUrl;
    let requestOptions;
    globalThis.fetch = async (url, options) => {
      requestUrl = String(url);
      requestOptions = options;
      return jsonResponse({
        data: { message_outbox_ids: [1123544244] },
        meta: { status: true, message_code: '200-1' },
      });
    };

    const { issuedAtMs, expiresAtMs } = otpWindow();
    const result = await sendOtpSms(RECIPIENT, '123456', { issuedAtMs, expiresAtMs });
    assert.deepEqual(result, { ok: true, ids: ['1123544244'], accepted: true, provider: 'ippanel' });
    assert.equal(requestUrl, SEND_URL);
    assert.equal(requestOptions.method, 'POST');
    assert.equal(requestOptions.headers.Authorization, TEST_KEY);
    assert.ok(requestOptions.signal);

    const body = JSON.parse(requestOptions.body);
    assert.deepEqual(body, {
      sending_type: 'webservice',
      from_number: '+983000505',
      // Fixed short template: no validity text, no link, no advertising (see OTP_SMS_MAX_CHARACTERS).
      message: 'کد اتاق جنگ: 123456',
      params: { recipients: [RECIPIENT] },
    });

    globalThis.fetch = async () => jsonResponse({
      data: { message_outbox_ids: [1123544244] },
      meta: { status: false, message_code: '400-2' },
    });
    await expectSmsError(sendOtpSms(RECIPIENT, '123456', otpWindow()), 'SMS_PROVIDER_REJECTED');

    globalThis.fetch = async () => jsonResponse({ data: { message_outbox_ids: [] }, meta: { status: true } });
    await expectSmsError(sendOtpSms(RECIPIENT, '123456', otpWindow()), 'SMS_SEND_FAILED');
  });
});

test('provider failures are classified instead of collapsed into one error', async () => {
  await withSmsConfig(async () => {
    const cases = [
      {
        name: 'invalid or expired API token',
        response: jsonResponse({ data: null, meta: { status: false, message_code: '400-1' } }, 401),
        code: 'SMS_AUTH_REJECTED',
      },
      {
        name: 'provider-side rate limit',
        response: jsonResponse({ data: null, meta: { status: false, message_code: '429-1' } }, 429),
        code: 'SMS_PROVIDER_RATE_LIMITED',
      },
      {
        name: 'sender number rejected by the account',
        response: jsonResponse({ data: null, meta: { status: false, message_code: '400-2', errors: { from_number: ['not assigned'] } } }, 422),
        code: 'SMS_SENDER_REJECTED',
      },
      {
        name: 'recipient rejected',
        response: jsonResponse({ data: null, meta: { status: false, message_code: '400-2', errors: { recipients: ['invalid'] } } }, 422),
        code: 'SMS_RECIPIENT_REJECTED',
      },
      {
        name: 'message rejected',
        response: jsonResponse({ data: null, meta: { status: false, message_code: '400-2', errors: { message: ['required'] } } }, 422),
        code: 'SMS_MESSAGE_REJECTED',
      },
      {
        name: 'provider outage',
        response: jsonResponse({ data: null, meta: { status: false } }, 503),
        code: 'SMS_PROVIDER_UNAVAILABLE',
      },
      {
        name: 'unparsable response',
        response: new Response('<html>bad gateway</html>', { status: 200 }),
        code: 'SMS_SEND_FAILED',
      },
    ];

    for (const scenario of cases) {
      globalThis.fetch = async () => scenario.response;
      await expectSmsError(sendOtpSms(RECIPIENT, '123456', otpWindow()), scenario.code);
    }

    globalThis.fetch = async () => { throw new Error('socket hang up'); };
    await expectSmsError(sendOtpSms(RECIPIENT, '123456', otpWindow()), 'SMS_NETWORK_FAILED');

    // A wrong recipient/otp shape is refused before any network call.
    await expectSmsError(sendOtpSms('+98912000000', '123456', otpWindow()), 'SMS_REQUEST_INVALID');
    await expectSmsError(sendOtpSms(RECIPIENT, '12345', otpWindow()), 'SMS_REQUEST_INVALID');
    await expectSmsError(
      sendOtpSms(RECIPIENT, '123456', { issuedAtMs: Date.now(), expiresAtMs: Date.now() - 1 }),
      'OTP_EXPIRY_INVALID',
    );
  });
});

test('send logs never contain the OTP, the recipient number or the API key', async () => {
  await withSmsConfig(async () => {
    const captured = [];
    const realConsole = { info: console.info, warn: console.warn };
    console.info = (...args) => captured.push(args.map(String).join(' '));
    console.warn = (...args) => captured.push(args.map(String).join(' '));
    try {
      globalThis.fetch = async () => jsonResponse({
        data: { message_outbox_ids: [1123544244] },
        meta: { status: true, message_code: '200-1' },
      });
      await sendOtpSms(RECIPIENT, '987654', otpWindow());

      globalThis.fetch = async () => jsonResponse({ data: null, meta: { status: false, message_code: '400-1' } }, 401);
      await expectSmsError(sendOtpSms(RECIPIENT, '987654', otpWindow()), 'SMS_AUTH_REJECTED');
    } finally {
      console.info = realConsole.info;
      console.warn = realConsole.warn;
    }

    const text = captured.join('\n');
    assert.ok(text.includes('1123544244'), 'the accepted message id is recorded for support');
    assert.equal(text.includes('987654'), false, 'the OTP code is never logged');
    assert.equal(text.includes(RECIPIENT), false, 'the full recipient number is never logged');
    assert.equal(text.includes('+989120000000'), false);
    assert.equal(text.includes(TEST_KEY), false, 'the API key is never logged');
  });
});

test('delivery status reads the documented report endpoints and stays sanitized', async () => {
  await withSmsConfig(async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      if (String(url).includes('/api/report/by_bulk')) {
        return jsonResponse({
          data: { messages_outbox_id: '1123544244', state: 'finish', status: 'پایان یافته', rcpts_count: '1' },
          meta: { status: true, message_code: '200-1' },
        });
      }
      return jsonResponse({
        data: [{ recipient: RECIPIENT, message: 'متن پیام', is_readable: true, msg_parts: '1', message_status: '2' }],
        meta: { status: true, message_code: '200-1' },
      });
    };

    const status = await fetchSmsDeliveryStatus('1123544244');
    assert.equal(status.state, 'finish');
    assert.equal(status.delivered, true);
    assert.deepEqual(status.counts, { delivered: 1, notDelivered: 0, blacklisted: 0, inProgress: 0 });
    assert.equal(status.recipients[0].state, 'delivered');
    assert.equal(status.recipients[0].phone.includes('*'), true, 'recipient numbers are masked');

    assert.equal(calls[0].url, `${BULK_URL}?messages_outbox_id=1123544244`);
    assert.equal(calls[1].url, `${RECIPIENTS_URL}?bulk_id=1123544244&page=1&per_page=30`);
    assert.equal(calls[0].options.headers.Authorization, TEST_KEY);

    // A not-delivered recipient and the provider free text are mapped, never echoed verbatim.
    globalThis.fetch = async (url) => String(url).includes('/api/report/by_bulk')
      ? jsonResponse({ data: { state: 'finish' }, meta: { status: true } })
      : jsonResponse({ data: [{ recipient: RECIPIENT, message_status: '3', msg_parts: '1' }], meta: { status: true } });
    const failed = await fetchSmsDeliveryStatus(1123544244);
    assert.equal(failed.recipients[0].state, 'not_delivered');
    assert.equal(failed.delivered, false);
    assert.equal('status' in failed, false, 'provider free text is dropped');
  });
});

test('delivery status rejects invalid ids and provider auth failures', async () => {
  await withSmsConfig(async () => {
    await expectSmsError(fetchSmsDeliveryStatus('not-an-id'), 'SMS_REQUEST_INVALID');

    globalThis.fetch = async () => jsonResponse({ data: null, meta: { status: false, message_code: '400-1' } }, 401);
    await expectSmsError(fetchSmsDeliveryStatus('1123544244'), 'SMS_AUTH_REJECTED');
  });
});

/** Runs a test with pattern mode enabled and always restores the previous settings. */
async function withPatternConfig(patternCode, run) {
  const original = {
    sendingType: config.ippanelSendingType,
    patternCode: config.ippanelPatternCode,
  };
  config.ippanelSendingType = 'pattern';
  config.ippanelPatternCode = patternCode;
  try {
    return await withSmsConfig(run);
  } finally {
    config.ippanelSendingType = original.sendingType;
    config.ippanelPatternCode = original.patternCode;
  }
}

test('the OTP SMS text is the fixed short template and fits the 25-character limit', () => {
  const message = buildOtpSmsMessage('123456');
  assert.equal(message, 'کد اتاق جنگ: 123456');
  // Two counters are checked: code points (what the user reads) and UTF-16 code units
  // (what a naive counter measures). Both must stay within the limit.
  assert.ok([...message].length <= OTP_SMS_MAX_CHARACTERS, `code points: ${[...message].length}`);
  assert.ok(message.length <= OTP_SMS_MAX_CHARACTERS, `UTF-16 units: ${message.length}`);
  assert.equal([...message].length, 19, 'the template with a 6-digit code is 19 characters');
  // The length does not depend on the digits of the code.
  for (const otp of ['000000', '999999', '504817']) {
    assert.equal([...buildOtpSmsMessage(otp)].length, 19);
  }
  // No validity period, link, advertising or extra wording is ever added.
  assert.equal(/ثانیه|اعتبار|http|www|\.ir|\n/.test(message), false);
});

test('an OTP that is not exactly six digits never produces an SMS text', () => {
  for (const otp of ['12345', '1234567', 'abcdef', '', null]) {
    assert.throws(() => buildOtpSmsMessage(otp), (error) => error.code === 'SMS_REQUEST_INVALID');
  }
});

test('pattern mode sends the approved code as a string with the OTP in the "code" variable', () => {
  const body = buildSendBody({
    sendingType: 'pattern',
    fromNumber: '+983000505',
    patternCode: 'test-pattern-code',
    e164Phone: RECIPIENT,
    otp: '123456',
  });
  assert.deepEqual(body, {
    sending_type: 'pattern',
    from_number: '+983000505',
    code: 'test-pattern-code',
    recipients: [RECIPIENT],
    params: { code: '123456' },
  });
  assert.equal(typeof body.code, 'string');
  assert.equal(typeof body.params.code, 'string');
  assert.equal('message' in body, false, 'pattern bodies carry no free text');
});

test('pattern mode without a code fails explicitly and never builds a free-text body', () => {
  assert.throws(
    () => buildSendBody({ sendingType: 'pattern', fromNumber: '+983000505', patternCode: '', e164Phone: RECIPIENT, otp: '123456' }),
    (error) => error.code === 'SMS_PATTERN_NOT_CONFIGURED',
  );
});

test('pattern mode sends one pattern request with mocked IPPanel and never a free-text request', async () => {
  await withPatternConfig('test-pattern-code', async () => {
    const requests = [];
    globalThis.fetch = async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      return jsonResponse({ data: { message_outbox_ids: [555001] }, meta: { status: true, message_code: '200-1' } });
    };
    const result = await sendOtpSms(RECIPIENT, '246810', otpWindow());
    assert.deepEqual(result, { ok: true, ids: ['555001'], accepted: true, provider: 'ippanel' });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, SEND_URL);
    assert.equal(requests[0].body.sending_type, 'pattern');
    assert.equal(requests[0].body.code, 'test-pattern-code');
    assert.deepEqual(requests[0].body.params, { code: '246810' });
    assert.deepEqual(requests[0].body.recipients, [RECIPIENT]);
    assert.equal('message' in requests[0].body, false);
  });
});

test('pattern mode without a code throws before any network call (no fallback, no mock)', async () => {
  await withPatternConfig('', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return jsonResponse({ data: null, meta: { status: false } }, 500);
    };
    await expectSmsError(sendOtpSms(RECIPIENT, '246810', otpWindow()), 'SMS_PATTERN_NOT_CONFIGURED');
    assert.equal(calls, 0, 'no request is made in pattern mode without a code');

    // The gateway must not reach the mock sender either, even when mock SMS is allowed.
    const gateway = createSmsGateway({ allowMock: true, configured: () => true, sender: async () => {
      calls += 1;
      return { ok: true, ids: ['x'] };
    } });
    await assert.rejects(gateway.send(RECIPIENT, '246810', otpWindow()), (error) => error.code === 'SMS_PATTERN_NOT_CONFIGURED');
    assert.equal(calls, 0, 'neither the real sender nor a mock is used');
  });
});

test('a pattern rejected by IPPanel is a detectable error and the adapter sends no second, free-text request', async () => {
  await withPatternConfig('unapproved-code', async () => {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return jsonResponse(
        { data: null, meta: { status: false, message_code: '400-2', errors: { code: ['pattern not found'] } } },
        422,
      );
    };
    await expectSmsError(sendOtpSms(RECIPIENT, '246810', otpWindow()), 'SMS_PATTERN_REJECTED');
    assert.equal(calls, 1, 'exactly one request, never a fallback request');
  });
});

test('pattern and webservice modes are read from explicit settings only', () => {
  assert.deepEqual(parseIppanelSendingType(undefined), { value: 'webservice', valid: true });
  assert.deepEqual(parseIppanelSendingType(''), { value: 'webservice', valid: true });
  assert.deepEqual(parseIppanelSendingType('webservice'), { value: 'webservice', valid: true });
  assert.deepEqual(parseIppanelSendingType(' Pattern '), { value: 'pattern', valid: true });
  assert.equal(parseIppanelSendingType('free-text').valid, false, 'unknown values are never silently accepted');
  assert.equal(parseIppanelSendingType('free-text').value, 'invalid');
});

test('the pattern code must be an identifier and placeholders are rejected', () => {
  assert.equal(parseIppanelPatternCode('abc-123_XYZ'), 'abc-123_XYZ');
  assert.equal(parseIppanelPatternCode('  abcd1234  '), 'abcd1234');
  assert.equal(parseIppanelPatternCode(''), '');
  assert.equal(parseIppanelPatternCode(undefined), '');
  assert.equal(parseIppanelPatternCode('abc'), '', 'shorter than 4 characters');
  assert.equal(parseIppanelPatternCode('code with spaces'), '');
  assert.equal(parseIppanelPatternCode('replace_with_pattern_code'), '');
  assert.equal(parseIppanelPatternCode('your_pattern_code'), '');
  assert.equal(parseIppanelPatternCode('x'.repeat(65)), '');
});
