<?php
declare(strict_types=1);

// Destructive fixture: never run against a production/development database.
if (($_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '') !== 'sec010_test') {
    fwrite(STDERR, "SEC-010 refused non-test database\n");
    exit(1);
}

$pdo = new PDO(
    'pgsql:host=' . ($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1')
      . ';port=' . ($_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432')
      . ';dbname=sec010_test',
    $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: 'postgres',
    $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$featureColumns = [
    'canAttendance', 'canLeave', 'canPayroll', 'canExpenses',
    'canEmployees', 'canRecruitment', 'canAssets', 'canLoanOrigination',
    'canSalesOrigination', 'canBranchOperations', 'canAdminAssessments'
];
$definitions = implode(', ', array_map(
    static fn(string $column): string => "\"{$column}\" BOOLEAN NOT NULL DEFAULT FALSE",
    $featureColumns
));
$pdo->exec('CREATE TABLE users (id TEXT PRIMARY KEY, role TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE)');
$pdo->exec("CREATE TABLE user_feature_access (\"userId\" TEXT PRIMARY KEY, {$definitions})");

$users = [
    ['sec010-admin', 'admin', true],
    ['sec010-candidate', 'candidate', true],
    ['sec010-none', 'employee', true],
    ['sec010-all', 'employee', true],
    ['sec010-loans', 'employee', true],
    ['sec010-hr', 'hr', true],
    ['sec010-manager', 'manager', true],
    ['sec010-disabled', 'employee', false],
    ['sec010-no-row', 'employee', true],
];
$userStmt = $pdo->prepare('INSERT INTO users (id, role, "isActive") VALUES (?, ?, ?::boolean)');
foreach ($users as [$id, $role, $active]) {
    $userStmt->execute([$id, $role, $active ? 'true' : 'false']);
}
$quoted = implode(', ', array_map(static fn($c) => "\"{$c}\"", $featureColumns));
$placeholders = implode(', ', array_fill(0, count($featureColumns) + 1, '?'));
$grantsStmt = $pdo->prepare("INSERT INTO user_feature_access (\"userId\", {$quoted}) VALUES ({$placeholders})");
foreach ($users as [$id]) {
    if ($id === 'sec010-no-row') {
        continue;
    }
    $allowed = match ($id) {
        'sec010-candidate', 'sec010-all' => $featureColumns,
        'sec010-loans', 'sec010-disabled' => ['canLoanOrigination'],
        'sec010-hr' => ['canAttendance'],
        'sec010-manager' => ['canBranchOperations'],
        default => []
    };
    $values = array_map(
        static fn($c) => in_array($c, $allowed, true) ? 'true' : 'false',
        $featureColumns
    );
    $grantsStmt->execute(array_merge([$id], $values));
}
echo "SEC-010 isolated full feature-permission schema seeded\n";
