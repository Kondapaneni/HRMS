<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();

$filename = "1785664944158_Video_Project_1.mp4"; // The filename user provided
$encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
$supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/training_videos/" . $encodedFilename;

echo "URL: " . $supabaseUrl . "\n";

$ch = curl_init($supabaseUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true); // Get headers
curl_setopt($ch, CURLOPT_NOBODY, true); // HEAD request
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: " . $httpcode . "\n";
?>
