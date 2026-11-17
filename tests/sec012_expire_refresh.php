<?php
declare(strict_types=1);
if (getenv('DB_DATABASE') !== 'sec012_test'
    || !str_starts_with((string)getenv('JWT_SECRET'), 'SEC012_TEST_ONLY_')
    || !isset($argv[1]) || !preg_match('/\A[0-9a-f-]{36}\z/', $argv[1])) exit(1);
$pdo = new PDO(
    'pgsql:host=127.0.0.1;port=' . (getenv('DB_PORT') ?: '5432') . ';dbname=sec012_test',
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: '',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$stmt = $pdo->prepare("UPDATE public.hrms_refresh_sessions SET expires_at = NOW() - INTERVAL '1 minute' WHERE id = ?");
$stmt->execute([$argv[1]]);
if ($stmt->rowCount() !== 1) exit(1);
