// Layer 2 browser HTTP cache contract. No HRMS credentials or live network calls.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const apache = read('backend/public/.htaccess');
const html = read('frontend/index.html');
const entry = read('frontend/src/main.jsx');
const php = read('backend/public/index.php');
const vite = read('frontend/vite.config.js');
const segment = (body, start, end) => {
  const at = body.indexOf(start);
  assert(at >= 0, 'Missing cache policy section: ' + start);
  const until = body.indexOf(end, at + start.length);
  assert(until > at, 'Unclosed cache policy section: ' + start);
  return body.slice(at, until + end.length);
};

// Only the actual static entry file (including SPA fallback rewrites) is
// marked no-store. Protected HTML must not survive identity/deploy changes.
const shell = segment(apache, '<Files "index.html">', '</Files>');
assert.match(shell, /Header always set Cache-Control "no-store"/);
assert.match(shell, /Header always set Pragma "no-cache"/);

// A one-year immutable response needs BOTH a physical hashed filename
// and an original /assets/ request, so never apply it to SPA fallback HTML,
// dynamic documents or an unversioned public resource.
assert.match(apache, /SetEnvIf Request_URI "\^\/assets\/" HRMS_VITE_ASSET=1/);
const fileRules = [...apache.matchAll(/<FilesMatch "([^"]+)">([\s\S]*?)<\/FilesMatch>/g)];
const immutable = fileRules.find(([, pattern, body]) => body.includes('immutable'));
assert(immutable, 'Missing immutable hashed-asset FilesMatch rule');
const filenameRule = new RegExp(immutable[1]);
for (const filename of ['index-AbCd1234.js', 'index-AbCd1234.css',
  'font-AbCd1234.woff2', 'logo-AbCd1234.webp']) {
  assert(filenameRule.test(filename), 'Hashed public asset rejected: ' + filename);
}
for (const filename of ['index.html', 'index.js', 'logo.png',
  'private-123.pdf', 'salary-2026.csv', 'service-worker.js']) {
  assert(!filenameRule.test(filename), 'Unversioned/private resource accepted: ' + filename);
}
assert.match(immutable[2], /Header always set Cache-Control "public, max-age=31536000, immutable" env=HRMS_VITE_ASSET/);
assert.match(immutable[2], /Header onsuccess unset Cache-Control env=HRMS_VITE_ASSET/);
assert(!/max-age=31536000/.test(apache.replace(immutable[0], '')),
  'One-year caching must not be applied outside allowlisted hashed assets');

const branding = fileRules.find(([, pattern, body]) =>
  pattern.includes('favicon') && body.includes('max-age=3600'));
assert(branding, 'Non-hashed public branding must be cached briefly');
assert(!branding[2].includes('immutable'), 'Non-hashed branding cannot be immutable');
const manifest = segment(apache, '<Files "manifest.json">', '</Files>');
assert.match(manifest, /Cache-Control "no-cache, must-revalidate"/);

// Explicit no-store on the PHP-served version endpoint prevents an outdated
// bundle from hiding a deployment. Keep the existing PHP API no-store wrapper.
const version = segment(php, "$app->get('/version.json'", 'use App\\Utils\\RateLimiter;');
assert.match(version, /withHeader\('Cache-Control', 'no-store'\)/);
assert.match(version, /withHeader\('Pragma', 'no-cache'\)/);
assert.match(php, /str_starts_with\(\$request->getUri\(\)->getPath\(\), '\/api\/'\)/);
assert.match(php, /withHeader\('Cache-Control', 'no-store'\)/);

// Online-only policy: do not install/register a worker from the HTML entry,
// while maintaining the existing startup cleanup for any older installations.
assert(!/serviceWorker\.register\s*\(/.test(html), 'HTML must not register a worker');
assert(!existsSync('frontend/public/service-worker.js'), 'Do not publish the legacy worker');
assert.match(entry, /navigator\.serviceWorker\.getRegistrations\(\)/);
assert.match(entry, /registration\.unregister\(\)/);
assert(!/serviceWorker\.register\s*\(/.test(entry), 'Entry must not register a worker');
assert.match(vite, /versionPlugin\(\)/, 'Keep the existing deploy-version mechanism');
assert.match(apache, /RewriteRule \^version\\\.json\$ index\.php/, 'Version stays PHP-routed');
assert.match(apache, /Content-Security-Policy/, 'Do not weaken browser security headers');

if (process.argv.includes('--built')) {
  const dist = 'frontend/dist';
  assert(existsSync(dist + '/index.html'), 'Production frontend build is required');
  const built = read(dist + '/index.html');
  const output = readdirSync(dist + '/assets');
  assert(output.some(file => /-[A-Za-z0-9_-]{8,}\.js$/.test(file)),
    'Vite must produce hashed JavaScript assets');
  assert(output.some(file => /-[A-Za-z0-9_-]{8,}\.css$/.test(file)),
    'Vite must produce hashed CSS assets');
  assert.match(built, /\/assets\/[^"' ]+-[A-Za-z0-9_-]{8,}\.js/,
    'HTML should reference a hashed entry bundle');
  assert(!existsSync(dist + '/service-worker.js'),
    'Production build must not ship a service worker');
  assert(!/serviceWorker\.register\s*\(/.test(built),
    'Production HTML must not register a worker');
}
console.log('Layer 2 safe static/browser HTTP cache policy PASS' +
  (process.argv.includes('--built') ? ' (built assets verified)' : ''));
