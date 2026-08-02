<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();
$db = new App\Config\Database();
$conn = $db->getConnection();
try {
    $stmt = $conn->query("SELECT * FROM storage.buckets WHERE id = 'training_videos'");
    $bucket = $stmt->fetch(PDO::FETCH_ASSOC);
    print_r($bucket);
} catch (Exception $e) { 
    echo "Error: " . $e->getMessage() . "\n"; 
}
?>
