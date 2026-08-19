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
    CREATE TABLE IF NOT EXISTS public.sales_leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lead_number VARCHAR(50) UNIQUE,
        name TEXT NOT NULL,
        company_name TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        product_interest VARCHAR(100) DEFAULT 'Enterprise Suite',
        deal_value NUMERIC(15, 2) DEFAULT 0,
        status TEXT DEFAULT 'New',
        notes TEXT,
        branch VARCHAR(255),
        created_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

    CREATE INDEX IF NOT EXISTS idx_sales_leads_created_by ON public.sales_leads(created_by);
    CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON public.sales_leads(status);
    CREATE INDEX IF NOT EXISTS idx_sales_leads_created_at ON public.sales_leads(created_at);
    ";

    $conn->exec($sql);
    echo "sales_leads table created/verified successfully.\n";
} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
