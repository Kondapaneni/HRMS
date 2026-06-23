<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT id, resume_url FROM candidate_profiles WHERE resume_url IS NOT NULL");
$profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

$frontendUrl = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
if (strpos($frontendUrl, 'localhost') === false) {
    $proxyBase = "https://hrms-qwv3.onrender.com/Resume/";
} else {
    $proxyBase = $frontendUrl . "/Resume/";
}

$updatedCount = 0;

foreach ($profiles as $profile) {
    $resumesJson = $profile['resume_url'];
    if (is_string($resumesJson)) {
        $resumes = json_decode($resumesJson, true);
        $changed = false;
        
        if (is_array($resumes)) {
            foreach ($resumes as &$resume) {
                if (isset($resume['url']) && strpos($resume['url'], 'supabase.co/storage/v1/object/public/resumes/') !== false) {
                    $parts = explode('/', $resume['url']);
                    $filename = end($parts);
                    $resume['url'] = $proxyBase . $filename;
                    $changed = true;
                }
            }
            
            if ($changed) {
                $newJson = json_encode($resumes);
                $update = $conn->prepare("UPDATE candidate_profiles SET resume_url = :new_json WHERE id = :id");
                $update->execute([
                    'new_json' => $newJson,
                    'id' => $profile['id']
                ]);
                $updatedCount++;
                echo "Updated resumes for profile {$profile['id']}\n";
            }
        }
    }
}

echo "Proxy URL migration complete for $updatedCount profiles.\n";
