<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();
require 'src/Config/Database.php';

$db = new App\Config\Database();
$conn = $db->getConnection();

try {
    $conn->exec('
        ALTER TABLE chat_messages 
        ADD COLUMN "deliveredTo" JSONB DEFAULT \'[]\'::jsonb,
        ADD COLUMN "readBy" JSONB DEFAULT \'[]\'::jsonb;
    ');
    echo "Successfully added deliveredTo and readBy columns.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
