/**
 * Clock model for one OTP challenge.
 *
 * The server is the only source of truth for the deadlines:
 *   - `expiresAt`        when the code stops being valid,
 *   - `serverTime`       the server clock at the moment it produced the answer,
 *   - `resendAvailableAt` when a new code may be requested (cooldown end).
 *
 * The browser clock may be wrong, so every deadline is converted with the offset between the
 * server clock and the local clock measured when the answer arrived. A single pure function
 * computes the remaining time, so the UI never runs a second, independent timer.
 */

export interface OtpChallengeClock {
  challengeToken: string;
  /** Server deadline of the code (ISO). */
  expiresAt: string;
  /** Server clock when the answer was produced (ISO), if the server sent it. */
  serverTime?: string;
  /** Server resend deadline (ISO), if the server sent it. */
  resendAvailableAt?: string;
  /** Cooldown in seconds, used only when `resendAvailableAt` is missing. */
  resendAvailableIn?: number;
  /** Local clock (ms) when the answer was received. */
  receivedAtMs: number;
}

export interface OtpClockInput {
  challengeToken?: string;
  expiresAt?: string;
  serverTime?: string;
  resendAvailableAt?: string;
  resendAvailableIn?: number;
}

function parseIso(value: unknown): number {
  return typeof value === 'string' ? Date.parse(value) : Number.NaN;
}

/** Builds the clock from a server answer. Returns null when the answer has no usable deadline. */
export function buildOtpChallengeClock(input: OtpClockInput, receivedAtMs: number): OtpChallengeClock | null {
  if (typeof input.challengeToken !== 'string' || input.challengeToken === '') return null;
  if (!Number.isFinite(parseIso(input.expiresAt))) return null;
  const serverTimeOk = Number.isFinite(parseIso(input.serverTime));
  const resendAtOk = Number.isFinite(parseIso(input.resendAvailableAt));
  const cooldownOk = Number.isInteger(input.resendAvailableIn) && Number(input.resendAvailableIn) > 0;
  return {
    challengeToken: input.challengeToken,
    expiresAt: String(input.expiresAt),
    serverTime: serverTimeOk ? String(input.serverTime) : undefined,
    resendAvailableAt: resendAtOk ? String(input.resendAvailableAt) : undefined,
    resendAvailableIn: cooldownOk ? Number(input.resendAvailableIn) : undefined,
    receivedAtMs,
  };
}

/** Server clock minus local clock, measured when the answer arrived (0 when the server sent no time). */
export function serverOffsetMs(clock: OtpChallengeClock): number {
  const serverMs = parseIso(clock.serverTime);
  return Number.isFinite(serverMs) ? serverMs - clock.receivedAtMs : 0;
}

/** Whole seconds left on the code, computed from the server deadline. Never negative. */
export function codeRemainingSeconds(clock: OtpChallengeClock, nowClientMs: number): number {
  const expiresServerMs = parseIso(clock.expiresAt);
  const serverNowMs = nowClientMs + serverOffsetMs(clock);
  return Math.max(0, Math.ceil((expiresServerMs - serverNowMs) / 1000));
}

/**
 * Local-clock instant at which a new code may be requested.
 * Preference: the server's absolute resend deadline; then the cooldown measured from receipt;
 * then the code deadline (the previous behaviour for servers that send no cooldown).
 */
export function resendUnlockClientMs(clock: OtpChallengeClock): number {
  const offset = serverOffsetMs(clock);
  const resendAtMs = parseIso(clock.resendAvailableAt);
  if (Number.isFinite(resendAtMs)) return resendAtMs - offset;
  if (clock.resendAvailableIn !== undefined) return clock.receivedAtMs + clock.resendAvailableIn * 1000;
  return parseIso(clock.expiresAt) - offset;
}
