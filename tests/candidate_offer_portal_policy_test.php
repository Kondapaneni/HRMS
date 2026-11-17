<?php
declare(strict_types=1);
// Only run against the synthetic SEC-015 database, after offer HTTP tests.
if ((getenv('DB_DATABASE') ?: '') !== 'sec015_test'
    || (getenv('DB_HOST') ?: '') !== '127.0.0.1') {
    fwrite(STDERR, "Refusing candidate offer policy test outside synthetic DB\n");
    exit(1);
}
require __DIR__ . '/../backend/vendor/autoload.php';
require __DIR__ . '/../backend/public/sec003_file_access.php';

$pdo = new PDO(
    'pgsql:host=127.0.0.1;dbname=sec015_test',
    getenv('DB_USERNAME') ?: 'postgres',
    getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$applicationId='00000000-0000-4000-8000-00000000b503';
$path=$applicationId . '/offer-12345678-1234-4123-8123-123456789abc-' . str_repeat('a',32) . '.pdf';
$owner=['id'=>'00000000-0000-4000-8000-00000000e504','role'=>'candidate'];
$other=['id'=>'00000000-0000-4000-8000-00000000e502','role'=>'candidate'];
$employee=['id'=>'00000000-0000-4000-8000-00000000e506','role'=>'employee'];

if (!sec003SafePath($path)
    || !sec003CanRead($pdo,$owner,'offer_letters',$path)
    || sec003CanRead($pdo,$other,'offer_letters',$path)
    || sec003CanRead($pdo,$employee,'offer_letters',$path)
    || sec003CanRead($pdo,$owner,'offer_letters',str_replace(str_repeat('a',32),str_repeat('b',32),$path))
    || !sec003CanRead($pdo,['id'=>'00000000-0000-4000-8000-00000000e501','role'=>'admin'],'offer_letters',$path)
) {
    throw new RuntimeException('Offer file access must match owning candidate application');
}
echo "PASS Candidate offer private-download ownership and cross-account denial\n";
