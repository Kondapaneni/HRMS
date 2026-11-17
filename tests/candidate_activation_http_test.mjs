import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Runs ONLY against synthetic PostgreSQL started by SEC-015 CI, never live HRMS.
assert.equal(process.env.DB_DATABASE, 'sec015_test');
assert.equal(process.env.DB_HOST, '127.0.0.1');
assert(process.env.JWT_SECRET?.startsWith('SEC015_TEST_ONLY_'));
assert(!process.env.SUPABASE_SECRET_KEY);

const base = 'http://127.0.0.1:8776';
const emailA = 'activation-a@example.invalid';
const emailB = 'activation-b@example.invalid';
const neverUser = 'activation-unknown@example.invalid';

function sql(query) {
  return execFileSync('psql', [
    '-h', process.env.DB_HOST,
    '-U', process.env.DB_USERNAME,
    '-d', process.env.DB_DATABASE,
    '-At', '-v', 'ON_ERROR_STOP=1', '-c', query
  ], {
    encoding: 'utf8',
    env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
  }).trim();
}
async function post(path, payload) {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await response.json();
  return { status: response.status, json };
}
function tokenFor(email) {
  return sql("SELECT reset_token FROM users WHERE email = '" + email + "' AND role = 'candidate'");
}
function queuedCount(email) {
  return Number(sql("SELECT count(*) FROM email_queue WHERE to_email = '" + email + "'"));
}
function assertToken(token) {
  assert.match(token, /^[0-9a-f]{64}$/);
}
async function register(email) {
  const r = await post('/api/candidate/register', {
    firstName: 'Activation', lastName: 'Tester',
    email, password: 'SecurePassword123!'
  });
  assert.equal(r.status, 201, JSON.stringify(r));
  assert.equal(r.json.token, undefined, 'Registration must not disclose token');
  const token = tokenFor(email);
  assertToken(token);
  assert.equal(
    sql("SELECT (reset_token_expires > CURRENT_TIMESTAMP)::text FROM users WHERE email = '" + email + "'"),
    'true'
  );
  assert.equal(queuedCount(email), 1);
  assert.equal(
    sql("SELECT (body LIKE '%Activate Candidate Account%' AND body LIKE '%/candidate/activate?token=%')::text FROM email_queue WHERE to_email = '" + email + "' ORDER BY id DESC LIMIT 1"),
    'true',
    'Activation email must contain a working activation CTA'
  );
  return token;
}

const a = await register(emailA);
const inactiveLogin = await post('/api/candidate/login', { email: emailA, password: 'SecurePassword123!' });
assert.equal(inactiveLogin.status, 403, 'Inactive candidate must not log in before verification');

assert.equal((await post('/api/candidate/activate', { token: 'not-a-token' })).status, 400);
assert.equal((await post('/api/candidate/activate', { token: a })).status, 200);
assert.equal((await post('/api/candidate/activate', { token: a })).status, 400, 'Token must be single use');
assert.equal(
  sql("SELECT (\"isActive\" = true AND reset_token IS NULL AND reset_token_expires IS NULL)::text FROM users WHERE email = '" + emailA + "'"),
  'true'
);

const b = await register(emailB);
sql("UPDATE users SET reset_token_expires = CURRENT_TIMESTAMP - INTERVAL '2 minutes' WHERE email = '" + emailB + "'");
assert.equal((await post('/api/candidate/activate', { token: b })).status, 400,
  'Expired activation token must be rejected');

const resend = await post('/api/candidate/resend-activation', { email: emailB });
assert.equal(resend.status, 200);
assert.equal(resend.json.token, undefined, 'Resend must not disclose token');
const bNew = tokenFor(emailB);
assertToken(bNew);
assert.notEqual(bNew, b, 'Resend must rotate the token');
assert.equal(queuedCount(emailB), 2, 'Resend must queue a fresh email');
assert.equal((await post('/api/candidate/activate', { token: b })).status, 400,
  'Old replaced token must not activate candidate');
assert.equal((await post('/api/candidate/activate', { token: bNew })).status, 200);

const queueBefore = queuedCount(neverUser);
const unknown = await post('/api/candidate/resend-activation', { email: neverUser });
assert.equal(unknown.status, 200);
assert.equal(unknown.json.message, resend.json.message,
  'Resend must not reveal whether an account exists');
assert.equal(queuedCount(neverUser), queueBefore);

assert.equal((await post('/api/candidate/resend-activation', { email: 'invalid' })).status, 400);
for (let i = 1; i <= 2; i++) {
  assert.equal((await post('/api/candidate/resend-activation', { email: neverUser })).status, 200);
}
assert.equal((await post('/api/candidate/resend-activation', { email: neverUser })).status, 429,
  'Resend endpoint must enforce per-account rate limit');

console.log('Candidate activation HTTP: CTA, expiry, one-use, resend, enumeration and rate limits PASS');
