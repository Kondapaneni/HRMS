<?php
require __DIR__ . '/../vendor/autoload.php';
use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->safeLoad();
require_once __DIR__ . '/../src/Config/Database.php';

$db = new Database();
$conn = $db->getConnection();

try {
    $conn->beginTransaction();
    
    // Drop the keys table
    $conn->exec('DROP TABLE IF EXISTS user_public_keys CASCADE');
    
    // Alter chat_messages
    $conn->exec('ALTER TABLE chat_messages DROP COLUMN IF EXISTS "encryptedPayload"');
    $conn->exec('ALTER TABLE chat_messages DROP COLUMN IF EXISTS "encryptedSymmetricKeys"');
    $conn->exec('ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS content TEXT');
    
    $conn->commit();
    echo "Successfully removed E2EE schema from database.\n";
} catch (Exception $e) {
    $conn->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
