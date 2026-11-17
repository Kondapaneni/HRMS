<?php
declare(strict_types=1);
// Test-only extraction of synthetic OTP mail to exercise the real HTTP flow.
if (getenv('DB_DATABASE') !== 'sec012_test'
    || !str_starts_with((string)getenv('JWT_SECRET'), 'SEC012_TEST_ONLY_')) {
    fwrite(STDERR, "Refusing to access a non-SEC012 test database\n");
    exit(1);
}
$pdo = new PDO(
    'pgsql:host=127.0.0.1;port=' . (getenv('DB_PORT') ?: '5432') . ';dbname=sec012_test',
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$row = $pdo->query("SELECT u.otp_code, q.subject FROM public.users u
    JOIN public.email_queue q ON q.to_email = u.email
    WHERE u.id = 'sec012-employee'
    ORDER BY q.id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$row || !preg_match('/\A([0-9]{6}) is your /', (string)$row['subject'], $match)) {
    fwrite(STDERR, "Synthetic OTP not queued\n"); exit(1);
}
echo json_encode(['code' => $match[1], 'digest' => $row['otp_code']]);
