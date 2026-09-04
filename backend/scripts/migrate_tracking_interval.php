<?php
require 'c:/Users/HP/OneDrive/Desktop/Acme HRMS/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable('c:/Users/HP/OneDrive/Desktop/Acme HRMS/backend');
$dotenv->safeLoad();
use App\Config\Database;

$db = new Database();
$conn = $db->getConnection();

try {
    $conn->exec('ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS tracking_interval_minutes INTEGER DEFAULT 15;');
    
    // Ensure existing row has default if null
    $conn->exec('UPDATE global_settings SET tracking_interval_minutes = 15 WHERE tracking_interval_minutes IS NULL;');

    echo "Migration completed successfully!\n";
    $stmt = $conn->query('SELECT id, tracking_interval_minutes FROM global_settings LIMIT 1');
    print_r($stmt->fetch(PDO::FETCH_ASSOC));
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
