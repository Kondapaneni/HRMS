<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();
$stmt = $conn->prepare("SELECT id, pending_participants FROM chats WHERE type = 'group' LIMIT 1");
$stmt->execute();
$chat = $stmt->fetch();
echo "Chat ID: " . $chat['id'] . "\n";
echo "Pending raw: " . $chat['pending_participants'] . "\n";
$pending = is_string($chat['pending_participants']) ? json_decode($chat['pending_participants'], true) : ($chat['pending_participants'] ?? []);
var_dump($pending);
$pending[] = 999;
$stmt = $conn->prepare('UPDATE chats SET pending_participants = ?::jsonb WHERE id = ?');
$stmt->execute([json_encode(array_values($pending)), $chat['id']]);
echo "Updated.\n";
