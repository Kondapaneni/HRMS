<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/feature-access
/** @var \Slim\App $app */
$app->get('/api/admin/feature-access', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $params = $request->getQueryParams();
    $limit = min(100, max(1, (int)($params['limit'] ?? 50)));
    $requestedPage = max(1, (int)($params['page'] ?? 1));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset']) : ($requestedPage - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
    $search = trim((string)($params['search'] ?? ''));

    $where = "WHERE u.role != 'admin'";
    $queryParams = [];
    if (!empty($search)) {
        $where .= ' AND (u."firstName" ILIKE ? OR u."lastName" ILIKE ? OR u.email ILIKE ? OR e."employeeId" ILIKE ? OR e.department ILIKE ?)';
        $searchTerm = '%' . $search . '%';
        $queryParams = array_fill(0, 5, $searchTerm);
    }

    // Query users and their feature access
    $sql = "
        SELECT 
            u.id, 
            u.\"firstName\", 
            u.\"lastName\", 
            u.email, 
            u.role,
            e.\"employeeId\" AS \"employeeCode\",
            e.department,
            fa.\"canAttendance\", 
            fa.\"canLeave\", 
            fa.\"canPayroll\", 
            fa.\"canExpenses\", 
            fa.\"canEmployees\", 
            fa.\"canRecruitment\", 
            fa.\"canAssets\",
            fa.\"canLoanOrigination\",
            fa.\"canSalesOrigination\",
            fa.\"canBranchOperations\",
            fa.\"canAdminAssessments\"
        FROM users u
        LEFT JOIN employee e ON e.\"userId\" = u.id
        LEFT JOIN user_feature_access fa ON fa.\"userId\" = u.id
        {$where}
        ORDER BY u.\"firstName\" ASC, u.\"lastName\" ASC
        LIMIT ? OFFSET ?
    ";

    try {
        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = "SELECT COUNT(*) FROM users u LEFT JOIN employee e ON e.\"userId\" = u.id {$where}";
        $stmtCount = $conn->prepare($countSql);
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        // Full-population counts; never infer global assignments from a page.
        $featureColumns = ['canAttendance', 'canLeave', 'canPayroll', 'canExpenses',
            'canEmployees', 'canRecruitment', 'canAssets', 'canLoanOrigination',
            'canSalesOrigination', 'canBranchOperations', 'canAdminAssessments'];
        $countExpressions = [];
        foreach ($featureColumns as $column) {
            $countExpressions[] = 'COUNT(*) FILTER (WHERE fa."' . $column . '" IS TRUE) AS "' . $column . '"';
        }
        $fullStats = $conn->query(
            'SELECT ' . implode(', ', $countExpressions) .
            ', COUNT(*) FILTER (WHERE ' .
            implode(' OR ', array_map(
                static fn($column) => 'fa."' . $column . '" IS TRUE',
                $featureColumns
            )) .
            ') AS "delegatedManagers" FROM users u ' .
            'LEFT JOIN user_feature_access fa ON fa."userId" = u.id ' .
            "WHERE u.role != 'admin'"
        )->fetch(PDO::FETCH_ASSOC);
        $featureCounts = [];
        foreach ($featureColumns as $column) {
            $featureCounts[$column] = (int)($fullStats[$column] ?? 0);
        }
        $delegatedManagers = (int)($fullStats['delegatedManagers'] ?? 0);

        // Map nulls to false
        foreach ($users as &$user) {
            $user['canAttendance'] = (bool) $user['canAttendance'];
            $user['canLeave'] = (bool) $user['canLeave'];
            $user['canPayroll'] = (bool) $user['canPayroll'];
            $user['canExpenses'] = (bool) ($user['canExpenses'] ?? false);
            $user['canEmployees'] = (bool) $user['canEmployees'];
            $user['canRecruitment'] = (bool) $user['canRecruitment'];
            $user['canAssets'] = (bool) $user['canAssets'];
            $user['canLoanOrigination'] = (bool) $user['canLoanOrigination'];
            $user['canSalesOrigination'] = (bool) ($user['canSalesOrigination'] ?? false);
            $user['canBranchOperations'] = (bool) ($user['canBranchOperations'] ?? false);
            $user['canAdminAssessments'] = (bool) ($user['canAdminAssessments'] ?? false);
        }
        unset($user);

        $response->getBody()->write(json_encode([
            'data' => $users,
            'users' => $users,
            'total' => $totalCount,
            'featureCounts' => $featureCounts,
            'delegatedManagers' => $delegatedManagers,
            'pagination' => [
                'page' => $page, 'limit' => $limit, 'total' => $totalCount,
                'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($users) < $totalCount,
                'hasPreviousPage' => $offset > 0
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (PDOException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// POST /api/admin/feature-access
$app->post('/api/admin/feature-access', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $userId = $data['userId'] ?? null;
    $feature = $data['feature'] ?? null;
    $value = $data['value'] ?? false;

    if (!$userId || !$feature) {
        $response->getBody()->write(json_encode(['error' => 'Missing userId or feature']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $validFeatures = ['canAttendance', 'canLeave', 'canPayroll', 'canExpenses', 'canEmployees', 'canRecruitment', 'canAssets', 'canLoanOrigination', 'canSalesOrigination', 'canBranchOperations', 'canAdminAssessments'];
    if (!in_array($feature, $validFeatures)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid feature']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        // Upsert logic
        $sql = "
            INSERT INTO user_feature_access (\"userId\", \"$feature\")
            VALUES (:userId, :value)
            ON CONFLICT (\"userId\") 
            DO UPDATE SET \"$feature\" = :value, \"updatedAt\" = CURRENT_TIMESTAMP
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':userId', $userId, PDO::PARAM_STR);
        $stmt->bindValue(':value', $value ? 'true' : 'false', PDO::PARAM_STR);
        $stmt->execute();

        $response->getBody()->write(json_encode(['success' => true, 'message' => 'Feature access updated.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (PDOException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
