<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

function expenseObjectPath(?string $storedPath, string $ownerId): ?string
{
    $stored = (string)$storedPath;
    if (str_starts_with($stored, 'storage:expenses/')) $path = substr($stored, strlen('storage:expenses/'));
    elseif (str_contains($stored, '/Bills/')) $path = substr($stored, strpos($stored, '/Bills/') + strlen('/Bills/'));
    elseif (str_starts_with($stored, '/Bills/')) $path = substr($stored, strlen('/Bills/'));
    else return null;
    if ($path === '' || str_contains($path, '..') || preg_match('/[^A-Za-z0-9_./-]/', $path)) return null;
    if (!str_starts_with($path, $ownerId . '/')) return null;
    return $path;
}

function expenseStorageRequest(string $method, string $objectPath, string $serviceKey, string $baseUrl, ?string $body = null, string $contentType = 'application/octet-stream')
{
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/expenses/' . implode('/', $segments);
    $headers = ['Authorization: Bearer ' . $serviceKey, 'apikey: ' . $serviceKey, 'Content-Type: ' . $contentType, 'Cache-Control: no-store'];
    $context = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $body ?? '', 'timeout' => 25, 'ignore_errors' => true]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    return ['status' => (int)($matches[1] ?? 0), 'body' => $result === false ? '' : $result];
}

function expenseStorageConfig(): array
{
    $url = rtrim($_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: '', '/');
    $key = $_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '';
    if (!$url || !$key) throw new RuntimeException('Private storage is not configured.');
    return [$url, $key];
}


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


$app->post('/api/employee/expenses/bill', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $file = $request->getUploadedFiles()['file'] ?? null;
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        $response->getBody()->write(json_encode(['error' => 'Receipt must be smaller than 5 MB.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    $contents = $file->getStream()->getContents();
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    $extensions = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) {
        $response->getBody()->write(json_encode(['error' => 'Only PDF, JPEG, PNG, and WEBP receipts are accepted.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }
    try {
        [$baseUrl, $serviceKey] = expenseStorageConfig();
        $objectPath = (string)$user->id . '/' . bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
        $upload = expenseStorageRequest('POST', $objectPath, $serviceKey, $baseUrl, $contents, $mime);
        if ($upload['status'] < 200 || $upload['status'] >= 300) throw new RuntimeException('Storage upload failed.');
        $response->getBody()->write(json_encode(['bill_url' => 'storage:expenses/' . $objectPath]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        error_log('Expense receipt upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload receipt.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['employee']));

$app->get('/api/employee/expenses/{id}/bill', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    try {
        $db = new Database(); $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT bill_url FROM expenses WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$args['id'], $user->id]);
        $stored = $stmt->fetchColumn();
        $path = expenseObjectPath($stored === false ? null : (string)$stored, (string)$user->id);
        if (!$path) return $response->withStatus(404);
        [$baseUrl, $serviceKey] = expenseStorageConfig();
        $download = expenseStorageRequest('GET', $path, $serviceKey, $baseUrl);
        if ($download['status'] !== 200) return $response->withStatus(404);
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'application/octet-stream';
        $response->getBody()->write($download['body']);
        return $response->withHeader('Content-Type', $mime)->withHeader('Content-Disposition', 'inline')
            ->withHeader('Cache-Control', 'private, no-store, max-age=0')->withHeader('X-Content-Type-Options', 'nosniff');
    } catch (Throwable $e) { error_log('Employee expense receipt access failed: ' . $e->getMessage()); return $response->withStatus(503); }
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
