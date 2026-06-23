<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

function printKeys($conn, $table) {
    try {
        $stmt = $conn->query("SELECT * FROM $table LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            echo "$table: " . implode(', ', array_keys($row)) . "\n";
        } else {
            echo "$table is empty.\n";
        }
    } catch (Exception $e) {
        echo "Table $table error: " . $e->getMessage() . "\n";
    }
}

printKeys($conn, 'employees');
printKeys($conn, 'holidays');
printKeys($conn, 'attendance');
printKeys($conn, 'attendance_logs');
