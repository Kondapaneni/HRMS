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
        $stmt = $conn->query('SELECT id, "firstName", "lastName", email FROM users WHERE role IN (\'candidate\', \'employee\')');
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['candidates' => $candidates]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Send generic email to candidate
$app->post('/api/admin/send-email', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $data = json_decode($request->getBody()->getContents(), true);
    $toEmail = $data['to'] ?? '';
    $subject = $data['subject'] ?? '';
    $body = $data['body'] ?? '';
    
    if (empty($toEmail) || empty($subject) || empty($body)) {
        $response->getBody()->write(json_encode(['error' => 'Missing required fields']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    
    try {
        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
        $stmtQueue->execute([$toEmail, $subject, $body]);

        $response->getBody()->write(json_encode(['message' => 'Email queued successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
