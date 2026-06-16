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
    
    $sql = file_get_contents(__DIR__ . '/query.sql');
    if (trim($sql) === '') {
        echo "Empty query\n";
        exit(1);
    }
    
    if (preg_match('/^\s*(SELECT|WITH|SHOW)\b/i', $sql) && strpos($sql, ';') === strrpos($sql, ';')) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $result = $stmt->fetchAll();
        echo json_encode($result, JSON_PRETTY_PRINT);
    } else {
        $pdo->exec($sql);
        echo "Query executed successfully.\n";
    }
} catch (\PDOException $e) {
    echo "Connection failed/Query Error: " . $e->getMessage() . "\n";
    exit(1);
}
