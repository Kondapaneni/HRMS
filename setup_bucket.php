<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

$db = new App\Config\Database();
$conn = $db->getConnection();

try {
  $conn->exec("INSERT INTO storage.buckets (id, name, public) VALUES ('offer_letters', 'offer_letters', true) ON CONFLICT (id) DO NOTHING;");
  
  // Need to create RLS policies so public can read and authenticated users can insert?
  // Actually, Supabase handles storage via separate API, but inserting directly into storage.buckets sometimes works.
  // It's safer to create policy if needed, but for now we just create the bucket.
  echo "Bucket offer_letters created.\n";
} catch (Exception $e) {
  echo "Error: " . $e->getMessage() . "\n";
}
