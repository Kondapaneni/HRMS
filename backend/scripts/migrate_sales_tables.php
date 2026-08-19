<?php
require __DIR__ . '/../vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

$db = new App\Config\Database();
$conn = $db->getConnection();

if (!$conn) {
    die("Database connection error\n");
}

try {
    $sql = "
    CREATE TABLE IF NOT EXISTS public.sale_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        status TEXT DEFAULT 'New',
        branch VARCHAR(255),
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    CREATE INDEX IF NOT EXISTS idx_sale_leads_created_by ON public.sale_leads(created_by);
    CREATE INDEX IF NOT EXISTS idx_sale_leads_status ON public.sale_leads(status);
    CREATE INDEX IF NOT EXISTS idx_sale_leads_created_at ON public.sale_leads(created_at);
    ";

    $conn->exec($sql);
    echo "sale_leads table created/verified successfully.\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
