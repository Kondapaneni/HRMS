<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/audit-logs
/** @var \Slim\App $app */
$app->get('/api/admin/audit-logs', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $params = $request->getQueryParams();
    
    // Pagination
    $page = isset($params['page']) ? (int)$params['page'] : 1;
    $limit = isset($params['limit']) ? (int)$params['limit'] : 20;
    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 100) $limit = 20;
    $offset = ($page - 1) * $limit;

    // Filters
    $module = $params['module'] ?? null;
    $action = $params['action'] ?? null;
    $search = $params['search'] ?? null;
    $startDate = $params['startDate'] ?? null;
    $endDate = $params['endDate'] ?? null;

    $where = [];
    $queryArgs = [];

    if ($module) {
        $where[] = 'module_name = ?';
        $queryArgs[] = $module;
    }

    if ($action) {
        $where[] = 'action_type = ?';
        $queryArgs[] = $action;
    }

    if ($startDate) {
        $where[] = 'timestamp >= ?';
        $queryArgs[] = $startDate . ' 00:00:00';
    }

    if ($endDate) {
        $where[] = 'timestamp <= ?';
        $queryArgs[] = $endDate . ' 23:59:59';
    }

    if ($search) {
        $where[] = '((actor_name ILIKE ?) OR (target_employee_name ILIKE ?) OR (actor_user_id::text ILIKE ?))';
        $searchTerm = '%' . $search . '%';
        $queryArgs[] = $searchTerm;
        $queryArgs[] = $searchTerm;
        $queryArgs[] = $searchTerm;
    }

    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    try {
        // Get total count
        $countQuery = "SELECT COUNT(*) FROM audit_logs $whereClause";
        $stmtCount = $conn->prepare($countQuery);
        $stmtCount->execute($queryArgs);
        $total = $stmtCount->fetchColumn();

        // Get logs
        $query = "
            SELECT 
                audit_id, module_name, entity_type, entity_id, action_type,
                actor_user_id, actor_name, actor_role, target_employee_id, target_employee_name,
                previous_values, new_values, changed_fields, timestamp, ip_address, browser_information, session_id
            FROM audit_logs
            $whereClause
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        ";
        
        // Add limit and offset to query args
        $queryArgs[] = $limit;
        $queryArgs[] = $offset;

        $stmt = $conn->prepare($query);
        $stmt->execute($queryArgs);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $uuids = [];
        $uuidRegex = '/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/';
        
        $extractUuids = function($data) use (&$uuids, $uuidRegex) {
            if (is_array($data)) {
                array_walk_recursive($data, function($item) use (&$uuids, $uuidRegex) {
                    if (is_string($item) && preg_match($uuidRegex, $item)) {
                        $uuids[$item] = true;
                    }
                });
            }
        };

        // Decode JSON fields to actual JSON objects for the frontend
        foreach ($logs as &$log) {
            $log['previous_values'] = $log['previous_values'] ? json_decode($log['previous_values'], true) : null;
            $log['new_values'] = $log['new_values'] ? json_decode($log['new_values'], true) : null;
            $log['changed_fields'] = $log['changed_fields'] ? json_decode($log['changed_fields'], true) : null;
            
            $extractUuids($log['previous_values']);
            $extractUuids($log['new_values']);
            $extractUuids($log['changed_fields']);
        }

        $idMap = [];
        if (!empty($uuids)) {
            $uuidList = array_keys($uuids);
            
            // To prevent issues with too many placeholders if someone has massive logs, we chunk it
            foreach (array_chunk($uuidList, 100) as $chunk) {
                $placeholders = implode(',', array_fill(0, count($chunk), '?'));
                
                $stmtU = $conn->prepare("SELECT id, \"firstName\" || ' ' || \"lastName\" as name FROM users WHERE id IN ($placeholders)");
                $stmtU->execute($chunk);
                while ($row = $stmtU->fetch(PDO::FETCH_ASSOC)) {
                    $idMap[$row['id']] = $row['name'];
                }
                
                $stmtE = $conn->prepare("SELECT id, \"firstName\" || ' ' || \"lastName\" as name FROM employee WHERE id IN ($placeholders)");
                $stmtE->execute($chunk);
                while ($row = $stmtE->fetch(PDO::FETCH_ASSOC)) {
                    // if it already exists, no need to overwrite, but append if needed
                    $idMap[$row['id']] = $row['name'];
                }
            }
        }

        $response->getBody()->write(json_encode([
            'data' => $logs,
            'idMap' => $idMap,
            'pagination' => [
                'total' => (int)$total,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($total / $limit)
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
