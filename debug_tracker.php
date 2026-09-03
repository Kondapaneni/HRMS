<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable('backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

// Check Ashok's attendance record today
$stmt = $conn->query("
    SELECT a.id, a.\"employeeId\", a.date, a.\"checkIn\", a.\"checkOut\", a.status,
           e.\"shiftTime\",
           st.\"startTime\" as \"shiftStartTime\", st.\"endTime\" as \"shiftEndTime\"
    FROM attendance a
    LEFT JOIN employee e ON a.\"employeeId\" = e.\"userId\"
    LEFT JOIN shift_times st ON e.\"shiftTime\" = st.\"shiftLabel\"
    WHERE a.date = '2026-09-03'
    ORDER BY a.\"checkIn\" DESC
    LIMIT 5
");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "=== ATTENDANCE RECORDS ===\n";
echo json_encode($rows, JSON_PRETTY_PRINT) . "\n\n";

// Check shift cutoff calculation
if (!empty($rows)) {
    $record = $rows[0];
    $today = '2026-09-03';
    $now = time();
    $checkInTimestamp = strtotime($record['checkIn']);
    $shiftEndTime = $record['shiftEndTime'];
    $shiftStartTime = $record['shiftStartTime'];

    echo "=== CUTOFF ANALYSIS ===\n";
    echo "Now: " . date('Y-m-d H:i:s') . "\n";
    echo "Check-in: " . $record['checkIn'] . "\n";
    echo "Check-out: " . ($record['checkOut'] ?: 'NULL') . "\n";
    echo "Shift: " . $record['shiftTime'] . "\n";
    echo "Shift End Time: " . $shiftEndTime . "\n";
    echo "Shift Start Time: " . $shiftStartTime . "\n";

    if ($shiftEndTime) {
        $shiftEndToday = strtotime("$today $shiftEndTime");
        if ($shiftStartTime && $shiftEndTime < $shiftStartTime) {
            $shiftEndToday += 86400;
        }
        $cutoffTimestamp = $shiftEndToday + (2 * 3600);
        echo "Shift end today: " . date('Y-m-d H:i:s', $shiftEndToday) . "\n";
        echo "Cutoff (+2h): " . date('Y-m-d H:i:s', $cutoffTimestamp) . "\n";
        echo "checkIn < cutoff? " . ($checkInTimestamp < $cutoffTimestamp ? "YES" : "NO") . "\n";
        echo "now > cutoff? " . ($now > $cutoffTimestamp ? "YES" : "NO") . "\n";

        if ($checkInTimestamp < $cutoffTimestamp && $now > $cutoffTimestamp) {
            echo "\n>>> TRACKER WOULD BE BLOCKED: Shift+2h cutoff exceeded! <<<\n";
        } else {
            echo "\n>>> TRACKER SHOULD BE ALLOWED <<<\n";
        }
    }

    // 12h check
    $elapsed = $now - $checkInTimestamp;
    echo "\nElapsed since check-in: " . round($elapsed / 3600, 2) . " hours\n";
    echo "12h exceeded? " . ($elapsed > 12 * 3600 ? "YES" : "NO") . "\n";
}
