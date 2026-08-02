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
            SELECT tv.id, tv.title, tv.video_url, tv.created_at
            FROM training_videos tv
            WHERE tv.assigned_employee_ids @> :employeeIdInt::jsonb
               OR tv.assigned_employee_ids @> :employeeIdStr::jsonb
            ORDER BY tv.created_at DESC
        ';
        
        $employeeIdIntJson = json_encode([(int)$employeeId]);
        $employeeIdStrJson = json_encode([(string)$employeeId]);
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':employeeIdInt', $employeeIdIntJson);
        $stmt->bindValue(':employeeIdStr', $employeeIdStrJson);
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
