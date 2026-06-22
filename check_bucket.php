<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();
$stmt = $conn->query("SELECT id, name, public FROM storage.buckets WHERE id = 'offer_letters';");
$bucket = $stmt->fetch(PDO::FETCH_ASSOC);
print_r($bucket);
