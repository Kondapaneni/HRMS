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
        question_text TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT \'[]\'::jsonb,
        correct_option INTEGER NOT NULL DEFAULT 0,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );',

    'CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        passing_percentage INTEGER NOT NULL DEFAULT 70,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        randomize_questions BOOLEAN DEFAULT false,
        randomize_options BOOLEAN DEFAULT false,
        result_visibility VARCHAR(50) DEFAULT \'immediate\',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );',

    'ALTER TABLE assessments DROP COLUMN IF EXISTS category;',
    'ALTER TABLE assessments DROP COLUMN IF EXISTS description;',
    'ALTER TABLE assessments DROP COLUMN IF EXISTS status;'
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
