/**
 * In-memory implementation of the store interface used in tests.
 *
 * It reproduces the *security semantics* of the database layer:
 *   - rate limit counters are windowed and never reset by switching stores,
 *   - OTP proof consumption is a single atomic winner/loser decision,
 *   - registration finalization is atomic, idempotent per challenge and refuses duplicates,
 *   - admin helpers require an admin id resolved by the server.
 *
 * It contains no real credentials, phone numbers or OTP codes.
 */

function clone(row) {
  return row ? JSON.parse(JSON.stringify(row)) : null;
}

export function createMemoryStore({ latencyMs = 0 } = {}) {
  const state = {
    users: new Map(),
    credentials: new Map(),
    pending: new Map(),
    otpCodes: new Map(),
    securityKv: new Map(),
    sessions: new Map(),
    rateLimits: new Map(),
    passwordResets: new Map(),
    auditLog: [],
    failures: { rateLimit: false },
  };

  const wait = () => (latencyMs > 0 ? new Promise((resolve) => setTimeout(resolve, latencyMs)) : Promise.resolve());

  function isAdminId(id) {
    const user = state.users.get(String(id));
    return Boolean(user && user.data?.role === 'admin' && user.data?.is_blocked !== true && user.data?.is_active !== false);
  }

  function passwordMatches(stored, candidate) {
    // Test doubles keep a reversible marker; production stores bcrypt hashes.
    return typeof stored === 'string' && stored === `test-hash::${candidate}`;
  }

  return {
    state,
    failures: state.failures,

    async ping() {
      return true;
    },

    async checkSchema() {
      return { ok: true, missing: [] };
    },

    async hitRateLimit(key, max, windowSeconds) {
      if (state.failures.rateLimit) throw new Error('simulated rate limit store outage');
      const now = Date.now();
      const entry = state.rateLimits.get(key);
      if (!entry || entry.windowEnd <= now) {
        state.rateLimits.set(key, { count: 1, windowEnd: now + windowSeconds * 1000 });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },

    async findUserByNationalCode(nationalCode) {
      await wait();
      for (const user of state.users.values()) {
        if (String(user.data?.national_code || '') === String(nationalCode)) return clone(user);
      }
      return null;
    },

    async findUserByPhone(phone) {
      await wait();
      for (const user of state.users.values()) {
        if (String(user.data?.phone || '') === String(phone)) return clone(user);
      }
      return null;
    },

    async findUserById(id) {
      await wait();
      return clone(state.users.get(String(id)) || null);
    },

    async verifyLoginCredentials(nationalCode, password) {
      await wait();
      const user = [...state.users.values()].find((u) => String(u.data?.national_code) === String(nationalCode));
      if (!user) return { success: false, error: 'INVALID_CREDENTIALS' };
      if (user.data?.is_blocked === true) return { success: false, error: 'USER_BLOCKED' };
      if (user.data?.is_active === false) return { success: false, error: 'USER_INACTIVE' };
      const credential = state.credentials.get(user.id);
      if (!passwordMatches(credential?.data?.password_hash, password)) {
        return { success: false, error: 'INVALID_CREDENTIALS' };
      }
      const { password: _ignored, ...safeUser } = user.data || {};
      return { success: true, user: { id: user.id, ...safeUser }, mustChangePassword: credential?.data?.mustChangePassword === true };
    },

    async findPendingRegistration({ nationalCode }) {
      await wait();
      for (const row of state.pending.values()) {
        if (String(row.national_code) === String(nationalCode) && row.is_verified === false && new Date(row.expires_at) > new Date()) {
          return clone(row);
        }
      }
      return null;
    },

    async createPendingRegistration(row) {
      state.pending.set(String(row.id), { ...row });
    },

    async deletePendingRegistration(id) {
      state.pending.delete(String(id));
    },

    async setPendingPassword(pendingId, password) {
      const row = state.pending.get(String(pendingId));
      if (!row) return { success: false, error: 'PENDING_NOT_FOUND' };
      if (String(password || '').length < 8) return { success: false, error: 'WEAK_PASSWORD' };
      row.password_hash = `test-hash::${password}`;
      return { success: true };
    },

    async finalizeRegistration({ challengeId, pendingId, userId }) {
      await wait();
      const idempotencyKey = `registration_finalized:${challengeId}`;
      if (state.securityKv.has(idempotencyKey)) {
        return { success: true, user_id: state.securityKv.get(idempotencyKey).user_id, idempotent: true };
      }

      const otp = state.otpCodes.get(String(challengeId));
      if (!otp || otp.verified !== true || otp.is_used !== true || Date.now() - Number(otp.used_at || 0) > 5 * 60 * 1000) {
        return { success: false, error: 'INVALID_OR_EXPIRED_PROOF' };
      }
      if ((otp.purpose || 'login') !== 'registration') return { success: false, error: 'PROOF_PURPOSE_MISMATCH' };
      if (String(otp.pending_id) !== String(pendingId)) return { success: false, error: 'PENDING_MISMATCH' };

      const pending = state.pending.get(String(pendingId));
      if (!pending) return { success: false, error: 'PENDING_NOT_FOUND' };
      if (pending.is_verified) return { success: false, error: 'PENDING_ALREADY_VERIFIED' };
      if (new Date(pending.expires_at) <= new Date()) return { success: false, error: 'PENDING_EXPIRED' };
      if (!pending.password_hash) return { success: false, error: 'PENDING_PASSWORD_MISSING' };

      for (const user of state.users.values()) {
        if (String(user.data?.national_code) === String(pending.national_code)) {
          if (user.data?.is_blocked === true || user.data?.is_active === false) {
            return { success: false, error: 'ACCOUNT_BLOCKED' };
          }
          return { success: false, error: 'USER_ALREADY_EXISTS' };
        }
      }

      const userData = { ...(pending.user_data || {}) };
      delete userData.password;
      delete userData.password_hash;
      delete userData.role;
      const newUser = {
        id: String(userId),
        data: { ...userData, role: 'user', is_active: true, is_blocked: false, registration_source: 'pending_registration' },
      };
      state.users.set(newUser.id, newUser);
      state.credentials.set(newUser.id, {
        id: newUser.id,
        data: { password_hash: pending.password_hash, password_algorithm: 'bcrypt', mustChangePassword: false },
      });
      pending.is_verified = true;
      pending.password_hash = null;
      state.securityKv.set(idempotencyKey, { user_id: newUser.id, pending_id: pendingId });
      return { success: true, user_id: newUser.id };
    },

    async issueOtpChallenge(row) {
      for (const previous of state.otpCodes.values()) {
        if (previous.national_code === row.national_code && !previous.revoked_at) {
          previous.revoked_at = new Date().toISOString();
        }
      }
      await this.invalidateActiveOtpChallenges({ nationalCode: row.national_code, keepChallengeId: null });
      await this.insertOtpChallenge(row);
    },

    async insertOtpChallenge(row) {
      const challengeId = String(row.challenge_id);
      state.otpCodes.set(challengeId, {
        challenge_id: challengeId,
        user_id: String(row.user_id),
        national_code: String(row.national_code),
        phone: String(row.phone),
        code_hash: String(row.code_hash),
        attempt_count: 0,
        max_attempts: Number(row.max_attempts || 5),
        verified: false,
        is_used: false,
        used_at: null,
        expires_at: String(row.expires_at),
        purpose: String(row.purpose || 'login'),
        pending_id: row.pending_id ? String(row.pending_id) : null,
        sms_message_id: null,
        revoked_at: null,
      });
    },

    async getOtpByChallenge(challengeId) {
      await wait();
      return clone(state.otpCodes.get(String(challengeId)) || null);
    },

    async setOtpSmsMessageId(challengeId, messageId) {
      const row = state.otpCodes.get(String(challengeId));
      if (!row || row.is_used) return null;
      row.sms_message_id = String(messageId);
      return { challenge_id: row.challenge_id };
    },

    async getOtpSmsMessageId(challengeId) {
      const row = state.otpCodes.get(String(challengeId));
      return row?.sms_message_id ? String(row.sms_message_id) : null;
    },

    async invalidateOtpChallenge(challengeId) {
      const row = state.otpCodes.get(String(challengeId));
      if (row && !row.is_used) {
        row.is_used = true;
        row.used_at = Date.now();
      }
    },

    async invalidateActiveOtpChallenges({ nationalCode, keepChallengeId }) {
      for (const row of state.otpCodes.values()) {
        if (String(row.national_code) !== String(nationalCode)) continue;
        if (keepChallengeId && String(row.challenge_id) === String(keepChallengeId)) continue;
        if (row.is_used) continue;
        row.is_used = true;
        row.used_at = Date.now();
      }
    },

    async verifyOtp({ challengeId, nationalCode, codeHash }) {
      await wait();
      const row = state.otpCodes.get(String(challengeId));
      if (!row || row.is_used || row.revoked_at || !row.sms_message_id || new Date(row.expires_at) <= new Date() || String(row.national_code) !== String(nationalCode)) {
        return { result: 'missing' };
      }
      row.attempt_count += 1;
      const match = row.code_hash === codeHash;
      if (match) {
        row.verified = true;
        row.is_used = true;
        row.used_at = Date.now();
        return { result: 'valid', user_id: row.user_id, phone: row.phone };
      }
      if (row.attempt_count >= row.max_attempts) {
        row.is_used = true;
        row.used_at = Date.now();
        return { result: 'locked' };
      }
      return { result: 'invalid' };
    },

    async consumeOtpProof(challengeId, purpose) {
      await wait();
      let expected;
      if (purpose === 'session:login') expected = 'login';
      else if (purpose === 'session:registration') expected = 'registration';
      else if (typeof purpose === 'string' && purpose.startsWith('admin:')) expected = 'admin';
      else return { success: false, error: 'PROOF_PURPOSE_MISMATCH' };

      const row = state.otpCodes.get(String(challengeId));
      if (!row || row.verified !== true || row.is_used !== true || row.revoked_at) {
        return { success: false, error: 'INVALID_OR_EXPIRED_PROOF' };
      }
      if (Date.now() - Number(row.used_at || 0) > 5 * 60 * 1000) {
        return { success: false, error: 'INVALID_OR_EXPIRED_PROOF' };
      }
      if ((row.purpose || 'login') !== expected) {
        return { success: false, error: 'PROOF_PURPOSE_MISMATCH' };
      }
      if (expected === 'admin') {
        const admin = state.users.get(row.user_id);
        if (!admin || admin.data?.role !== 'admin') return { success: false, error: 'ADMIN_PROOF_REQUIRED' };
      }

      // Atomic critical section: no awaits between the check and the write.
      const key = `otp_proof_consumed:${challengeId}:${purpose}`;
      if (state.securityKv.has(key)) {
        return { success: false, error: 'PROOF_ALREADY_CONSUMED' };
      }
      state.securityKv.set(key, { user_id: row.user_id, purpose, consumed_at: Date.now() });

      return {
        success: true,
        user_id: row.user_id,
        national_code: row.national_code,
        pending_id: row.pending_id,
        purpose,
      };
    },

    async insertSession(row) {
      const id = String(row.id);
      for (const session of state.sessions.values()) {
        if (session.token_hash === row.token_hash) {
          const error = new Error('duplicate token hash');
          error.code = '23505';
          throw error;
        }
      }
      state.sessions.set(id, {
        id,
        user_id: String(row.user_id),
        token_hash: String(row.token_hash),
        expires_at: String(row.expires_at),
        revoked_at: null,
      });
    },

    async findSessionByTokenHash(tokenHash) {
      await wait();
      for (const session of state.sessions.values()) {
        if (session.token_hash === tokenHash) return clone(session);
      }
      return null;
    },

    async revokeSessionById(sessionId) {
      const session = state.sessions.get(String(sessionId));
      if (session && !session.revoked_at) session.revoked_at = new Date().toISOString();
    },

    async revokeSessionsForUser(userId) {
      let revoked = 0;
      for (const session of state.sessions.values()) {
        if (String(session.user_id) === String(userId) && !session.revoked_at) {
          session.revoked_at = new Date().toISOString();
          revoked += 1;
        }
      }
      for (const row of state.otpCodes.values()) {
        if (String(row.user_id) === String(userId) && !row.is_used) {
          row.is_used = true;
          row.used_at = Date.now();
        }
      }
      return revoked;
    },

    async countActiveSessionsForUser(userId) {
      let count = 0;
      for (const session of state.sessions.values()) {
        if (String(session.user_id) === String(userId) && !session.revoked_at && new Date(session.expires_at) > new Date()) count += 1;
      }
      return count;
    },

    async mustChangePassword(userId) {
      return state.credentials.get(String(userId))?.data?.mustChangePassword === true;
    },

    async changePassword({ userId, currentPassword, newPassword }) {
      const credential = state.credentials.get(String(userId));
      if (!credential || !passwordMatches(credential.data?.password_hash, currentPassword)) {
        return { success: false, error: 'INVALID_CREDENTIALS' };
      }
      if (String(newPassword || '').length < 8) return { success: false, error: 'WEAK_PASSWORD' };
      credential.data.password_hash = `test-hash::${newPassword}`;
      credential.data.mustChangePassword = false;
      return { success: true };
    },

    async createPasswordResetRequest(row) {
      state.passwordResets.set(String(row.id), { ...row });
    },

    async findPasswordResetRequestsByTrackingCode(trackingCode, limit = 5) {
      const rows = [...state.passwordResets.values()].filter((row) => row.data?.tracking_code === trackingCode);
      return rows.slice(0, limit);
    },

    async adminUpdateUser({ adminId, userId, patch }) {
      if (!isAdminId(adminId)) return { success: false, error: 'FORBIDDEN' };
      const allowed = ['first_name', 'last_name', 'phone', 'gender', 'province', 'city', 'school_name', 'is_active', 'is_blocked', 'points', 'level', 'avatar_url'];
      for (const key of Object.keys(patch || {})) {
        if (!allowed.includes(key)) return { success: false, error: 'FORBIDDEN_FIELD', field: key };
      }
      const user = state.users.get(String(userId));
      if (!user) return { success: false, error: 'USER_NOT_FOUND' };
      user.data = { ...user.data, ...patch };
      return { success: true, user: clone(user) };
    },

    async adminSetUserPassword({ adminId, userId, password }) {
      if (!isAdminId(adminId)) return { success: false, error: 'FORBIDDEN' };
      const user = state.users.get(String(userId));
      if (!user) return { success: false, error: 'USER_NOT_FOUND' };
      if (String(password || '').length < 8) return { success: false, error: 'WEAK_PASSWORD' };
      state.credentials.set(String(userId), { id: String(userId), data: { password_hash: `test-hash::${password}`, mustChangePassword: true } });
      await this.revokeSessionsForUser(userId);
      return { success: true };
    },

    async adminCreateUser({ adminId, userId, userData, password }) {
      if (!isAdminId(adminId)) return { success: false, error: 'FORBIDDEN' };
      const national = String(userData?.national_code || '');
      for (const user of state.users.values()) {
        if (String(user.data?.national_code) === national) return { success: false, error: 'DUPLICATE_USER' };
      }
      const data = { ...userData, role: 'user', is_active: true, is_blocked: false };
      state.users.set(String(userId), { id: String(userId), data });
      state.credentials.set(String(userId), { id: String(userId), data: { password_hash: `test-hash::${password}`, mustChangePassword: true } });
      return { success: true, user: { id: String(userId), ...data } };
    },

    async adminListPasswordResets({ adminId, status = 'all', query = '' }) {
      if (!isAdminId(adminId)) return { success: false, error: 'FORBIDDEN' };
      const requests = [...state.passwordResets.values()]
        .map((row) => ({ id: row.id, ...row.data }))
        .filter((row) => (status === 'all' ? true : row.status === status))
        .filter((row) => (query ? JSON.stringify(row).includes(query) : true));
      const stats = { all: requests.length };
      return { success: true, requests, stats };
    },

    async adminUpdatePasswordReset({ adminId, requestId, action, password, note }) {
      if (!isAdminId(adminId)) return { success: false, error: 'FORBIDDEN' };
      const row = state.passwordResets.get(String(requestId));
      if (!row) return { success: false, error: 'REQUEST_NOT_FOUND' };
      if (action === 'resolve') {
        const userId = row.data?.user_id;
        if (!userId || !state.users.has(String(userId))) return { success: false, error: 'USER_NOT_FOUND' };
        if (String(password || '').length < 8) return { success: false, error: 'WEAK_PASSWORD' };
        state.credentials.set(String(userId), { id: String(userId), data: { password_hash: `test-hash::${password}`, mustChangePassword: true } });
        await this.revokeSessionsForUser(userId);
        row.data.status = 'resolved';
      } else if (action === 'contacted') {
        row.data.status = 'contacted';
      } else if (action === 'reject') {
        row.data.status = 'rejected';
      } else {
        return { success: false, error: 'INVALID_ACTION' };
      }
      row.data.admin_note = note || '';
      return { success: true, status: row.data.status };
    },

    async listAuditLog(limit = 100) {
      return state.auditLog.slice(0, limit);
    },

    // ---- test helpers -------------------------------------------------
    /** Creates a user directly (test fixture only). */
    seedUser({ id, data, password = 'TestPassword123', mustChangePassword = false }) {
      state.users.set(String(id), { id: String(id), data: { role: 'user', is_active: true, is_blocked: false, ...data } });
      state.credentials.set(String(id), { id: String(id), data: { password_hash: `test-hash::${password}`, mustChangePassword } });
      return String(id);
    },

    /** Simulates a completed OTP verification for a challenge (test fixture only). */
    markOtpVerified(challengeId, { purpose = 'login', pendingId = null, usedAt = Date.now() } = {}) {
      const row = state.otpCodes.get(String(challengeId));
      if (!row) throw new Error('unknown challenge');
      row.verified = true;
      row.is_used = true;
      row.used_at = usedAt;
      row.purpose = purpose;
      if (pendingId) row.pending_id = String(pendingId);
      return row;
    },

    seedOtpChallenge({ challengeId, userId, nationalCode, phone = '+989121234567', purpose = 'login', pendingId = null, verified = false, used = false, usedAt = null, expiresAt = null }) {
      state.otpCodes.set(String(challengeId), {
        challenge_id: String(challengeId),
        user_id: String(userId),
        national_code: String(nationalCode),
        phone: String(phone),
        code_hash: 'deadbeef',
        attempt_count: 0,
        max_attempts: 5,
        verified,
        is_used: used,
        used_at: usedAt,
        expires_at: expiresAt || new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        purpose,
        pending_id: pendingId ? String(pendingId) : null,
        sms_message_id: null,
      });
      return String(challengeId);
    },
  };
}
