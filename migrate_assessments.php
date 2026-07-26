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
    'ALTER TABLE user_feature_access ADD COLUMN IF NOT EXISTS "canAdminAssessments" BOOLEAN DEFAULT false;',
    'ALTER TABLE user_feature_access ADD COLUMN IF NOT EXISTS "canEmployeeAssessments" BOOLEAN DEFAULT false;',

    'CREATE TABLE IF NOT EXISTS department_question_bank (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department VARCHAR(150) NOT NULL,
        question_type VARCHAR(50) NOT NULL DEFAULT \'mcq_single\',
        question_text TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT \'[]\'::jsonb,
        correct_option INTEGER NOT NULL DEFAULT 0,
        correct_options JSONB NOT NULL DEFAULT \'[]\'::jsonb,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );',

    'CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        department VARCHAR(150) DEFAULT \'General\',
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        passing_percentage INTEGER NOT NULL DEFAULT 70,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        marks_per_question INTEGER NOT NULL DEFAULT 1,
        randomize_questions BOOLEAN DEFAULT false,
        randomize_options BOOLEAN DEFAULT false,
        result_visibility VARCHAR(50) DEFAULT \'immediate\',
        assessment_date VARCHAR(50) DEFAULT NULL,
        selected_questions JSONB DEFAULT \'[]\'::jsonb,
        status VARCHAR(50) DEFAULT \'Active\',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );',
    'ALTER TABLE assessments ADD COLUMN IF NOT EXISTS department VARCHAR(150) DEFAULT \'General\';',
    'ALTER TABLE assessments ADD COLUMN IF NOT EXISTS marks_per_question INTEGER DEFAULT 1;',
    'ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_date VARCHAR(50) DEFAULT NULL;',
    'ALTER TABLE assessments ADD COLUMN IF NOT EXISTS selected_questions JSONB DEFAULT \'[]\'::jsonb;',
    'ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT \'Active\';'
];

foreach ($queries as $index => $sql) {
    try {
        $conn->exec($sql);
        echo "Query " . ($index + 1) . " executed successfully.\n";
    } catch (Exception $e) {
        echo "Error on query " . ($index + 1) . ": " . $e->getMessage() . "\n";
    }
}

echo "Migration completed.\n";
?>
