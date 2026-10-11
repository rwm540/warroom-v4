import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const ISSUER = 'warroom-otp-service';

function requireOtpSigningSecret() {
  if (config.otpChallengeSecret.length < 32 || /^(replace_|your_|change_me|unset_)/i.test(config.otpChallengeSecret)) {
    const error = new Error('OTP_CHALLENGE_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'OTP_CHALLENGE_SECRET_NOT_CONFIGURED';
    throw error;
  }
}

export function signChallengeToken(payload, expiresAtMs) {
  requireOtpSigningSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = Math.floor(Number(expiresAtMs) / 1000);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= issuedAt) {
    const error = new Error('OTP_EXPIRY_INVALID');
    error.status = 503;
    error.code = 'OTP_EXPIRY_INVALID';
    throw error;
  }

  return jwt.sign(
    { ...payload, typ: 'otp_challenge', iat: issuedAt, exp: expiresAt },
    config.otpChallengeSecret,
    { issuer: ISSUER }
  );
}

export function verifyToken(token, expectedTyp) {
  requireOtpSigningSecret();
  const decoded = jwt.verify(token, config.otpChallengeSecret, { issuer: ISSUER });
  if (!decoded || typeof decoded !== 'object' || (expectedTyp && decoded.typ !== expectedTyp)) {
    const error = new Error('INVALID_TOKEN_TYPE');
    error.status = 401;
    error.code = 'INVALID_TOKEN_TYPE';
    throw error;
  }
  return decoded;
}
