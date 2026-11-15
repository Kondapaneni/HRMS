<?php
declare(strict_types=1);

// SEC-016: Synthetic role fixtures only in ephemeral local CI PostgreSQL.
if ((getenv('DB_DATABASE') ?: '') !== 'sec014_test') {
    fwrite(STDERR, "Refusing SEC-016 role fixture outside sec014_test\n");
    exit(1);
}
$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec014_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres',
    getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$insert = $pdo->prepare('INSERT INTO users (id, role, email, password, "firstName") VALUES (?, ?, ?, ?, ?)');
foreach (['admin' => '00000000-0000-4000-8000-000000000161',
          'hr' => '00000000-0000-4000-8000-000000000162',
          'manager' => '00000000-0000-4000-8000-000000000163'] as $role => $id) {
    $insert->execute([$id, $role, $role . '@example.invalid', 'SYNTHETIC_DISABLED', $role]);
}
echo "SEC-016 synthetic Maps role fixtures seeded\n";
