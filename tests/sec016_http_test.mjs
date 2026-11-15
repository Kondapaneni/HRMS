import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Never run on a real HRMS database or with real Google API credentials.
assert.equal(process.env.DB_DATABASE, 'sec014_test');
assert.match(process.env.JWT_SECRET ?? '', /^SEC014_TEST_ONLY_/);
assert.equal(process.env.GOOGLE_MAPS_JS_BROWSER_KEY, 'SEC016_PUBLIC_BROWSER_TEST_ONLY');
assert.equal(process.env.GOOGLE_GEOCODING_API_KEY, 'SEC016_PRIVATE_GEOCODING_TEST_ONLY');
const baseUrl = 'http://127.0.0.1:8776';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const body = {
  iss: 'acme_hrms', id: '00000000-0000-4000-8000-000000000142',
  role: 'employee', email: 'remote@example.invalid',
  iat: now, exp: now + 1200
};
const prefix = encode({typ:'JWT',alg:'HS256'}) + '.' + encode(body);
const token = prefix + '.' + crypto.createHmac('sha256', process.env.JWT_SECRET).update(prefix).digest('base64url');

const unauthenticated = await fetch(baseUrl + '/api/employee/geofences', {headers:{'Accept-Encoding':'identity'}});
assert.equal(unauthenticated.status, 401, 'Unauthenticated geofences must be denied');

const response = await fetch(baseUrl + '/api/employee/geofences', {
  headers: {Authorization: 'Bearer ' + token, 'Accept-Encoding':'identity'}
});
const raw = await response.text();
assert.equal(response.status, 200, 'Authenticated geofences returned unexpected status: ' + response.status + ' ' + raw.slice(0,140));
const result = JSON.parse(raw);
assert.equal(result.googleMapsBrowserKey, 'SEC016_PUBLIC_BROWSER_TEST_ONLY');
assert.ok(Array.isArray(result.geofences), 'Existing geofence data must still be returned');
assert.ok(Object.hasOwn(result,'geoFenceEnabled'), 'Existing server-owned feature setting must remain');
assert.ok(!Object.hasOwn(result, 'googleMapsApiKey'), 'Legacy key property must be absent');
assert.ok(!raw.includes('SEC016_PRIVATE_GEOCODING_TEST_ONLY'), 'Backend geocoding key leaked to employee');
assert.ok(!raw.includes('SEC016_LEGACY_SERVER_TEST_ONLY'), 'Legacy server key leaked to employee');
assert.ok(!raw.includes('GOOGLE_GEOCODING_API_KEY'), 'Backend environment variable name leaked to employee');
console.log('PASS SEC-016 isolated authenticated geofences payload exposes only intentionally public browser key');
