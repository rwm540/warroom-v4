import test from 'node:test';
import assert from 'node:assert/strict';

import { isAllowedAdminPassword } from './backendApi';

test('wrong admin password must be rejected', () => {
  assert.equal(isAllowedAdminPassword('0012345678', 'wrongpass'), false);
});

test('known default admin password must be accepted', () => {
  assert.equal(isAllowedAdminPassword('0012345678', 'Admin@123456'), true);
});
