<?php
require __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;
use App\Config\Database;

$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->safeLoad();

$db = new Database();
$conn = $db->getConnection();

echo "Starting Trigram search index application...\n";

// Ensure pg_trgm extension exists
try {
    $conn->exec('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    echo "Extension pg_trgm ensured.\n";
} catch (Exception $e) {
    echo "Error creating extension pg_trgm (Make sure the Postgres user has permissions): " . $e->getMessage() . "\n";
}

$indexes = [
    // Employee Search Indexes
    'idx_emp_firstName_trgm' => 'CREATE INDEX IF NOT EXISTS idx_emp_firstName_trgm ON employee USING GIN ("firstName" gin_trgm_ops);',
    'idx_emp_lastName_trgm' => 'CREATE INDEX IF NOT EXISTS idx_emp_lastName_trgm ON employee USING GIN ("lastName" gin_trgm_ops);',
    'idx_emp_email_trgm' => 'CREATE INDEX IF NOT EXISTS idx_emp_email_trgm ON employee USING GIN (email gin_trgm_ops);',
    'idx_emp_code_trgm' => 'CREATE INDEX IF NOT EXISTS idx_emp_code_trgm ON employee USING GIN ("employeeId" gin_trgm_ops);',
    
    // User Search Indexes
    'idx_users_firstName_trgm' => 'CREATE INDEX IF NOT EXISTS idx_users_firstName_trgm ON users USING GIN ("firstName" gin_trgm_ops);',
    'idx_users_lastName_trgm' => 'CREATE INDEX IF NOT EXISTS idx_users_lastName_trgm ON users USING GIN ("lastName" gin_trgm_ops);',
    'idx_users_email_trgm' => 'CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON users USING GIN (email gin_trgm_ops);',

    // Asset Search Indexes
    'idx_assets_name_trgm' => 'CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);',
    'idx_assets_serial_trgm' => 'CREATE INDEX IF NOT EXISTS idx_assets_serial_trgm ON assets USING GIN (serial_number gin_trgm_ops);'
];

foreach ($indexes as $name => $sql) {
    try {
        $conn->exec($sql);
        echo "Created trigram index: {$name}\n";
    } catch (Exception $e) {
        echo "Failed to create index {$name}: " . $e->getMessage() . "\n";
    }
}

echo "Trigram Index application complete!\n";
