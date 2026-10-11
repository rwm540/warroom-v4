import { describe, it, expect } from 'vitest';

describe('session security', () => {
  it('should not store session in localStorage', () => {
    // Check that no session token is stored in localStorage by secureApi
    const fs = require('fs');
    const path = require('path');
    const secureApiPath = path.resolve(process.cwd(), 'src/lib/secureApi.ts');
    const content = fs.readFileSync(secureApiPath, 'utf8');
    
    // Should use credentials: include for HttpOnly cookies
    expect(content).toContain('credentials:');
    expect(content).toContain('include');
    
    // Should NOT use localStorage for session
    expect(content).not.toContain('localStorage.setItem');
    expect(content).not.toContain('warroom_session');
    // The session creation should not return token in production
    expect(content).toContain('HttpOnly');
  });

  it('should have short-lived OTP proof (5 min)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sessionPath = path.resolve(process.cwd(), 'server_node/src/routes/session.js');
    const content = fs.readFileSync(sessionPath, 'utf8');
    
    // OTP proof should be short-lived (5 min)
    expect(content).toContain('5 * 60 * 1000');
    expect(content).toContain('OTP_PROOF_EXPIRED');
    expect(content).toContain('OTP_PROOF_REUSED');
  });

  it('should revoke sessions on block', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20261013000000_final_hardening_and_session.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');
    
    expect(content).toContain('warroom_auto_revoke_on_security_change');
    expect(content).toContain('is_blocked');
    expect(content).toContain('warroom_revoke_user_sessions');
  });
});

describe('offline storage privacy', () => {
  it('should block sensitive tables from cache', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const offlinePath = path.resolve(process.cwd(), 'src/lib/offlineStorage.ts');
    const content = fs.readFileSync(offlinePath, 'utf8');
    
    expect(content).toContain('BLOCKED_TABLES');
    expect(content).toContain('warroom_users');
    expect(content).toContain('warroom_credentials');
    expect(content).toContain('warroom_otp_codes');
    expect(content).toContain('warroom_password_reset_requests');
    expect(content).toContain('warroom_wallet_transactions');
  });

  it('should delete old DBs containing sensitive data', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const offlinePath = path.resolve(process.cwd(), 'src/lib/offlineStorage.ts');
    const content = fs.readFileSync(offlinePath, 'utf8');
    
    expect(content).toContain('OLD_DB_NAMES');
    expect(content).toContain('deleteDatabase');
    expect(content).toContain('warroom_offline');
  });

  it('should have allowlist for offline mutations', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const offlinePath = path.resolve(process.cwd(), 'src/lib/offlineStorage.ts');
    const content = fs.readFileSync(offlinePath, 'utf8');
    
    expect(content).toContain('isTableAllowedForMutation');
    expect(content).toContain('allowedMutations');
    expect(content).toContain('BLOCKED_TABLES');
  });
});

describe('registration security', () => {
  it('should not have fallback to direct user creation', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const regPath = path.resolve(process.cwd(), 'server_node/src/routes/registration.js');
    const content = fs.readFileSync(regPath, 'utf8');
    
    // Should NOT contain fallback logic
    expect(content).not.toContain('Fallback: create user');
    expect(content).not.toContain('warroom_register_user');
    expect(content).toContain('pending');
    expect(content).toContain('REGISTRATION_TABLE_MISSING');
  });

  it('should have rate limit on check-national', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const regPath = path.resolve(process.cwd(), 'server_node/src/routes/registration.js');
    const content = fs.readFileSync(regPath, 'utf8');
    
    expect(content).toContain('check:');
    expect(content).toContain('hitRateLimit');
  });
});
