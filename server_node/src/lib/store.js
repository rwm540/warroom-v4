/**
 * Data access layer.
 *
 * Every route talks to the database through this interface. That keeps SQL/RPC details in
 * one place and makes the routes testable with an in-memory store (see tests), without
 * weakening production behaviour.
 */

const SENSITIVE_USER_KEYS = ['password', 'password_hash', 'token', 'refresh_token', 'secret', 'otp_proof'];

export function sanitizeUserData(data) {
  const source = data && typeof data === 'object' ? { ...data } : {};
  for (const key of SENSITIVE_USER_KEYS) {
    delete source[key];
  }
  return source;
}

function toDbFailure(error) {
  const failure = new Error('DB_ERROR');
  failure.code = 'DB_ERROR';
  failure.status = 503;
  failure.isPublic = true;
  failure.detail = String(error?.message || '').slice(0, 200);
  return failure;
}

function assertNoError(error) {
  if (error) throw toDbFailure(error);
}

function rowOrNull(data) {
  return data || null;
}

/**
 * Store used when the database is not configured. Every operation fails closed with 503
 * instead of silently skipping the security checks.
 */
export function createUnavailableStore() {
  const fail = () => {
    const error = new Error('DATABASE_NOT_CONFIGURED');
    error.code = 'DATABASE_NOT_CONFIGURED';
    error.status = 503;
    error.isPublic = true;
    return error;
  };
  const handler = {
    get() {
      return async () => {
        throw fail();
      };
    },
  };
  return new Proxy({}, handler);
}

export function createSupabaseStore(client) {

  return {
    async ping() {
      const { error } = await client.from('warroom_kv').select('id').limit(1);
      if (error) throw toDbFailure(error);
      return true;
    },

    async hitRateLimit(key, max, windowSeconds) {
      const { data, error } = await client.rpc('warroom_hit_otp_rate_limit', {
        p_id: key,
        p_max: max,
        p_window_seconds: windowSeconds,
      });
      assertNoError(error);
      return data === true;
    },

    async findUserByNationalCode(nationalCode) {
      const { data, error } = await client
        .from('warroom_users')
        .select('id, data')
        .eq('data->>national_code', nationalCode)
        .limit(1)
        .maybeSingle();
      assertNoError(error);
      return rowOrNull(data);
    },

    async findUserById(id) {
      const { data, error } = await client
        .from('warroom_users')
        .select('id, data')
        .eq('id', id)
        .maybeSingle();
      assertNoError(error);
      return rowOrNull(data);
    },

    async findUserByPhone(phoneLocal) {
      const { data, error } = await client
        .from('warroom_users')
        .select('id, data')
        .eq('data->>phone', phoneLocal)
        .limit(1)
        .maybeSingle();
      assertNoError(error);
      return rowOrNull(data);
    },

    async createPasswordResetRequest(row) {
      const { error } = await client.from('warroom_password_reset_requests').insert(row);
      assertNoError(error);
    },

    async findPasswordResetRequestsByTrackingCode(trackingCode, limit = 5) {
      const { data, error } = await client
        .from('warroom_password_reset_requests')
        .select('data, updated_at')
        .eq('data->>tracking_code', trackingCode)
        .limit(limit);
      assertNoError(error);
      return data || [];
    },

    async verifyLoginCredentials(nationalCode, password) {
      const { data, error } = await client.rpc('warroom_verify_login', {
        p_national_code: nationalCode,
        p_password: password,
      });
      assertNoError(error);
      return data || { success: false, error: 'INVALID_CREDENTIALS' };
    },

    async findPendingRegistration({ nationalCode }) {
      const { data, error } = await client
        .from('warroom_pending_registrations')
        .select('id, national_code, phone, phone_e164, user_data, expires_at, is_verified, attempt_count, password_hash')
        .eq('national_code', nationalCode)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      assertNoError(error);
      return rowOrNull(data);
    },

    async createPendingRegistration(row) {
      const { error } = await client.from('warroom_pending_registrations').insert(row);
      assertNoError(error);
    },

    async deletePendingRegistration(id) {
      const { error } = await client.from('warroom_pending_registrations').delete().eq('id', id);
      assertNoError(error);
    },

    async setPendingPassword(pendingId, password) {
      const { data, error } = await client.rpc('warroom_set_pending_password', {
        p_pending_id: pendingId,
        p_password: password,
      });
      assertNoError(error);
      return data || { success: false, error: 'PASSWORD_STORE_FAILED' };
    },

    async finalizeRegistration({ challengeId, pendingId, userId }) {
      const { data, error } = await client.rpc('warroom_finalize_registration', {
        p_challenge_id: challengeId,
        p_pending_id: pendingId,
        p_user_id: userId,
      });
      assertNoError(error);
      return data || { success: false, error: 'REGISTRATION_FINALIZE_FAILED' };
    },

    async issueOtpChallenge(row) {
      const { error } = await client.rpc('warroom_issue_otp_challenge', { p_row: row });
      assertNoError(error);
    },

    async insertOtpChallenge(row) {
      const { error } = await client.from('warroom_otp_codes').insert(row);
      assertNoError(error);
    },

    async getOtpByChallenge(challengeId) {
      const { data, error } = await client
        .from('warroom_otp_codes')
        .select('challenge_id, user_id, national_code, phone, purpose, pending_id, verified, is_used, used_at, expires_at, attempt_count, max_attempts')
        .eq('challenge_id', challengeId)
        .maybeSingle();
      assertNoError(error);
      return rowOrNull(data);
    },

    async setOtpSmsMessageId(challengeId, messageId) {
      const { data, error } = await client
        .from('warroom_otp_codes')
        .update({ sms_message_id: messageId })
        .eq('challenge_id', challengeId)
        .eq('is_used', false)
        .select('challenge_id')
        .maybeSingle();
      assertNoError(error);
      return data || null;
    },

    /** Read-only: the IPPanel outbox id recorded when the provider accepted the message. */
    async getOtpSmsMessageId(challengeId) {
      const { data, error } = await client
        .from('warroom_otp_codes')
        .select('sms_message_id')
        .eq('challenge_id', challengeId)
        .maybeSingle();
      assertNoError(error);
      return data?.sms_message_id ? String(data.sms_message_id) : null;
    },

    async invalidateOtpChallenge(challengeId) {
      const { error } = await client
        .from('warroom_otp_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('challenge_id', challengeId)
        .eq('is_used', false);
      assertNoError(error);
    },

    async invalidateActiveOtpChallenges({ nationalCode, keepChallengeId }) {
      let query = client
        .from('warroom_otp_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('national_code', nationalCode)
        .eq('is_used', false);
      if (keepChallengeId) query = query.neq('challenge_id', keepChallengeId);
      const { error } = await query;
      assertNoError(error);
    },

    async verifyOtp({ challengeId, nationalCode, codeHash }) {
      const { data, error } = await client.rpc('warroom_verify_otp', {
        p_challenge_id: challengeId,
        p_national_code: nationalCode,
        p_code_hash: codeHash,
      });
      assertNoError(error);
      const verification = Array.isArray(data) ? data[0] : data;
      return verification || { result: 'missing' };
    },

    async consumeOtpProof(challengeId, purpose) {
      const { data, error } = await client.rpc('warroom_consume_otp_proof', {
        p_challenge_id: challengeId,
        p_purpose: purpose,
      });
      assertNoError(error);
      return data || { success: false, error: 'PROOF_CONSUME_FAILED' };
    },

    async insertSession(row) {
      const { error } = await client.from('warroom_refresh_tokens').insert(row);
      assertNoError(error);
    },

    async findSessionByTokenHash(tokenHash) {
      const { data, error } = await client
        .from('warroom_refresh_tokens')
        .select('id, user_id, token_hash, expires_at, revoked_at')
        .eq('token_hash', tokenHash)
        .maybeSingle();
      assertNoError(error);
      return rowOrNull(data);
    },

    async mustChangePassword(userId) {
      const { data, error } = await client
        .from('warroom_credentials')
        .select('data')
        .eq('id', userId)
        .maybeSingle();
      assertNoError(error);
      return data?.data?.mustChangePassword === true;
    },

    /**
     * Readiness probe for the schema objects the auth/session flow depends on.
     * Never mutates data and never returns row contents.
     */
    async checkSchema() {
      const missing = [];
      const probeTable = async (name, columns) => {
        const { error } = await client.from(name).select(columns).limit(1);
        if (error) missing.push(`${name}: ${String(error.message || '').slice(0, 80)}`);
      };
      await probeTable('warroom_otp_codes', 'challenge_id, purpose, pending_id, verified, is_used');
      await probeTable('warroom_pending_registrations', 'id, national_code, is_verified');
      await probeTable('warroom_refresh_tokens', 'id, token_hash, revoked_at');
      await probeTable('warroom_security_kv', 'id');
      const { error: finalizeError } = await client.rpc('warroom_finalize_registration', {
        p_challenge_id: null,
        p_pending_id: null,
        p_user_id: null,
      });
      if (finalizeError && String(finalizeError.code || '') === '42883') {
        missing.push('function warroom_finalize_registration(text)');
      }
      const { error: consumeError } = await client.rpc('warroom_consume_otp_proof', {
        p_challenge_id: null,
        p_purpose: null,
      });
      if (consumeError && String(consumeError.code || '') === '42883') {
        missing.push('function warroom_consume_otp_proof(uuid,text)');
      }
      // Null JSONB fails the new issuance RPC's validation without writing any row.
      const { error: issueError } = await client.rpc('warroom_issue_otp_challenge', { p_row: null });
      if (issueError && ['42883', 'PGRST202'].includes(String(issueError.code || ''))) {
        missing.push('function warroom_issue_otp_challenge(jsonb)');
      }
      return { ok: missing.length === 0, missing };
    },

    async revokeSessionById(sessionId) {
      const { error } = await client
        .from('warroom_refresh_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', sessionId)
        .is('revoked_at', null);
      assertNoError(error);
    },

    async revokeSessionsForUser(userId) {
      const { data, error } = await client.rpc('warroom_revoke_user_sessions', { p_user_id: userId });
      assertNoError(error);
      return Number(data?.revoked ?? 0);
    },

    async countActiveSessionsForUser(userId) {
      const { count, error } = await client
        .from('warroom_refresh_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString());
      assertNoError(error);
      return Number(count || 0);
    },

    async changePassword({ userId, currentPassword, newPassword }) {
      const { data, error } = await client.rpc('warroom_change_password_service', {
        p_user_id: userId,
        p_current_password: currentPassword,
        p_new_password: newPassword,
      });
      assertNoError(error);
      return data || { success: false, error: 'PASSWORD_CHANGE_FAILED' };
    },

    async adminUpdateUser({ adminId, userId, patch }) {
      const { data, error } = await client.rpc('warroom_admin_update_user_service', {
        p_admin_id: adminId,
        p_user_id: userId,
        p_patch: patch,
      });
      assertNoError(error);
      return data || { success: false, error: 'ADMIN_OPERATION_FAILED' };
    },

    async adminSetUserPassword({ adminId, userId, password }) {
      const { data, error } = await client.rpc('warroom_admin_set_user_password_service', {
        p_admin_id: adminId,
        p_user_id: userId,
        p_new_password: password,
      });
      assertNoError(error);
      return data || { success: false, error: 'ADMIN_OPERATION_FAILED' };
    },

    async adminCreateUser({ adminId, userId, userData, password }) {
      const { data, error } = await client.rpc('warroom_admin_create_user_service', {
        p_admin_id: adminId,
        p_user_id: userId,
        p_user_data: userData,
        p_password: password,
      });
      assertNoError(error);
      return data || { success: false, error: 'ADMIN_OPERATION_FAILED' };
    },

    async adminListPasswordResets({ adminId, status, query }) {
      const { data, error } = await client.rpc('warroom_admin_list_password_resets_service', {
        p_admin_id: adminId,
        p_status: status,
        p_query: query,
      });
      assertNoError(error);
      return data || { success: false, error: 'ADMIN_OPERATION_FAILED' };
    },

    async adminUpdatePasswordReset({ adminId, requestId, action, password, note }) {
      const { data, error } = await client.rpc('warroom_admin_update_password_reset_service', {
        p_admin_id: adminId,
        p_request_id: requestId,
        p_action: action,
        p_password: password,
        p_note: note,
      });
      assertNoError(error);
      return data || { success: false, error: 'ADMIN_OPERATION_FAILED' };
    },

    async listAuditLog(limit = 100) {
      const bounded = Math.min(Math.max(Number(limit) || 100, 1), 500);
      const { data, error } = await client
        .from('warroom_audit_log')
        .select('id, data, created_at')
        .order('created_at', { ascending: false })
        .limit(bounded);
      assertNoError(error);
      return data || [];
    },
  };
}
