import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// SEC-016 CI only. Never operate against connected dev/production HRMS DB.
assert.equal(process.env.DB_DATABASE, 'sec014_test');
const secret = process.env.JWT_SECRET;
assert(secret?.startsWith('SEC014_TEST_ONLY_'));
const origin = 'http://127.0.0.1:8775';
const identities = {
  employee: { id: '00000000-0000-4000-8000-000000000143', email: 'second@example.invalid' },
  admin: { id: '00000000-0000-4000-8000-000000000161', email: 'admin@example.invalid' },
  hr: { id: '00000000-0000-4000-8000-000000000162', email: 'hr@example.invalid' },
  manager: { id: '00000000-0000-4000-8000-000000000163', email: 'manager@example.invalid' },
};
const browser = 'SEC016_BROWSER_TEST_PUBLIC_ONLY';
const geocode = 'SEC016_GEOCODE_TEST_SECRET_NEVER_SEND';
const legacy = 'SEC016_LEGACY_TEST_SECRET_NEVER_SEND';

function jwt(role = 'employee') {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = identities[role];
  const prefix = encode({ typ: 'JWT', alg: 'HS256' }) + '.' + encode({
    iss: 'acme_hrms', iat: now, exp: now + 1200,
    id: claims.id, role, email: claims.email,
  });
  return prefix + '.' + crypto.createHmac('sha256', secret).update(prefix).digest('base64url');
}
async function get(path, role = 'employee') {
  const res = await fetch(origin + path, {
    headers: {
      'Accept-Encoding': 'identity',
      ...(role ? { Authorization: 'Bearer ' + jwt(role) } : {}),
    },
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, data: JSON.parse(text), text };
}

const anon = await get('/api/maps/browser-config', null);
assert.equal(anon.status, 401);
const config = await get('/api/maps/browser-config');
assert.equal(config.status, 200, config.text.slice(0, 200));
assert.deepEqual(Object.keys(config.data), ['mapsJavaScriptApiKey']);
assert.equal(config.data.mapsJavaScriptApiKey, browser);
assert.match(config.headers.get('cache-control') || '', /no-store/);
assert(!config.text.includes(geocode) && !config.text.includes(legacy));

// The existing employee attendance map is also accessible to HR and Manager.
// The browser-only key is allowed for active sessions in these roles, not
// exposed to candidates or anonymous clients.
for (const role of ['admin', 'hr', 'manager']) {
  const result = await get('/api/maps/browser-config', role);
  assert.equal(result.status, 200, `Expected browser Maps config for ${role}: ${result.status}`);
  assert.deepEqual(result.data, { mapsJavaScriptApiKey: browser });
  assert(!result.text.includes(geocode) && !result.text.includes(legacy));
}
const candidate = await fetch(origin + '/api/maps/browser-config', {
  headers: {
    'Accept-Encoding': 'identity',
    Authorization: 'Bearer ' + (() => {
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const now = Math.floor(Date.now() / 1000);
      const prefix = encode({ typ: 'JWT', alg: 'HS256' }) + '.' + encode({
        iss: 'acme_hrms', iat: now, exp: now + 1200,
        id: identities.employee.id, role: 'candidate', email: identities.employee.email,
      });
      return prefix + '.' + crypto.createHmac('sha256', secret).update(prefix).digest('base64url');
    })(),
  },
});
assert.equal(candidate.status, 403, 'Candidate sessions must not receive browser Map config');

const fence = await get('/api/employee/geofences');
assert.equal(fence.status, 200, fence.text.slice(0, 200));
assert(Array.isArray(fence.data.geofences));
assert(!Object.hasOwn(fence.data, 'googleMapsApiKey'));
assert(!Object.hasOwn(fence.data, 'mapsJavaScriptApiKey'));
assert(!fence.text.includes(geocode) && !fence.text.includes(legacy));

console.log('PASS SEC-016 isolated HTTP: auth, separate browser config, no server keys in geofences');
