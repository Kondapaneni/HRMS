<?php
declare(strict_types=1);

// PERF-008 bounded concurrency worker. Only GitHub CI with a disposable local
// Postgres/PgBouncer fixture is permitted. No production endpoints or user data.
$required = [
    'GITHUB_ACTIONS' => 'true',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '6432',
    'DB_DATABASE' => 'perf008_capacity_ci',
    'DB_USERNAME' => 'perf008_ci',
    'DB_PASSWORD' => 'PERF008_SYNTHETIC_PG_ONLY',
    'DB_PDO_PREPARE_MODE' => 'pooler',
    'SEC018_NATIVE_SESSION_ENABLED' => 'false',
];
foreach ($required as $key => $expected) {
    if (getenv($key) !== $expected) {
        fwrite(STDERR, "REFUSED PERF-008 capacity worker: unexpected {$key}\n");
        exit(2);
    }
}
foreach (['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY',
          'SEC018_DB_USE_RESTRICTED', 'SEC018_AUDIT_CONTEXT_ENABLED'] as $key) {
    if (getenv($key) && getenv($key) !== 'false') {
        fwrite(STDERR, "REFUSED PERF-008 capacity worker: external/privileged setting {$key}\n");
        exit(2);
    }
}
foreach ($required as $key => $expected) $_ENV[$key] = $expected;
$_ENV['SEC018_DB_USE_RESTRICTED'] = 'false';
$_ENV['SEC018_AUDIT_CONTEXT_ENABLED'] = 'false';
require_once dirname(__DIR__) . '/backend/vendor/autoload.php';

use App\Config\Database;
use App\Config\LoggingPDO;

$started = hrtime(true);
$conn = (new Database())->getConnection();
if (!$conn instanceof LoggingPDO) {
    fwrite(STDERR, "FAIL PERF-008: pooler connection unavailable\n");
    exit(1);
}
if ($conn->getAttribute(PDO::ATTR_EMULATE_PREPARES) !== true
    || $conn->query('SELECT current_user')->fetchColumn() !== 'perf008_ci') {
    fwrite(STDERR, "FAIL PERF-008: unsafe prepare mode or unexpected identity\n");
    exit(1);
}
$backends = [];
for ($i = 0; $i < 4; $i++) {
    $stmt = $conn->query('SELECT pg_backend_pid() AS pid, pg_sleep(0.025)');
    $backends[] = (int) $stmt->fetchColumn();
}
if (min($backends) <= 0) {
    fwrite(STDERR, "FAIL PERF-008: invalid backend PID\n");
    exit(1);
}
echo json_encode(['elapsed_ms' => round((hrtime(true) - $started) / 1e6, 1),
  'backend_pids' => array_values(array_unique($backends))], JSON_THROW_ON_ERROR), "\n";
