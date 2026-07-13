<?php
require __DIR__ . '/../vendor/autoload.php';
require __DIR__ . '/../src/Database.php';

use App\Database;

try {
    $db = new Database();
    $conn = $db->getConnection();

    // Find all attendance records from strictly past dates where:
    // - checkIn is not null
    // - checkOut is null
    // - status is 'present' or 'present (late)'
    
    $stmt = $conn->prepare("
        SELECT id, status 
        FROM attendance 
        WHERE \"checkIn\" IS NOT NULL 
          AND \"checkOut\" IS NULL 
          AND date < CURRENT_DATE
          AND status ILIKE 'present%'
          AND status NOT ILIKE '%checkout missing%'
    ");
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $updatedCount = 0;

    if (count($records) > 0) {
        $updateStmt = $conn->prepare("UPDATE attendance SET status = ?, \"updatedAt\" = CURRENT_TIMESTAMP WHERE id = ?");
        
        foreach ($records as $record) {
            $currentStatus = strtolower($record['status']);
            
            // Map to new status
            if (strpos($currentStatus, '(late)') !== false) {
                $newStatus = 'present (late+checkout missing)';
            } else {
                $newStatus = 'present (checkout missing)';
            }
            
            $updateStmt->execute([$newStatus, $record['id']]);
            $updatedCount++;
        }
    }

    echo "Successfully ran missing checkout cron job. Updated $updatedCount records.\n";

} catch (Exception $e) {
    echo "Error running missing checkout cron job: " . $e->getMessage() . "\n";
    exit(1);
}
