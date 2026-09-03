<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable('backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$stmt = $conn->query("
    SELECT p.id, p.\"punchTime\", p.latitude, p.longitude, p.address, p.photo, p.\"createdAt\",
           e.\"firstName\", e.\"lastName\", e.\"shiftTime\"
    FROM attendance_punches p
    LEFT JOIN employee e ON p.\"employeeId\" = e.\"userId\"
    WHERE p.photo = 'Tracker'
    ORDER BY p.\"createdAt\" DESC
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo json_encode($rows, JSON_PRETTY_PRINT);
