<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Config\Database;

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    $queries = [
        'CREATE INDEX IF NOT EXISTS idx_employee_userId ON employee ("userId");',
        'CREATE INDEX IF NOT EXISTS idx_employee_employeeId ON employee ("employeeId");',
        'CREATE INDEX IF NOT EXISTS idx_employee_email ON employee (email);',
        'CREATE INDEX IF NOT EXISTS idx_employee_branch ON employee (branch);',
        'CREATE INDEX IF NOT EXISTS idx_employee_status ON employee (status);',
        
        'CREATE INDEX IF NOT EXISTS idx_attendance_employeeId ON attendance ("employeeId");',
        'CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);',
        'CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance (status);',
        
        'CREATE INDEX IF NOT EXISTS idx_leaves_employeeId ON leaves ("employeeId");',
        'CREATE INDEX IF NOT EXISTS idx_leaves_startDate ON leaves ("startDate");',
        'CREATE INDEX IF NOT EXISTS idx_leaves_endDate ON leaves ("endDate");',
        'CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves (status);',
        
        'CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets (assigned_to);',
        
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp);',
        
        'CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses (user_id);',
        
        'CREATE INDEX IF NOT EXISTS idx_company_holidays_holidayDate ON company_holidays ("holidayDate");'
    ];
    
    foreach ($queries as $query) {
        $conn->exec($query);
        echo "Executed: " . $query . "\n";
    }
    
    echo "All indexes applied successfully.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
