<?php
declare(strict_types=1);
if (getenv('DB_DATABASE') !== 'sec012_test'
    || !str_starts_with((string)getenv('JWT_SECRET'), 'SEC012_TEST_ONLY_')) exit(1);
require __DIR__ . '/../backend/vendor/autoload.php';
$now = time();
echo Firebase\JWT\JWT::encode([
    'iss' => 'acme_hrms', 'iat' => $now,
    'exp' => $now + 365 * 24 * 3600,
    'id' => 'sec012-admin', 'email' => 'sec012-admin@example.invalid',
    'role' => 'admin', 'type' => 'session', 'tv' => 0,
], (string)getenv('JWT_SECRET'), 'HS256');
