import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:8781';
const jar = new Map();
const setCookies = response => response.headers.getSetCookie();
const entries = headers => headers.map(v => ({
  name: v.split(';')[0].split('=')[0],
  value: v.split(';')[0].slice(v.split(';')[0].indexOf('=') + 1),
  raw: v,
}));
const updateCookies = response => {
  for (const item of entries(setCookies(response))) {
    if (item.value === '' || /Max-Age=0/.test(item.raw)) jar.delete(item.name);
    else jar.set(item.name, item.value);
  }
};
const cookieHeader = () => [...jar].map(([k, v]) => k + '=' + v).join('; ');
const call = async (method, path, body, headers = {}, status, sendCookie = true) => {
  const res = await fetch(origin + path, {
    method,
    headers: {
      'Accept-Encoding': 'identity',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(sendCookie ? { Cookie: cookieHeader() } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = { error: 'non-JSON response' }; }
  if (status !== undefined) assert.equal(res.status, status, method + ' ' + path + ' ' + text.slice(0, 300));
  return { status: res.status, response: res, data };
};
const headerCookie = (response, name) => {
  const match = entries(setCookies(response)).find(c => c.name === name);
  assert(match, name + ' must be set');
  return match;
};
const assertsWebCookies = response => {
  const access = headerCookie(response, '__Secure-hrms_access');
  const csrf = headerCookie(response, '__Host-hrms_csrf');
  const refresh = headerCookie(response, 'hrms_refresh');
  const file = headerCookie(response, 'hrms_file_auth');
  for (const cookie of [access, refresh, file]) {
    assert.match(cookie.raw, /Secure;/);
    assert.match(cookie.raw, /HttpOnly;/);
    assert.match(cookie.raw, /SameSite=Strict/);
  }
  assert.match(access.raw, /Path=\/api;/);
  assert.match(refresh.raw, /Path=\/api\/auth\/refresh;/);
  assert.match(csrf.raw, /Path=\/;/);
  assert.match(csrf.raw, /Secure;/);
  assert.match(csrf.raw, /SameSite=Strict/);
  assert(!csrf.raw.includes('HttpOnly'), 'CSRF value must be readable by first-party JS');
  assert.match(csrf.value, /^[0-9a-f]{64}$/);
  assert(!csrf.value.includes('.'));
  assert(!file.raw.includes('SameSite=Lax'));
  return { access: access.value, csrf: csrf.value, refresh: refresh.value };
};

// Synthetic CI identities; no real accounts, personnel records or passwords.
const signed = await call('POST', '/api/login', {
  email: 'sec012-employee@example.invalid',
  password: 'SEC012-Initial-Password1!',
}, {}, 200, false);
assert.equal(signed.data.authenticated, true);
assert(!('token' in signed.data) && !('refreshToken' in signed.data),
  'Web JSON must never disclose access or refresh JWTs');
assert.match(signed.response.headers.get('cache-control') || '', /no-store/, 'login responses must not be browser-disk cached');
const first = assertsWebCookies(signed.response);
updateCookies(signed.response);
const me = await call('GET', '/api/me', undefined, {}, 200);
assert.equal(me.data.role, 'employee');
assert.match(me.response.headers.get('cache-control') || '', /no-store/, 'private API GET must not use HTTP disk cache');
console.log('PASS web cookie sign-in: access protected, no JavaScript-visible JWT');

await call('PUT', '/api/change-password', {
  currentPassword: 'definitely-incorrect', newPassword: 'SEC021-Another-Synthetic-Password1!'
}, {}, 403);
await call('PUT', '/api/change-password', {
  currentPassword: 'definitely-incorrect', newPassword: 'SEC021-Another-Synthetic-Password1!'
}, { 'X-HRMS-CSRF': '0'.repeat(64) }, 403);
await call('PUT', '/api/change-password', {
  currentPassword: 'definitely-incorrect', newPassword: 'SEC021-Another-Synthetic-Password1!'
}, { 'X-HRMS-CSRF': first.csrf, Origin: 'https://cross-site.example.invalid' }, 403);
const acceptedCsrf = await call('PUT', '/api/change-password', {
  currentPassword: 'definitely-incorrect', newPassword: 'SEC021-Another-Synthetic-Password1!'
}, { 'X-HRMS-CSRF': first.csrf, Origin: 'https://127.0.0.1' }, 403);
assert.equal(acceptedCsrf.data.error, 'Current password is incorrect.', 'Matching CSRF must reach password verification');
assert.equal((await call('GET', '/api/me', undefined, {}, 200)).data.role, 'employee');
console.log('PASS CSRF enforcement: absent, wrong and cross-origin requests denied; legitimate request reaches password check');

await call('POST', '/api/auth/refresh', {}, {}, 403);
await call('POST', '/api/auth/refresh', {}, {
  'X-HRMS-Refresh': '1', Origin: 'https://cross-site.example.invalid',
}, 403);
const refreshed = await call('POST', '/api/auth/refresh', {}, {
  'X-HRMS-Refresh': '1', Origin: 'https://127.0.0.1',
}, 200);
assert.deepEqual(refreshed.data, { authenticated: true });
const second = assertsWebCookies(refreshed.response);
assert(second.access.length > 50, 'Fresh cookie carries a bounded JWT (not JSON)');
assert.notEqual(second.refresh, first.refresh, 'Refresh credential must rotate one-use');
updateCookies(refreshed.response);
await call('GET', '/api/me', undefined, {}, 200);
console.log('PASS browser refresh: access/refresh rotation, JSON has no JWT');

const candidate = await call('POST', '/api/candidate/login', {
  email: 'sec012-candidate@example.invalid', password: 'SEC012-Candidate-Password1!',
}, {}, 200, false);
assert(candidate.data.authenticated && !candidate.data.token && !candidate.data.refreshToken);
assertsWebCookies(candidate.response);
console.log('PASS Candidate portal uses web HttpOnly session');

const foreignLogin = await call('POST', '/api/login', {
  email: 'sec012-employee@example.invalid', password: 'SEC012-Initial-Password1!',
}, { Origin: 'https://different.example.invalid' }, 403, false);
assert(!setCookies(foreignLogin.response).some(v => v.startsWith('__Secure-hrms_access=')),
  'Cross-site login cannot plant browser access cookie');
await call('POST', '/api/login', {
  email: 'sec012-employee@example.invalid', password: 'SEC012-Initial-Password1!',
}, { 'Sec-Fetch-Site': 'cross-site' }, 403, false);
console.log('PASS cross-origin and cross-site browser login CSRF denied');

const nativeLogin = await call('POST', '/api/candidate/login', {
  email: 'sec012-candidate@example.invalid', password: 'SEC012-Candidate-Password1!',
}, { 'X-HRMS-Client': 'android' }, 200, false);
assert(nativeLogin.data.token && nativeLogin.data.refreshToken);
assert(!setCookies(nativeLogin.response).some(c => c.startsWith('hrms_refresh=')));
const nativeProfile = await call('GET', '/api/me', undefined, {
  Authorization: 'Bearer ' + nativeLogin.data.token,
}, 200, false);
assert.equal(nativeProfile.data.role, 'candidate');
const nativeRefresh = await call('POST', '/api/auth/refresh', {
  refreshToken: nativeLogin.data.refreshToken,
}, { 'X-HRMS-Client': 'android', 'X-HRMS-Refresh': '1' }, 200, false);
assert(nativeRefresh.data.token && nativeRefresh.data.refreshToken);
assert.notEqual(nativeRefresh.data.refreshToken, nativeLogin.data.refreshToken);
console.log('PASS native Android bearer/Keystore-compatible refresh path unchanged');

const logout = await call('POST', '/api/logout', {}, { 'X-HRMS-CSRF': second.csrf }, 200);
assert(logout.data.message && /revoked/i.test(logout.data.message));
for (const name of ['hrms_refresh', '__Secure-hrms_access', '__Host-hrms_csrf', 'hrms_file_auth']) {
  assert.match(headerCookie(logout.response, name).raw, /Max-Age=0/);
}
updateCookies(logout.response);
await call('GET', '/api/me', undefined, {
  Cookie: '__Secure-hrms_access=' + second.access,
}, 401, false);
await call('GET', '/api/me', undefined, {}, 401);
console.log('PASS logout revokes old JWT, deletes all browser session cookies');
console.log('SEC-021 browser-session synthetic HTTP security tests PASSED');
