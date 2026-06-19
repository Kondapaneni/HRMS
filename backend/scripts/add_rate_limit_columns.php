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
        ADD COLUMN IF NOT EXISTS login_rate_limit_attempts INT DEFAULT 5,
        ADD COLUMN IF NOT EXISTS login_rate_limit_window INT DEFAULT 15,
        ADD COLUMN IF NOT EXISTS forgot_password_rate_limit_attempts INT DEFAULT 3,
        ADD COLUMN IF NOT EXISTS forgot_password_rate_limit_window INT DEFAULT 60;
    ');
    echo "Columns added successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
