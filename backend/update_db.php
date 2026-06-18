<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = new App\Config\Database();
$pdo = $db->getConnection();

try {
    // Add columns
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP DEFAULT NULL");
    
    echo "Columns added successfully.\n";

} catch (PDOException $e) {
    echo "Query failed: " . $e->getMessage() . "\n";
}
