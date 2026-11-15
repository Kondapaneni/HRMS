import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const backend = read('backend/public/index.php');
const auth = read('backend/src/Middleware/AuthMiddleware.php');
const db = read('backend/src/Config/Database.php');

assert(backend.includes('$app->addErrorMiddleware(false, true, true);'),
  'Slim must not expose exception details in HTTP responses');
assert(!backend.includes('$app->addErrorMiddleware(true, true, true);'),
  'Hardcoded debug details must not be enabled');
assert(!auth.includes('Secret empty?') && !auth.includes('Invalid or expired token: '),
  'JWT diagnostics must not be reflected to clients');
assert(!/\becho\s+\$exception->getMessage\s*\(/.test(db),
  'Raw database errors must not be echoed');
assert(db.includes('error_log('), 'Database diagnostics remain server-side');

console.log('PASS SEC-024 source: debug response details disabled; auth and DB errors redacted');
