<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();

require 'backend/src/Config/Database.php';
require 'backend/src/Config/LoggingPDO.php';

$db = new App\Config\Database();
$conn = $db->getConnection();

try {
    $conn->exec('ALTER TABLE user_feature_access ADD COLUMN "canEmployeeTrainingVideos" BOOLEAN DEFAULT FALSE');
    echo "Column added successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "Column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
