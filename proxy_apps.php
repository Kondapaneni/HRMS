<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT id, resume_url FROM applications WHERE resume_url LIKE '%supabase.co/storage/v1/object/public/resumes/%'");
$apps = $stmt->fetchAll(PDO::FETCH_ASSOC);

$frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
if (strpos($frontendUrl, 'localhost') === false) {
    $proxyBase = "https://hrms-qwv3.onrender.com/Resume/";
} else {
    $proxyBase = $frontendUrl . "/Resume/";
}

foreach ($apps as $app) {
    $url = $app['resume_url'];
    $parts = explode('/', $url);
    $filename = end($parts);
    
    $newUrl = $proxyBase . $filename;
    
    $update = $conn->prepare("UPDATE applications SET resume_url = :new_url WHERE id = :id");
    $update->execute([
        'new_url' => $newUrl,
        'id' => $app['id']
    ]);
    
    echo "Updated application {$app['id']} URL to: $newUrl\n";
}

echo "Applications Resume URL migration complete.\n";
