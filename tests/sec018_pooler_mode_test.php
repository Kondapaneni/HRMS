<?php
declare(strict_types=1);

// Pooler compatibility smoke test; can only run against synthetic local CI DB.
if ((getenv('DB_DATABASE') ?: '') !== 'sec014_test'
    || (getenv('DB_HOST') ?: '') !== '127.0.0.1'
    || (getenv('DB_PORT') ?: '') !== '5432'
    || (getenv('DB_USERNAME') ?: '') !== 'postgres'
    || (getenv('DB_PASSWORD') ?: '') !== 'sec014_synthetic_only') {
    fwrite(STDERR, "Refusing SEC-018 pooler test outside isolated CI PostgreSQL\n");
    exit(1);
}
require dirname(__DIR__) . '/backend/vendor/autoload.php';

// PHP CLI does not necessarily populate $_ENV (variables_order can omit E).
// The application factory reads $_ENV, so transfer only synthetic CI settings.
foreach (['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'] as $name) {
    $_ENV[$name] = (string) getenv($name);
}

// Simulate Render DEV with no newly configured prepare-mode environment var.
// Do not overwrite the parent process environment (the next CI test uses native).
unset($_ENV['DB_PDO_PREPARE_MODE']);
putenv('DB_PDO_PREPARE_MODE');
$conn = (new App\Config\Database())->getConnection();
if (!$conn instanceof PDO || !$conn->getAttribute(PDO::ATTR_EMULATE_PREPARES)) {
    throw new RuntimeException('Default PDO must avoid server prepared statements in pooler mode');
}
for ($i = 0; $i < 4; $i++) {
    $query = $conn->query('SELECT 1 AS value');
    if ((int) $query->fetchColumn() !== 1) {
        throw new RuntimeException('Repeated ordinary SELECT must work in pooler mode');
    }
    $stmt = $conn->prepare('SELECT ?::integer + ?::integer');
    $stmt->execute([$i, 3]);
    if ((int) $stmt->fetchColumn() !== $i + 3) {
        throw new RuntimeException('Bound parameters must work in pooler mode');
    }
}
echo "PASS SEC-018 pooler-mode PDO: default emulated prepares, no session-only statement names\n";
