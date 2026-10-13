import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import OTPVerificationModal from './OTPVerificationModal';
import type { OTPSendResponse, OTPVerifiedUser } from '../lib/otpApi';

const NATIONAL = '1234567891';
const BASE_TIME = Date.UTC(2026, 0, 1, 12, 0, 0);
const TTL_SECONDS = 120;
const COOLDOWN_SECONDS = 120;

type HarnessProps = {
  expiresIn: number;
  expiresAt: string | null;
  resendAvailableIn?: number;
  onRequestNewCode?: () => Promise<OTPSendResponse>;
  onChallengeToken?: (token: string) => void;
  onSuccess?: (user: OTPVerifiedUser) => void;
};

let container: HTMLDivElement;
let root: Root;
const controls: { setOpen: (open: boolean) => void } = { setOpen: () => {} };

/** Minimal stand-in for AuthView: it owns the challenge state the modal reports back. */
function Harness(props: HarnessProps) {
  const [open, setOpen] = useState(true);
  const [challengeToken, setChallengeToken] = useState('challenge-1');
  const [expiresIn, setExpiresIn] = useState(props.expiresIn);
  const [expiresAt, setExpiresAt] = useState<string | null>(props.expiresAt);
  controls.setOpen = setOpen;

  return (
    <OTPVerificationModal
      isOpen={open}
      onClose={() => setOpen(false)}
      onSuccess={props.onSuccess ?? (() => {})}
      userPhone="0912***33"
      nationalCode={NATIONAL}
      challengeToken={challengeToken}
      expiresIn={expiresIn}
      expiresAt={expiresAt}
      resendAvailableIn={props.resendAvailableIn}
      purpose="login"
      onChallengeToken={(token) => {
        props.onChallengeToken?.(token);
        setChallengeToken(token);
      }}
      onExpiresIn={setExpiresIn}
      onExpiresAt={setExpiresAt}
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

describe('OTPVerificationModal lifecycle', () => {
  it('counts down from the server deadline and does not restart when the window is reopened', async () => {
    renderHarness({
      expiresIn: TTL_SECONDS,
      expiresAt: new Date(BASE_TIME + TTL_SECONDS * 1000).toISOString(),
      resendAvailableIn: COOLDOWN_SECONDS,
    });

    expect(timerText()).toContain('2:00');

    advance(30);
    expect(timerText()).toContain('1:30');

    // The user closes the window and comes back later.
    act(() => controls.setOpen(false));
    advance(20);
    act(() => controls.setOpen(true));

    // The remaining time continues from the original deadline instead of restarting at 2:00.
    expect(timerText()).toContain('1:10');
    await act(async () => {});
  });

  it('allows a new code after the full server deadline', async () => {
    const onRequestNewCode = vi.fn(async (): Promise<OTPSendResponse> => ({
      success: true,
      challengeToken: 'challenge-2',
      expiresIn: TTL_SECONDS,
      expiresAt: new Date(BASE_TIME + COOLDOWN_SECONDS * 1000 + TTL_SECONDS * 1000).toISOString(),
      resendAvailableIn: COOLDOWN_SECONDS,
      deliveryStatus: 'accepted',
    }));
    const onChallengeToken = vi.fn();

    renderHarness({
      expiresIn: TTL_SECONDS,
      expiresAt: new Date(BASE_TIME + TTL_SECONDS * 1000).toISOString(),
      resendAvailableIn: COOLDOWN_SECONDS,
      onRequestNewCode,
      onChallengeToken,
    });

    expect(resendButton().disabled).toBe(true);
    expect(resendButton().textContent).toContain('ارسال مجدد پس از پایان مهلت');

    advance(COOLDOWN_SECONDS);
    expect(resendButton().disabled).toBe(false);
    expect(resendButton().textContent).toContain('ارسال مجدد کد تایید');

    await act(async () => {
      resendButton().click();
    });

    expect(onRequestNewCode).toHaveBeenCalledTimes(1);
    expect(onChallengeToken).toHaveBeenCalledWith('challenge-2');
    // The fresh challenge restarts the countdown and clears previously typed digits.
    expect(timerText()).toContain('2:00');
    for (const input of Array.from(container.querySelectorAll('input'))) {
      expect((input as HTMLInputElement).value).toBe('');
    }
  });

  it('keeps the resend button locked when the server answers with a cooldown', async () => {
    const onRequestNewCode = vi.fn(async (): Promise<OTPSendResponse> => ({
      success: false,
      error: 'برای درخواست کد جدید ۱۲۰ ثانیه صبر کنید.',
      retryAfterSeconds: COOLDOWN_SECONDS,
    }));

    renderHarness({
      expiresIn: TTL_SECONDS,
      expiresAt: new Date(BASE_TIME + TTL_SECONDS * 1000).toISOString(),
      resendAvailableIn: COOLDOWN_SECONDS,
      onRequestNewCode,
    });

    advance(COOLDOWN_SECONDS);
    expect(resendButton().disabled).toBe(false);

    await act(async () => {
      resendButton().click();
    });

    expect(alertText()).toContain('۱۲۰ ثانیه');
    expect(resendButton().disabled).toBe(true);
    expect(resendButton().textContent).toContain('ارسال مجدد پس از پایان مهلت');
  });

  it('keeps resend locked until expiry when the server sends no cooldown', async () => {
    renderHarness({
      expiresIn: TTL_SECONDS,
      expiresAt: new Date(BASE_TIME + TTL_SECONDS * 1000).toISOString(),
      resendAvailableIn: undefined,
    });

    advance(60);
    expect(resendButton().disabled).toBe(true);

    advance(TTL_SECONDS - 60);
    expect(resendButton().disabled).toBe(false);
  });

  it('blocks verification of an expired code and offers a resend instead', async () => {
    renderHarness({
      expiresIn: TTL_SECONDS,
      expiresAt: new Date(BASE_TIME + TTL_SECONDS * 1000).toISOString(),
      resendAvailableIn: COOLDOWN_SECONDS,
    });

    advance(TTL_SECONDS);

    expect(timerText()).toContain('0:00');
    expect(verifyButton().disabled).toBe(true);
    expect(verifyButton().textContent).toContain('کد منقضی شده است');
    expect(resendButton().disabled).toBe(false);
  });
});
