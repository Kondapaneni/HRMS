<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */

// GET /api/employee/training/videos - List training videos assigned to the logged-in employee
$app->get('/api/employee/training/videos', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // Find videos where assigned_employee_ids contains the user's ID
        // Note: the assigned_employee_ids column is JSONB.
        $sql = '
            SELECT tv.id, tv.title, tv.video_url, tv.created_at
            FROM training_videos tv
            WHERE tv.assigned_employee_ids @> :userIdInt::jsonb
               OR tv.assigned_employee_ids @> :userIdStr::jsonb
            ORDER BY tv.created_at DESC
        ';
        
        $userIdIntJson = json_encode([(int)$user->id]);
        $userIdStrJson = json_encode([(string)$user->id]);
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':userIdInt', $userIdIntJson);
        $stmt->bindValue(':userIdStr', $userIdStrJson);
        $stmt->execute();
        
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode($videos));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

?>
