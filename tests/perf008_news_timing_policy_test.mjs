import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const index = readFileSync('backend/public/index.php', 'utf8');
const db = readFileSync('backend/src/Config/Database.php', 'utf8');
const start = index.indexOf("$app->get('/api/news'");
const end = index.indexOf("$app->get('/api/me'", start);
assert(start >= 0 && end > start, 'News and profile routes must exist');
const route = index.slice(start, end);

assert(route.includes("PERF008_NEWS_TIMING_ENABLED")
  && route.includes("getenv('PERF008_NEWS_TIMING_ENABLED')")
  && route.includes("=== 'true'"),
  'News timing must require explicit environment opt-in (off by default)');
assert(route.includes("array_key_exists('perf_probe', $request->getQueryParams())"),
  'News timing must also require an explicit request probe');
assert(route.includes('$perf008TimingEnabled ? hrtime(true) : null'),
  'Monotonic timing must be inactive for normal requests');

const ordered = [
  '$perf008StartNs =',
  '$perf008DbStages = $perf008TimingEnabled ? [] : null;',
  '$conn = $db->getConnection($perf008DbStages);',
  '$perf008AfterConnectionNs =',
  "$stmt = $conn->query('SELECT news_headlines, maintenance_mode, maintenance_message, tracking_interval_minutes FROM global_settings ORDER BY id ASC LIMIT 1');",
  '$settings = $stmt->fetch(PDO::FETCH_ASSOC);',
  '$perf008AfterQueryNs = hrtime(true);',
  "error_log(sprintf(",
];
let previous = -1;
for (const fragment of ordered) {
  const pos = route.indexOf(fragment);
  assert(pos > previous, 'News timing step missing or out of order: ' + fragment);
  previous = pos;
}
assert(route.includes("'PERF008_NEWS connection_and_identity_ms=%.2f pdo_connect_ms=%.2f identity_check_ms=%.2f settings_query_ms=%.2f'"),
  'Log must contain only numeric bounded timing fields');
assert(route.includes('($perf008AfterConnectionNs - $perf008StartNs) / 1e6')
  && route.includes('($perf008AfterQueryNs - $perf008AfterConnectionNs) / 1e6'),
  'Separate connection/identity time from settings query/fetch time');
assert.match(route, /if \(\$perf008TimingEnabled && isset\([\s\S]*?\)\) \{\s*\$perf008AfterQueryNs = hrtime\(true\);/,
  'Logging must be gated to explicit probes');
assert(!route.includes('Set-Cookie') && !route.includes('Server-Timing'),
  'Measurements must never be exposed in response headers');
assert(!route.includes('error_log($request') && !route.includes('error_log($settings'),
  'Do not log requests or private response values');
assert(route.includes("'news_headlines' => $headlines")
  && route.includes("'maintenance_mode' => $maintenanceMode")
  && route.includes("'maintenance_message' => $maintenanceMessage")
  && route.includes("'tracking_interval_minutes' => $trackingIntervalMinutes")
  && route.includes("->withStatus(200)"),
  'Existing news/maintenance/attendance configuration response is preserved');
assert(db.includes("SELECT current_user")
  && db.includes("getConnection(?array &$perf008DbStages = null)"),
  'Connection stage includes mandatory database identity verification');
assert(db.includes("$perf008DbStages = [];")
  && db.includes("hrtime(true) - $perf008PdoStartNs")
  && db.includes("hrtime(true) - $perf008IdentityStartNs"),
  'PDO and identity stages must be separately measured on opt-in');
assert(db.indexOf("new LoggingPDO($dsn, $username, $password)") > db.indexOf("$perf008PdoStartNs =")
  && db.indexOf("new LoggingPDO($dsn, $username, $password)") < db.indexOf("['pdo_connect_ms']"),
  'PDO constructor is enclosed by monotonic timing');
assert(db.indexOf("self::$conn->query('SELECT current_user')->fetchColumn()") > db.indexOf("$perf008IdentityStartNs =")
  && db.indexOf("self::$conn->query('SELECT current_user')->fetchColumn()") < db.indexOf("['identity_check_ms']"),
  'SEC-018 identity query remains mandatory and measured separately');
assert(route.includes("$perf008DbStages['pdo_connect_ms']")
  && route.includes("$perf008DbStages['identity_check_ms']"),
  'Only numeric phase times are included in private probe log');
assert(!db.includes("error_log(sprintf("),
  'Database configuration must not produce new diagnostic logs itself');
console.log('PERF-008 opt-in /api/news connection-versus-query timing policy PASS');
