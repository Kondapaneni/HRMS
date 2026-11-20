import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(p, 'utf8');
const cache = read('backend/src/Cache/RedisReferenceCache.php');
const routes = read('backend/public/admin_employees_routes.php');
const auth = read('backend/src/Middleware/AuthMiddleware.php');
const maintenance = read('backend/src/Middleware/MaintenanceMiddleware.php');
const docker = read('Dockerfile');
const entry = read('docker-entrypoint.sh');
const frontend = read('frontend/src/query/memoryClient.js');
const http = read('backend/public/index.php');

// Only explicitly allowlisted branch name/id references may enter Redis.
assert.match(cache, /\$family !== 'branches'/);
assert.match(cache, /count\(\$verifiedScope\) > 8/);
assert.match(cache, /hash\('sha256', json_encode\(array_values\(\$verifiedScope\)/);
assert.match(cache, /\$ttlSeconds > 300/);
assert.match(cache, /strlen\(\$packed\) <= 32768/);
assert.match(cache, /catch \(\\Throwable \$ignored\)/);
assert.match(cache, /\$data = \$loadFromDatabase\(\)/);
assert.match(cache, /public function invalidate\(/);
assert.match(cache, /public function counters\(/);
assert.match(cache, /HRMS_REDIS_ENABLED/);
assert.match(cache, /REDIS_URL/);
assert.match(cache, /class_exists\(\\Redis::class\)/);
assert.doesNotMatch(cache, /getMessage\(\)|error_log\(|setOption\(\\Redis::OPT_SERIALIZER/);
assert.doesNotMatch(cache, /(?:password|token|secret)[^\n]+(?:\$key|hash\()/i);

// The exact approved route needs server-authorized identity BEFORE the
// read; other private HRMS endpoints remain unchanged.
const start = routes.indexOf("$app->get('/api/branches'");
const end = routes.indexOf("$app->get('/api/admin/employees/{id}'");
assert(start > 0 && end > start);
const branch = routes.slice(start, end);
assert.match(branch, /getAttribute\('user'\)/);
assert.match(branch, /RedisReferenceCache::fromEnvironment\(\)/);
assert.match(branch, /->remember\('branches', \$scope, 45,/);
assert.match(branch, /SELECT id, name FROM branches ORDER BY id ASC/);
assert.match(branch, /new AuthMiddleware\(\['admin', 'employee'\]\)/);
assert(branch.indexOf("getAttribute('user')") < branch.indexOf('->remember('),
  'Verified identity must be computed before Redis access');
assert(!routes.slice(0, start).includes("->remember("),
  'Employee listings and pay records may not be Redis cached');
assert.match(auth, /SessionVersion::matches\(\$decoded, \$userRow\)/);
assert.match(auth, /SELECT role, "isActive", token_version FROM users/);
assert.match(maintenance, /SELECT maintenance_mode FROM public\.global_settings/);
assert.match(http, /withHeader\('Cache-Control', 'no-store'\)/);
assert.match(frontend, /memoryQueryClient\.clear\(\)/);
assert.match(docker, /pecl install redis-6\.2\.0/);
assert.match(docker, /docker-php-ext-enable redis/);
assert.match(entry, /HRMS_REDIS_ENABLED REDIS_URL/);
console.log('PASS Layer 3 security and cache-aside source contract');
