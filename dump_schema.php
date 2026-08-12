<?php
require 'backend/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

$db = new \App\Config\Database();
$stmt = $db->getConnection()->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'loan_applications'");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
