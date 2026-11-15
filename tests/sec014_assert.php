<?php
declare(strict_types=1);
if ((getenv('DB_DATABASE') ?: '') !== 'sec014_test') {
    fwrite(STDERR, "Refusing SEC-014 assertions outside sec014_test\n");
    exit(1);
}
$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec014_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
function requireCheck(bool $okay, string $label): void {
    if (!$okay) throw new RuntimeException($label);
}
$fenced = '00000000-0000-4000-8000-000000000141';
$remote = '00000000-0000-4000-8000-000000000142';
$second = '00000000-0000-4000-8000-000000000143';
$attStmt = $pdo->prepare('SELECT "checkInLat", "checkInLng", "checkOutLat", "checkOutLng", "checkIn", "checkOut" FROM attendance WHERE "employeeId" = ?');
$attStmt->execute([$fenced]);
$fencedRecords = $attStmt->fetchAll(PDO::FETCH_ASSOC);
requireCheck(count($fencedRecords) === 1, 'Outside/missing locations must not create another attendance record');
requireCheck(abs((float)$fencedRecords[0]['checkInLat'] - 16.5001) < 0.00001, 'Blocked offsite check-in did not change location');
requireCheck(abs((float)$fencedRecords[0]['checkOutLat'] - 16.5001) < 0.00001, 'Blocked offsite check-out did not change location');
requireCheck(!empty($fencedRecords[0]['checkIn']) && !empty($fencedRecords[0]['checkOut']), 'Authorized check-in/out persisted');
$attStmt->execute([$remote]);
$rem = $attStmt->fetchAll(PDO::FETCH_ASSOC);
requireCheck(count($rem) === 1 && abs((float)$rem[0]['checkInLat'] - 17.1) < 0.00001, 'Explicitly remote-eligible employee can use remote attendance');
$attStmt->execute([$second]);
requireCheck(count($attStmt->fetchAll(PDO::FETCH_ASSOC)) === 0, 'Map-only account has no attendance');
$punches = $pdo->query('SELECT "employeeId",latitude FROM attendance_punches')->fetchAll(PDO::FETCH_ASSOC);
requireCheck(count($punches) === 1 && $punches[0]['employeeId'] === $fenced, 'One roaming background interval punch retained');
requireCheck((int)$pdo->query('SELECT COUNT(*) FROM email_queue')->fetchColumn() === 0, 'Tests must not send or queue account emails');
$stored = $pdo->query('SELECT DISTINCT ip_address FROM rate_limits')->fetchAll(PDO::FETCH_COLUMN);
requireCheck(count($stored) > 2, 'Credential and map limits persisted scoped keys');
foreach ($stored as $key) {
    requireCheck(!str_contains((string)$key, '@'), 'Account address must not appear in rate_limits');
    requireCheck(!str_contains((string)$key, '198.51.100.'), 'Spoofed XFF must not appear in rate_limits');
}
requireCheck(count(array_filter($stored, static fn($k) => str_starts_with((string)$k, 'acct:'))) >= 4, 'Credential account-specific counters recorded');
requireCheck(count(array_filter($stored, static fn($k) => str_starts_with((string)$k, 'user:'))) === 1, 'Maps per-account tracking only for the tested limited employee');
echo "PASS SEC-014 isolated SQL postconditions, no unauthorized attendance writes, no emails, no spoofed IPs\n";
