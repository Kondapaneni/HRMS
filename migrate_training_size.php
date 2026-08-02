<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();
$db = new App\Config\Database();
$conn = $db->getConnection();
try {
    // 500MB = 524288000 bytes
    $sql = "UPDATE storage.buckets SET file_size_limit = 524288000 WHERE id = 'training_videos';";
    $conn->exec($sql);
    echo "Bucket file size limit updated successfully.\n";
} catch (Exception $e) { 
    echo "Error: " . $e->getMessage() . "\n"; 
}
?>
