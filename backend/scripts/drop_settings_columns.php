<?php
require __DIR__ . '/../vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$db = new Database();
$conn = $db->getConnection();

try {
    $conn->exec('
        ALTER TABLE global_settings 
        DROP COLUMN IF EXISTS company_name, 
        DROP COLUMN IF EXISTS company_email, 
        DROP COLUMN IF EXISTS company_phone, 
        DROP COLUMN IF EXISTS address, 
        DROP COLUMN IF EXISTS email_notifications, 
        DROP COLUMN IF EXISTS slack_notifications;
    ');
    echo "Columns dropped successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
