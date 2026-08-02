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

    try {
        $sql = '
            SELECT tv.*, u."firstName", u."lastName" 
            FROM training_videos tv
            LEFT JOIN users u ON tv.created_by = u.id
            ORDER BY tv.created_at DESC
        ';
        $stmt = $conn->query($sql);
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($videos as &$video) {
            if (!empty($video['assigned_employee_ids']) && is_string($video['assigned_employee_ids'])) {
                $video['assigned_employee_ids'] = json_decode($video['assigned_employee_ids'], true);
            } else {
                $video['assigned_employee_ids'] = [];
            }
        }

        $response->getBody()->write(json_encode($videos));
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

?>
