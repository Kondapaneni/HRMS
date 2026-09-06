<?php
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$db = new \App\Config\Database();
$conn = $db->getConnection();

echo "Executing Database Migration for OTP & Face Biometrics Removal...\n";

// 1. Drop user_biometrics table
$conn->exec("DROP TABLE IF EXISTS public.user_biometrics CASCADE");
echo "✓ Dropped table user_biometrics\n";

// 2. Add OTP columns to users table
$conn->exec("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10), ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP");
echo "✓ Added otp_code and otp_expires_at to users table\n";

// 3. Verify columns in users table
$stmt = $conn->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name LIKE '%otp%'");
$cols = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "✓ Verified users table columns: " . json_encode($cols) . "\n";

echo "Migration complete.\n";
