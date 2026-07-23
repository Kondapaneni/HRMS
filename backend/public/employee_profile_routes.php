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
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email, e.phone, e.address,
                   e.gender, e."maritalStatus", e.nationality, e."dateOfBirth", e."bloodGroup", e."workEmail",
                   e."panNumber", e.department, e.position, e.branch, e.salary, e."employmentType",
                   e."noticePeriod", e."shiftTime", e."workMode", e."weekOff", e."joinDate", e."managerId",
                   e.avatar, e.status, e.timeline, e."geoFenceEnabled", e."webAttendanceEnabled",
                   e."emergencyContact", e."emergencyPhone",
                   b.name as branch_name
            FROM employee e 
            LEFT JOIN branches b ON e.branch::uuid = b.id 
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
             $stmtMgr = $conn->prepare('SELECT id, "employeeId", "firstName", "lastName", position, department, email, avatar FROM employee WHERE id = ? LIMIT 1');
             $stmtMgr->execute([$employee['managerId']]);
             $team['manager'] = $stmtMgr->fetch(PDO::FETCH_ASSOC) ?: null;

             if ($team['manager']) {
                 $stmtPeers = $conn->prepare('SELECT id, "employeeId", "firstName", "lastName", position, department, email, avatar FROM employee WHERE "managerId" = ? AND id != ?');
                 $stmtPeers->execute([$team['manager']['id'], $employee['id']]);
                 $team['peers'] = $stmtPeers->fetchAll(PDO::FETCH_ASSOC) ?: [];
             }
        }

        $stmtSubs = $conn->prepare('SELECT id, "employeeId", "firstName", "lastName", position, department, email, avatar FROM employee WHERE "managerId" = ?');
        $stmtSubs->execute([$employee['id']]);
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

// Update Employee Biometrics
$app->post('/api/employee/biometrics/face', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $faceDescriptorStr = trim($data['faceDescriptor'] ?? '');

    if (empty($faceDescriptorStr) || $faceDescriptorStr === '[]') {
        $response->getBody()->write(json_encode(['error' => 'Face descriptor is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('
            INSERT INTO user_biometrics (user_id, face_descriptor) 
            VALUES (?, ?::vector) 
            ON CONFLICT (user_id) 
            DO UPDATE SET face_descriptor = EXCLUDED.face_descriptor, updated_at = CURRENT_TIMESTAMP
        ');
        $stmt->execute([$decodedToken->id, $faceDescriptorStr]);
        
        $response->getBody()->write(json_encode(['message' => 'Biometrics updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        file_put_contents('biometric_error.log', $e->getMessage() . "\n", FILE_APPEND);
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['employee']));
