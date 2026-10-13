import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resendOtp, sendOtpByNationalCode, verifyOtp } from './otpApi';

const NATIONAL = '1234567891';
const PASSWORD = 'Rz7kQm2Lp9x';

type FetchArgs = [path: string, options?: RequestInit];

function sendResponse(overrides: Record<string, unknown> = {}, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => ({
      success: true,
      message: 'ok',
      expiresIn: 120,
      expiresAt: '2026-01-01T00:02:00.000Z',
      resendAvailableIn: 60,
      deliveryStatus: 'accepted',
      maskedPhone: '0912***33',
      challengeToken: 'challenge-token',
      purpose: 'login',
      ...overrides,
    }),
  } as unknown as Response;
}

function errorResponse(body: Record<string, unknown>, status: number) {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
});

afterEach(() => {
  setItemSpy.mockRestore();
  vi.restoreAllMocks();
});

describe('OTP resend contract', () => {
  it('resends a login code with the password so the server can re-run the password gate', async () => {
    const fetchMock = vi.fn(async (_path: string, _options?: RequestInit) => sendResponse());
    vi.stubGlobal('fetch', fetchMock);

    const result = await resendOtp(NATIONAL, { purpose: 'login', password: PASSWORD });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, options] = fetchMock.mock.calls[0] as FetchArgs;
    expect(path).toBe('/api/otp/resend');
    expect(JSON.parse(String(options.body))).toEqual({
      nationalCode: NATIONAL,
      purpose: 'login',
      password: PASSWORD,
    });
    expect(result.success).toBe(true);
    expect(result.challengeToken).toBe('challenge-token');
    expect(result.expiresAt).toBe('2026-01-01T00:02:00.000Z');
    expect(result.resendAvailableIn).toBe(60);
    expect(result.deliveryStatus).toBe('accepted');
    // Nothing credential-related may ever be written to Web Storage.
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('accepts the legacy (nationalCode, purpose, password) call shape', async () => {
    const fetchMock = vi.fn(async (_path: string, _options?: RequestInit) => sendResponse());
    vi.stubGlobal('fetch', fetchMock);

    const result = await resendOtp(NATIONAL, 'login', PASSWORD);

    const [, options] = fetchMock.mock.calls[0] as FetchArgs;
    expect(JSON.parse(String(options?.body)).password).toBe(PASSWORD);
    expect(result.success).toBe(true);
  });

  it('resends a registration code without a password', async () => {
    const fetchMock = vi.fn(async (_path: string, _options?: RequestInit) => sendResponse({ purpose: 'registration' }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await resendOtp(NATIONAL, { purpose: 'registration' });

    const [, options] = fetchMock.mock.calls[0] as FetchArgs;
    expect(JSON.parse(String(options?.body))).toEqual({ nationalCode: NATIONAL, purpose: 'registration' });
    expect(JSON.parse(String(options?.body))).not.toHaveProperty('password');
    expect(result.purpose).toBe('registration');
  });

  it('refuses a login resend without a password before any request is made', async () => {
    const fetchMock = vi.fn(async (_path: string, _options?: RequestInit) => sendResponse());
    vi.stubGlobal('fetch', fetchMock);

    const result = await resendOtp(NATIONAL, { purpose: 'login' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/رمز عبور/);
  });

  it('surfaces the cooldown answer with its retry hint and never throws', async () => {
    const fetchMock = vi.fn(async (_path: string, _options?: RequestInit) => errorResponse(
      { success: false, error: 'RATE_LIMITED_COOLDOWN', message: 'برای درخواست کد جدید ۶۰ ثانیه صبر کنید.', retryAfterSeconds: 60 },
      429,
    ));
    vi.stubGlobal('fetch', fetchMock);

    const result = await resendOtp(NATIONAL, { purpose: 'login', password: PASSWORD });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/۶۰ ثانیه/);
    expect(result.retryAfterSeconds).toBe(60);
  });

  it('maps a failed initial send without leaking server internals', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => errorResponse(
      { success: false, error: 'SMS_PROVIDER_UNAVAILABLE', message: 'سرویس پیامک موقتاً در دسترس نیست.' },
      503,
    )));

    const result = await sendOtpByNationalCode(NATIONAL, { purpose: 'login', password: PASSWORD });

    expect(result.success).toBe(false);
    expect(result.error).toBe('سرویس پیامک موقتاً در دسترس نیست.');
    expect(result.challengeToken).toBeUndefined();
  });
});

describe('OTP verification mapping', () => {
  it('returns the one-time proof and purpose on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, otpProof: 'challenge-uuid', purpose: 'login' }),
    })));

    const result = await verifyOtp(NATIONAL, '123456', 'token');

    expect(result.success).toBe(true);
    expect(result.user).toEqual({ otpProof: 'challenge-uuid', purpose: 'login' });
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it('turns an invalid code into a clear failure without a proof', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'OTP_INVALID', message: 'کد تأیید اشتباه است.' }),
    })));

    const result = await verifyOtp(NATIONAL, '000000', 'token');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/اشتباه/);
    expect(result.user).toBeUndefined();
  });
});
