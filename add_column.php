<?php
require 'backend/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

$db = new \App\Config\Database();
$conn = $db->getConnection();

try {
    $conn->exec("ALTER TABLE loan_applications ADD COLUMN signatures jsonb DEFAULT '{}'::jsonb");
    echo "Column 'signatures' added successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "Column 'signatures' already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
