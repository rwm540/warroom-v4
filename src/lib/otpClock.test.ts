import { describe, it, expect } from 'vitest';
import {
  buildOtpChallengeClock,
  codeRemainingSeconds,
  resendUnlockClientMs,
  serverOffsetMs,
} from './otpClock';

const SERVER_START = Date.UTC(2026, 0, 1, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

describe('otpClock', () => {
  it('builds a clock only from an answer that has a usable deadline and token', () => {
    expect(buildOtpChallengeClock({ challengeToken: 't', expiresAt: iso(SERVER_START + 120_000) }, 1)).not.toBeNull();
    expect(buildOtpChallengeClock({ expiresAt: iso(SERVER_START) }, 1)).toBeNull();
    expect(buildOtpChallengeClock({ challengeToken: 't' }, 1)).toBeNull();
    expect(buildOtpChallengeClock({ challengeToken: 't', expiresAt: 'not-a-date' }, 1)).toBeNull();
    expect(buildOtpChallengeClock({ challengeToken: '', expiresAt: iso(SERVER_START) }, 1)).toBeNull();
  });

  it('measures the code lifetime on the server clock even when the browser clock is wrong', () => {
    // Browser 5 minutes behind the server when the answer arrives.
    const clock = buildOtpChallengeClock(
      { challengeToken: 't', expiresAt: iso(SERVER_START + 120_000), serverTime: iso(SERVER_START) },
      SERVER_START - 300_000,
    )!;
    expect(serverOffsetMs(clock)).toBe(300_000);
    expect(codeRemainingSeconds(clock, SERVER_START - 300_000)).toBe(120);
    expect(codeRemainingSeconds(clock, SERVER_START - 300_000 + 45_000)).toBe(75);
    expect(codeRemainingSeconds(clock, SERVER_START - 300_000 + 120_000)).toBe(0);
    expect(codeRemainingSeconds(clock, SERVER_START - 300_000 + 500_000)).toBe(0);
  });

  it('falls back to the local clock only when the server sent no time', () => {
    const clock = buildOtpChallengeClock({ challengeToken: 't', expiresAt: iso(SERVER_START + 120_000) }, SERVER_START);
    expect(serverOffsetMs(clock)).toBe(0);
    expect(codeRemainingSeconds(clock, SERVER_START + 1_000)).toBe(119);
  });

  it('unlocks resend at the server resend deadline first, then at the cooldown, then at code expiry', () => {
    const withAt = buildOtpChallengeClock({
      challengeToken: 't',
      expiresAt: iso(SERVER_START + 120_000),
      serverTime: iso(SERVER_START),
      resendAvailableAt: iso(SERVER_START + 60_000),
      resendAvailableIn: 120,
    }, SERVER_START)!;
    expect(resendUnlockClientMs(withAt)).toBe(SERVER_START + 60_000);

    const cooldownOnly = buildOtpChallengeClock({
      challengeToken: 't',
      expiresAt: iso(SERVER_START + 120_000),
      resendAvailableIn: 30,
    }, SERVER_START + 1_000)!;
    expect(resendUnlockClientMs(cooldownOnly)).toBe(SERVER_START + 31_000);

    const neither = buildOtpChallengeClock({ challengeToken: 't', expiresAt: iso(SERVER_START + 120_000) }, SERVER_START)!;
    expect(resendUnlockClientMs(neither)).toBe(SERVER_START + 120_000);
  });
});
