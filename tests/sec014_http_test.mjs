import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Every mutating call below is strictly against isolated CI PostgreSQL.
assert.equal(process.env.DB_DATABASE, 'sec014_test');
const secret = process.env.JWT_SECRET;
assert(secret?.startsWith('SEC014_TEST_ONLY_'));
const origin = 'http://127.0.0.1:8775';
const ids = {
  fenced: '00000000-0000-4000-8000-000000000141',
  remote: '00000000-0000-4000-8000-000000000142',
  second: '00000000-0000-4000-8000-000000000143',
};

function jwt(actor) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss:'acme_hrms', iat:now, exp:now + 1200,
    id:ids[actor], role:'employee', email:actor+'@example.invalid' };
  const prefix = encode({typ:'JWT', alg:'HS256'}) + '.' + encode(payload);
  return prefix + '.' + crypto.createHmac('sha256', secret).update(prefix).digest('base64url');
}

async function call(method, path, body, actor = null, spoof = null) {
  const headers = {
    'Accept-Encoding': 'identity',
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(actor ? { Authorization: 'Bearer ' + jwt(actor) } : {}),
    ...(spoof ? { 'X-Forwarded-For': spoof, 'Client-IP': spoof } : {})
  };
  const response = await fetch(origin + path, {
    method,
    headers,
    ...(body === undefined ? {} : {body:JSON.stringify(body)}),
    redirect:'manual'
  });
  const raw = await response.text();
  let json;
  try { json = JSON.parse(raw); } catch {}
  return { status:response.status, json, raw:raw.slice(0,220) };
}
async function expect(status, method, path, body, actor, spoof) {
  const r = await call(method, path, body, actor, spoof);
  assert.equal(r.status, status, method + ' ' + path + ' expected ' + status + ' got ' + r.status + ': ' + r.raw);
  console.log('PASS', method, path, status);
  return r.json;
}
const fakeIp = i => `198.51.100.${i+1}`;

// Login: failed-password counters must follow the normalized account, not XFF.
// This is a nonexistent .invalid synthetic account: no real credentials guessed.
for (let i = 0; i < 5; i++) await expect(401, 'POST', '/api/login',
  {email:i%2 ? 'LOCK@example.invalid' : 'lock@example.invalid', password:'never-valid'}, null, fakeIp(i));
const loginLock = await expect(429, 'POST', '/api/login',
  {email:'lock@example.invalid',password:'never-valid'}, null, fakeIp(18));
assert(loginLock.secondsRemaining > 0);
// Multiple users on the same corporate peer must not all lock out.
await expect(401, 'POST', '/api/login',
  {email:'other@example.invalid',password:'never-valid'}, null, fakeIp(19));

// OTP send: use nonexistent account only, so no OTP or email queue is created.
for (let i=0;i<5;i++) await expect(404,'POST','/api/auth/otp/send',
  {email:'unknown-otp@example.invalid'},null,fakeIp(i));
await expect(429,'POST','/api/auth/otp/send',
  {email:'UNKNOWN-OTP@example.invalid'},null,fakeIp(15));

// OTP verify: do not touch real login OTPs.
for (let i=0;i<6;i++) await expect(401,'POST','/api/auth/otp/verify',
  {email:'missing-verify@example.invalid',otp:'000000'},null,fakeIp(i));
await expect(429,'POST','/api/auth/otp/verify',
  {email:'missing-verify@example.invalid',otp:'000000'},null,fakeIp(17));

// Forgot password: nonexistent target means no reset email is ever queued.
for (let i=0;i<3;i++) await expect(200,'POST','/api/forgot-password',
  {email:'absent-reset@example.invalid'},null,fakeIp(i));
await expect(429,'POST','/api/forgot-password',
  {email:'absent-reset@example.invalid'},null,fakeIp(23));

const path = '/api/employee/attendance/punch';
const far = {latitude:17.1,longitude:81.3};
const near = {latitude:16.5001,longitude:80.6001};

// No server trust in client-side geofence: all these must fail before INSERT.
await expect(403,'POST',path,{action:'check-in',...far},'fenced',fakeIp(1));
await expect(403,'POST',path,{action:'check-in'},'fenced',fakeIp(2));
await expect(400,'POST',path,{action:'check-in',latitude:999,longitude:80.6},'fenced',fakeIp(3));
await expect(400,'POST',path,{action:'check-in',latitude:'NaN',longitude:80.6},'fenced',fakeIp(3));
await expect(200,'POST',path,{action:'check-in',...near},'fenced',fakeIp(4));
await expect(403,'POST',path,{action:'check-out',...far},'fenced',fakeIp(5));
// Existing Android tracking behavior: intermediate punches can be offsite.
await expect(200,'POST',path,{action:'punch',...far,photo:'Tracker',address:'Synthetic offsite'},'fenced',fakeIp(6));
await expect(200,'POST',path,{action:'check-out',...near},'fenced',fakeIp(7));
// Explicit geofence OFF: remote check-in/out are intentionally allowed.
await expect(200,'POST',path,{action:'check-in',...far},'remote',fakeIp(8));
await expect(200,'POST',path,{action:'check-out',...far},'remote',fakeIp(9));

// Map loads: scoped to authenticated employee, not spoofed XFF or shared IP.
await expect(401,'GET','/api/employee/maps-rate-limit-status',undefined,null,fakeIp(10));
for(let i=0;i<5;i++) await expect(200,'GET','/api/employee/geofences',undefined,'second',fakeIp(i));
const mapsBlock = await expect(429,'GET','/api/employee/geofences',undefined,'second',fakeIp(11));
assert.match(mapsBlock.error,/too many map loads/i);
const status = await expect(200,'GET','/api/employee/maps-rate-limit-status',undefined,'second',fakeIp(12));
assert.equal(status.locked,true);
await expect(200,'GET','/api/employee/geofences',undefined,'remote',fakeIp(13));

console.log('SEC-014 synthetic authenticated HTTP geofence/credential limits passed');
