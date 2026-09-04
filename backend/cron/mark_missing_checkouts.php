<?php

require __DIR__ . '/../vendor/autoload.php';

use App\Config\Database;
use App\Utils\AttendanceReconciler;
use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Set default timezone to Indian Standard Time (IST)
date_default_timezone_set('Asia/Kolkata');

try {
    $db = new Database();
    $conn = $db->getConnection();

    echo "[" . date('Y-m-d H:i:s') . "] Running missing checkout reconciliation cron job...\n";

    $result = AttendanceReconciler::reconcileMissingCheckouts($conn);
    $count = $result['updatedCount'];

    echo "[" . date('Y-m-d H:i:s') . "] Successfully reconciled $count attendance records.\n";

    foreach ($result['records'] as $r) {
        echo " - [{$r['date']}] CheckIn: {$r['checkIn']} | ShiftEnd: {$r['shiftEndTime']} => {$r['status']} ({$r['hours']} hrs)\n";
    }

    exit(0);

} catch (Exception $e) {
    echo "[" . date('Y-m-d H:i:s') . "] Error running missing checkout cron job: " . $e->getMessage() . "\n";
    exit(1);
}
