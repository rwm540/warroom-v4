import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import OTPVerificationModal from './OTPVerificationModal';
import type { OTPSendResponse, OTPVerifiedUser } from '../lib/otpApi';
import type { OtpChallengeClock } from '../lib/otpClock';

const NATIONAL = '1234567891';
const BASE_TIME = Date.UTC(2026, 0, 1, 12, 0, 0);
const TTL_SECONDS = 120;

/** A challenge issued by the server at `serverStartMs` (server clock), received at `receivedMs`. */
function makeClock(
  serverStartMs: number,
  overrides: Partial<OtpChallengeClock> & { resendSeconds?: number; receivedMs?: number } = {},
): OtpChallengeClock {
  const { resendSeconds = TTL_SECONDS, receivedMs = serverStartMs, ...rest } = overrides;
  return {
    challengeToken: 'challenge-1',
    expiresAt: new Date(serverStartMs + TTL_SECONDS * 1000).toISOString(),
    serverTime: new Date(serverStartMs).toISOString(),
    resendAvailableAt: new Date(serverStartMs + resendSeconds * 1000).toISOString(),
    resendAvailableIn: resendSeconds,
    receivedAtMs: receivedMs,
    ...rest,
  };
}

type HarnessProps = {
  initial: OtpChallengeClock;
  onRequestNewCode?: () => Promise<OTPSendResponse>;
  onChallengeRenewed?: (next: OtpChallengeClock) => void;
  onSuccess?: (user: OTPVerifiedUser) => void;
};

let container: HTMLDivElement;
let root: Root;
const controls: { setOpen: (open: boolean) => void } = { setOpen: () => {} };

/** Minimal stand-in for AuthView: it owns the single challenge value the modal reports back. */
function Harness(props: HarnessProps) {
  const [open, setOpen] = useState(true);
  const [challenge, setChallenge] = useState<OtpChallengeClock>(props.initial);
  controls.setOpen = setOpen;

  return (
    <OTPVerificationModal
      isOpen={open}
      onClose={() => setOpen(false)}
      onSuccess={props.onSuccess ?? (() => {})}
      userPhone="0912***33"
      nationalCode={NATIONAL}
      challenge={challenge}
      onChallengeRenewed={(next) => {
        props.onChallengeRenewed?.(next);
        setChallenge(next);
      }}
      purpose="login"
      onRequestNewCode={props.onRequestNewCode}
    />
  );
}

function renderHarness(props: HarnessProps) {
  act(() => {
    root.render(<Harness {...props} />);
  });
}

function timerText() {
  return container.querySelector('[data-testid="otp-timer"]')?.textContent ?? '';
}

function resendButton() {
  return container.querySelector('[data-testid="otp-resend-button"]') as HTMLButtonElement;
}

function verifyButton() {
  return container.querySelector('[data-testid="otp-verify-button"]') as HTMLButtonElement;
}

function alertText() {
  return container.querySelector('[role="alert"]')?.textContent ?? '';
}

function advance(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

beforeAll(() => {
  // React only batches/flushes effects through act() when this flag is set (no testing-library).
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
  if (!window.matchMedia) {
    // motion queries this in jsdom; a static "no preference" answer keeps rendering simple.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('OTPVerificationModal: one countdown from the server deadline', () => {
  it('shows exactly one timer, counts from the server deadline and survives close and reopen', async () => {
    renderHarness({ initial: makeClock(BASE_TIME) });

    expect(timerText()).toContain('2:00');
    expect(container.querySelectorAll('[data-testid="otp-timer"]').length).toBe(1);

    advance(30);
    expect(timerText()).toContain('1:30');

    // The user closes the window and comes back later: the same deadline continues.
    act(() => controls.setOpen(false));
    advance(20);
    act(() => controls.setOpen(true));
    expect(timerText()).toContain('1:10');
    await act(async () => {});
  });

  it('computes the countdown from the server clock, not from a skewed browser clock', () => {
    // The browser clock is 5 minutes behind the server. The answer carries the server time.
    const serverStart = BASE_TIME + 5 * 60 * 1000;
    renderHarness({ initial: makeClock(serverStart, { receivedMs: BASE_TIME }) });

    expect(timerText()).toContain('2:00');
    advance(30);
    expect(timerText()).toContain('1:30');
    advance(90);
    expect(timerText()).toContain('کد منقضی');
  });

  it('shows the code as expired at its deadline, rejects verification and keeps resend available', () => {
    renderHarness({ initial: makeClock(BASE_TIME) });

    advance(TTL_SECONDS);
    expect(timerText()).toContain('کد منقضی شده است');
    expect(verifyButton().disabled).toBe(true);
    expect(verifyButton().textContent).toContain('کد منقضی شده است');
    expect(resendButton().disabled).toBe(false);
  });
});

describe('OTPVerificationModal: resend gate', () => {
  it('keeps resend disabled until the server resend deadline and never shows a second timer', () => {
    // Resend unlocks after 60 seconds while the code is still valid for 120 seconds.
    renderHarness({ initial: makeClock(BASE_TIME, { resendSeconds: 60 }) });

    expect(resendButton().disabled).toBe(true);
    expect(resendButton().textContent).not.toMatch(/\d:\d\d/);
    expect(container.querySelectorAll('[data-testid="otp-timer"]').length).toBe(1);

    advance(59);
    expect(resendButton().disabled).toBe(true);
    advance(1);
    expect(resendButton().disabled).toBe(false);
    expect(timerText()).toContain('1:00');
  });

  it('issues a new code, replaces the whole challenge at once and restarts the countdown', async () => {
    const onChallengeRenewed = vi.fn();
    const onRequestNewCode = vi.fn(async (): Promise<OTPSendResponse> => {
      const issuedAt = BASE_TIME + TTL_SECONDS * 1000;
      return {
        success: true,
        challengeToken: 'challenge-2',
        expiresIn: TTL_SECONDS,
        expiresAt: new Date(issuedAt + TTL_SECONDS * 1000).toISOString(),
        serverTime: new Date(issuedAt).toISOString(),
        resendAvailableIn: TTL_SECONDS,
        resendAvailableAt: new Date(issuedAt + TTL_SECONDS * 1000).toISOString(),
        deliveryStatus: 'accepted',
      };
    });

    renderHarness({ initial: makeClock(BASE_TIME), onRequestNewCode, onChallengeRenewed });

    advance(TTL_SECONDS);
    expect(resendButton().disabled).toBe(false);

    await act(async () => {
      resendButton().click();
    });

    expect(onRequestNewCode).toHaveBeenCalledTimes(1);
    expect(onChallengeRenewed).toHaveBeenCalledTimes(1);
    const next = onChallengeRenewed.mock.calls[0][0] as OtpChallengeClock;
    expect(next.challengeToken).toBe('challenge-2');
    expect(next.expiresAt).toBe(new Date(BASE_TIME + 240_000).toISOString());
    // The fresh challenge restarts the countdown and clears previously typed digits.
    expect(timerText()).toContain('2:00');
    expect(resendButton().disabled).toBe(true);
    for (const input of Array.from(container.querySelectorAll('input'))) {
      expect((input as HTMLInputElement).value).toBe('');
    }
  });

  it('keeps resend locked for the server cooldown and shows the Persian message', async () => {
    const onRequestNewCode = vi.fn(async (): Promise<OTPSendResponse> => ({
      success: false,
      error: 'برای درخواست کد جدید ۳۰ ثانیه صبر کنید.',
      retryAfterSeconds: 30,
    }));
    renderHarness({ initial: makeClock(BASE_TIME, { resendSeconds: 0 }), onRequestNewCode });

    await act(async () => {
      resendButton().click();
    });
    expect(alertText()).toContain('۳۰ ثانیه');
    expect(resendButton().disabled).toBe(true);

    advance(29);
    expect(resendButton().disabled).toBe(true);
    advance(1);
    expect(resendButton().disabled).toBe(false);
  });

  it('closing the window neither locks the account nor blocks a later resend', async () => {
    const onRequestNewCode = vi.fn(async (): Promise<OTPSendResponse> => ({ success: false, error: 'تست' }));
    renderHarness({ initial: makeClock(BASE_TIME, { resendSeconds: 40 }), onRequestNewCode });

    act(() => controls.setOpen(false));
    advance(60);
    act(() => controls.setOpen(true));

    expect(resendButton().disabled).toBe(false);
    await act(async () => {
      resendButton().click();
    });
    expect(onRequestNewCode).toHaveBeenCalledTimes(1);
  });
});
