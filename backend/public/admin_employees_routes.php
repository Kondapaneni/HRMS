<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get all employees for admin
$app->get('/api/admin/employees', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $params = $request->getQueryParams();
    $search = $params['search'] ?? '';

    $sql = 'SELECT e.id, e."userId", e."employeeId", e."firstName", e."lastName", e.email, e.department, e.position, e.branch, e."joinDate", e.salary, e.status, e.avatar, e."managerId", b.name as branch_name FROM employee e LEFT JOIN branches b ON e.branch = b.id::text';
    $queryParams = [];

    if (!empty($search)) {
        $sql .= ' WHERE e."firstName" ILIKE ? OR e."lastName" ILIKE ? OR e.email ILIKE ? OR e."employeeId" ILIKE ?';
        $searchParam = '%' . $search . '%';
        $queryParams = [$searchParam, $searchParam, $searchParam, $searchParam];
    }

    $sql .= ' ORDER BY e."firstName" ASC';

    try {
        $stmt = $conn->prepare($sql);
        $stmt->execute($queryParams);
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['employees' => $employees]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// Get all branches
$app->get('/api/branches', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->query('SELECT * FROM branches ORDER BY id ASC');
        $branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['branches' => $branches]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin', 'employee']));

// Get single employee for admin
$app->get('/api/admin/employees/{id}', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('
            SELECT e.*, b.name as branch_name, u."isActive", u."mfaEnabled" 
            FROM employee e 
            LEFT JOIN branches b ON e.branch = b.id::text 
            LEFT JOIN users u ON e."userId" = u.id
            WHERE e.id = ?
        ');
        $stmt->execute([$args['id']]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            $response->getBody()->write(json_encode(['error' => 'Employee not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        // Get leave balance
        $stmtLeave = $conn->prepare('
            SELECT 
                SUM(CASE WHEN "leaveType" ILIKE \'paid\' AND status ILIKE \'approved\' THEN days ELSE 0 END) as "paidUsed",
                SUM(CASE WHEN "leaveType" ILIKE \'unpaid\' AND status ILIKE \'approved\' THEN days ELSE 0 END) as "unpaidUsed"
            FROM leaves 
            WHERE "employeeId" = ? AND date_part(\'year\', "startDate") = date_part(\'year\', CURRENT_DATE)
        ');
        $stmtLeave->execute([$employee['userId']]);
        $leaveBalance = $stmtLeave->fetch(PDO::FETCH_ASSOC) ?: ['paidUsed' => 0, 'unpaidUsed' => 0];
        
        $stmtBal = $conn->prepare('SELECT "paidTotal" FROM leave_balances WHERE "employeeId" = ?');
        $stmtBal->execute([$employee['userId']]);
        $balRow = $stmtBal->fetch(PDO::FETCH_ASSOC);
        $leaveBalance['paidTotal'] = $balRow ? $balRow['paidTotal'] : 12;

        // Get recent payslips
        $stmtPayslips = $conn->prepare('SELECT * FROM payslips WHERE "employeeId" = ? ORDER BY year DESC, month DESC LIMIT 5');
        $stmtPayslips->execute([$employee['userId']]);
        $rawPayslips = $stmtPayslips->fetchAll(PDO::FETCH_ASSOC);

        $recentPayslips = array_map(function($p) use ($employee) {
            return [
                'id' => $p['id'],
                'employeeId' => $p['employeeId'],
                'employeeName' => trim(($employee['firstName'] ?? '') . ' ' . ($employee['lastName'] ?? '')),
                'employeeCode' => $employee['employeeId'],
                'month' => (int)$p['month'],
                'year' => (int)$p['year'],
                'netSalary' => (float)$p['netSalary'],
                'status' => $p['status'],
                'earnings' => json_decode($p['earningsJson'], true),
                'deductions' => json_decode($p['deductionsJson'], true),
                'details' => json_decode($p['detailsJson'], true)
            ];
        }, $rawPayslips);

        // Get assets
        $stmtAssets = $conn->prepare('
            SELECT 
                name as "productName", 
                serial_number as "serialNumber", 
                status, 
                created_at as "assignedAt" 
            FROM assets 
            WHERE assigned_to = ?
        ');
        $stmtAssets->execute([$employee['id']]);
        $assets = $stmtAssets->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'employee' => $employee,
            'leaveBalance' => $leaveBalance,
            'recentPayslips' => $recentPayslips,
            'assets' => $assets
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// Update employee for admin
$app->put('/api/admin/employees/{id}', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();

        // 1. Fetch current employee to check for changes and get current timeline
        $stmtCurrent = $conn->prepare('SELECT position, department, branch, salary, timeline FROM employee WHERE id = ?');
        $stmtCurrent->execute([$args['id']]);
        $currentEmp = $stmtCurrent->fetch(PDO::FETCH_ASSOC);

        if (!$currentEmp) {
            throw new Exception('Employee not found');
        }

        $timeline = [];
        if (!empty($currentEmp['timeline'])) {
            $parsed = json_decode($currentEmp['timeline'], true);
            if (is_array($parsed)) {
                $timeline = $parsed;
            }
        }

        $hasTimelineUpdate = false;
        $today = date('Y-m-d');

        // Check Position
        if (isset($data['position']) && $data['position'] !== $currentEmp['position']) {
            $timeline[] = [
                'date' => $today,
                'title' => 'Position Changed',
                'description' => 'Position changed from ' . ($currentEmp['position'] ?: 'None') . ' to ' . $data['position']
            ];
            $hasTimelineUpdate = true;
        }

        // Check Department
        if (isset($data['department']) && $data['department'] !== $currentEmp['department']) {
            $timeline[] = [
                'date' => $today,
                'title' => 'Department Changed',
                'description' => 'Department changed from ' . ($currentEmp['department'] ?: 'None') . ' to ' . $data['department']
            ];
            $hasTimelineUpdate = true;
        }

        // Check Branch
        if (isset($data['branch']) && (string)$data['branch'] !== (string)$currentEmp['branch']) {
            $timeline[] = [
                'date' => $today,
                'title' => 'Branch Changed',
                'description' => 'Branch changed from ' . ($currentEmp['branch'] ?: 'None') . ' to ' . $data['branch']
            ];
            $hasTimelineUpdate = true;
        }

        // Check Salary
        if (isset($data['salary']) && (string)$data['salary'] !== (string)$currentEmp['salary']) {
            $timeline[] = [
                'date' => $today,
                'title' => 'Salary Updated',
                'description' => 'Salary changed from ₹' . ($currentEmp['salary'] ?: '0') . ' to ₹' . $data['salary']
            ];
            $hasTimelineUpdate = true;
        }

        // Build dynamic update query
        $updateFields = [];
        $updateValues = [];
        $allowedFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'gender', 'maritalStatus', 'nationality', 'dateOfBirth', 'bloodGroup', 'workEmail', 'panNumber', 'department', 'position', 'branch', 'salary', 'employmentType', 'noticePeriod', 'shiftTime', 'workMode', 'weekOff', 'joinDate', 'managerId'];
        
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updateFields[] = "\"$field\" = ?";
                $updateValues[] = $data[$field] !== '' ? $data[$field] : null;
            }
        }
        
        if ($hasTimelineUpdate) {
            $updateFields[] = "timeline = ?";
            $updateValues[] = json_encode($timeline);
        }
        
        if (empty($updateFields)) {
            $response->getBody()->write(json_encode(['message' => 'No fields to update']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $updateValues[] = $args['id'];
        $sql = 'UPDATE employee SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($updateValues);
        
        // Update user table if necessary
        if (isset($data['firstName']) || isset($data['lastName']) || isset($data['email'])) {
            $stmtUserFields = [];
            $stmtUserValues = [];
            if (isset($data['firstName'])) { $stmtUserFields[] = '"firstName" = ?'; $stmtUserValues[] = $data['firstName']; }
            if (isset($data['lastName'])) { $stmtUserFields[] = '"lastName" = ?'; $stmtUserValues[] = $data['lastName']; }
            if (isset($data['email'])) { $stmtUserFields[] = 'email = ?'; $stmtUserValues[] = $data['email']; }
            
            $stmtEmpUser = $conn->prepare('SELECT "userId" FROM employee WHERE id = ?');
            $stmtEmpUser->execute([$args['id']]);
            $userId = $stmtEmpUser->fetchColumn();
            
            if ($userId && !empty($stmtUserFields)) {
                $stmtUserValues[] = $userId;
                $sqlUser = 'UPDATE users SET ' . implode(', ', $stmtUserFields) . ' WHERE id = ?';
                $stmtUpdateUser = $conn->prepare($sqlUser);
                $stmtUpdateUser->execute($stmtUserValues);
            }
        }
        
        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Employee updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// Update employee settings for admin
$app->put('/api/admin/employees/{id}/settings', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $updateFields = [];
        $updateValues = [];
        $allowedFields = ['webAttendanceEnabled', 'geoFenceEnabled', 'status', 'employmentStatus', 'employmentStatusDate', 'employmentStatusReason'];
        
        $disableMfa = false;

        // Force business logic for employment status
        if (isset($data['employmentStatus'])) {
            $status = $data['employmentStatus'];
            if (in_array($status, ['Exited', 'Terminated', 'Absconded'])) {
                $data['status'] = 'inactive';
                $data['isActive'] = false;
            } else if ($status === 'Active') {
                $data['status'] = 'active';
                $data['isActive'] = true;
                $data['employmentStatusDate'] = null;
                $data['employmentStatusReason'] = null;
            }
        }

        // Flag to delete MFA configuration if it's being turned off
        if (isset($data['mfaEnabled']) && $data['mfaEnabled'] === false) {
            $disableMfa = true;
        }

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updateFields[] = "\"$field\" = ?";
                $val = $data[$field];
                if (is_bool($val)) {
                    $updateValues[] = $val ? 'true' : 'false';
                } else {
                    $updateValues[] = $val !== '' ? $val : null;
                }
            }
        }
        
        $conn->beginTransaction();
        
        if (!empty($updateFields)) {
            $updateValues[] = $args['id'];
            $sql = 'UPDATE employee SET ' . implode(', ', $updateFields) . ' WHERE id = ?';
            $stmt = $conn->prepare($sql);
            $stmt->execute($updateValues);
        }
        
        // Query user_id to update users table and handle MFA deletion
        $stmtUser = $conn->prepare('SELECT "userId" FROM employee WHERE id = ?');
        $stmtUser->execute([$args['id']]);
        $userId = $stmtUser->fetchColumn();
        
        if ($userId) {
            $userUpdates = [];
            $userValues = [];
            
            if (isset($data['isActive'])) {
                $userUpdates[] = '"isActive" = ?';
                $userValues[] = $data['isActive'] ? 'true' : 'false';
            }
            
            if (isset($data['mfaEnabled'])) {
                $conn->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false');
                $userUpdates[] = '"mfaEnabled" = ?';
                $userValues[] = $data['mfaEnabled'] ? 'true' : 'false';
            }
            
            if (!empty($userUpdates)) {
                $userValues[] = $userId;
                $sqlUser = 'UPDATE users SET ' . implode(', ', $userUpdates) . ' WHERE id = ?';
                $conn->prepare($sqlUser)->execute($userValues);
            }
            
            if ($disableMfa) {
                $conn->prepare('DELETE FROM mfa_secrets WHERE user_id = ?')->execute([$userId]);
                $conn->prepare('DELETE FROM mfa_backup_codes WHERE user_id = ?')->execute([$userId]);
            }
        }
        
        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Settings updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// Create Employee endpoint
$app->post('/api/employees', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $firstName = $data['firstName'] ?? '';
    $lastName = $data['lastName'] ?? '';
    $phone = $data['phone'] ?? '';
    $department = $data['department'] ?? '';
    $position = $data['position'] ?? '';
    $branch = $data['branch_id'] ?? '';
    $joinDate = $data['joinDate'] ?? null;
    $salary = $data['salary'] ?? 0;
    $status = strtolower($data['status'] ?? 'active');
    $managerId = $data['manager_id'] ?? null;

    if (empty($email) || empty($password)) {
        $response->getBody()->write(json_encode(['error' => 'Email and password are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    // Check if email already exists
    $stmtCheck = $conn->prepare('SELECT id FROM users WHERE email = ?');
    $stmtCheck->execute([$email]);
    if ($stmtCheck->fetchColumn()) {
        $response->getBody()->write(json_encode(['error' => 'An employee with this email address already exists.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $conn->beginTransaction();

        // 1. Insert into users table
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $role = 'employee';
        
        $stmtUser = $conn->prepare('INSERT INTO users (email, password, "firstName", "lastName", role, department, position, "forcePasswordChange") VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
        $stmtUser->execute([$email, $hashedPassword, $firstName, $lastName, $role, $department, $position, 'true']);
        
        $userId = $stmtUser->fetchColumn();

        // 2. Insert into employee table
        $employeeId = 'EMP-' . strtoupper(substr(uniqid(), -6));
        
        $stmtEmp = $conn->prepare('
            INSERT INTO employee (
                "employeeId", "userId", "firstName", "lastName", email, phone, 
                branch, department, position, "joinDate", salary, status, "managerId"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        
        $stmtEmp->execute([
            $employeeId, $userId, $firstName, $lastName, $email, $phone,
            $branch, $department, $position, $joinDate, $salary, $status, $managerId
        ]);

        // 3. Queue Welcome Email
        $loginLink = $_ENV['FRONTEND_URL'] ?? 'https://hrms-qwv3.onrender.com';
        $subject = 'Welcome to Acme HRMS - Your Account Details';
        
        $currentYear = date('Y');
        
        $template = file_get_contents(__DIR__ . '/../src/Templates/welcome_email.html');
        $body = str_replace(
            ['{{firstName}}', '{{email}}', '{{password}}', '{{loginLink}}', '{{currentYear}}'],
            [htmlspecialchars($firstName), htmlspecialchars($email), htmlspecialchars($password), htmlspecialchars($loginLink), htmlspecialchars($currentYear)],
            $template
        );
        
        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
        $stmtQueue->execute([$email, $subject, $body]);

        $conn->commit();

        $response->getBody()->write(json_encode([
            'message' => 'Employee created successfully',
            'employeeId' => $employeeId,
            'userId' => $userId
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

    } catch (\Exception $e) {
        $conn->rollBack();
        
        $errorMsg = 'An error occurred while creating the employee.';
        if (strpos($e->getMessage(), '23505') !== false && strpos($e->getMessage(), 'users_email_key') !== false) {
            $errorMsg = 'An employee with this email address already exists.';
        }
        
        $response->getBody()->write(json_encode(['error' => $errorMsg]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
