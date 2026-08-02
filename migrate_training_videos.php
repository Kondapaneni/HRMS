<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();

$db = new App\Config\Database();
$conn = $db->getConnection();

try {
    $conn->exec("ALTER TABLE training_videos ADD COLUMN IF NOT EXISTS assigned_employee_ids JSONB DEFAULT '[]'::jsonb;");
    echo "Column assigned_employee_ids added successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
