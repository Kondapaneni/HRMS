import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const docker = read('Dockerfile');
const ini = read('docker/php/opcache.ini');
const entry = read('docker-entrypoint.sh');
const db = read('backend/src/Config/Database.php');
const cache = read('backend/src/Utils/Cache.php');

assert.match(docker, /docker-php-ext-install pdo pdo_pgsql curl opcache/, 'PHP Docker image must compile OPcache');
assert.match(docker, /COPY docker\/php\/opcache\.ini \/usr\/local\/etc\/php\/conf\.d\/zz-perf008-opcache\.ini/, 'OPcache settings must be loaded by Apache');
assert.match(docker, /RUN php -r .*Zend OPcache.*opcache\.validate_timestamps/, 'Build must fail closed when OPcache configuration is absent');
for (const [key, expected] of Object.entries({
  'opcache.enable': '1',
  'opcache.enable_cli': '0',
  'opcache.memory_consumption': '128',
  'opcache.interned_strings_buffer': '16',
  'opcache.max_accelerated_files': '10000',
  'opcache.validate_timestamps': '0',
  'opcache.save_comments': '1',
  'opcache.jit_buffer_size': '0',
})) {
  assert(ini.split(/\r?\n/).some(line => line.trim() === key + '=' + expected), 'Missing OPcache policy: ' + key);
}
assert.match(entry, /PERF008_DB_ENDPOINT_HINT=\$\{perf008_db_endpoint_hint\}/, 'Startup must report safe pooler hint');
assert.match(entry, /SEC018_NATIVE_SESSION_ENABLED/, 'Mode hint must respect SEC-018 session override');
assert.match(entry, /6543\) perf008_db_endpoint_hint="transaction-pooler"/, 'Recognize transaction pooler');
assert.match(entry, /5432\) perf008_db_endpoint_hint="session-pooler"/, 'Recognize session pooler');
assert(!/echo [^\n]*\$\{?(?:DB_PASSWORD|DB_HOST|DB_USERNAME|JWT_SECRET|SEC018_DB_PASSWORD)/.test(entry), 'Never log sensitive DB settings');
assert(db.includes("getenv('DB_PDO_PREPARE_MODE') ?: 'pooler'") &&
  db.includes('PDO::ATTR_EMULATE_PREPARES, $prepareMode !== \'native\'') &&
  db.includes("self::$conn->query('SELECT current_user')->fetchColumn()") &&
  db.includes("if ($prepareMode === 'native' && (int) $port === 6543)"), 'Preserve SEC-018 pooler-safe prepare mode and mandatory role check');
assert(!docker.includes('docker-php-ext-install apcu'), 'Do not silently enable mutable/shared business cache without security review');
assert(cache.includes("function_exists('apcu_fetch')"), 'Preserve the current disabled-by-default data cache');
console.log('PASS PERF-008: OPcache image, redacted pooler startup diagnostics and SEC-018 compatibility');
