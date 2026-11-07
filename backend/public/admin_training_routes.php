<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */


function trainingStorageConfig(): array
{
    $baseUrl = rtrim((string)($_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: ''), '/');
    $serviceKey = (string)($_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
    if (!$baseUrl || !$serviceKey) throw new RuntimeException('Training storage is not configured.');
    return [$baseUrl, $serviceKey];
}

function trainingStorageRequest(string $method, string $url, string $serviceKey, ?string $body = null, string $contentType = 'application/json'): array
{
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => "Authorization: Bearer {$serviceKey}\r\napikey: {$serviceKey}\r\nContent-Type: {$contentType}\r\n",
        'content' => $body ?? '',
        'timeout' => 30,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    return ['status' => (int)($matches[1] ?? 0), 'body' => $result === false ? '' : $result];
}

function trainingVideoObjectPath(?string $videoUrl): ?string
{
    $value = trim((string)$videoUrl);
    if ($value === '') return null;
    if (preg_match('#/storage/v1/object/public/training_videos/([^?]+)#', $value, $m)) {
        $path = rawurldecode($m[1]);
    } elseif (preg_match('#(?:^|/)Training-Video/([^?]+)$#', $value, $m)) {
        $path = rawurldecode($m[1]);
    } else {
        return null;
    }
    if ($path === '' || str_contains($path, '..') || preg_match('/[^A-Za-z0-9_./-]/', $path)) return null;
    return $path;
}

// Admins receive a short-lived signed upload URL; the service-role key never reaches the browser.
$app->post('/api/admin/training/videos/upload-url', function (Request $request, Response $response) {
    try {
        $data = json_decode($request->getBody()->getContents(), true) ?: [];
        $mime = strtolower(trim((string)($data['content_type'] ?? '')));
        $extensions = ['video/mp4' => 'mp4', 'video/webm' => 'webm', 'video/quicktime' => 'mov'];
        if (!isset($extensions[$mime])) {
            $response->getBody()->write(json_encode(['error' => 'Upload an MP4, WEBM, or MOV video.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
        }

        [$baseUrl, $serviceKey] = trainingStorageConfig();
        $filename = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
        $signUrl = $baseUrl . '/storage/v1/object/upload/sign/training_videos/' . rawurlencode($filename);
        $signed = trainingStorageRequest('POST', $signUrl, $serviceKey, json_encode(['upsert' => false]));
        if ($signed['status'] < 200 || $signed['status'] >= 300) {
            error_log('Training signed upload URL request failed with status ' . $signed['status']);
            throw new RuntimeException('Unable to prepare secure video upload.');
        }
        $payload = json_decode($signed['body'], true) ?: [];
        $relativeUrl = $payload['url'] ?? $payload['signedURL'] ?? null;
        $token = $payload['token'] ?? null;
        if (!$relativeUrl || !$token) throw new RuntimeException('Storage did not return a valid upload token.');
        $uploadUrl = preg_match('#^https?://#i', $relativeUrl) ? $relativeUrl : $baseUrl . '/' . ltrim($relativeUrl, '/');
        if (!str_contains($uploadUrl, 'token=')) {
            $uploadUrl .= (str_contains($uploadUrl, '?') ? '&' : '?') . 'token=' . rawurlencode((string)$token);
        }

        $response->getBody()->write(json_encode([
            'upload_url' => $uploadUrl,
            'token' => $token,
            'object_path' => $filename,
            'video_url' => '/Training-Video/' . $filename,
            'content_type' => $mime
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        error_log('Training signed upload URL failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to prepare secure video upload right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'canAdminAssessments'));

// GET /api/admin/training/videos - List all training videos
$app->get('/api/admin/training/videos', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;
    $search = trim($params['search'] ?? '');

    $where = '';
    $queryParams = [];
    if (!empty($search)) {
        $where = 'WHERE tv.title ILIKE ?';
        $queryParams = ['%' . $search . '%'];
    }

    try {
        $sql = "
            SELECT tv.*, u.\"firstName\", u.\"lastName\" 
            FROM training_videos tv
            LEFT JOIN users u ON tv.created_by = u.id
            {$where}
            ORDER BY tv.created_at DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = "SELECT COUNT(*) FROM training_videos tv {$where}";
        $stmtCount = $conn->prepare($countSql);
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        foreach ($videos as &$video) {
            if (!empty($video['assigned_employee_ids']) && is_string($video['assigned_employee_ids'])) {
                $video['assigned_employee_ids'] = json_decode($video['assigned_employee_ids'], true);
            } else {
                $video['assigned_employee_ids'] = [];
            }
        }
        unset($video);

        $response->getBody()->write(json_encode([
            'data' => $videos,
            'videos' => $videos,
            'total' => $totalCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'canAdminAssessments'));

// POST /api/admin/training/videos - Add a new training video
$app->post('/api/admin/training/videos', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $data = json_decode($request->getBody()->getContents(), true);

    $title = trim($data['title'] ?? '');
    $videoUrl = trim($data['video_url'] ?? '');

    $assignedEmployeeIds = isset($data['assigned_employee_ids']) && is_array($data['assigned_employee_ids'])
        ? json_encode(array_values(array_unique(array_filter($data['assigned_employee_ids'], 'is_string'))))
        : '[]';

    if ($title === '' || !preg_match('#^/Training-Video/[A-Fa-f0-9]{40}\\.(?:mp4|webm|mov)$#', $videoUrl)) {
        $response->getBody()->write(json_encode(['error' => 'A title and a valid uploaded training video are required.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = 'INSERT INTO training_videos (title, video_url, created_by, assigned_employee_ids) VALUES (?, ?, ?, ?)';
        $stmt = $conn->prepare($sql);
        $stmt->execute([$title, $videoUrl, $user->id, $assignedEmployeeIds]);

        $response->getBody()->write(json_encode(['message' => 'Video added successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'canAdminAssessments'));

// DELETE /api/admin/training/videos/{id} - Delete a training video
$app->delete('/api/admin/training/videos/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $find = $conn->prepare('SELECT video_url FROM training_videos WHERE id = ? LIMIT 1');
        $find->execute([$id]);
        $video = $find->fetch(PDO::FETCH_ASSOC);
        if (!$video) {
            $response->getBody()->write(json_encode(['error' => 'Training video was not found.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $objectPath = trainingVideoObjectPath($video['video_url'] ?? '');
        if ($objectPath) {
            [$baseUrl, $serviceKey] = trainingStorageConfig();
            $encodedPath = implode('/', array_map('rawurlencode', explode('/', $objectPath)));
            $deleted = trainingStorageRequest('DELETE', $baseUrl . '/storage/v1/object/training_videos/' . $encodedPath, $serviceKey);
            if ($deleted['status'] < 200 || $deleted['status'] >= 300) {
                error_log('Training video storage delete failed with status ' . $deleted['status']);
                $response->getBody()->write(json_encode(['error' => 'Unable to delete the stored video. Please try again.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
            }
        }

        $stmt = $conn->prepare('DELETE FROM training_videos WHERE id = ?');
        $stmt->execute([$id]);
        $response->getBody()->write(json_encode(['message' => 'Video deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\\Throwable $e) {
        error_log('Training video deletion failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to delete the training video right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'canAdminAssessments'));

// PUT /api/admin/training/videos/{id}/assign - Assign employees to a video
$app->put('/api/admin/training/videos/{id}/assign', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);

    $assignedEmployeeIds = isset($data['assigned_employee_ids']) ? json_encode($data['assigned_employee_ids']) : '[]';

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('UPDATE training_videos SET assigned_employee_ids = ? WHERE id = ?');
        $stmt->execute([$assignedEmployeeIds, $id]);

        $response->getBody()->write(json_encode(['message' => 'Employees assigned successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'canAdminAssessments'));

?>
