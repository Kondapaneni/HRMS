<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Config\Database;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = new Database();
$conn = $db->getConnection();

try {
    $conn->exec('ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "isSystemMessage" BOOLEAN DEFAULT FALSE');
    echo "Column isSystemMessage added successfully.\n";
} catch (\PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
