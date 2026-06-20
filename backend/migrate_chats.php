<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Config\Database;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = new Database();
$conn = $db->getConnection();

try {
    $conn->exec('ALTER TABLE chats ADD COLUMN pending_participants JSONB DEFAULT \'[]\'::jsonb');
    echo "Column pending_participants added successfully.\n";
} catch (\PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "Column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
