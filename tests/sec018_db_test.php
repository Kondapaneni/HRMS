<?php
declare(strict_types=1);

// SEC-018: Synthetic ephemeral PostgreSQL only. No live DB writes.
if ((getenv('DB_DATABASE') ?: '') !== 'sec014_test'
    || !in_array((getenv('DB_HOST') ?: ''), ['127.0.0.1', 'localhost'], true)
    || (getenv('DB_PORT') ?: '') !== '5432'
    || (getenv('DB_USERNAME') ?: '') !== 'postgres'
    || (getenv('DB_PASSWORD') ?: '') !== 'sec014_synthetic_only') {
    fwrite(STDERR, "Refusing SEC-018 test outside isolated CI PostgreSQL\n");
    exit(1);
}
require dirname(__DIR__) . '/backend/vendor/autoload.php';
use App\Config\Database;
use App\Utils\HierarchyHelper;
function sec018Check(bool $value, string $label): void {
    if (!$value) throw new RuntimeException($label);
}
$dsn = 'pgsql:host=127.0.0.1;port=5432;dbname=sec014_test';
$admin = new PDO($dsn, 'postgres', 'sec014_synthetic_only', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$admin->exec('ALTER TABLE employee ADD COLUMN id uuid');
$admin->exec('ALTER TABLE employee ADD COLUMN department text');
$admin->exec('UPDATE employee SET id = "userId"');
$admin->exec("UPDATE employee SET department='HR' WHERE \"userId\" = '00000000-0000-4000-8000-000000000143'");
$admin->exec("CREATE ROLE sec018_runtime LOGIN PASSWORD 'SEC018_SYNTHETIC_DB_ONLY'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOINHERIT");
$admin->exec('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
$admin->exec('GRANT CONNECT ON DATABASE sec014_test TO sec018_runtime');
$admin->exec('GRANT USAGE ON SCHEMA public TO sec018_runtime');
$admin->exec('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sec018_runtime');
$admin->exec('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sec018_runtime');

// Exercise the actual application database factory as a non-owner/non-superuser.
$_ENV['DB_HOST'] = '127.0.0.1';
$_ENV['DB_PORT'] = '5432';
$_ENV['DB_DATABASE'] = 'sec014_test';
$_ENV['DB_USERNAME'] = 'sec018_runtime';
$_ENV['DB_PASSWORD'] = 'SEC018_SYNTHETIC_DB_ONLY';
$conn = (new Database())->getConnection();
sec018Check($conn instanceof PDO, 'Restricted runtime PDO must connect');
sec018Check(!$conn->getAttribute(PDO::ATTR_EMULATE_PREPARES), 'Native prepares required');
$identity = $conn->query('SELECT current_user AS name, rolsuper
    FROM pg_roles WHERE rolname = current_user')->fetch(PDO::FETCH_ASSOC);
sec018Check(($identity['name'] ?? '') === 'sec018_runtime', 'Expected restricted DB login');
sec018Check(in_array($identity['rolsuper'] ?? null, [false, 'f', 'false', 0, '0'], true),
    'Runtime DB login must not be superuser');
$q = $conn->prepare('SELECT ?::integer + ?::integer');
$q->execute([2, 3]);
sec018Check((int)$q->fetchColumn() === 5, 'Native positional SQL binding');
$userId = '00000000-0000-4000-8000-000000000143';
sec018Check(HierarchyHelper::isExempt($conn, (object)[
    'role' => 'employee', 'id' => $userId,
]), 'Hierarchy helper with distinct native named placeholders');
$conn->prepare('UPDATE users SET department = ? WHERE id = ?')
    ->execute(['Human Resources', $userId]);
$conn->prepare('UPDATE employee SET department = ? WHERE "userId" = ?')
    ->execute(['Sales', $userId]);
sec018Check(!HierarchyHelper::isExempt($conn, (object)[
    'role' => 'employee', 'id' => $userId,
]), 'Employee department must override stale users department');
$q = $conn->prepare('UPDATE users SET "mfaEnabled" = :flag WHERE id = :user_id');
$q->execute([':flag' => true, ':user_id' => $userId]);
sec018Check($q->rowCount() === 1, 'Restricted runtime can perform allowed MFA DML');
$alterDenied = false;
try {
    $conn->exec('ALTER TABLE users ADD COLUMN sec018_forbidden boolean');
} catch (PDOException $e) {
    $alterDenied = $e->getCode() === '42501';
}
sec018Check($alterDenied, 'Runtime DB role must not have ALTER TABLE');
$createDenied = false;
try {
    $conn->exec('CREATE TABLE sec018_forbidden (id integer)');
} catch (PDOException $e) {
    $createDenied = $e->getCode() === '42501';
}
sec018Check($createDenied, 'Runtime DB role must not have CREATE TABLE');
echo "PASS SEC-018 synthetic DB: native prepares, hierarchy, allowed writes, denied DDL\n";
