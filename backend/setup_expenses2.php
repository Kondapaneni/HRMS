<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
$dsn = "pgsql:host=" . $_ENV['DB_HOST'] . ";port=" . $_ENV['DB_PORT'] . ";dbname=" . $_ENV['DB_DATABASE'];
try {
    $pdo = new PDO($dsn, $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    
    $pdo->exec("DROP TABLE IF EXISTS public.expenses;");
    // Create table
    $sqlTable = "
    CREATE TABLE public.expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
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
    echo "Expenses table created with user_id.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
