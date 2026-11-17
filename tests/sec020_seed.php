<?php
declare(strict_types=1);

// Destructive synthetic schema: hard-stop outside dedicated test DB.
$dbName = getenv('DB_DATABASE');
if ($dbName !== 'sec020_test') {
    fwrite(STDERR, "SEC-020 refused non-test database\n");
    exit(1);
}
$pdo = new PDO(
    'pgsql:host=127.0.0.1;port=' . (getenv('DB_PORT') ?: '5432') . ';dbname=sec020_test',
    getenv('DB_USERNAME') ?: 'postgres',
    getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('CREATE TABLE public.global_settings (id SERIAL PRIMARY KEY, maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE)');
$pdo->exec('INSERT INTO public.global_settings (maintenance_mode) VALUES (FALSE)');
$pdo->exec('CREATE TABLE public.users (id TEXT PRIMARY KEY, role TEXT NOT NULL, "isActive" BOOLEAN NOT NULL)');
$stmt = $pdo->prepare('INSERT INTO public.users (id, role, "isActive") VALUES (?, ?, ?::boolean)');
foreach ([
    ['sec020-admin', 'admin', 'true'],
    ['sec020-employee', 'employee', 'true'],
    ['sec020-demoted', 'employee', 'true'],
    ['sec020-disabled', 'admin', 'false'],
] as $row) {
    $stmt->execute($row);
}
echo "SEC-020 synthetic users and global settings seeded\n";
