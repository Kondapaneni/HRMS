<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();

$supabaseUrl = $_ENV['VITE_SUPABASE_URL'];
$supabaseAnonKey = $_ENV['VITE_SUPABASE_ANON_KEY'];

$url = $supabaseUrl . '/storage/v1/object/training_videos/test_file.txt';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_POSTFIELDS, "dummy content");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer " . $supabaseAnonKey,
    "apikey: " . $supabaseAnonKey,
    "Content-Type: text/plain"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo "Curl error: " . curl_error($ch) . "\n";
}
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: " . $httpcode . "\n";
echo "Response: " . $response . "\n";
?>
