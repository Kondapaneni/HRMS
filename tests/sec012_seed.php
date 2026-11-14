<?php
declare(strict_types=1);

// SEC-012 destructive fixture: hard-block any real database.
if (getenv('DB_DATABASE') !== 'sec012_test'
    || !str_starts_with((string)getenv('JWT_SECRET'), 'SEC012_TEST_ONLY_')) {
    fwrite(STDERR, "SEC-012 refused non-test database or signing secret\n");
    exit(1);
}
$pdo = new PDO(
    'pgsql:host=127.0.0.1;port=' . (getenv('DB_PORT') ?: '5432') . ';dbname=sec012_test',
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$pdo->exec(<<<'SQL'
CREATE TABLE public.users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    "firstName" TEXT, "lastName" TEXT, role TEXT NOT NULL,
    department TEXT, position TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT FALSE,
    "themePreference" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
    token_version INTEGER NOT NULL DEFAULT 0,
    otp_code TEXT, otp_expires_at TIMESTAMP,
    reset_token TEXT, reset_token_expires TIMESTAMP
);
CREATE TABLE public.global_settings (
    id INTEGER PRIMARY KEY,
    login_rate_limit_attempts INTEGER NOT NULL DEFAULT 5,
    login_rate_limit_window INTEGER NOT NULL DEFAULT 15,
    session_timeout TEXT NOT NULL DEFAULT 'never',
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    news_headlines TEXT DEFAULT '[]',
    admin_avatar TEXT,
    tracking_interval_minutes INTEGER DEFAULT 15
);
CREATE TABLE public.rate_limits (
    id SERIAL PRIMARY KEY, ip_address TEXT, action TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.mfa_secrets (user_id TEXT PRIMARY KEY, secret TEXT, confirmed BOOLEAN DEFAULT FALSE);
CREATE TABLE public.user_feature_access (
    "userId" TEXT PRIMARY KEY,
    "canAttendance" BOOLEAN DEFAULT FALSE, "canLeave" BOOLEAN DEFAULT FALSE,
    "canPayroll" BOOLEAN DEFAULT FALSE, "canExpenses" BOOLEAN DEFAULT FALSE,
    "canEmployees" BOOLEAN DEFAULT FALSE, "canRecruitment" BOOLEAN DEFAULT FALSE,
    "canAssets" BOOLEAN DEFAULT FALSE, "canLoanOrigination" BOOLEAN DEFAULT FALSE,
    "canSalesOrigination" BOOLEAN DEFAULT FALSE, "canBranchOperations" BOOLEAN DEFAULT FALSE,
    "canAdminAssessments" BOOLEAN DEFAULT FALSE
);
CREATE TABLE public.employee (
    "userId" TEXT PRIMARY KEY, avatar TEXT, "employeeId" TEXT,
    "geoFenceEnabled" BOOLEAN DEFAULT FALSE, "webAttendanceEnabled" BOOLEAN DEFAULT FALSE
);
CREATE TABLE public.email_queue (
    id SERIAL PRIMARY KEY, to_email TEXT, subject TEXT, body TEXT
);
INSERT INTO public.global_settings (id, session_timeout, maintenance_mode) VALUES (1, 'never', FALSE);
SQL);
$users = [
    ['sec012-employee', 'sec012-employee@example.invalid', 'employee', 'SEC012-Initial-Password1!'],
    ['sec012-candidate', 'sec012-candidate@example.invalid', 'candidate', 'SEC012-Candidate-Password1!'],
    ['sec012-admin', 'sec012-admin@example.invalid', 'admin', 'SEC012-Admin-Password1!'],
];
$u = $pdo->prepare('INSERT INTO public.users (id, email, role, password, "firstName", "lastName", reset_token, reset_token_expires) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL \'1 hour\')');
$f = $pdo->prepare('INSERT INTO public.user_feature_access ("userId") VALUES (?)');
$e = $pdo->prepare('INSERT INTO public.employee ("userId") VALUES (?)');
foreach ($users as [$id,$email,$role,$password]) {
    $u->execute([$id,$email,$role,password_hash($password,PASSWORD_DEFAULT),'Sec012','Test','sec012-reset-'.$id]);
    $f->execute([$id]);
    if ($role !== 'candidate') $e->execute([$id]);
}
echo "SEC-012 isolated PostgreSQL fixture ready\n";
