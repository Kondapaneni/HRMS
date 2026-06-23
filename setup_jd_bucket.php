<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

try {
  $conn->exec("INSERT INTO storage.buckets (id, name, public) VALUES ('job_descriptions', 'job_descriptions', true) ON CONFLICT (id) DO NOTHING;");
  echo "Bucket job_descriptions created.\n";

  $sql = "CREATE POLICY \"Public Access for job_descriptions\" ON storage.objects FOR ALL USING (bucket_id = 'job_descriptions');";
  $conn->exec($sql);
  echo "Policy created.\n";
} catch (Exception $e) {
  // If the policy already exists it might throw an exception, which is fine
  echo "Message: " . $e->getMessage() . "\n";
}
