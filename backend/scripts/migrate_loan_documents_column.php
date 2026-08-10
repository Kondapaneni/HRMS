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
        -- 1. Add dedicated documents column to public.loan_applications
        ALTER TABLE public.loan_applications 
        ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '{}'::jsonb;

        -- 2. Migrate existing documents from form_data->'documents' if present
        UPDATE public.loan_applications 
        SET documents = (form_data->'documents')::jsonb 
        WHERE (documents = '{}'::jsonb OR documents IS NULL) 
          AND form_data ? 'documents' 
          AND form_data->'documents' IS NOT NULL;

        -- 3. Add GIN index on documents for fast querying
        CREATE INDEX IF NOT EXISTS idx_loan_applications_documents ON public.loan_applications USING gin(documents);
    ";

    $conn->exec($sql);
    echo "Successfully added 'documents' JSONB column to public.loan_applications and migrated existing data.\n";
} catch (PDOException $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
    exit(1);
}
