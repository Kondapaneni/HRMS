<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\ChatEncryption;

// GET /api/chat/users - Get all active users for chat
/** @var \Slim\App $app */
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
        WITH user_chats AS (
            SELECT c.id, c.type, c.name, c."createdAt", c."group_avatar", c."permissions", c."admin_ids", c."pending_participants", cp."joinedAt"
            FROM chats c
            JOIN chat_participants cp ON c.id = cp."chatId"
            WHERE cp."userId" = ?
        ),
        chat_parts AS (
            SELECT cp2."chatId", json_agg(json_build_object(\'id\', u.id, \'firstName\', u."firstName", \'lastName\', u."lastName", \'email\', u.email, \'avatar\', e.avatar)) as participants
            FROM chat_participants cp2
            JOIN users u ON u.id = cp2."userId"
            LEFT JOIN employee e ON u.id = e."userId"
            WHERE cp2."chatId" IN (SELECT id FROM user_chats)
            GROUP BY cp2."chatId"
        ),
        chat_msgs AS (
            SELECT m."chatId",
                   COUNT(*) FILTER (WHERE m."senderId" != ? AND NOT (m."readBy" @> ?::jsonb)) as unread_count,
                   MAX(m."createdAt") as max_created_at
            FROM chat_messages m
            JOIN user_chats uc ON m."chatId" = uc.id
            WHERE m."createdAt" >= uc."joinedAt"
            GROUP BY m."chatId"
        ),
        last_msg AS (
            SELECT DISTINCT ON (m."chatId") m."chatId", row_to_json(m.*) as last_message
            FROM chat_messages m
            JOIN user_chats uc ON m."chatId" = uc.id
            WHERE m."createdAt" >= uc."joinedAt"
            ORDER BY m."chatId", m."createdAt" DESC
        )
        SELECT uc.id, uc.type, uc.name, uc."createdAt", uc."group_avatar", uc."permissions", uc."admin_ids", uc."pending_participants",
               cp.participants,
               lm.last_message,
               COALESCE(cm.unread_count, 0) as unread_count
        FROM user_chats uc
        LEFT JOIN chat_parts cp ON uc.id = cp."chatId"
        LEFT JOIN chat_msgs cm ON uc.id = cm."chatId"
        LEFT JOIN last_msg lm ON uc.id = lm."chatId"
        ORDER BY COALESCE(cm.max_created_at, uc."createdAt") DESC
    ';
    
    $stmt = $conn->prepare($sql);
    $stmt->execute([$userId, $userId, json_encode([$userId])]);
    $chats = $stmt->fetchAll();
    
    foreach ($chats as &$chat) {
        $chat['participants'] = is_string($chat['participants']) ? json_decode($chat['participants'], true) : $chat['participants'];
        $chat['permissions'] = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : $chat['permissions'];
        $chat['admin_ids'] = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : $chat['admin_ids'];
        $chat['pending_participants'] = is_string($chat['pending_participants']) ? json_decode($chat['pending_participants'], true) : ($chat['pending_participants'] ?? []);
        if (!is_array($chat['pending_participants'])) $chat['pending_participants'] = [];
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
    try {
        $userId = $request->getAttribute('user')->id;
        $chatId = $args['id'];
        
        $db = new Database();
        $conn = $db->getConnection();
        
        // Check if user is participant
        $stmt = $conn->prepare('SELECT "joinedAt" FROM chat_participants WHERE "chatId" = ? AND "userId" = ?');
        $stmt->execute([$chatId, $userId]);
        $joinedAt = $stmt->fetchColumn();
        if (!$joinedAt) {
            return $response->withStatus(403);
        }
        
        $stmt = $conn->prepare('SELECT id, "chatId", "senderId", content, "attachmentUrl", "attachmentType", "attachmentName", "attachmentSize", "deliveredTo", "readBy", "isSystemMessage", "createdAt" FROM chat_messages WHERE "chatId" = ? AND "createdAt" >= ? ORDER BY "createdAt" ASC');
        $stmt->execute([$chatId, $joinedAt]);
        $messages = $stmt->fetchAll();
        
        foreach ($messages as &$msg) {
            $msg['content'] = ChatEncryption::decrypt($msg['content']);
            $msg['deliveredTo'] = is_string($msg['deliveredTo']) ? json_decode($msg['deliveredTo'], true) : $msg['deliveredTo'];
            $msg['readBy'] = is_string($msg['readBy']) ? json_decode($msg['readBy'], true) : $msg['readBy'];
        }
        
        $response->getBody()->write(json_encode($messages));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\PDOException $e) {
        $response->getBody()->write(json_encode(['error' => 'Database error: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'An error occurred: ' . $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// POST /api/chat/{id}/messages
$app->post('/api/chat/{id}/messages', function (Request $request, Response $response, $args) {
    $userId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('SELECT type, admin_ids, permissions FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    // Check sendMessages permission
    if ($chat && $chat['type'] === 'group') {
        $permissions = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : ($chat['permissions'] ?? []);
        $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
        
        $canSend = $permissions['sendMessages'] ?? true;
        if (!$canSend && !in_array($userId, $adminIds)) {
            $response->getBody()->write(json_encode(['error' => 'Only admins can send messages in this group']));
            return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
        }
    }
    
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

// PUT /api/chat/{id}
$app->put('/api/chat/{id}', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $name = $data['name'] ?? null;
    
    if (!$name) {
        $response->getBody()->write(json_encode(['error' => 'Name is required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if chat exists and is a group
    $stmt = $conn->prepare('SELECT type, admin_ids, permissions FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    $permissions = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : ($chat['permissions'] ?? []);
    
    // Check if current user is allowed to edit group info
    $canEdit = $permissions['editSettings'] ?? true;
    if (!$canEdit && !in_array($currentUserId, $adminIds)) {
        $response->getBody()->write(json_encode(['error' => 'Only admins can edit group info']));
        return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
    }
    
    $stmt = $conn->prepare('UPDATE chats SET name = ? WHERE id = ?');
    $stmt->execute([$name, $chatId]);
    
    $response->getBody()->write(json_encode(['success' => true, 'name' => $name]));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// PUT /api/chat/{id}/avatar
$app->put('/api/chat/{id}/avatar', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $groupAvatar = $data['group_avatar'] ?? null;
    
    if (!$groupAvatar) {
        $response->getBody()->write(json_encode(['error' => 'Group avatar URL is required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if chat exists and is a group
    $stmt = $conn->prepare('SELECT type, admin_ids, permissions FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    $permissions = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : ($chat['permissions'] ?? []);
    
    // Check if current user is allowed to edit group info
    $canEdit = $permissions['editSettings'] ?? true;
    if (!$canEdit && !in_array($currentUserId, $adminIds)) {
        $response->getBody()->write(json_encode(['error' => 'Only admins can edit group info']));
        return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
    }
    
    $stmt = $conn->prepare('UPDATE chats SET group_avatar = ? WHERE id = ?');
    $stmt->execute([$groupAvatar, $chatId]);
    
    $response->getBody()->write(json_encode(['success' => true, 'group_avatar' => $groupAvatar]));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// PUT /api/chat/{id}/admins/toggle
$app->put('/api/chat/{id}/admins/toggle', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $targetUserId = $data['targetUserId'] ?? null;
    
    if (!$targetUserId) {
        $response->getBody()->write(json_encode(['error' => 'targetUserId is required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if chat exists and is a group
    $stmt = $conn->prepare('SELECT type, admin_ids FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    
    // Check if current user is an admin
    if (!in_array($currentUserId, $adminIds)) {
        return $response->withStatus(403);
    }
    
    // Check if target user is a participant
    $stmt = $conn->prepare('SELECT 1 FROM chat_participants WHERE "chatId" = ? AND "userId" = ?');
    $stmt->execute([$chatId, $targetUserId]);
    if (!$stmt->fetchColumn()) {
        $response->getBody()->write(json_encode(['error' => 'Target user is not a participant']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    // Toggle admin status
    if (in_array($targetUserId, $adminIds)) {
        // Only allow remove if there's more than 1 admin
        if (count($adminIds) <= 1) {
            $response->getBody()->write(json_encode(['error' => 'Cannot remove the last admin']));
            return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
        }
        $adminIds = array_values(array_filter($adminIds, fn($id) => $id != $targetUserId));
    } else {
        $adminIds[] = $targetUserId;
    }
    
    $stmt = $conn->prepare('UPDATE chats SET admin_ids = ?::jsonb WHERE id = ?');
    $stmt->execute([json_encode($adminIds), $chatId]);
    
    $response->getBody()->write(json_encode(['success' => true, 'admin_ids' => $adminIds]));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// PUT /api/chat/{id}/permissions
$app->put('/api/chat/{id}/permissions', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $permissionKey = $data['permissionKey'] ?? null;
    $permissionValue = $data['permissionValue'] ?? null;
    
    if (!$permissionKey || $permissionValue === null) {
        $response->getBody()->write(json_encode(['error' => 'permissionKey and permissionValue are required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('SELECT type, admin_ids, permissions FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    
    // Check if current user is an admin
    if (!in_array($currentUserId, $adminIds)) {
        return $response->withStatus(403);
    }
    
    $permissions = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : ($chat['permissions'] ?? []);
    
    // Update the specific permission
    $permissions[$permissionKey] = (bool)$permissionValue;
    
    $stmt = $conn->prepare('UPDATE chats SET permissions = ?::jsonb WHERE id = ?');
    $stmt->execute([json_encode($permissions), $chatId]);
    
    $response->getBody()->write(json_encode(['success' => true, 'permissions' => $permissions]));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// POST /api/chat/{id}/participants
$app->post('/api/chat/{id}/participants', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $userIds = $data['userIds'] ?? [];
    
    if (empty($userIds) || !is_array($userIds)) {
        $response->getBody()->write(json_encode(['error' => 'userIds array is required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if chat exists and user is participant
    $stmt = $conn->prepare('SELECT type, admin_ids, permissions, pending_participants FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $stmt = $conn->prepare('SELECT 1 FROM chat_participants WHERE "chatId" = ? AND "userId" = ?');
    $stmt->execute([$chatId, $currentUserId]);
    if (!$stmt->fetchColumn()) {
        return $response->withStatus(403);
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    $permissions = is_string($chat['permissions']) ? json_decode($chat['permissions'], true) : ($chat['permissions'] ?? []);
    if (!is_array($permissions)) $permissions = [];
    $pending = is_string($chat['pending_participants']) ? json_decode($chat['pending_participants'], true) : ($chat['pending_participants'] ?? []);
    if (!is_array($pending)) $pending = [];
    
    $amIAdmin = in_array($currentUserId, $adminIds);
    $canAdd = $permissions['addMembers'] ?? true;
    
    if (!$canAdd && !$amIAdmin) {
        $response->getBody()->write(json_encode(['error' => 'Only admins can add members to this group']));
        return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
    }
    
    $requiresApproval = ($permissions['approveNewMembers'] ?? false) && !$amIAdmin;
    
    try {
        $conn->beginTransaction();
        
        if ($requiresApproval) {
            // Add to pending
            foreach ($userIds as $uid) {
                if (!in_array($uid, $pending)) {
                    $pending[] = $uid;
                }
            }
            $stmt = $conn->prepare('UPDATE chats SET pending_participants = ?::jsonb WHERE id = ?');
            $stmt->execute([json_encode(array_values($pending)), $chatId]);
            $status = 'pending';
        } else {
            // Directly add
            $insertPart = $conn->prepare('INSERT INTO chat_participants ("chatId", "userId") VALUES (?, ?) ON CONFLICT DO NOTHING');
            
            $actorStmt = $conn->prepare('SELECT "firstName" FROM users WHERE id = ?');
            $actorStmt->execute([$currentUserId]);
            $actorName = $actorStmt->fetchColumn() ?: 'Someone';
            $targetStmt = $conn->prepare('SELECT "firstName" FROM users WHERE id = ?');
            $sysStmt = $conn->prepare('INSERT INTO chat_messages ("chatId", "senderId", "content", "isSystemMessage") VALUES (?, ?, ?, true)');
            
            foreach ($userIds as $uid) {
                $insertPart->execute([$chatId, $uid]);
                if ($insertPart->rowCount() > 0) {
                    $targetStmt->execute([$uid]);
                    $targetName = $targetStmt->fetchColumn() ?: 'User';
                    $msgContent = $actorName . " added " . $targetName;
                    $sysStmt->execute([$chatId, $currentUserId, ChatEncryption::encrypt($msgContent)]);
                }
            }
            // Remove from pending if they were there
            $pending = array_values(array_filter($pending, fn($id) => !in_array($id, $userIds)));
            $stmt = $conn->prepare('UPDATE chats SET pending_participants = ?::jsonb WHERE id = ?');
            $stmt->execute([json_encode($pending), $chatId]);
            $status = 'added';
        }
        
        $conn->commit();
        $response->getBody()->write(json_encode(['success' => true, 'status' => $status]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// PUT /api/chat/{id}/participants/pending
$app->put('/api/chat/{id}/participants/pending', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $data = $request->getParsedBody();
    $userId = $data['userId'] ?? null;
    $action = $data['action'] ?? null; // 'approve' or 'reject'
    
    if (!$userId || !in_array($action, ['approve', 'reject'])) {
        $response->getBody()->write(json_encode(['error' => 'Valid userId and action (approve/reject) are required']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('SELECT type, admin_ids, pending_participants FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    if (!in_array($currentUserId, $adminIds)) {
        return $response->withStatus(403);
    }
    
    $pending = is_string($chat['pending_participants']) ? json_decode($chat['pending_participants'], true) : ($chat['pending_participants'] ?? []);
    if (!is_array($pending)) $pending = [];
    
    if (!in_array($userId, $pending)) {
        $response->getBody()->write(json_encode(['error' => 'User not in pending list']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    try {
        $conn->beginTransaction();
        
        $pending = array_values(array_filter($pending, fn($id) => $id != $userId));
        $stmt = $conn->prepare('UPDATE chats SET pending_participants = ?::jsonb WHERE id = ?');
        $stmt->execute([json_encode($pending), $chatId]);
        
        if ($action === 'approve') {
            $insertPart = $conn->prepare('INSERT INTO chat_participants ("chatId", "userId") VALUES (?, ?) ON CONFLICT DO NOTHING');
            $insertPart->execute([$chatId, $userId]);
            if ($insertPart->rowCount() > 0) {
                $actorStmt = $conn->prepare('SELECT "firstName" FROM users WHERE id = ?');
                $actorStmt->execute([$currentUserId]);
                $actorName = $actorStmt->fetchColumn() ?: 'Someone';
                
                $targetStmt = $conn->prepare('SELECT "firstName" FROM users WHERE id = ?');
                $targetStmt->execute([$userId]);
                $targetName = $targetStmt->fetchColumn() ?: 'User';
                
                $msgContent = $actorName . " added " . $targetName;
                $sysStmt = $conn->prepare('INSERT INTO chat_messages ("chatId", "senderId", "content", "isSystemMessage") VALUES (?, ?, ?, true)');
                $sysStmt->execute([$chatId, $currentUserId, ChatEncryption::encrypt($msgContent)]);
            }
        }
        
        $conn->commit();
        $response->getBody()->write(json_encode(['success' => true, 'action' => $action]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

// DELETE /api/chat/{id}/participants/{userId}
$app->delete('/api/chat/{id}/participants/{userId}', function (Request $request, Response $response, $args) {
    $currentUserId = $request->getAttribute('user')->id;
    $chatId = $args['id'];
    $userIdToRemove = $args['userId'];
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('SELECT type, admin_ids FROM chats WHERE id = ?');
    $stmt->execute([$chatId]);
    $chat = $stmt->fetch();
    
    if (!$chat || $chat['type'] !== 'group') {
        $response->getBody()->write(json_encode(['error' => 'Not a group chat']));
        return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
    }
    
    $adminIds = is_string($chat['admin_ids']) ? json_decode($chat['admin_ids'], true) : ($chat['admin_ids'] ?? []);
    
    // Authorization
    if ($currentUserId != $userIdToRemove) {
        if (!in_array($currentUserId, $adminIds)) {
            $response->getBody()->write(json_encode(['error' => 'Only admins can remove members']));
            return $response->withStatus(403)->withHeader('Content-Type', 'application/json');
        }
    } else {
        // User is exiting
        if (in_array($currentUserId, $adminIds) && count($adminIds) === 1) {
            $stmt = $conn->prepare('SELECT COUNT(*) FROM chat_participants WHERE "chatId" = ?');
            $stmt->execute([$chatId]);
            $participantCount = (int)$stmt->fetchColumn();
            
            if ($participantCount > 1) {
                $response->getBody()->write(json_encode(['error' => 'You must promote another member to admin before exiting.']));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            } else {
                $response->getBody()->write(json_encode(['error' => 'You are the only member in the group, you cannot exit.']));
                return $response->withStatus(400)->withHeader('Content-Type', 'application/json');
            }
        }
    }
    
    try {
        $conn->beginTransaction();
        
        $stmt = $conn->prepare('DELETE FROM chat_participants WHERE "chatId" = ? AND "userId" = ?');
        $stmt->execute([$chatId, $userIdToRemove]);
        
        if ($stmt->rowCount() > 0) {
            $actorStmt = $conn->prepare('SELECT "firstName" FROM users WHERE id = ?');
            $actorStmt->execute([$currentUserId]);
            $actorName = $actorStmt->fetchColumn() ?: 'Someone';
            
            $targetStmt = $conn->prepare('SELECT "firstName" FROM users WHERE id = ?');
            $targetStmt->execute([$userIdToRemove]);
            $targetName = $targetStmt->fetchColumn() ?: 'User';
            
            if ($currentUserId == $userIdToRemove) {
                $msgContent = $actorName . " exited";
            } else {
                $msgContent = $actorName . " removed " . $targetName;
            }
            
            $sysStmt = $conn->prepare('INSERT INTO chat_messages ("chatId", "senderId", "content", "isSystemMessage") VALUES (?, ?, ?, true)');
            $sysStmt->execute([$chatId, $currentUserId, ChatEncryption::encrypt($msgContent)]);
        }
        
        // Remove from admins if they were an admin
        if (in_array($userIdToRemove, $adminIds)) {
            $adminIds = array_values(array_filter($adminIds, fn($id) => $id != $userIdToRemove));
            $stmt = $conn->prepare('UPDATE chats SET admin_ids = ?::jsonb WHERE id = ?');
            $stmt->execute([json_encode($adminIds), $chatId]);
        }
        
        $conn->commit();
        $response->getBody()->write(json_encode(['success' => true]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));
