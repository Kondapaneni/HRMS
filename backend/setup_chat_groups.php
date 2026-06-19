<?php
require __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

$db = new App\Config\Database();
$pdo = $db->getConnection();

try {
    $pdo->exec('ALTER TABLE public.chats
        ADD COLUMN IF NOT EXISTS "group_avatar" VARCHAR(500),
        ADD COLUMN IF NOT EXISTS "permissions" JSONB DEFAULT \'{"editSettings": true, "sendMessages": true, "addMembers": true, "approveNewMembers": false}\'::jsonb,
        ADD COLUMN IF NOT EXISTS "admin_ids" JSONB DEFAULT \'[]\'::jsonb;
    ');
    
    echo "Chat group features configured successfully.\n";

} catch (PDOException $e) {
    echo "Query failed: " . $e->getMessage() . "\n";
}
