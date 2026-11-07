<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */

// GET /api/employee/training/videos - List training videos assigned to the logged-in employee with progress
$app->get('/api/employee/training/videos', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // The JWT user->id is the users table ID. 
        // We need to get the employee table ID for this user since AdminTrainingVideos assigns by employee.id
        $stmtEmp = $conn->prepare('SELECT id FROM employee WHERE "userId" = :uid LIMIT 1');
        $stmtEmp->execute([':uid' => $user->id]);
        $employeeRecord = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        
        if (!$employeeRecord) {
            // If user is not an employee, return empty array
            $response->getBody()->write(json_encode([]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }
        
        $employeeId = $employeeRecord['id'];
        
        $sql = '
            SELECT 
                tv.id, 
                tv.title, 
                tv.video_url, 
                tv.created_at,
                COALESCE(etp.completed, false) as is_completed,
                etp.completed_at
            FROM training_videos tv
            LEFT JOIN public.employee_training_progress etp 
                ON etp.video_id = tv.id AND etp.employee_id = :empIdUuid
            WHERE jsonb_array_length(COALESCE(tv.assigned_employee_ids, ''[]''::jsonb)) = 0
               OR tv.assigned_employee_ids @> :employeeIdInt::jsonb
               OR tv.assigned_employee_ids @> :employeeIdStr::jsonb
            ORDER BY tv.created_at DESC
        ';
        
        $employeeIdIntJson = json_encode([(int)$employeeId]);
        $employeeIdStrJson = json_encode([(string)$employeeId]);
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':empIdUuid', $employeeId);
        $stmt->bindValue(':employeeIdInt', $employeeIdIntJson);
        $stmt->bindValue(':employeeIdStr', $employeeIdStrJson);
        $stmt->execute();
        
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // The assignment query above authorizes the employee; only then issue a
        // time-limited signed URL for each private training video.
        foreach ($videos as &$video) {
            $video['video_url'] = trainingVideoSignedUrl($video['video_url'] ?? null);
        }
        unset($video);


        // Normalize boolean is_completed
        $formattedVideos = array_map(function($v) {
            $v['is_completed'] = filter_var($v['is_completed'], FILTER_VALIDATE_BOOLEAN);
            return $v;
        }, $videos);

        $response->getBody()->write(json_encode($formattedVideos));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Throwable $e) {
        error_log('Employee training video list failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to load training videos right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// POST /api/employee/training/progress - Mark a video as completed or uncompleted
$app->post('/api/employee/training/progress', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $body = json_decode((string)$request->getBody(), true) ?? [];
    
    $videoId = $body['video_id'] ?? null;
    $completed = isset($body['completed']) ? (bool)$body['completed'] : true;
    
    if (!$videoId) {
        $response->getBody()->write(json_encode(['error' => 'video_id is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmtEmp = $conn->prepare('SELECT id FROM employee WHERE "userId" = :uid LIMIT 1');
        $stmtEmp->execute([':uid' => $user->id]);
        $employeeRecord = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        
        if (!$employeeRecord) {
            $response->getBody()->write(json_encode(['error' => 'Employee record not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }
        
        $employeeId = $employeeRecord['id'];

        // A user may update progress only for a course they can actually access.
        $accessStmt = $conn->prepare('
            SELECT 1
            FROM training_videos
            WHERE id = :videoId
              AND (
                  jsonb_array_length(COALESCE(assigned_employee_ids, ''[]''::jsonb)) = 0
                  OR assigned_employee_ids @> :employeeIdInt::jsonb
                  OR assigned_employee_ids @> :employeeIdStr::jsonb
              )
            LIMIT 1
        ');
        $accessStmt->execute([
            ':videoId' => $videoId,
            ':employeeIdInt' => json_encode([(int)$employeeId]),
            ':employeeIdStr' => json_encode([(string)$employeeId])
        ]);
        if (!$accessStmt->fetchColumn()) {
            $response->getBody()->write(json_encode(['error' => 'Training video was not found or is not assigned to you.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }
        
        $stmt = $conn->prepare('
            INSERT INTO public.employee_training_progress (employee_id, user_id, video_id, completed, completed_at, updated_at)
            VALUES (:empId, :userId, :videoId, :completed, :completedAt, NOW())
            ON CONFLICT (employee_id, video_id)
            DO UPDATE SET 
                completed = EXCLUDED.completed,
                completed_at = EXCLUDED.completed_at,
                updated_at = NOW()
            RETURNING id, employee_id, video_id, completed, completed_at
        ');
        
        $now = $completed ? date('Y-m-d H:i:s') : null;
        $stmt->execute([
            ':empId' => $employeeId,
            ':userId' => $user->id,
            ':videoId' => $videoId,
            ':completed' => $completed ? 1 : 0,
            ':completedAt' => $now
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            $result['completed'] = filter_var($result['completed'], FILTER_VALIDATE_BOOLEAN);
        }
        
        $response->getBody()->write(json_encode([
            'success' => true,
            'video_id' => $videoId,
            'completed' => (bool)$completed,
            'data' => $result
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Throwable $e) {
        error_log('Employee training progress update failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to update training progress right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// GET /api/employee/training/progress - Get all progress records for current employee
$app->get('/api/employee/training/progress', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmtEmp = $conn->prepare('SELECT id FROM employee WHERE "userId" = :uid LIMIT 1');
        $stmtEmp->execute([':uid' => $user->id]);
        $employeeRecord = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        
        if (!$employeeRecord) {
            $response->getBody()->write(json_encode([]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }
        
        $employeeId = $employeeRecord['id'];
        
        $stmt = $conn->prepare('
            SELECT video_id, completed, completed_at, created_at, updated_at
            FROM public.employee_training_progress
            WHERE employee_id = :empId
        ');
        $stmt->execute([':empId' => $employeeId]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array_map(function($r) {
            $r['completed'] = filter_var($r['completed'], FILTER_VALIDATE_BOOLEAN);
            return $r;
        }, $records);

        $response->getBody()->write(json_encode($formatted));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Throwable $e) {
        error_log('Employee training progress list failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to load training progress right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());
