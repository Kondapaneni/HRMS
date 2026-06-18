<?php
require __DIR__ . '/backend/vendor/autoload.php';
use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();
require_once __DIR__ . '/backend/src/Config/Database.php';

$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT * FROM email_queue ORDER BY created_at DESC LIMIT 3");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($rows as $row) {
    echo "ID: {$row['id']}\n";
    echo "To: {$row['to_email']}\n";
    echo "Status: {$row['status']}\n";
    echo "Body: {$row['body']}\n";
    echo "---------------------------\n";
}
