import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Execute the actual standalone browser access/refresh routines with synthetic
// browser/Android bridges. No network, personal information or live accounts.
const src = readFileSync('frontend/src/api/axios.js', 'utf8');
const memoryStart = src.indexOf('let webAccessToken = null;');
const requestStart = src.indexOf('api.interceptors.request.use(', memoryStart);
const refreshStart = src.indexOf('let sharedRefresh = null;');
const responseStart = src.indexOf('api.interceptors.response.use(', refreshStart);
assert(memoryStart > 0 && requestStart > memoryStart && refreshStart > 0 && responseStart > refreshStart);
const browserCode = [
  src.slice(memoryStart, requestStart),
  src.slice(refreshStart, responseStart),
].join('\n').replace(/^export /gm, '');

const validJwt = 'test.' + Buffer.from(JSON.stringify({
  type: 'session', exp: Math.floor(Date.now() / 1000) + 3600,
})).toString('base64url') + '.signature-for-synthetic-test';
function sessionHarness(native = false) {
  const state = new Map();
  let calls = 0;
  let restores = 0;
  let rotations = 0;
  let purges = 0;
  const ctx = vm.createContext({
    isAndroidSession: native,
    clearPrivateSessionStorage: () => { purges++; },
    window: { sessionStorage: {
      getItem: k => state.get(k) || null,
      setItem: (k, v) => state.set(k, v),
      removeItem: k => state.delete(k),
    }},
    navigator: { locks: { request: async (_key, callback) => callback() } },
    atob: data => Buffer.from(data, 'base64').toString('binary'),
    Date,
    axios: { post: async (url, body, config) => {
      calls++;
      assert(['/api/auth/refresh', '/api/auth/refresh/restore'].includes(url));
      if (url === '/api/auth/refresh') rotations++;
      if (url === '/api/auth/refresh/restore') restores++;
      assert.equal(Object.keys(body).length, 0);
      assert.equal(config.withCredentials, true);
      assert.equal(config.headers['X-HRMS-Refresh'], '1');
      return { data: { token: validJwt } };
    }},
    getNativeAccessToken: async () => native ? validJwt : null,
    refreshNativeSession: async () => validJwt,
  });
  vm.runInContext(browserCode, ctx);
  return { ctx, state, get calls() { return calls; },
    get restores() { return restores; }, get rotations() { return rotations; },
    get purges() { return purges; } };
}

const web = sessionHarness();
assert.equal(vm.runInContext('getAccessToken()', web.ctx), null, 'no persisted token on startup');
assert.equal(await vm.runInContext('restoreSession()', web.ctx), validJwt, 'web reload restores from HttpOnly cookie');
assert.equal(web.calls, 1, 'one restore request');
assert.equal(web.restores, 1, 'page reload calls idempotent restore');
assert.equal(web.rotations, 0, 'page reload does not rotate one-use refresh credential');
assert.equal(vm.runInContext('getAccessToken()', web.ctx), validJwt, 'access is memory-only');
assert.equal(await vm.runInContext('restoreSession()', web.ctx), validJwt);
assert.equal(web.calls, 1, 'fresh in-memory token does not cause needless refresh');
vm.runInContext('clearSessionAccess()', web.ctx);
assert.equal(vm.runInContext('getAccessToken()', web.ctx), null, 'logout clears access immediately');
assert.equal(web.purges, 1, 'logout clears browser private storage');
web.state.set('hrms_block_session_restore', '1');
assert.equal(await vm.runInContext('restoreSession()', web.ctx), null, 'failed remote logout cannot restore session');
assert.equal(web.calls, 1, 'blocked logout does not rotate cookie');
// Simulate six distinct browser navigations: each reload creates a fresh
// JavaScript module but reuses the same HttpOnly cookie in the browser.
for (let reload = 0; reload < 6; reload++) {
  const freshPage = sessionHarness();
  assert.equal(await vm.runInContext('restoreSession()', freshPage.ctx), validJwt);
  assert.equal(freshPage.restores, 1);
  assert.equal(freshPage.rotations, 0, 'no single-use rotation across rapid reloads');
}
const expiredInMemory = sessionHarness();
vm.runInContext('setAccessToken("expired-token")', expiredInMemory.ctx);
assert.equal(await vm.runInContext('restoreSession()', expiredInMemory.ctx), validJwt);
assert.equal(expiredInMemory.rotations, 1, 'in-session expired JWT still rotates on renewal');
assert.equal(expiredInMemory.restores, 0);
const android = sessionHarness(true);
assert.equal(await vm.runInContext('restoreSession()', android.ctx), validJwt,
  'Android restores Keystore token without a browser cookie');
assert.equal(android.calls, 0, 'Android does not use browser refresh');
vm.runInContext('setAccessToken("synthetic")', android.ctx);
assert.equal(vm.runInContext('getAccessToken()', android.ctx), null,
  'Android never mirrors a token into browser JavaScript storage');
console.log('SEC-021 synthetic web restore, logout, and Android session isolation PASS');
