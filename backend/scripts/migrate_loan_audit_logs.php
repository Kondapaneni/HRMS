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
        CREATE TABLE IF NOT EXISTS public.loan_application_audit_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            application_id VARCHAR(100) NOT NULL,
            loan_application_id UUID NULL,
            editor_name VARCHAR(255) NOT NULL,
            editor_user_id UUID NULL,
            changes JSONB NOT NULL DEFAULT '[]'::jsonb,
            changes_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_loan_audit_app_id ON public.loan_application_audit_logs(application_id);
        CREATE INDEX IF NOT EXISTS idx_loan_audit_loan_app_id ON public.loan_application_audit_logs(loan_application_id);
    ";

    $conn->exec($sql);
    echo "Successfully created/verified public.loan_application_audit_logs table in database.\n";

} catch (PDOException $e) {
    die("Database error: " . $e->getMessage() . "\n");
}
