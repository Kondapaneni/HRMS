import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const origin = 'http://127.0.0.1:8773';
const ok = async (method, path, body, token, expectedStatus) => {
  const headers = { 'Content-Type': 'application/json' };
  // Existing revocation assertions intentionally exercise native bearer JWTs.
  // SEC-021 separately verifies that browser login returns no readable JWT.
  if (['/api/login', '/api/candidate/login', '/api/auth/otp/verify'].includes(path))
    headers['X-HRMS-Client'] = 'android';
  if (token) headers.Authorization = 'Bearer ' + token;
  const resp = await fetch(origin + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await resp.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 120) }; }
  assert.equal(resp.status, expectedStatus, method + ' ' + path + ' expected ' + expectedStatus + ', got ' + resp.status + ', body ' + JSON.stringify(data));
  return data;
};
const login = async (email, password, apiPath = '/api/login') =>
  ok('POST', apiPath, { email, password }, null, 200);

const email = 'sec012-employee@example.invalid';
const originalPassword = 'SEC012-Initial-Password1!';
const changedPassword = 'SEC012-New-Password2!';
const resetPassword = 'SEC012-Reset-Password3!';

let result = await login(email, originalPassword);
let first = result.token;
assert(first && result.user.role === 'employee');
await ok('GET', '/api/me', null, first, 200);
await ok('POST', '/api/logout', {}, first, 200);
await ok('GET', '/api/me', null, first, 401);
await ok('POST', '/api/logout', {}, first, 401);
console.log('PASS: logout immediately revokes old signed JWT; replay denied');

result = await login(email, originalPassword);
const second = result.token;
assert.notEqual(second, first);
await ok('PUT', '/api/change-password', { newPassword: changedPassword }, second, 400);
await ok('PUT', '/api/change-password', {
  currentPassword: 'Wrong-Password!', newPassword: changedPassword,
}, second, 403);
await ok('GET', '/api/me', null, second, 200);
await ok('PUT', '/api/change-password', {
  currentPassword: originalPassword, newPassword: changedPassword,
}, second, 200);
await ok('GET', '/api/me', null, second, 401);
await ok('POST', '/api/login', { email, password: originalPassword }, null, 401);
const third = (await login(email, changedPassword)).token;
await ok('GET', '/api/me', null, third, 200);
console.log('PASS: required current password, wrong password denied, old JWT invalidated');

await ok('POST', '/api/reset-password', {
  token: 'sec012-reset-sec012-employee', newPassword: resetPassword,
}, null, 200);
await ok('GET', '/api/me', null, third, 401);
await ok('POST', '/api/reset-password', {
  token: 'sec012-reset-sec012-employee', newPassword: resetPassword,
}, null, 400);
const fourth = (await login(email, resetPassword)).token;
await ok('GET', '/api/me', null, fourth, 200);
console.log('PASS: password reset invalidates prior JWT and burns reset token');

const cand = (await login(
  'sec012-candidate@example.invalid', 'SEC012-Candidate-Password1!',
  '/api/candidate/login'
)).token;
await ok('GET', '/api/me', null, cand, 200);
await ok('POST', '/api/logout', {}, cand, 200);
await ok('GET', '/api/me', null, cand, 401);
console.log('PASS: candidate JWT also revoked on logout');

await ok('POST', '/api/auth/otp/send', { email }, null, 200);
const { code, digest } = JSON.parse(execFileSync(
  'php', ['tests/sec012_synthetic_otp.php'], { encoding: 'utf8' }
));
assert.match(code, /^[0-9]{6}$/);
assert.match(digest, /^hmac-sha256:[0-9a-f]{64}$/);
assert.notEqual(digest, code);
await ok('POST', '/api/auth/otp/verify', { email, otp: '000000' }, null, 401);
const otpSession = await ok('POST', '/api/auth/otp/verify', { email, otp: code }, null, 200);
assert(otpSession.token);
await ok('GET', '/api/me', null, otpSession.token, 200);
await ok('POST', '/api/auth/otp/verify', { email, otp: code }, null, 400);
await ok('POST', '/api/logout', {}, otpSession.token, 200);
await ok('GET', '/api/me', null, otpSession.token, 401);
console.log('PASS: email OTP stored only as keyed HMAC, verified once, and issued session revocable');

console.log('SEC-012 stage 1 synthetic HTTP flows PASSED');
