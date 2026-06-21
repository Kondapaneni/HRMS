<?php
require __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Config\Database;
$db = new Database();
$conn = $db->getConnection();

try {
    $stmt = $conn->prepare('
        INSERT INTO users ("firstName", "lastName", email, password, role, "isActive", reset_token) 
        VALUES (:first, :last, :email, :pass, :role, :active, :token)
        RETURNING id
    ');
    $stmt->execute([
        'first' => 'Test',
        'last' => 'User',
        'email' => 'test@example.com',
        'pass' => 'hash',
        'role' => 'candidate',
        'active' => 'false',
        'token' => 'token123'
    ]);
    $userId = $stmt->fetchColumn();
    echo "User created with ID: $userId\n";

    $queueStmt = $conn->prepare("INSERT INTO email_queue (to_email, subject, body) VALUES (:email, :subject, :body)");
    $queueStmt->execute([
        'email' => 'test@example.com',
        'subject' => 'Test Subject',
        'body' => 'Test Body'
    ]);
    echo "Email queued.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
