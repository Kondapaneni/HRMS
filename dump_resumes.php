<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT id, resume_url FROM candidate_profiles WHERE resume_url IS NOT NULL");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

$stmt2 = $conn->query("SELECT id, resume_url FROM applications WHERE resume_url IS NOT NULL");
print_r($stmt2->fetchAll(PDO::FETCH_ASSOC));
