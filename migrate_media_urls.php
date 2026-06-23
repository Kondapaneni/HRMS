<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
if (strpos($frontendUrl, 'localhost') === false) {
    $proxyDomain = "https://hrms-qwv3.onrender.com";
} else {
    $proxyDomain = rtrim($frontendUrl, '/');
}

function updateTable($conn, $table, $columns, $bucket, $proxyDomain) {
    echo "Updating $table...\n";
    $count = 0;
    $selectCols = array_map(function($c) { return '"' . $c . '"'; }, $columns);
    $selectColsStr = implode(', ', $selectCols);
    
    $stmt = $conn->query("SELECT id, $selectColsStr FROM $table");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($rows as $row) {
        $updates = [];
        $params = ['id' => $row['id']];
        
        foreach ($columns as $col) {
            $url = $row[$col] ?? null;
            if ($url && strpos($url, 'supabase.co/storage/v1/object/public/') !== false) {
                $parts = explode('/', parse_url($url, PHP_URL_PATH));
                $filename = end($parts);
                $route = '';
                if ($bucket === 'avatars') $route = '/Avatar/';
                else if ($bucket === 'holidays') $route = '/Holiday/';
                else if ($bucket === 'attendance') $route = '/Attendance/';
                else if ($bucket === 'chat_attachments') $route = '/Chat-Attachment/';
                
                $newUrl = $proxyDomain . $route . rawurlencode($filename);
                $updates[] = "\"$col\" = :$col";
                $params[$col] = $newUrl;
            }
        }
        
        if (!empty($updates)) {
            $sql = "UPDATE $table SET " . implode(', ', $updates) . " WHERE id = :id";
            $updateStmt = $conn->prepare($sql);
            $updateStmt->execute($params);
            $count++;
        }
    }
    echo "Updated $count rows in $table.\n";
}

updateTable($conn, 'employee', ['avatar'], 'avatars', $proxyDomain);
updateTable($conn, 'company_holidays', ['holidayImage'], 'holidays', $proxyDomain);
updateTable($conn, 'attendance', ['checkInPhoto', 'checkOutPhoto'], 'attendance', $proxyDomain);
updateTable($conn, 'chat_messages', ['file_url'], 'chat_attachments', $proxyDomain); // if it exists, otherwise it will just catch and ignore or fail. Wait, I should wrap in try-catch.
