<?php
declare(strict_types=1);
if ((getenv('DB_DATABASE') ?: '') !== 'sec014_test') {
    fwrite(STDERR, "Refusing SEC-014 policy test outside sec014_test\n");
    exit(1);
}
require __DIR__ . '/../backend/vendor/autoload.php';
use App\Security\AttendanceGeofence;
use App\Utils\RateLimiter;
function check(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException($message);
}
$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.24, 198.51.100.2';
$_SERVER['HTTP_CLIENT_IP'] = '203.0.113.18';
check(RateLimiter::getClientIp() === '127.0.0.1', 'Spoofed forwarding IP must be ignored');
$_SERVER['HTTP_X_FORWARDED_FOR'] = '1.2.3.4';
check(RateLimiter::getClientIp() === '127.0.0.1', 'XFF rotation must not change socket identity');
check(RateLimiter::accountKey(' Alice@Example.Invalid ') === RateLimiter::accountKey('alice@example.invalid'), 'Case and whitespace normalized');
check(!str_contains(RateLimiter::accountKey('alice@example.invalid'), '@'), 'No email PII in rate key');
check(RateLimiter::userKey('user1') !== RateLimiter::userKey('user2'), 'Map limiter scopes user identity');

check(AttendanceGeofence::coordinates(null, null) === [null, null], 'Optional location allowed without configured gate');
[$lat, $lng] = AttendanceGeofence::coordinates('16.5000', '80.6000');
check($lat === 16.5 && $lng === 80.6, 'Valid numeric location accepted');
foreach ([[100, 80], [0, 190], ['NaN', '0'], [[1], 80], [true, 80], [16.5, null], [INF, 80]] as [$la, $lo]) {
    try {
        AttendanceGeofence::coordinates($la, $lo);
        throw new RuntimeException('Invalid coordinates accepted');
    } catch (InvalidArgumentException $e) {
        // expected
    }
}
check(AttendanceGeofence::distanceMeters(16.5, 80.6, 16.5, 80.6) < 0.001, 'Zero-distance Haversine');
check(AttendanceGeofence::distanceMeters(16.5, 80.6, 16.51, 80.6) > 1000, 'Meter-based Haversine');

$pdo = new PDO(sprintf('pgsql:host=%s;port=%s;dbname=sec014_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'), getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$fenced = '00000000-0000-4000-8000-000000000141';
$remote = '00000000-0000-4000-8000-000000000142';

check(AttendanceGeofence::permits($pdo, $fenced, 'check-in', 16.5, 80.6), 'Inside enabled geofence accepted');
check(AttendanceGeofence::permits($pdo, $fenced, 'check-out', 16.5, 80.6), 'Inside geofence checkout accepted');
check(!AttendanceGeofence::permits($pdo, $fenced, 'check-in', 16.51, 80.6), 'Outside geofence denied');
check(!AttendanceGeofence::permits($pdo, $fenced, 'check-in', null, null), 'Missing location denied when enabled');
check(AttendanceGeofence::permits($pdo, $remote, 'check-in', null, null), 'Remote-eligible employee check-in accepted');
check(AttendanceGeofence::permits($pdo, $fenced, 'punch', 16.51, 80.6), 'Roaming interval punch preserved');
check(!AttendanceGeofence::permits($pdo, '00000000-0000-4000-8000-000000000149', 'check-in', 16.5, 80.6), 'Missing employee denied');

$pdo->beginTransaction();
try {
    $pdo->exec('DELETE FROM geofences');
    check(!AttendanceGeofence::permits($pdo, $fenced, 'check-in', 16.5, 80.6), 'Enabled with empty geofences must fail closed');
    check(AttendanceGeofence::permits($pdo, $remote, 'check-in', 16.5, 80.6), 'Explicit geofence OFF still works');
} finally {
    $pdo->rollBack();
}
echo "PASS SEC-014 policy unit and PostgreSQL Haversine, no-office and remote-interval checks\n";
