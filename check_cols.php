<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();
$stmt = $conn->query("SELECT * FROM chat_messages LIMIT 1");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if ($row) {
    echo implode(', ', array_keys($row));
} else {
    echo 'empty';
}
