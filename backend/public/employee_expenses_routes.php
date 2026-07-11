<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get Employee Expenses
/** @var \Slim\App $app */
$app->get('/api/employee/expenses', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();

    $params = $request->getQueryParams();
    $page = max(1, (int)($params['page'] ?? 1));
    $limit = max(1, min(100, (int)($params['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    try {
        $countQuery = "SELECT COUNT(*) FROM expenses WHERE user_id = ?";
        $stmtCount = $conn->prepare($countQuery);
        $stmtCount->execute([$decodedToken->id]);
        $totalCount = (int)$stmtCount->fetchColumn();
        $stmt = $conn->prepare('SELECT id, user_id, title, description, amount, category, bill_url, status, remarks, created_at FROM expenses WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
        $stmt->execute([$decodedToken->id, $limit, $offset]);
        $expenses = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'expenses' => $expenses,
            'pagination' => [
                'total' => $totalCount,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($totalCount / $limit)
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));

// Add Expense
$app->post('/api/employee/expenses', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();

    $title = trim($data['title'] ?? '');
    $description = trim($data['description'] ?? '');
    $amount = $data['amount'] ?? 0;
    $category = $data['category'] ?? '';
    $bill_url = $data['bill_url'] ?? null;

    if (empty($title) || empty($amount) || empty($category)) {
        $response->getBody()->write(json_encode(['error' => 'Title, amount, and category are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('
            INSERT INTO expenses (user_id, title, description, amount, category, bill_url)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([$decodedToken->id, $title, $description, $amount, $category, $bill_url]);

        $response->getBody()->write(json_encode(['message' => 'Expense submitted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));

// Delete Expense
$app->delete('/api/employee/expenses/{id}', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $expenseId = $args['id'];
    
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // Only allow deleting Pending expenses
        $stmtCheck = $conn->prepare('SELECT status FROM expenses WHERE id = ? AND user_id = ?');
        $stmtCheck->execute([$expenseId, $decodedToken->id]);
        $expense = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$expense) {
            throw new Exception("Expense not found or unauthorized");
        }
        
        if ($expense['status'] !== 'Pending') {
            throw new Exception("Can only delete Pending expenses");
        }

        $stmtDel = $conn->prepare('DELETE FROM expenses WHERE id = ?');
        $stmtDel->execute([$expenseId]);

        $response->getBody()->write(json_encode(['message' => 'Expense deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));
