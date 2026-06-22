<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

$db = new App\Config\Database();
$conn = $db->getConnection();

try {
  $sql = "CREATE POLICY \"Public Access for offer_letters\" ON storage.objects FOR ALL USING (bucket_id = 'offer_letters');";
  $conn->exec($sql);
  echo "Policy created.\n";
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}
