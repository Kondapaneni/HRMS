import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('backend/public/index.php', 'utf8');
const start = source.indexOf("$app->post('/api/auth/refresh'");
const end = source.indexOf("$app->post('/api/logout'", start);
assert(start >= 0 && end > start, 'Refresh route must exist');
const route = source.slice(start, end);
const setting = route.indexOf('SELECT session_timeout FROM public.global_settings');
const secret = route.indexOf("if ($secret === '') throw new RuntimeException('Session signing unavailable')");
const rotate = route.indexOf('RefreshSessions::rotate($conn, $provided, $client)');
const mint = route.indexOf("AccessToken::mint($result['user']");
const cookie = route.indexOf("RefreshSessions::cookie($result['refreshToken']");
assert(setting >= 0 && secret > setting && rotate > secret && mint > rotate && cookie > mint,
  'Independent DB reads and signing checks must precede one-time rotation, with cookie issued on success');
assert.equal((route.match(/RefreshSessions::rotate\(\$conn, \$provided, \$client\)/g) || []).length, 1,
  'Refresh must never rotate a credential twice');
assert(route.includes("'Refresh session invalid or revoked.'") && route.includes("->withStatus(401)"),
  'Invalid refresh credentials remain denied');
assert(route.includes("if ($client === 'android')"),
  'Android Keystore refresh response behavior must remain distinct');
assert(route.includes("'Cache-Control', 'no-store'"),
  'Refresh responses may not be browser cached');
const refresh = readFileSync('backend/src/Utils/RefreshSessions.php', 'utf8');
assert(refresh.includes("if (isset($used[$hash]))")
  && refresh.includes("SET revoked_at = COALESCE(revoked_at, NOW())")
  && refresh.includes("hash_equals("),
  'Immediate known replay revocation and constant-time comparisons remain mandatory');
assert(refresh.includes('Secure; HttpOnly; SameSite=Strict')
  && refresh.includes('Path=/api/auth/refresh'),
  'Refresh secret remains in the HttpOnly cookie scoped to the refresh endpoint');
console.log('SEC-012 refresh preflight-before-rotation and replay preservation PASS');
