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

    // Create RLS policies for storage
    $sqlPolicy = "
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public uploads to expenses bucket'
        ) THEN
            CREATE POLICY \"Allow public uploads to expenses bucket\" 
            ON storage.objects FOR INSERT 
            WITH CHECK (bucket_id = 'expenses');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public updates to expenses bucket'
        ) THEN
            CREATE POLICY \"Allow public updates to expenses bucket\" 
            ON storage.objects FOR UPDATE 
            USING (bucket_id = 'expenses');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public deletes from expenses bucket'
        ) THEN
            CREATE POLICY \"Allow public deletes from expenses bucket\" 
            ON storage.objects FOR DELETE 
            USING (bucket_id = 'expenses');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Allow public reads from expenses bucket'
        ) THEN
            CREATE POLICY \"Allow public reads from expenses bucket\" 
            ON storage.objects FOR SELECT 
            USING (bucket_id = 'expenses');
        END IF;
    END
    $$;
    ";
    $pdo->exec($sqlPolicy);
    echo "Expenses bucket RLS policies created.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
