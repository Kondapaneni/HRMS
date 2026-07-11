<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$db = new Database();
$conn = $db->getConnection();

echo "Starting Manager ID Migration...\n";

try {
    $conn->beginTransaction();
    
    // Find all employees where managerId is currently storing the employeeId (e.g. EMP001) instead of UUID
    // We join the employee table to itself on managerId = m.employeeId
    // And set managerId = m.id
    
    $sql = '
        UPDATE employee e
        SET "managerId" = m.id
        FROM employee m
        WHERE e."managerId" = m."employeeId"
    ';
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rowCount = $stmt->rowCount();
    
    $conn->commit();
    echo "Migration complete! Updated {$rowCount} rows.\n";
    
} catch (Exception $e) {
    $conn->rollBack();
    echo "Migration failed: " . $e->getMessage() . "\n";
}
