import jwt from 'jsonwebtoken';
import { config } from '../config.js';

function requireOtpSigningSecret() {
  if (config.jwtSecret.length < 32 || /^(replace_|your_|change_me|unset_)/i.test(config.jwtSecret)) {
    const error = new Error('OTP_CHALLENGE_SECRET_NOT_CONFIGURED');
    error.status = 503;
    error.code = 'OTP_CHALLENGE_SECRET_NOT_CONFIGURED';
    throw error;
  }
}

export function signChallengeToken(payload) {
  requireOtpSigningSecret();
  return jwt.sign(
    { ...payload, typ: 'otp_challenge' },
    config.jwtSecret,
    { expiresIn: `${config.otpTtlSeconds}s`, issuer: 'warroom-otp-service' }
  );
}

export function verifyToken(token, expectedTyp) {
  requireOtpSigningSecret();
  const decoded = jwt.verify(token, config.jwtSecret, { issuer: 'warroom-otp-service' });
  if (expectedTyp && decoded.typ !== expectedTyp) {
    const error = new Error('INVALID_TOKEN_TYPE');
    error.status = 401;
    throw error;
  }
  return decoded;
}
