<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$db = new Database();
$conn = $db->getConnection();

echo "Starting Composite Index Application...\n";

$indexes = [
    // Attendance lookups
    'idx_attendance_empid_date' => 'CREATE INDEX IF NOT EXISTS idx_attendance_empid_date ON attendance ("employeeId", date)',
    
    // Leaves lookups
    'idx_leaves_empid_start' => 'CREATE INDEX IF NOT EXISTS idx_leaves_empid_start ON leaves ("employeeId", "startDate")',
    'idx_leaves_empid_status' => 'CREATE INDEX IF NOT EXISTS idx_leaves_empid_status ON leaves ("employeeId", status)',
    
    // Payslips lookups
    'idx_payslips_empid_year_month' => 'CREATE INDEX IF NOT EXISTS idx_payslips_empid_year_month ON payslips ("employeeId", year DESC, month DESC)',
    
    // Expenses lookups
    'idx_expenses_userid_created' => 'CREATE INDEX IF NOT EXISTS idx_expenses_userid_created ON expenses (user_id, created_at DESC)',
    
    // Employee hierarchy lookups
    'idx_employee_managerid_status' => 'CREATE INDEX IF NOT EXISTS idx_employee_managerid_status ON employee ("managerId", status)',
];

try {
    foreach ($indexes as $name => $sql) {
        echo "Creating index: {$name}...\n";
        $conn->exec($sql);
    }
    
    echo "All composite indexes applied successfully!\n";
} catch (Exception $e) {
    echo "Error applying indexes: " . $e->getMessage() . "\n";
}
