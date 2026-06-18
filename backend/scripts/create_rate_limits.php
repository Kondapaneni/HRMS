<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '5432';
$db_name = $_ENV['DB_DATABASE'] ?? 'postgres';
$username = $_ENV['DB_USERNAME'] ?? 'postgres';
$password = $_ENV['DB_PASSWORD'] ?? '';

try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$db_name}";
    $conn = new PDO($dsn, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = '
    CREATE TABLE IF NOT EXISTS rate_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address VARCHAR(45) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action ON rate_limits(ip_address, action);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at ON rate_limits(created_at);
    ';

    $conn->exec($sql);
    echo "Table rate_limits created successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
