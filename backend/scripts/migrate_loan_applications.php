<?php
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) {
    die("Error: .env file not found\n");
}

$env = file_get_contents($envFile);
$vars = [];
foreach (explode("\n", $env) as $line) {
    $line = trim($line);
    if ($line && strpos($line, '=') !== false && strpos($line, '#') !== 0) {
        list($k, $v) = explode('=', $line, 2);
        $vars[trim($k)] = trim($v);
    }
}

$host = $vars['DB_HOST'] ?? 'localhost';
$port = $vars['DB_PORT'] ?? '5432';
$dbname = $vars['DB_DATABASE'] ?? 'postgres';
$user = $vars['DB_USERNAME'] ?? 'postgres';
$pass = $vars['DB_PASSWORD'] ?? '';

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $pass);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = "
        CREATE TABLE IF NOT EXISTS public.loan_applications (
            id SERIAL PRIMARY KEY,
            loan_type VARCHAR(100) NOT NULL DEFAULT 'Business Loan',
            applicant_name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'Submitted',
            form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
            created_by VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE public.loan_applications ALTER COLUMN created_by TYPE VARCHAR(255) USING created_by::text;

        CREATE INDEX IF NOT EXISTS idx_loan_applications_created_by ON public.loan_applications(created_by);
        CREATE INDEX IF NOT EXISTS idx_loan_applications_loan_type ON public.loan_applications(loan_type);
    ";

    $conn->exec($sql);
    echo "Successfully updated public.loan_applications table schema in database.\n";
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
    exit(1);
}
