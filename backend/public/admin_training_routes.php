<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */

// GET /api/admin/training/videos - List all training videos
$app->get('/api/admin/training/videos', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = min(50, max(1, (int)($params['limit'] ?? 12)));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset'])
        : (max(1, (int)($params['page'] ?? 1)) - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
    $search = trim((string)($params['search'] ?? ''));
    $assignment = (string)($params['assignment'] ?? 'All');
    $filters = [];
    $queryParams = [];
    if ($search !== '') {
        $filters[] = 'tv.title ILIKE ?';
        $queryParams[] = '%' . $search . '%';
    }
    if ($assignment === 'Assigned') {
        $filters[] = "jsonb_array_length(COALESCE(tv.assigned_employee_ids::jsonb, '[]'::jsonb)) > 0";
    } elseif ($assignment === 'Open') {
        $filters[] = "jsonb_array_length(COALESCE(tv.assigned_employee_ids::jsonb, '[]'::jsonb)) = 0";
    }
    $where = $filters ? 'WHERE ' . implode(' AND ', $filters) : '';

    try {
        $sql = "
            SELECT tv.*, u.\"firstName\", u.\"lastName\" 
            FROM training_videos tv
            LEFT JOIN users u ON tv.created_by = u.id
            {$where}
            ORDER BY tv.created_at DESC, tv.id ASC
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

        // Aggregate independent of the current page and search filters.
        $stats = $conn->query(
            "SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(assigned_employee_ids::jsonb, '[]'::jsonb)) > 0) AS assigned_courses
             FROM training_videos"
        )->fetch(PDO::FETCH_ASSOC);
        $enrolled = (int)$conn->query(
            "SELECT COUNT(DISTINCT employee_id) FROM training_videos tv
             CROSS JOIN LATERAL jsonb_array_elements_text(
               COALESCE(tv.assigned_employee_ids::jsonb, '[]'::jsonb)
             ) AS employee_id"
        )->fetchColumn();
        $response->getBody()->write(json_encode([
            'data' => $videos,
            'videos' => $videos,
            'total' => $totalCount,
            'stats' => ['total' => (int)($stats['total'] ?? 0),
                'assignedCourses' => (int)($stats['assigned_courses'] ?? 0),
                'enrolledStaff' => $enrolled],
            'pagination' => ['page' => $page, 'limit' => $limit,
                'total' => $totalCount, 'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($videos) < $totalCount,
                'hasPreviousPage' => $offset > 0]
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

    $assignedEmployeeIds = isset($data['assigned_employee_ids']) ? json_encode($data['assigned_employee_ids']) : '[]';

    if (empty($title) || empty($videoUrl)) {
        $response->getBody()->write(json_encode(['error' => 'Title and video URL are required']));
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
        // Optionally, one could delete the file from Supabase storage here,
        // but for now we just delete the database record.
        $stmt = $conn->prepare('DELETE FROM training_videos WHERE id = ?');
        $stmt->execute([$id]);

        $response->getBody()->write(json_encode(['message' => 'Video deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
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
