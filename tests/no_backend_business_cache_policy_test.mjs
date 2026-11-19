import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const read = path => readFileSync(path, 'utf8');
const phpFiles = [];
function walk(folder) {
  for (const entry of readdirSync(folder)) {
    const file = join(folder, entry);
    if (statSync(file).isDirectory()) walk(file);
    else if (file.endsWith('.php')) phpFiles.push(file);
  }
}
walk('backend/public');
walk('backend/src');

assert(!existsSync('backend/src/Utils/Cache.php'),
  'Delete the obsolete APCu application data-cache utility');
for (const path of phpFiles) {
  const src = read(path);
  for (const [pattern, reason] of [
    [/\\App\\Utils\\Cache::|\bCache::(?:get|set|delete|clear)\s*\(/,
      'No server-wide cached business records or invalidation calls'],
    [/\bapcu_(?:fetch|store|delete|clear_cache)\s*\(/,
      'No APCu data-response caching'],
    [/assessments_meta_cache\.json|\$cacheFile\b|\bstatic\s+\$(?:cache|map)\b/,
      'No temporary-file assessment cache or PHP static lookup cache'],
  ]) {
    assert.doesNotMatch(src, pattern, reason + ': ' + path);
  }
}

const assessment = read('backend/public/employee_assessments_routes.php');
const assessmentAdmin = read('backend/public/admin_assessments_routes.php');
const dashboard = read('backend/public/admin_dashboard_routes.php');
const settings = read('backend/public/admin_settings_routes.php');
const helpers = read('backend/public/attendance_helpers.php');
const index = read('backend/public/index.php');
const maintenance = read('backend/src/Middleware/MaintenanceMiddleware.php');
const proxy = index.slice(index.indexOf('function streamSupabaseFile('),
  index.indexOf('// Avatar proxy route'));

assert.match(assessment,
  /\$stmtMeta\s*=\s*\$conn->query\('SELECT id, title, department, duration_minutes/,
  'Employee assessments must request current metadata on each GET');
assert.match(assessment, /if \(!in_array\(\$user->id, \$assignedIds\)\)/,
  'Assessment assignment visibility must remain user-specific');
assert.match(assessment, /WHERE employee_id = \?/,
  'Assessment attempts must remain scoped to the current employee');
assert.doesNotMatch(assessmentAdmin, /unlink\(|assessments_meta_cache/,
  'Assessment mutations no longer manipulate a shared cache file');
assert.match(dashboard, /\$empStmt\s*=\s*\$conn->query\(/,
  'Dashboard statistics must read current database values');
assert.match(settings, /\$settings\s*=\s*\$stmt->fetch\(PDO::FETCH_ASSOC\)/,
  'Admin Settings must read the authoritative database');
assert.match(settings, /new AuthMiddleware\(\['admin'\]\)/,
  'Admin Settings access control must remain unchanged');
assert.match(helpers, /return array_flip\(\$holidays\)/,
  'Holiday map is recomputed from fresh database rows');
assert.match(helpers, /return array_map\('trim', explode\(',', strtolower\(\$weekOff\)\)\)/,
  'Week-off lookup must return fresh database values');
assert.match(maintenance, /SELECT maintenance_mode FROM public\.global_settings/,
  'Maintenance authorization must always use direct database state');
assert.match(index, /withHeader\('Cache-Control', 'no-store'\)/,
  'HRMS API responses must retain the SEC-021 no-store policy');
assert.match(proxy, /withHeader\('Cache-Control', 'no-store'\)/,
  'Public file proxy responses must prevent browser cache retention');
assert.match(proxy, /withHeader\('Pragma', 'no-cache'\)/,
  'Legacy HTTP clients must avoid proxy response caching');
assert.doesNotMatch(proxy, /ETag|HTTP_IF_NONE_MATCH|HTTP_IF_MODIFIED_SINCE|max-age|\b304\b/,
  'Public file proxy must not return client-cached data using conditional responses');

const opcache = read('docker/php/opcache.ini');
assert.match(opcache, /opcache\.enable=1/,
  'PHP code bytecode optimization remains enabled; it does not cache business data');
assert.match(read('Dockerfile'), /docker-php-ext-install pdo pdo_pgsql curl opcache/,
  'The SQL driver and code-only OPcache must remain installed');
assert.doesNotMatch(read('Dockerfile'), /docker-php-ext-install apcu/,
  'No new shared business data-cache extension');

console.log('Backend business-data and HTTP proxy cache removal policy PASS');
