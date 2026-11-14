import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const origin = 'http://127.0.0.1:8773';
async function request(path, body, headers = {}, expected = 200) {
  const response = await fetch(origin + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body || {}),
  });
  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch { data = { error: 'non-JSON HTTP response' }; }
  assert.equal(response.status, expected,
    'POST ' + path + ' expected HTTP ' + expected + ', got ' + response.status +
    ' (' + (data.error || '') + ')');
  return { data, cookie: response.headers.get('set-cookie') };
}
const cookieOnly = value => {
  const match = /^hrms_refresh=([0-9a-f-]{36}\.[0-9a-f]{64})/.exec(value || '');
  assert(match, 'Secure refresh cookie must be issued');
  assert.match(value, /Secure;/);
  assert.match(value, /HttpOnly;/);
  assert.match(value, /SameSite=Strict/);
  assert.match(value, /Path=\/api\/auth\/refresh/);
  return match[0];
};
const tokenPayload = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
const refreshWeb = (cookie, expected = 200, extraHeaders = {}) =>
  request('/api/auth/refresh', {}, {
    Cookie: cookie, 'X-HRMS-Refresh': '1', ...extraHeaders,
  }, expected);

const employeeEmail = 'sec012-employee@example.invalid';
let browser = await request('/api/login', {
  email: employeeEmail, password: 'SEC012-Reset-Password3!',
});
assert(browser.data.token && !browser.data.refreshToken, 'web must not receive JSON refresh token');
assert(tokenPayload(browser.data.token).exp - tokenPayload(browser.data.token).iat <= 8 * 3600,
  'access token lifetime bounded');
assert(tokenPayload(browser.data.token).exp - tokenPayload(browser.data.token).iat === 3600,
  'session_timeout=never defaults to one-hour access JWT, not 10 years');
const firstCookie = cookieOnly(browser.cookie);
const malformedUuid = 'a'.repeat(36) + '.' + 'b'.repeat(64);
await refreshWeb('hrms_refresh=' + malformedUuid, 401);
console.log('PASS: malformed refresh UUID fails authentication rather than throwing a database error');
let rotated = await refreshWeb(firstCookie);
const secondCookie = cookieOnly(rotated.cookie);
assert.notEqual(secondCookie, firstCookie, 'refresh token rotates on every request');
assert(rotated.data.token && !rotated.data.refreshToken, 'web only receives access token');
let again = await refreshWeb(secondCookie);
const thirdCookie = cookieOnly(again.cookie);
assert.notEqual(thirdCookie, secondCookie, 'consecutive rotations issue distinct credentials');

// A single replay invalidates this refresh chain, but not other sessions.
await refreshWeb(firstCookie, 401);
await refreshWeb(thirdCookie, 401);
console.log('PASS: web refresh cookie is HttpOnly/Strict and single-use replay revokes chain');

const other = await request('/api/login', {
  email: employeeEmail, password: 'SEC012-Reset-Password3!',
});
const otherCookie = cookieOnly(other.cookie);
await refreshWeb(otherCookie);
await request('/api/auth/refresh', {}, { Cookie: otherCookie }, 403);
await request('/api/auth/refresh', {}, {
  Cookie: otherCookie,
  'X-HRMS-Refresh': '1',
  Origin: 'https://untrusted.example.invalid',
}, 403);
console.log('PASS: custom refresh header and same-origin requirement enforced');

// Login via the Android bridge: raw refresh is returned only to native mode,
// and there is never a corresponding web refresh cookie.
const native = await request('/api/candidate/login', {
  email: 'sec012-candidate@example.invalid',
  password: 'SEC012-Candidate-Password1!',
}, { 'X-HRMS-Client': 'android' });
assert(native.data.token && native.data.refreshToken);
assert(!native.cookie?.includes('hrms_refresh='), 'native must not get browser refresh cookie');
const nativeRefresh = async (secret, expected = 200) =>
  request('/api/auth/refresh', { refreshToken: secret }, {
    'X-HRMS-Client': 'android', 'X-HRMS-Refresh': '1',
  }, expected);
const nativeRotated = await nativeRefresh(native.data.refreshToken);
assert(nativeRotated.data.token && nativeRotated.data.refreshToken);
assert.notEqual(nativeRotated.data.refreshToken, native.data.refreshToken);
await nativeRefresh(native.data.refreshToken, 401);
await nativeRefresh(nativeRotated.data.refreshToken, 401);
console.log('PASS: Android refresh rotates in JSON and replay revokes native chain');

// The server must reject a *validly signed* ten-year access JWT even when
// version 0 and role are otherwise valid.
const syntheticLongJwt = execFileSync('php', ['tests/sec012_signed_legacy.php'],
  { encoding: 'utf8' }).trim();
const denied = await fetch(origin + '/api/me', {
  headers: { Authorization: 'Bearer ' + syntheticLongJwt },
});
assert.equal(denied.status, 401, 'ten-year signed JWT must no longer authorize APIs');

const candidate = await request('/api/candidate/login', {
  email: 'sec012-candidate@example.invalid',
  password: 'SEC012-Candidate-Password1!',
});
const expiring = cookieOnly(candidate.cookie);
execFileSync('php', ['tests/sec012_expire_refresh.php', expiring.split('=')[1].split('.')[0]]);
await refreshWeb(expiring, 401);
console.log('PASS: expired refresh row is rejected');

console.log('SEC-012 stage 2 HTTP refresh, replay, expiry and access TTL checks PASSED');
