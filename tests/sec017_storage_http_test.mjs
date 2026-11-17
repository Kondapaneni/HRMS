import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// SEC-017: synthetic local HTTP checks. No real Supabase key, files or users.
assert.equal(process.env.DB_DATABASE, 'sec014_test');
assert.equal(process.env.DB_HOST, '127.0.0.1');
assert(process.env.JWT_SECRET?.startsWith('SEC014_TEST_ONLY_'));
assert(!process.env.SUPABASE_SECRET_KEY, 'Refusing to run with real Storage credentials');
const origin = 'http://127.0.0.1:8775';
function jwt() {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = encode({ typ: 'JWT', alg: 'HS256' }) + '.' + encode({
    iss: 'acme_hrms', iat: now, exp: now + 1200,
    id: '00000000-0000-4000-8000-000000000161',
    role: 'admin', email: 'admin@example.invalid',
  });
  return body + '.' + crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(body).digest('base64url');
}
async function attempt(bucket, path, payload, signed = true) {
  const query = new URLSearchParams({ bucket, path });
  const response = await fetch(origin + '/api/storage/upload?' + query, {
    method: 'POST', body: Buffer.from(payload),
    headers: {
      'Content-Type': 'application/octet-stream',
      'Accept-Encoding': 'identity',
      ...(signed ? { Authorization: 'Bearer ' + jwt() } : {}),
    },
  });
  const text = await response.text();
  return { status: response.status, text };
}
const samplePdf = '%PDF-1.4\n1 0 obj <</Type/Catalog>> endobj\n%%EOF\n';
const anonymous = await attempt('offer_letters', 'anonymous.pdf', samplePdf, false);
assert.equal(anonymous.status, 401, 'Anonymous upload rejected');

const badPath = await attempt('offer_letters', '../traversal.pdf', samplePdf);
assert.equal(badPath.status, 400, 'Path traversal rejected');

const badBucket = await attempt('unlisted', 'fake.pdf', samplePdf);
assert.equal(badBucket.status, 403, 'Unknown bucket denied');

const disguisedPdf = await attempt('offer_letters', 'fake.pdf', '<html>fake upload</html>');
assert.equal(disguisedPdf.status, 415, 'HTML disguised as PDF rejected');

const disguisedJpg = await attempt('attendance', 'fake.jpg', '<svg onload="alert(1)"/>');
assert.equal(disguisedJpg.status, 415, 'SVG disguised as JPG rejected');

const validWithoutStorage = await attempt('offer_letters', 'synthetic.pdf', samplePdf);
assert.equal(validWithoutStorage.status, 503, 'Valid synthetic file cannot reach unconfigured Storage');

console.log('PASS SEC-017 isolated HTTP: anonymous, path, bucket, signature and no remote Storage');
