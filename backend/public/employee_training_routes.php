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
            WHERE tv.assigned_employee_ids @> :userId::jsonb
            ORDER BY tv.created_at DESC
        ';
        
        // Encode the user ID as a JSON array string so we can use the @> operator
        // For example: '["4d5e6f..."]'
        $userIdJson = json_encode([$user->id]);
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':userId', $userIdJson);
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
