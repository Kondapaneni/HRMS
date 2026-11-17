import assert from 'node:assert/strict';
import crypto from 'node:crypto';
assert.equal(process.env.DB_DATABASE, 'sec014_test');
assert.equal(process.env.DB_HOST, '127.0.0.1');
assert(process.env.JWT_SECRET?.startsWith('SEC014_TEST_ONLY_'));
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const prefix = encode({typ: 'JWT', alg: 'HS256'}) + '.' + encode({
  iss: 'acme_hrms', iat: now, exp: now + 1200,
  id: '00000000-0000-4000-8000-000000000161',
  role: 'admin', email: 'admin@example.invalid',
});
const jwt = prefix + '.' + crypto.createHmac('sha256', process.env.JWT_SECRET)
  .update(prefix).digest('base64url');
// The ephemeral fixture intentionally lacks branches table; legacy route
// catches a PDO failure and would ordinarily disclose SQLSTATE in the 500.
const result = await fetch('http://127.0.0.1:8775/api/branches', {
  headers: { Authorization: 'Bearer ' + jwt, 'Accept-Encoding': 'identity' },
});
const content = await result.text();
assert.equal(result.status, 500, 'Expected synthetic missing-table failure');
assert.deepEqual(JSON.parse(content), { error: 'Internal server error' });
assert(!/SQLSTATE|relation|branches|SELECT|postgres|stack trace|PDOException/i.test(content));
assert.match(result.headers.get('cache-control') || '', /no-store/);
console.log('PASS SEC-018 synthetic HTTP: no database diagnostics in error response');
