<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get all candidate users
$app->get('/api/admin/candidates', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->query('SELECT id, "firstName", "lastName", email FROM users WHERE role = \'candidate\'');
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['candidates' => $candidates]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));
