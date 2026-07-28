<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();

$db = new App\Config\Database();
$conn = $db->getConnection();

if (!$conn) {
    die("Database connection failed.\n");
}

$queries = [
    // 1. Store questions_count in assessments table
    'ALTER TABLE assessments ADD COLUMN IF NOT EXISTS questions_count INTEGER DEFAULT 0;',
    
    // 2. Backfill questions_count from existing selected_questions
    'UPDATE assessments SET questions_count = CASE WHEN selected_questions IS NOT NULL AND jsonb_typeof(selected_questions) = \'array\' THEN jsonb_array_length(selected_questions) ELSE 0 END WHERE questions_count IS NULL OR questions_count = 0;',
    
    // 3. Performance indexes on assessment_attempts
    'CREATE INDEX IF NOT EXISTS idx_assessment_attempts_emp_ass ON assessment_attempts (employee_id, assessment_id);',
    'CREATE INDEX IF NOT EXISTS idx_assessment_attempts_emp_ass_status ON assessment_attempts (employee_id, assessment_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_assessment_attempts_ass ON assessment_attempts (assessment_id);',
    'CREATE INDEX IF NOT EXISTS idx_assessment_attempts_status ON assessment_attempts (status);',
    
    // 4. Performance indexes on assessments
    'CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments (status);',
    'CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments (assessment_date);',
    'CREATE INDEX IF NOT EXISTS idx_assessments_dept_status ON assessments (department, status);'
];

echo "Starting Employee Assessments performance migration...\n";
foreach ($queries as $index => $sql) {
    try {
        $conn->exec($sql);
        echo "[" . ($index + 1) . "/" . count($queries) . "] Successfully executed query.\n";
    } catch (Exception $e) {
        echo "[" . ($index + 1) . "/" . count($queries) . "] Error: " . $e->getMessage() . "\n";
    }
}

echo "Performance migration completed successfully.\n";
?>
