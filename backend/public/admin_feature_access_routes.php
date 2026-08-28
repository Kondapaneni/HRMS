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
    
    // Query users and their feature access
    $sql = '
        SELECT 
            u.id, 
            u."firstName", 
            u."lastName", 
            u.email, 
            u.role,
            e."employeeCode",
            e.department,
            fa."canAttendance", 
            fa."canLeave", 
            fa."canPayroll", 
            fa."canEmployees", 
            fa."canRecruitment", 
            fa."canAssets",
            fa."canLoanOrigination",
            fa."canSalesOrigination",
            fa."canBranchOperations",
            fa."canAdminAssessments"
        FROM users u
        LEFT JOIN employee e ON e."userId" = u.id
        LEFT JOIN user_feature_access fa ON fa."userId" = u.id
        WHERE u.role != \'admin\'
        ORDER BY u."firstName" ASC, u."lastName" ASC
    ';

    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Map nulls to false
        foreach ($users as &$user) {
            $user['canAttendance'] = (bool) $user['canAttendance'];
            $user['canLeave'] = (bool) $user['canLeave'];
            $user['canPayroll'] = (bool) $user['canPayroll'];
            $user['canEmployees'] = (bool) $user['canEmployees'];
            $user['canRecruitment'] = (bool) $user['canRecruitment'];
            $user['canAssets'] = (bool) $user['canAssets'];
            $user['canLoanOrigination'] = (bool) $user['canLoanOrigination'];
            $user['canSalesOrigination'] = (bool) ($user['canSalesOrigination'] ?? false);
            $user['canBranchOperations'] = (bool) ($user['canBranchOperations'] ?? false);
            $user['canAdminAssessments'] = (bool) ($user['canAdminAssessments'] ?? false);
        }

        $response->getBody()->write(json_encode($users));
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

    $validFeatures = ['canAttendance', 'canLeave', 'canPayroll', 'canEmployees', 'canRecruitment', 'canAssets', 'canLoanOrigination', 'canSalesOrigination', 'canBranchOperations', 'canAdminAssessments'];
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
