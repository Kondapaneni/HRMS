<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$tables = ['candidate_profiles', 'applications'];
foreach($tables as $table) {
    echo "--- $table ---\n";
    $stmt = $conn->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='$table'");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo $row['column_name'] . ' - ' . $row['data_type'] . "\n";
    }
}
