import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const read = p => readFileSync(p, 'utf8');
const files = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)])
  .filter(p => /\.(jsx?|mjs)$/.test(p));

const app = read('frontend/src/App.jsx');
const axios = read('frontend/src/api/axios.js');
const auth = read('frontend/src/contexts/AuthContext.jsx');
const storage = read('frontend/src/api/browserPrivacy.js');
const cookies = read('backend/src/Utils/WebSessionCookies.php');
const middleware = read('backend/src/Middleware/AuthMiddleware.php');
const refresh = read('backend/src/Utils/RefreshSessions.php');
const server = read('backend/public/index.php');
const native = read('frontend/src/api/nativeSession.js');
const vite = read('frontend/vite.config.js');
const html = read('frontend/index.html');

assert.match(app, /<QueryClientProvider client=\{queryClient\}>/);
assert.doesNotMatch(app, /PersistQueryClientProvider|createSyncStoragePersister|persister\s*=/);
assert.match(app, /gcTime:\s*5\s*\*\s*60\s*\*\s*1000/);
assert.match(storage, /TANSTACK_QUERY_OFFLINE_CACHE/);
assert.match(storage, /REACT_QUERY_OFFLINE_CACHE/);
assert.match(storage, /localStorage\.removeItem\(key\)/);
assert.match(storage, /sessionStorage\.removeItem\(key\)/);
assert.match(auth, /queryClient\.clear\(\)/);
assert.match(auth, /BroadcastChannel\('hrms-auth'\)/);

for (const path of files('frontend/src')) {
  const body = read(path);
  const name = relative('frontend/src', path);
  // Even temporary storage of access JWTs/refresh secrets is prohibited.
  assert.doesNotMatch(body, /\blocalStorage\.(?:getItem|setItem)\s*\(\s*['"]token['"]/,
    name + ' reads or writes an accessible access JWT');
  assert.doesNotMatch(body, /\blocalStorage\.setItem\s*\(\s*['"][^'"]*(?:token|jwt|refresh)/i,
    name + ' persists session credentials');
  if (!name.endsWith('api/browserPrivacy.js')) {
    assert.doesNotMatch(body,
      /\bsessionStorage\.(?:setItem|getItem)\s*\(\s*['"](?:current_(?:loan|sale)_(?:lead|member)|hrms_(?:admin|employee)_chat_history)/,
      name + ' persists HRMS private business records');
  }
}
assert.match(axios, /browserCsrfToken\(\)/);
assert.match(axios, /getNativeAccessToken\(\)/);
assert.match(axios, /refreshNativeSession\(\)/);
assert.match(axios, /X-HRMS-Refresh/);
assert.match(axios, /hrms-session-expired/);
assert.doesNotMatch(axios, /localStorage/);
assert.match(auth, /if \(response\.data\?\.mfaRequired\)/);
assert.match(auth, /if \(isAndroidSession\) await saveNativeSession\(response\.data\)/);
assert.match(native, /NativeLocationTracker\.getSessionAccessToken\(\)/);
assert.match(native, /NativeLocationTracker\.refreshSession\(\)/);

assert.match(cookies, /__Secure-hrms_access/);
assert.match(cookies, /__Host-hrms_csrf/);
assert.match(cookies, /HttpOnly; SameSite=Strict/);
assert.match(cookies, /Secure; SameSite=Strict/);
assert.match(cookies, /hash_equals\(\$cookie, \$header\)/);
assert.match(middleware, /WebSessionCookies::validCsrf\(\$request\)/);
assert.match(middleware, /WebSessionCookies::ACCESS/);
assert.match(middleware, /SessionVersion::matches/);
assert.match(refresh, /WebSessionCookies::issue\(\$response, \$access\)/);
assert.match(refresh, /\['authenticated' => true\]/);
assert.match(refresh, /'refreshToken' => \$refresh/);
assert.match(server, /WebSessionCookies::issue\(/);
assert.match(server, /WebSessionCookies::clear\(/);
assert.match(server, /X-HRMS-CSRF/);
assert.match(server, /AuthMiddleware\(\['admin', 'employee', 'hr', 'manager', 'candidate'\]\)/);
assert.match(vite, /drop:\s*\['console', 'debugger'\]/);
assert.doesNotMatch(html, /console\.(?:log|warn|error)\(/);
assert.match(read('frontend/public/service-worker.js'), /without caching any resources/);

console.log('SEC-021 source/privacy/session/MFA/native/rollback regression assertions PASSED');
