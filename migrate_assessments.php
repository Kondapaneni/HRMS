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

    'CREATE TABLE IF NOT EXISTS assessment_question_bank (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        question_type VARCHAR(50) NOT NULL DEFAULT \'mcq_single\',
        difficulty VARCHAR(50) NOT NULL DEFAULT \'Medium\',
        options JSONB NOT NULL DEFAULT \'[]\'::jsonb,
        correct_answers JSONB NOT NULL DEFAULT \'[]\'::jsonb,
        marks INTEGER NOT NULL DEFAULT 5,
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );',

    'CREATE TABLE IF NOT EXISTS assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 30,
        passing_percentage INTEGER NOT NULL DEFAULT 70,
        max_attempts INTEGER NOT NULL DEFAULT 1,
        randomize_questions BOOLEAN DEFAULT false,
        randomize_options BOOLEAN DEFAULT false,
        result_visibility VARCHAR(50) DEFAULT \'immediate\',
        status VARCHAR(50) DEFAULT \'published\',
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );',

    'ALTER TABLE assessment_question_bank DROP COLUMN IF EXISTS category;',
    'ALTER TABLE assessments DROP COLUMN IF EXISTS category;',

    'CREATE TABLE IF NOT EXISTS assessment_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES assessment_question_bank(id) ON DELETE CASCADE,
        order_num INTEGER NOT NULL DEFAULT 1,
        marks INTEGER NOT NULL DEFAULT 5,
        UNIQUE(assessment_id, question_id)
    );',

    'CREATE TABLE IF NOT EXISTS assessment_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by UUID,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT \'assigned\',
        UNIQUE(assessment_id, employee_id)
    );',

    'CREATE TABLE IF NOT EXISTS assessment_attempts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attempt_number INTEGER NOT NULL DEFAULT 1,
        start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) DEFAULT \'in_progress\',
        total_score NUMERIC(10,2) DEFAULT 0,
        max_score NUMERIC(10,2) DEFAULT 0,
        percentage NUMERIC(5,2) DEFAULT 0,
        passed BOOLEAN DEFAULT false,
        answers_data JSONB DEFAULT \'{}\'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );'
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
