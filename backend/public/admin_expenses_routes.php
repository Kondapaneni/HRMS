<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get All Expenses for Admin
/** @var \Slim\App $app */
$app->get('/api/admin/expenses', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    $params = $request->getQueryParams();
    $page = max(1, (int)($params['page'] ?? 1));
    $limit = max(1, min(100, (int)($params['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;
    $search = trim($params['search'] ?? '');
    $status = trim($params['status'] ?? '');
    $category = trim($params['category'] ?? '');

    try {
        // Aggregate KPI stats across the entire table
        $statsStmt = $conn->query('
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count,
                COALESCE(SUM(CASE WHEN status = \'Pending\' THEN amount ELSE 0 END), 0) as pending_amount,
                COALESCE(COUNT(CASE WHEN status = \'Pending\' THEN 1 END), 0) as pending_count,
                COALESCE(SUM(CASE WHEN status = \'Approved\' THEN amount ELSE 0 END), 0) as approved_amount,
                COALESCE(COUNT(CASE WHEN status = \'Approved\' THEN 1 END), 0) as approved_count,
                COALESCE(SUM(CASE WHEN status = \'Rejected\' THEN amount ELSE 0 END), 0) as rejected_amount,
                COALESCE(COUNT(CASE WHEN status = \'Rejected\' THEN 1 END), 0) as rejected_count
            FROM expenses
        ');
        $statsRaw = $statsStmt->fetch(PDO::FETCH_ASSOC);

        $stats = [
            'totalAmount' => (float)$statsRaw['total_amount'],
            'totalCount' => (int)$statsRaw['total_count'],
            'pendingAmount' => (float)$statsRaw['pending_amount'],
            'pendingCount' => (int)$statsRaw['pending_count'],
            'approvedAmount' => (float)$statsRaw['approved_amount'],
            'approvedCount' => (int)$statsRaw['approved_count'],
            'rejectedAmount' => (float)$statsRaw['rejected_amount'],
            'rejectedCount' => (int)$statsRaw['rejected_count']
        ];

        // Build filtered query
        $whereConditions = [];
        $queryParams = [];

        if (!empty($search)) {
            $whereConditions[] = '(e."firstName" ILIKE ? OR e."lastName" ILIKE ? OR e."employeeId" ILIKE ? OR ex.title ILIKE ? OR ex.category ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $queryParams[] = $searchTerm;
            $queryParams[] = $searchTerm;
            $queryParams[] = $searchTerm;
            $searchTerm2 = '%' . $search . '%';
            $queryParams[] = $searchTerm2;
            $queryParams[] = $searchTerm2;
        }

        if (!empty($status) && $status !== 'All') {
            $whereConditions[] = 'ex.status = ?';
            $queryParams[] = $status;
        }

        if (!empty($category) && $category !== 'All') {
            $whereConditions[] = 'ex.category = ?';
            $queryParams[] = $category;
        }

        $whereSql = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

        // Count total filtered
        $countSql = "
            SELECT COUNT(*) 
            FROM expenses ex
            LEFT JOIN employee e ON ex.user_id = e.\"userId\"
            $whereSql
        ";
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute($queryParams);
        $totalCount = (int)$countStmt->fetchColumn();

        // Fetch paginated expenses
        $dataSql = "
            SELECT ex.*, e.\"firstName\", e.\"lastName\", e.\"employeeId\" as employee_ref, e.\"position\", e.\"department\"
            FROM expenses ex
            LEFT JOIN employee e ON ex.user_id = e.\"userId\"
            $whereSql
            ORDER BY ex.created_at DESC
            LIMIT ? OFFSET ?
        ";
        $dataStmt = $conn->prepare($dataSql);
        $execParams = array_merge($queryParams, [$limit, $offset]);
        $dataStmt->execute($execParams);
        $expenses = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'expenses' => $expenses,
            'stats' => $stats,
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
})->add(new AuthMiddleware(['admin'], 'canExpenses'));


$app->get('/api/admin/expenses/{id}/bill', function (Request $request, Response $response, $args) {
    try {
        $db = new Database(); $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT user_id, bill_url FROM expenses WHERE id = ? LIMIT 1');
        $stmt->execute([$args['id']]);
        $expense = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$expense || empty($expense['bill_url'])) return $response->withStatus(404);
        $path = expenseObjectPath((string)$expense['bill_url'], (string)$expense['user_id']);
        if (!$path) return $response->withStatus(404);
        [$baseUrl, $serviceKey] = expenseStorageConfig();
        $download = expenseStorageRequest('GET', $path, $serviceKey, $baseUrl);
        if ($download['status'] !== 200) return $response->withStatus(404);
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'application/octet-stream';
        $response->getBody()->write($download['body']);
        return $response->withHeader('Content-Type', $mime)->withHeader('Content-Disposition', 'inline')
            ->withHeader('Cache-Control', 'private, no-store, max-age=0')->withHeader('X-Content-Type-Options', 'nosniff');
    } catch (Throwable $e) {
        error_log('Admin expense receipt access failed: ' . $e->getMessage());
        return $response->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'canExpenses'));

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
})->add(new AuthMiddleware(['admin'], 'canExpenses'));
