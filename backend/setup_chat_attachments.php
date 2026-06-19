<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = new App\Config\Database();
$pdo = $db->getConnection();

try {
    $pdo->exec('ALTER TABLE public.chat_messages
        ADD COLUMN IF NOT EXISTS "attachmentUrl" VARCHAR(500),
        ADD COLUMN IF NOT EXISTS "attachmentType" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "attachmentName" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER;
    ');
    
    $pdo->exec("INSERT INTO storage.buckets (id, name, public)
        VALUES ('chat_attachments', 'chat_attachments', true)
        ON CONFLICT (id) DO UPDATE SET public = true;
    ");

    try {
        $pdo->exec("CREATE POLICY \"Public Access\" ON storage.objects FOR SELECT USING (bucket_id = 'chat_attachments');");
    } catch (Exception $e) {}

    try {
        $pdo->exec("CREATE POLICY \"Public Insert\" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_attachments');");
    } catch (Exception $e) {}

    echo "Chat attachments configured successfully.\n";

} catch (PDOException $e) {
    echo "Query failed: " . $e->getMessage() . "\n";
}
