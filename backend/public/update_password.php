<?php
require __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

$host = $_ENV['DB_HOST'];
$port = $_ENV['DB_PORT'];
$db   = $_ENV['DB_DATABASE'];
$user = $_ENV['DB_USERNAME'];
$pass = $_ENV['DB_PASSWORD'];

$dsn = "pgsql:host=$host;port=$port;dbname=$db";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Hash the new password
    $newPassword = '9966476922';
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update the admin user
    $stmt = $pdo->prepare('UPDATE users SET password = ?');
    $stmt->execute([$hashedPassword]);
    
    echo "Password updated successfully for all users.\n";
} catch (\PDOException $e) {
    echo "Connection failed/Query Error: " . $e->getMessage() . "\n";
    exit(1);
}
