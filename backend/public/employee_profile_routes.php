<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get Employee Profile
/** @var \Slim\App $app */
$app->get('/api/employee/profile', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('
            SELECT e.*, b.name as branch_name 
            FROM employee e 
            LEFT JOIN branches b ON e.branch = b.id::text 
            WHERE e."userId" = ? LIMIT 1
        ');
        $stmt->execute([$decodedToken->id]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            throw new Exception("Employee profile not found.");
        }

        // We could also fetch manager details, peers, and subordinates here if needed,
        // but for now we just return the employee data directly.
        $team = [
            'manager' => null,
            'peers' => [],
            'subordinates' => []
        ];

        if ($employee['managerId']) {
             $stmtMgr = $conn->prepare('SELECT id, "employeeId", "firstName", "lastName", position, department, email, avatar FROM employee WHERE "employeeId" = ? OR id::text = ? LIMIT 1');
             $stmtMgr->execute([$employee['managerId'], $employee['managerId']]);
             $team['manager'] = $stmtMgr->fetch(PDO::FETCH_ASSOC) ?: null;

             if ($team['manager']) {
                 $stmtPeers = $conn->prepare('SELECT id, "employeeId", "firstName", "lastName", position, department, email, avatar FROM employee WHERE ("managerId" = ? OR "managerId" = ?) AND id != ?');
                 $stmtPeers->execute([$team['manager']['employeeId'], $team['manager']['id'], $employee['id']]);
                 $team['peers'] = $stmtPeers->fetchAll(PDO::FETCH_ASSOC) ?: [];
             }
        }

        $stmtSubs = $conn->prepare('SELECT id, "employeeId", "firstName", "lastName", position, department, email, avatar FROM employee WHERE "managerId" = ? OR "managerId" = ?');
        $stmtSubs->execute([$employee['employeeId'], (string)$employee['id']]);
        $team['subordinates'] = $stmtSubs->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $stmtAssets = $conn->prepare('SELECT id, name, category, serial_number, status, created_at FROM assets WHERE assigned_to = ? ORDER BY created_at DESC');
        $stmtAssets->execute([$employee['id']]);
        $assets = $stmtAssets->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $response->getBody()->write(json_encode([
            'profile' => $employee,
            'team' => $team,
            'assets' => $assets
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));


// Update Employee Profile
$app->put('/api/employee/profile', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $email = trim($data['email'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? '');
    $gender = trim($data['gender'] ?? '');
    $maritalStatus = trim($data['maritalStatus'] ?? '');
    $nationality = trim($data['nationality'] ?? '');
    $dateOfBirth = trim($data['dateOfBirth'] ?? '');
    $bloodGroup = trim($data['bloodGroup'] ?? '');
    $emergencyContact = trim($data['emergencyContact'] ?? '');
    $emergencyPhone = trim($data['emergencyPhone'] ?? '');

    if (empty($firstName) || empty($lastName) || empty($email)) {
        $response->getBody()->write(json_encode(['error' => 'First name, last name, and email are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $conn->beginTransaction();

        $stmtCheck = $conn->prepare('SELECT "userId" FROM employee WHERE "userId" = ?');
        $stmtCheck->execute([$decodedToken->id]);
        if (!$stmtCheck->fetch()) {
            throw new Exception("Employee record not found.");
        }

        // Update Users Table
        $stmtUpdateUser = $conn->prepare('UPDATE users SET "firstName" = ?, "lastName" = ?, email = ? WHERE id = ?');
        $stmtUpdateUser->execute([$firstName, $lastName, $email, $decodedToken->id]);

        // Update Employee Table
        $stmtUpdateEmp = $conn->prepare('
            UPDATE employee 
            SET "firstName" = ?, "lastName" = ?, email = ?, phone = ?, address = ?, gender = ?, 
                "maritalStatus" = ?, nationality = ?, "dateOfBirth" = ?, "bloodGroup" = ?, 
                "emergencyContact" = ?, "emergencyPhone" = ?
            WHERE "userId" = ?
        ');
        $stmtUpdateEmp->execute([
            $firstName, $lastName, $email, $phone, $address, $gender,
            $maritalStatus, $nationality, $dateOfBirth ?: null, $bloodGroup,
            $emergencyContact, $emergencyPhone, $decodedToken->id
        ]);

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Profile updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));

// Update Employee Avatar
$app->post('/api/employee/profile/avatar', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $avatarUrl = trim($data['avatar'] ?? '');

    if (empty($avatarUrl)) {
        $response->getBody()->write(json_encode(['error' => 'Avatar URL is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmtUpdateEmp = $conn->prepare('UPDATE employee SET avatar = ? WHERE "userId" = ?');
        $stmtUpdateEmp->execute([$avatarUrl, $decodedToken->id]);
        
        $response->getBody()->write(json_encode(['message' => 'Avatar updated successfully', 'avatar' => $avatarUrl]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['employee']));
