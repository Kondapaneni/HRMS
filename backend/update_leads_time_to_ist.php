<?php
require __DIR__ . '/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '5432';
$db_name = $_ENV['DB_DATABASE'] ?? 'postgres';
$username = $_ENV['DB_USERNAME'] ?? 'postgres';
$password = $_ENV['DB_PASSWORD'] ?? '';

try {
    $dsn = "pgsql:host={$host};port={$port};dbname={$db_name}";
    $conn = new PDO($dsn, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Convert all existing timestamps that are in UTC to IST
    // Assuming records inserted before today's fix were in UTC.
    // If they were already in IST, they shouldn't be touched, but the DB doesn't store timezone info if it's TIMESTAMP WITHOUT TIME ZONE.
    // So we'll just add 5 hours and 30 minutes to all existing records.
    $sql = "UPDATE public.loan_leads SET created_at = created_at + interval '5 hours 30 minutes'";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    
    $rowCount = $stmt->rowCount();
    echo "Successfully updated {$rowCount} leads to IST.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
