<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

try {
    $conn->exec("ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;");
    $conn->exec("CREATE POLICY candidate_documents_all ON candidate_documents FOR ALL USING (candidate_id = auth.uid());");
    echo "RLS enabled.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
