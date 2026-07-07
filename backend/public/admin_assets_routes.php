<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/assets
// Fetches all assets with their assigned employee details
/** @var \Slim\App $app */
$app->get('/api/admin/assets', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    $params = $request->getQueryParams();
    $page = max(1, (int)($params['page'] ?? 1));
    $limit = max(1, min(100, (int)($params['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    try {
        $countQuery = "SELECT COUNT(*) FROM assets";
        $totalCount = (int)$conn->query($countQuery)->fetchColumn();

        $query = "
            SELECT 
                a.id, a.name, a.category, a.serial_number, a.status, a.assigned_to, a.created_at,
                e.\"userId\" as employee_id, e.\"firstName\" as employee_first_name, e.\"lastName\" as employee_last_name
            FROM assets a
            LEFT JOIN employee e ON a.assigned_to = e.id
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->execute([$limit, $offset]);
        $assets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'data' => $assets,
            'pagination' => [
                'total' => $totalCount,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($totalCount / $limit)
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'assets'));

// POST /api/admin/assets
// Creates a new asset
$app->post('/api/admin/assets', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $data = json_decode($request->getBody()->getContents(), true);

    if (empty($data['name']) || empty($data['category'])) {
        $response->getBody()->write(json_encode(['error' => 'Name and category are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $assigned_to = $data['assigned_to'] ?? null;
        if ($assigned_to) {
            $empStmt = $conn->prepare('SELECT id FROM employee WHERE "userId" = ?');
            $empStmt->execute([$assigned_to]);
            $emp = $empStmt->fetch();
            if ($emp) {
                $assigned_to = $emp['id'];
            } else {
                throw new \Exception('Employee profile not found for user');
            }
        }

        $query = "
            INSERT INTO assets (name, category, serial_number, status, assigned_to)
            VALUES (?, ?, ?, ?, ?)
            RETURNING *
        ";
        $stmt = $conn->prepare($query);
        $stmt->execute([
            $data['name'],
            $data['category'],
            $data['serial_number'] ?? null,
            $data['status'] ?? 'Available',
            $assigned_to
        ]);
        
        $asset = $stmt->fetch(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['message' => 'Asset created successfully', 'data' => $asset]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'assets'));

// PUT /api/admin/assets/{id}
// Updates an asset (e.g., assignment)
$app->put('/api/admin/assets/{id}', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);

    try {
        $fields = [];
        $values = [];

        if (isset($data['name'])) {
            $fields[] = "name = ?";
            $values[] = $data['name'];
        }
        if (isset($data['category'])) {
            $fields[] = "category = ?";
            $values[] = $data['category'];
        }
        if (isset($data['serial_number'])) {
            $fields[] = "serial_number = ?";
            $values[] = $data['serial_number'];
        }
        if (isset($data['status'])) {
            $fields[] = "status = ?";
            $values[] = $data['status'];
        }
        if (array_key_exists('assigned_to', $data)) {
            $assigned_to = $data['assigned_to'];
            if ($assigned_to) {
                $empStmt = $conn->prepare('SELECT id FROM employee WHERE "userId" = ?');
                $empStmt->execute([$assigned_to]);
                $emp = $empStmt->fetch();
                if ($emp) {
                    $assigned_to = $emp['id'];
                } else {
                    throw new \Exception('Employee profile not found for user');
                }
            }

            $fields[] = "assigned_to = ?";
            $values[] = $assigned_to;
            
            // Automatically update status based on assignment if status wasn't explicitly passed
            if (!isset($data['status'])) {
                $fields[] = "status = ?";
                $values[] = $assigned_to ? 'Assigned' : 'Available';
            }
        }

        if (empty($fields)) {
            $response->getBody()->write(json_encode(['error' => 'No fields to update']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $values[] = $id;
        $setClause = implode(', ', $fields);

        $query = "UPDATE assets SET $setClause WHERE id = ? RETURNING *";
        $stmt = $conn->prepare($query);
        $stmt->execute($values);
        
        if ($stmt->rowCount() === 0) {
            $response->getBody()->write(json_encode(['error' => 'Asset not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $asset = $stmt->fetch(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['message' => 'Asset updated successfully', 'data' => $asset]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'assets'));

// GET /api/admin/assets/{id}/history
// Fetches the assignment and status history of an asset
$app->get('/api/admin/assets/{id}/history', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $id = $args['id'];

    try {
        $query = "
            SELECT 
                al.timestamp,
                al.action_type,
                al.changed_fields,
                al.new_values->>'status' as status,
                al.new_values->>'assigned_to' as assigned_to_employee_id,
                e.\"firstName\",
                e.\"lastName\"
            FROM audit_logs al
            LEFT JOIN employee e ON e.id = (al.new_values->>'assigned_to')::uuid
            WHERE al.entity_type = 'assets' AND al.entity_id = ?
            ORDER BY al.timestamp DESC
        ";
        $stmt = $conn->prepare($query);
        $stmt->execute([$id]);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['data' => $history]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'assets'));

// DELETE /api/admin/assets/{id}
// Deletes an asset
$app->delete('/api/admin/assets/{id}', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $id = $args['id'];

    try {
        $query = "DELETE FROM assets WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            $response->getBody()->write(json_encode(['error' => 'Asset not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $response->getBody()->write(json_encode(['message' => 'Asset deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'assets'));
