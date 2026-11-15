<?php
declare(strict_types=1);

// SEC-014: NEVER create or modify fixtures in a development or production HRMS DB.
if ((getenv('DB_DATABASE') ?: '') !== 'sec014_test') {
    fwrite(STDERR, "Refusing SEC-014 fixture seed outside sec014_test\n");
    exit(1);
}
$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec014_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec(<<<'SQL'
CREATE TABLE global_settings (
 id integer primary key, maintenance_mode boolean default false,
 login_rate_limit_attempts integer default 5, login_rate_limit_window integer default 15,
 forgot_password_rate_limit_attempts integer default 3, forgot_password_rate_limit_window integer default 60,
 maps_rate_limit_attempts integer default 5, maps_rate_limit_window integer default 10,
 session_timeout text default 'never'
);
INSERT INTO global_settings (id) VALUES (1);
CREATE TABLE users (
 id uuid primary key, role text not null, email text, password text,
 "isActive" boolean default true, token_version integer default 0,
 "firstName" text, "lastName" text, department text, position text,
 "forcePasswordChange" boolean default false, "themePreference" text, "mfaEnabled" boolean default false,
 otp_code text, otp_expires_at timestamp, reset_token text, reset_token_expires timestamp
);
CREATE TABLE rate_limits (
 id bigserial primary key, ip_address text, action text,
 created_at timestamp default CURRENT_TIMESTAMP
);
CREATE TABLE employee (
 "userId" uuid primary key, "shiftTime" text, "geoFenceEnabled" boolean default false
);
CREATE TABLE shift_times ("shiftLabel" text, "startTime" time, "endTime" time);
CREATE TABLE geofences (
 id integer generated always as identity primary key,
 name text, latitude numeric, longitude numeric, radius numeric
);
CREATE TABLE attendance (
 id uuid primary key default gen_random_uuid(), "employeeId" uuid, date date,
 status text, "checkIn" timestamp, "checkOut" timestamp, hours numeric,
 "isRegularized" boolean default false, "checkInPhoto" text,
 "checkOutPhoto" text, "checkInLat" numeric, "checkInLng" numeric,
 "checkInAddress" text, "checkOutLat" numeric, "checkOutLng" numeric,
 "checkOutAddress" text, "updatedAt" timestamp
);
CREATE TABLE attendance_punches (
 id uuid primary key default gen_random_uuid(),
 "attendanceId" uuid, "employeeId" uuid, "punchTime" timestamp,
 latitude numeric, longitude numeric, address text, photo text
);
CREATE TABLE leaves (id uuid, "employeeId" uuid, status text, "startDate" date, "endDate" date);
CREATE TABLE email_queue (to_email text, subject text, body text);
SQL);

$ids = [
 'fenced' => '00000000-0000-4000-8000-000000000141',
 'remote' => '00000000-0000-4000-8000-000000000142',
 'second' => '00000000-0000-4000-8000-000000000143',
];
$insertUser = $pdo->prepare('INSERT INTO users (id,role,email,password,"firstName") VALUES (?,?,?, ?, ?)');
$insertEmp = $pdo->prepare('INSERT INTO employee ("userId","shiftTime","geoFenceEnabled") VALUES (?, ?, ?)');
foreach ($ids as $name => $id) {
    $insertUser->execute([$id, 'employee', $name . '@example.invalid', password_hash('SEC014-test-only', PASSWORD_DEFAULT), $name]);
    $insertEmp->execute([$id, null, $name === 'remote' ? 'false' : 'true']);
}
$pdo->exec("INSERT INTO geofences (name,latitude,longitude,radius) VALUES ('Synthetic Office',16.500000,80.600000,250)");
echo "SEC-014 isolated attendance / rate-limit fixtures seeded\n";
