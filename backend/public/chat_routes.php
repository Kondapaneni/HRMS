<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\ChatEncryption;

// GET /api/chat/users - Get all active users for chat
$app->get('/api/chat/users', function (Request $request, Response $response) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query('
        SELECT u.id, u.email, u."firstName", u."lastName", e.avatar 
        FROM users u
        LEFT JOIN employee e ON u.id = e."userId"
        WHERE u."isActive" = true
    ');
    
    $users = $stmt->fetchAll();
    
    $response->getBody()->write(json_encode($users));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// GET /api/chat - Get all my chats with latest message
$app->get('/api/chat', function (Request $request, Response $response) {
    $userId = $request->getAttribute('user')->id;
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $sql = '
        SELECT c.id, c.type, c.name, c."createdAt", c."group_avatar", c."permissions", c."admin_ids",
            (SELECT json_agg(json_build_object(\'id\', u.id, \'firstName\', u."firstName", \'lastName\', u."lastName", \'email\', u.email, \'avatar\', e.avatar))
             FROM chat_participants cp2 
             JOIN users u ON u.id = cp2."userId"
             LEFT JOIN employee e ON u.id = e."userId"
             WHERE cp2."chatId" = c.id) as participants,
            (SELECT row_to_json(m.*) 
             FROM chat_messages m 
             WHERE m."chatId" = c.id 
             ORDER BY m."createdAt" DESC LIMIT 1) as last_message,
            (SELECT COUNT(*) 
             FROM chat_messages m2 
             WHERE m2."chatId" = c.id 
             AND m2."senderId" != ?
             AND NOT (m2."readBy" @> to_jsonb(?::text))
            ) as unread_count
        FROM chats c
        JOIN chat_participants cp ON c.id = cp."chatId"
        WHERE cp."userId" = ?
        ORDER BY (
            SELECT COALESCE(MAX(m."createdAt"), c."createdAt") 
            FROM chat_messages m WHERE m."chatId" = c.id
        ) DESC
    ';
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$userId, $userId, $userId]);
    $chats = $stmt->fetchAll();
    
    foreach ($chats as &$chat) {
        $chat['participants'] = json_decode($chat['participants'], true);
        $chat['permissions'] = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : $chat['permissions'];
        $chat['admin_ids'] = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : $chat['admin_ids'];
        $chat['unread_count'] = (int) $chat['unread_count'];
        if ($chat['last_message']) {
            $lm = json_decode($chat['last_message'], true);
            $lm['content'] = ChatEncryption::decrypt($lm['content']);
            $lm['deliveredTo'] = is_string($lm['deliveredTo']) ? json_decode($lm['deliveredTo'], true) : $lm['deliveredTo'];
            $lm['readBy'] = is_string($lm['readBy']) ? json_decode($lm['readBy'], true) : $lm['readBy'];
            $chat['last_message'] = $lm;
        } else {
            $chat['last_message'] = null;
        }
    }
    
    $response->getBody()->write(json_encode($chats));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// POST /api/chat - Create a new chat
$app->post('/api/chat', function (Request $request, Response $response) {
    $userId = $request->getAttribute('user')->id;
    $data = $request->getParsedBody();
    
    $type = $data['type'] ?? 'personal';
    $name = $data['name'] ?? null;
    $participantIds = $data['participants'] ?? [];
    $groupAvatar = $data['group_avatar'] ?? null;
    $permissions = $data['permissions'] ?? '{"editSettings": true, "sendMessages": true, "addMembers": true, "approveNewMembers": false}';
    
    if (!in_array($userId, $participantIds)) {
        $participantIds[] = $userId;
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();
        
        // Check if personal chat already exists
        if ($type === 'personal' && count($participantIds) === 2) {
            $checkSql = '
                SELECT c.id 
                FROM chats c
                WHERE c.type = \'personal\'
                AND NOT EXISTS (
                    SELECT 1 FROM chat_participants cp WHERE cp."chatId" = c.id AND cp."userId" NOT IN (?, ?)
                )
                AND (
                    SELECT count(*) FROM chat_participants cp WHERE cp."chatId" = c.id
                ) = 2
                LIMIT 1
            ';
            $stmt = $conn->prepare($checkSql);
            $stmt->execute([$participantIds[0], $participantIds[1]]);
            $existing = $stmt->fetchColumn();
            
            if ($existing) {
                $conn->commit();
                $response->getBody()->write(json_encode(['id' => $existing, 'existing' => true]));
                return $response->withHeader('Content-Type', 'application/json');
            }
        }
        
        $adminIds = json_encode([$userId]);
        $permsStr = is_string($permissions) ? $permissions : json_encode($permissions);

        $stmt = $conn->prepare('INSERT INTO chats (type, name, "group_avatar", "permissions", "admin_ids") VALUES (?, ?, ?, ?::jsonb, ?::jsonb) RETURNING id');
        $stmt->execute([$type, $name, $groupAvatar, $permsStr, $adminIds]);
        $chatId = $stmt->fetchColumn();
        
        $insertPart = $conn->prepare('INSERT INTO chat_participants ("chatId", "userId") VALUES (?, ?)');
        foreach ($participantIds as $pid) {
            $insertPart->execute([$chatId, $pid]);
        }
        
        $conn->commit();
        $response->getBody()->write(json_encode(['id' => $chatId]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// GET /api/chat/{id}/messages
$app->get('/api/chat/{id}/messages', function (Request $request, Response $response, $args) {
    $userId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if user is participant
    $stmt = $conn->prepare('SELECT 1 FROM chat_participants WHERE "chatId" = ? AND "userId" = ?');
    $stmt->execute([$chatId, $userId]);
    if (!$stmt->fetchColumn()) {
        return $response->withStatus(403);
    }
    
    $stmt = $conn->prepare('SELECT * FROM chat_messages WHERE "chatId" = ? ORDER BY "createdAt" ASC');
    $stmt->execute([$chatId]);
    $messages = $stmt->fetchAll();
    
    foreach ($messages as &$msg) {
        $msg['content'] = ChatEncryption::decrypt($msg['content']);
        $msg['deliveredTo'] = is_string($msg['deliveredTo']) ? json_decode($msg['deliveredTo'], true) : $msg['deliveredTo'];
        $msg['readBy'] = is_string($msg['readBy']) ? json_decode($msg['readBy'], true) : $msg['readBy'];
    }
    
    $response->getBody()->write(json_encode($messages));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// POST /api/chat/{id}/messages
$app->post('/api/chat/{id}/messages', function (Request $request, Response $response, $args) {
    $userId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('SELECT 1 FROM chat_participants WHERE "chatId" = ? AND "userId" = ?');
    $stmt->execute([$chatId, $userId]);
    if (!$stmt->fetchColumn()) {
        return $response->withStatus(403);
    }
    
    $attachmentUrl = $data['attachmentUrl'] ?? null;
    $attachmentType = $data['attachmentType'] ?? null;
    $attachmentName = $data['attachmentName'] ?? null;
    $attachmentSize = $data['attachmentSize'] ?? null;
    
    // Allow empty content if there's an attachment
    $textContent = $data['content'] ?? '';
    $encryptedContent = ChatEncryption::encrypt($textContent);
    
    $stmt = $conn->prepare('
        INSERT INTO chat_messages ("chatId", "senderId", "content", "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize") 
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
    ');
    $stmt->execute([
        $chatId, 
        $userId, 
        $encryptedContent,
        $attachmentUrl,
        $attachmentType,
        $attachmentName,
        $attachmentSize
    ]);
    
    $msg = $stmt->fetch();
    $msg['content'] = $textContent;
    $msg['deliveredTo'] = is_string($msg['deliveredTo']) ? json_decode($msg['deliveredTo'], true) : $msg['deliveredTo'];
    $msg['readBy'] = is_string($msg['readBy']) ? json_decode($msg['readBy'], true) : $msg['readBy'];
    
    $response->getBody()->write(json_encode($msg));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// POST /api/chat/{id}/messages/receipts
$app->post('/api/chat/{id}/messages/receipts', function (Request $request, Response $response, $args) {
    $userId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $messageIds = $data['messageIds'] ?? [];
    $status = $data['status'] ?? ''; // 'delivered' or 'read'
    
    if (empty($messageIds) || !in_array($status, ['delivered', 'read'])) {
        $response->getBody()->write(json_encode(['success' => false]));
        return $response->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $column = $status === 'delivered' ? '"deliveredTo"' : '"readBy"';
    
    // Use jsonb_insert or similar to add userId if not exists
    // In postgres, we can use:  "deliveredTo" = (SELECT jsonb_agg(DISTINCT elem) FROM jsonb_array_elements("deliveredTo" || ?) elem)
    $placeholders = implode(',', array_fill(0, count($messageIds), '?'));
    $params = array_merge([json_encode([$userId])], $messageIds);
    $params[] = $chatId;
    
    $sql = "UPDATE chat_messages 
            SET $column = (
                SELECT jsonb_agg(DISTINCT elem) 
                FROM jsonb_array_elements($column || ?) elem
            )
            WHERE id IN ($placeholders) AND \"chatId\" = ?";
            
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    
    $response->getBody()->write(json_encode(['success' => true]));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));
