<?php
declare(strict_types=1);

/**
 * SEC-008 synthetic integration test fixture.
 * Run ONLY against the isolated GitHub Actions PostgreSQL service.
 * Never execute against production: this script creates test tables.
 */
$dsn = 'pgsql:host=' . ($_ENV['DB_HOST'] ?? getenv('DB_HOST') ?: '127.0.0.1')
    . ';port=' . ($_ENV['DB_PORT'] ?? getenv('DB_PORT') ?: '5432')
    . ';dbname=' . ($_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: 'sec008_test');
$dbName = $_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE') ?: '';
if ($dbName !== 'sec008_test') {
    fwrite(STDERR, "Refusing to seed a non-test database\n");
    exit(1);
}

$pdo = new PDO($dsn, $_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME') ?: 'postgres',
    $_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD') ?: '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(<<<'SQL'
CREATE TABLE users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT,
    "firstName" TEXT, "lastName" TEXT, role TEXT, department TEXT,
    position TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false,
    "themePreference" TEXT DEFAULT 'light',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    otp_code TEXT, otp_expires_at TIMESTAMP
);
CREATE TABLE mfa_secrets (
    user_id TEXT PRIMARY KEY, secret TEXT NOT NULL,
    confirmed BOOLEAN NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE mfa_backup_codes (
    id SERIAL PRIMARY KEY, user_id TEXT, code_hash TEXT,
    used BOOLEAN NOT NULL DEFAULT false, used_at TIMESTAMP
);
CREATE TABLE global_settings (
    id INTEGER PRIMARY KEY, session_timeout TEXT,
    login_rate_limit_attempts INTEGER, login_rate_limit_window INTEGER
);
CREATE TABLE rate_limits (
    id SERIAL PRIMARY KEY, ip_address TEXT, action TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_feature_access (
    "userId" TEXT PRIMARY KEY, "canAttendance" BOOLEAN DEFAULT false,
    "canLeave" BOOLEAN DEFAULT false, "canPayroll" BOOLEAN DEFAULT false,
    "canExpenses" BOOLEAN DEFAULT false, "canEmployees" BOOLEAN DEFAULT false,
    "canRecruitment" BOOLEAN DEFAULT false, "canAssets" BOOLEAN DEFAULT false,
    "canLoanOrigination" BOOLEAN DEFAULT false,
    "canSalesOrigination" BOOLEAN DEFAULT false,
    "canBranchOperations" BOOLEAN DEFAULT false,
    "canAdminAssessments" BOOLEAN DEFAULT false
);
INSERT INTO global_settings VALUES (1, '30', 5, 15);
SQL);

$users = [
    ['sec008-admin@example.invalid', 'admin', 'true', '654321'],
    ['sec008-employee@example.invalid', 'employee', 'false', '123456'],
];
$stmt = $pdo->prepare(<<<'SQL'
INSERT INTO users (
    id, email, password, "firstName", "lastName", role, "mfaEnabled",
    otp_code, otp_expires_at
) VALUES (?, ?, ?, 'Security', 'Test', ?, ?::boolean, ?, CURRENT_TIMESTAMP + INTERVAL '10 minutes')
SQL);
foreach ($users as $i => [$email, $role, $mfaEnabled, $otp]) {
    $stmt->execute([
        'sec008-user-' . $i, $email,
        password_hash('SEC008-Test-Password-Only!', PASSWORD_DEFAULT),
        $role, $mfaEnabled, $otp
    ]);
    $pdo->prepare('INSERT INTO user_feature_access ("userId") VALUES (?)')
        ->execute(['sec008-user-' . $i]);
}
$pdo->exec("INSERT INTO mfa_secrets (user_id, secret, confirmed)
    VALUES ('sec008-user-0', 'JBSWY3DPEHPK3PXP', true)");
echo "Isolated SEC-008 integration fixtures seeded\n";
