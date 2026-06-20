<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

$db = new App\Config\Database();
$conn = $db->getConnection();

$stmt = $conn->query("
    SELECT is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'senderId'
");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
