<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();
$db = new App\Config\Database();
$conn = $db->getConnection();
$stmt = $conn->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_feature_access'");
print_r($stmt->fetchAll());
?>
