// End-to-end HTTP regression for SEC-008 using a disposable PostgreSQL database.
// Never supply real credentials, personal information or production tokens.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root = 'http://127.0.0.1:8769';
const admin = 'sec008-admin@example.invalid';
const employee = 'sec008-employee@example.invalid';
const grantedButNotSetUp = 'sec008-granted@example.invalid';

async function post(path, data) {
  const response = await fetch(root + path, {
    method: 'POST',
    headers: { 'X-HRMS-Client': 'android', 'Content-Type': 'application/json', 'Accept-Encoding': 'identity' },
    body: JSON.stringify(data),
  });
  return { status: response.status, data: await response.json() };
}

async function get(path, token) {
  const response = await fetch(root + path, {
    headers: { Authorization: 'Bearer ' + token, 'Accept-Encoding': 'identity' },
  });
  return { status: response.status, data: await response.json() };
}

function totp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret) {
    const index = alphabet.indexOf(char);
    assert.notEqual(index, -1);
    bits += index.toString(2).padStart(5, '0');
  }
  const decoded = Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, i) =>
      Number.parseInt(bits.slice(i * 8, i * 8 + 8), 2)
    )
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = crypto.createHmac('sha1', decoded).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(value).padStart(6, '0');
}

function assertPending(response, name) {
  assert.equal(response.status, 200, name + ' status');
  assert.equal(response.data.mfaRequired, true, name + ' requires MFA');
  assert.equal(typeof response.data.mfaToken, 'string', name + ' scoped token');
  assert.equal(response.data.token, undefined, name + ' no full JWT');
  assert.equal(response.data.user, undefined, name + ' no authenticated user');
  console.log('PASS: ' + name);
}

const wrong = await post('/api/auth/otp/verify', { email: admin, otp: '111111' });
assert.equal(wrong.status, 401);
console.log('PASS: invalid email OTP rejected');

const otp = await post('/api/auth/otp/verify', { email: admin, otp: '654321' });
assertPending(otp, 'MFA admin email OTP cannot bypass TOTP');

const unauthorized = await get('/api/mfa/status', otp.data.mfaToken);
assert.equal(unauthorized.status, 401, 'pending MFA JWT must not access protected API');
console.log('PASS: pending MFA JWT denied by actual HTTP AuthMiddleware');

const replay = await post('/api/auth/otp/verify', { email: admin, otp: '654321' });
assert.notEqual(replay.status, 200, 'email OTP must be single use');
console.log('PASS: consumed email OTP cannot be replayed');

const invalidMfa = await post('/api/auth/mfa/verify', {
  mfaToken: otp.data.mfaToken,
  code: 'not-a-code',
});
assert.equal(invalidMfa.status, 401);
console.log('PASS: invalid second factor rejected');

const validMfa = await post('/api/auth/mfa/verify', {
  mfaToken: otp.data.mfaToken,
  code: totp('JBSWY3DPEHPK3PXP'),
});
assert.equal(validMfa.status, 200, 'valid second factor status');
assert.equal(validMfa.data.user?.role, 'admin');
assert.equal(typeof validMfa.data.token, 'string');
console.log('PASS: valid authenticator code produces admin session');

const profile = await get('/api/mfa/status', validMfa.data.token);
assert.equal(profile.status, 200, 'completed MFA session must access protected routes');
console.log('PASS: completed admin session can access protected API');

const passwordLogin = await post('/api/login', {
  email: admin,
  password: 'SEC008-Test-Password-Only!',
});
assertPending(passwordLogin, 'password login still enforces confirmed MFA');

const plainOtpLogin = await post('/api/auth/otp/verify', { email: employee, otp: '123456' });
assert.equal(plainOtpLogin.status, 200);
assert.equal(plainOtpLogin.data.user?.role, 'employee');
assert.equal(typeof plainOtpLogin.data.token, 'string');
assert.equal(plainOtpLogin.data.mfaRequired, undefined);
console.log('PASS: non-MFA email OTP login remains functional');

// Admin has granted the MFA feature, but the employee has NOT completed
// Authenticator setup. They must be allowed to log in without an MFA prompt
// and may finish setup after login. This is not the same as MFA bypass.
const grantedOtpLogin = await post('/api/auth/otp/verify', {
  email: grantedButNotSetUp, otp: '789012',
});
assert.equal(grantedOtpLogin.status, 200);
assert.equal(grantedOtpLogin.data.mfaRequired, undefined,
  'Do not require MFA before setup confirmation');
assert.equal(grantedOtpLogin.data.user?.role, 'employee');
assert.equal(typeof grantedOtpLogin.data.token, 'string');
const grantedStatus = await get('/api/mfa/status', grantedOtpLogin.data.token);
assert.equal(grantedStatus.status, 200);
assert.equal(grantedStatus.data.authorized, true, 'Admin grant exposes MFA setup');
assert.equal(grantedStatus.data.configured, false, 'Authenticator setup not complete');
assert.equal(grantedStatus.data.enabled, false, 'MFA must remain inactive before confirmation');
console.log('PASS: admin-granted employee can log in and sees setup, without MFA challenge');

const deniedStatus = await get('/api/mfa/status', plainOtpLogin.data.token);
assert.equal(deniedStatus.status, 200);
assert.equal(deniedStatus.data.authorized, false, 'No admin grant hides MFA feature');
assert.equal(deniedStatus.data.enabled, false);
console.log('PASS: employee without admin permission cannot see MFA setup');

console.log('SEC-008 synthetic end-to-end HTTP authentication tests PASSED');
