<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

// Protect these routes with AuthMiddleware if needed
$app->get('/api/leads/list', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $queryParams = $request->getQueryParams();
    $search = $queryParams['search'] ?? '';

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $sql = "
            SELECT id, name, phone, address, status, created_at
            FROM public.loan_leads
            WHERE created_by = :uid
        ";
        $params = [':uid' => $user->id];

        if (!empty($search)) {
            $sql .= " AND (name ILIKE :search OR phone ILIKE :search OR address ILIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'success' => true,
            'leads' => $leads
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        
    } catch (\PDOException $e) {
        error_log("Database error fetching leads: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while fetching leads']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error fetching leads: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching leads']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware());
