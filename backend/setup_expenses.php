<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
$dsn = "pgsql:host=" . $_ENV['DB_HOST'] . ";port=" . $_ENV['DB_PORT'] . ";dbname=" . $_ENV['DB_DATABASE'];
try {
    $pdo = new PDO($dsn, $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    
    // Create table
    $sqlTable = "
    CREATE TABLE IF NOT EXISTS public.expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES public.employee(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        amount NUMERIC(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        bill_url TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        remarks TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );";
    $pdo->exec($sqlTable);
    echo "Expenses table created.\n";

    // Create bucket
    $sqlBucket = "INSERT INTO storage.buckets (id, name, public) VALUES ('expenses', 'expenses', true) ON CONFLICT (id) DO NOTHING;";
    $pdo->exec($sqlBucket);
    echo "Expenses bucket created.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
