<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();
$db = new App\Config\Database();
$conn = $db->getConnection();
$stmt = $conn->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
