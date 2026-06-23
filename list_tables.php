<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
