<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Database;
use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$db = new Database();
$conn = $db->getConnection();

$sql = '
CREATE TABLE IF NOT EXISTS user_public_keys (
    "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    "publicKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN (\'personal\', \'group\')),
    name VARCHAR(255) NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_participants (
    "chatId" UUID REFERENCES chats(id) ON DELETE CASCADE,
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("chatId", "userId")
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatId" UUID REFERENCES chats(id) ON DELETE CASCADE,
    "senderId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "encryptedPayload" TEXT NOT NULL,
    "encryptedSymmetricKeys" JSONB NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Turn on realtime for chat_messages table (Supabase feature)
-- We use a raw query, if this fails on standard Postgres, we can ignore it.
DO $$
BEGIN
    -- Check if publication supabase_realtime exists
    IF EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = \'supabase_realtime\'
    ) THEN
        -- Add table to publication if not already added
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = \'supabase_realtime\' AND tablename = \'chat_messages\'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
        END IF;
    END IF;
END $$;
';

try {
    $conn->exec($sql);
    echo "Chat schema migration completed successfully.\n";
} catch (PDOException $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
