<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get All Expenses for Admin
$app->get('/api/admin/expenses', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('
            SELECT ex.*, e."firstName", e."lastName", e."employeeId" as employee_ref
            FROM expenses ex
            LEFT JOIN employee e ON ex.user_id = e."userId"
            ORDER BY ex.created_at DESC
        ');
        $stmt->execute();
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['expenses' => $expenses]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['admin']));

// Update Expense Status (Approve/Reject)
$app->put('/api/admin/expenses/{id}', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $expenseId = $args['id'];
    
    $status = $data['status'] ?? '';
    $remarks = $data['remarks'] ?? '';

    if (!in_array($status, ['Approved', 'Rejected'])) {
        $response->getBody()->write(json_encode(['error' => 'Invalid status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('UPDATE expenses SET status = ?, remarks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$status, $remarks, $expenseId]);

        $response->getBody()->write(json_encode(['message' => 'Expense updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['admin']));
