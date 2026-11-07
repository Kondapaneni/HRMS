<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get all employees for admin
/** @var \Slim\App $app */
$app->get('/api/admin/employees', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $params = $request->getQueryParams();
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;
    $search = $params['search'] ?? '';

    $whereClause = '';
    $queryParams = [];

    if (!empty($search)) {
        $whereClause = ' WHERE e."firstName" ILIKE ? OR e."lastName" ILIKE ? OR e.email ILIKE ? OR e."employeeId" ILIKE ?';
        $searchParam = '%' . $search . '%';
        $queryParams = [$searchParam, $searchParam, $searchParam, $searchParam];
    }

    $sql = 'SELECT e.id, e."userId", e."employeeId", e."firstName", e."lastName", e.email, e.department, e.position, e.branch, e."joinDate", e.salary, e.status, e.avatar, e."managerId", b.name as branch_name FROM employee e LEFT JOIN branches b ON e.branch::uuid = b.id' . $whereClause . ' ORDER BY e."firstName" ASC LIMIT ? OFFSET ?';

    try {
        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($queryParams as $param) {
            $stmt->bindValue($paramIndex++, $param);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = 'SELECT COUNT(*) FROM employee e' . $whereClause;
        $stmtCount = $conn->prepare($countSql);
        $paramIndex = 1;
        foreach ($queryParams as $param) {
            $stmtCount->bindValue($paramIndex++, $param);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        $response->getBody()->write(json_encode([
            'employees' => $employees,
            'total' => $totalCount
        ]));
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
        $stmt = $conn->query('SELECT id, name FROM branches ORDER BY id ASC');
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
            LEFT JOIN branches b ON e.branch::uuid = b.id
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
        $stmtPayslips = $conn->prepare('SELECT id, "employeeId", year, month, "netSalary", "status", "detailsJson", "earningsJson", "deductionsJson", "createdAt" FROM payslips WHERE "employeeId" = ? ORDER BY year DESC, month DESC LIMIT 5');
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
})->add(new AuthMiddleware(['admin'], 'employees'));

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
        $allowedFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'gender', 'maritalStatus', 'nationality', 'dateOfBirth', 'bloodGroup', 'workEmail', 'panNumber', 'department', 'position', 'branch', 'salary', 'employmentType', 'noticePeriod', 'shiftTime', 'workMode', 'weekOff', 'joinDate', 'managerId', 'avatar'];
        
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
        \App\Utils\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Employee updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'employees'));

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
        \App\Utils\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Settings updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        if (isset($conn) && $conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'employees'));

// Convert candidate to employee
$app->post('/api/admin/employees/convert', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    
    $userId = $data['userId'] ?? '';
    $employeeId = $data['employeeId'] ?? '';
    $firstName = $data['firstName'] ?? '';
    $lastName = $data['lastName'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $department = $data['department'] ?? '';
    $position = $data['position'] ?? '';
    $branch = $data['branch'] ?? '';
    $joinDate = $data['joinDate'] ?? null;
    $salary = $data['salary'] ?? 0;
    $status = $data['status'] ?? 'active';
    $managerId = $data['managerId'] ?? null;

    if (empty($userId) || empty($employeeId) || empty($firstName)) {
        $response->getBody()->write(json_encode(['error' => 'Required fields are missing.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $conn->beginTransaction();

        // 1. Insert into employee table
        $stmtEmp = $conn->prepare('
            INSERT INTO employee (
                "employeeId", "userId", "firstName", "lastName", email, phone, 
                department, position, branch, "joinDate", salary, status, "managerId"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ');
        $stmtEmp->execute([
            $employeeId, $userId, $firstName, $lastName, $email, $phone, 
            $department, $position, $branch, $joinDate, $salary, strtolower($status), $managerId
        ]);

        // 2. Update users table role and info
        $stmtUser = $conn->prepare('
            UPDATE users SET 
                role = ?, "firstName" = ?, "lastName" = ?, department = ?, position = ?
            WHERE id = ?
        ');
        $stmtUser->execute(['employee', $firstName, $lastName, $department, $position, $userId]);

        $conn->commit();
        \App\Utils\Cache::delete('dashboard_stats');

        $response->getBody()->write(json_encode([
            'message' => 'Candidate converted to employee successfully',
            'employeeId' => $employeeId,
            'userId' => $userId
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => 'An error occurred while converting the candidate: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'employees'));

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

    if (!\App\Utils\PasswordValidator::validate($password)) {
        $response->getBody()->write(json_encode(['error' => \App\Utils\PasswordValidator::getPolicyMessage()]));
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
        ');
        
        $stmtEmp->execute([
            $employeeId, $userId, $firstName, $lastName, $email, $phone,
            $branch, $department, $position, $joinDate, $salary, $status, $managerId
        ]);
        $empPkId = $stmtEmp->fetchColumn();

        // 3. Queue Welcome Email
        $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? '', '/');
        $loginLink = !empty($frontendUrl) ? ($frontendUrl . '/login') : '/login';
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

        \App\Utils\Cache::delete('dashboard_stats');

        $response->getBody()->write(json_encode([
            'message' => 'Employee created successfully',
            'id' => $empPkId,
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
})->add(new AuthMiddleware(['admin'], 'employees'));

// Promote employee with position & salary update, timeline milestone, and promotion letter email
$app->post('/api/admin/employees/{id}/promote', function (Request $request, Response $response, $args) {
    $empId = $args['id'];
    $data = $request->getParsedBody() ?? [];

    $newPosition = trim($data['newPosition'] ?? '');
    $newSalary = $data['newSalary'] ?? null;
    $effectiveDate = !empty($data['effectiveDate']) ? $data['effectiveDate'] : date('Y-m-d');
    $notes = trim($data['notes'] ?? '');
    $sendEmail = isset($data['sendEmail']) ? filter_var($data['sendEmail'], FILTER_VALIDATE_BOOLEAN) : true;

    if (empty($newPosition)) {
        $response->getBody()->write(json_encode(['error' => 'New position is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if ($newSalary === null || !is_numeric($newSalary) || (float)$newSalary < 0) {
        $response->getBody()->write(json_encode(['error' => 'A valid salary amount is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $conn->beginTransaction();

        // 1. Fetch current employee
        $stmt = $conn->prepare('
            SELECT id, "userId", "employeeId", "firstName", "lastName", email, position, salary, department, timeline 
            FROM employee 
            WHERE id = ?
        ');
        $stmt->execute([$empId]);
        $emp = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$emp) {
            $conn->rollBack();
            $response->getBody()->write(json_encode(['error' => 'Employee not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $oldPosition = $emp['position'] ?: 'Staff Member';
        $oldSalary = (float)($emp['salary'] ?? 0);
        $revisedSalary = (float)$newSalary;

        $positionChanged = (trim($newPosition) !== trim($oldPosition));
        $salaryChanged = (abs($revisedSalary - $oldSalary) > 0.01);

        // Calculate hike percentage
        $hikeText = '';
        $hikeBadge = 'Unchanged';
        if ($oldSalary > 0 && $revisedSalary > $oldSalary) {
            $diff = $revisedSalary - $oldSalary;
            $pct = round(($diff / $oldSalary) * 100);
            $hikeText = "+{$pct}% hike";
            $hikeBadge = "+{$pct}% Hike";
        } elseif ($revisedSalary < $oldSalary) {
            $diff = $oldSalary - $revisedSalary;
            $pct = $oldSalary > 0 ? round(($diff / $oldSalary) * 100) : 0;
            $hikeBadge = "-{$pct}% Adjustment";
        } elseif ($revisedSalary === $oldSalary) {
            $hikeBadge = 'Retained (Same Pay)';
        }

        // 2. Determine titles, badges, and opening paragraphs adaptively
        $formattedEffectiveDate = date('F j, Y', strtotime($effectiveDate));
        $empFullName = trim(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));

        if ($positionChanged && $salaryChanged) {
            // Case A: Full Promotion & Salary Revision
            $actionType = 'Promotion & Salary Revision';
            $letterBadge = '★ Official Promotion & Salary Revision';
            $letterHeading = "Congratulations, {$emp['firstName']}!";
            $letterSubheading = "We are proud to announce your promotion to <strong style=\"color: #1a73e8;\">{$newPosition}</strong> and revision of your monthly compensation.";
            $openingParagraph = "In recognition of your exceptional dedication, sustained performance, and impactful contributions to <strong>Acme Corp</strong>, the management and leadership team are pleased to officially promote you to the designation of <strong>{$newPosition}</strong> along with a revised compensation structure.";
            $closingNote = "Your revised compensation and elevated role responsibilities will take effect as of <strong>{$formattedEffectiveDate}</strong>. All other terms and conditions of your employment contract remain in full force and effect.";
            $emailSubject = "Congratulations on Your Promotion to {$newPosition} - Acme Corp";
            $timelineTitle = "Promoted to {$newPosition}";
            $timelineDesc = "Promoted from {$oldPosition} to {$newPosition}. Revised monthly compensation: ₹" . number_format($revisedSalary, 2) . ($hikeText ? " ({$hikeText})" : "") . ($notes ? ". Remarks: {$notes}" : "");
        } elseif ($positionChanged && !$salaryChanged) {
            // Case B: Role / Title Promotion Only (Salary remains unchanged)
            $actionType = 'Role Advancement & Promotion';
            $letterBadge = '★ Official Role Advancement';
            $letterHeading = "Congratulations, {$emp['firstName']}!";
            $letterSubheading = "We are proud to announce your career advancement to <strong style=\"color: #1a73e8;\">{$newPosition}</strong>.";
            $openingParagraph = "In recognition of your demonstrated leadership, technical expertise, and outstanding commitments to <strong>Acme Corp</strong>, the management team is proud to officially promote you to the designation of <strong>{$newPosition}</strong>.";
            $closingNote = "Your new role responsibilities will take effect as of <strong>{$formattedEffectiveDate}</strong>. Your current compensation remains in effect. All other terms and conditions remain in full force.";
            $emailSubject = "Congratulations on Your Promotion to {$newPosition} - Acme Corp";
            $timelineTitle = "Promoted to {$newPosition}";
            $timelineDesc = "Promoted from {$oldPosition} to {$newPosition}. Base compensation retained at ₹" . number_format($revisedSalary, 2) . ($notes ? ". Remarks: {$notes}" : "");
        } elseif (!$positionChanged && $salaryChanged) {
            // Case C: Salary Appraisal / Increment Only (Designation remains unchanged)
            $actionType = 'Compensation Appraisal & Revision';
            $letterBadge = '★ Official Compensation Revision';
            $letterHeading = "Salary Revision Notification, {$emp['firstName']}";
            $letterSubheading = "We are pleased to communicate the revision of your monthly compensation as <strong style=\"color: #1a73e8;\">{$newPosition}</strong>.";
            $openingParagraph = "In appreciation of your valued contributions, commitment, and performance during this cycle, the leadership team at <strong>Acme Corp</strong> is pleased to approve a revision in your monthly compensation.";
            $closingNote = "Your revised monthly compensation will take effect as of <strong>{$formattedEffectiveDate}</strong>. All other terms and conditions of your employment contract remain unchanged.";
            $emailSubject = "Official Notification: Salary Revision & Compensation Update - Acme Corp";
            $timelineTitle = "Salary Revised to ₹" . number_format($revisedSalary, 2);
            $timelineDesc = "Monthly compensation revised from ₹" . number_format($oldSalary, 2) . " to ₹" . number_format($revisedSalary, 2) . ($hikeText ? " ({$hikeText})" : "") . ($notes ? ". Remarks: {$notes}" : "");
        } else {
            // Case D: Administrative update / notes update
            $actionType = 'Employee Record Update';
            $letterBadge = '★ Official Employment Record Update';
            $letterHeading = "Employment Record Confirmation, {$emp['firstName']}";
            $letterSubheading = "Confirmation of your current designation as <strong style=\"color: #1a73e8;\">{$newPosition}</strong>.";
            $openingParagraph = "This letter serves to confirm your active designation and compensation terms with <strong>Acme Corp</strong>.";
            $closingNote = "All terms and conditions of your employment contract remain in full force and effect.";
            $emailSubject = "Employment Record Confirmation - Acme Corp";
            $timelineTitle = "Profile Milestone Confirmed";
            $timelineDesc = "Designation: {$newPosition}, monthly compensation: ₹" . number_format($revisedSalary, 2) . ($notes ? ". Remarks: {$notes}" : "");
        }

        // 3. Parse and update timeline
        $timeline = [];
        if (!empty($emp['timeline'])) {
            $parsed = json_decode($emp['timeline'], true);
            if (is_array($parsed)) {
                $timeline = $parsed;
            }
        }

        $timelineEntry = [
            'date' => $effectiveDate,
            'title' => $timelineTitle,
            'description' => $timelineDesc
        ];
        $timeline[] = $timelineEntry;

        // 4. Update employee table
        $stmtUpdateEmp = $conn->prepare('
            UPDATE employee 
            SET position = ?, salary = ?, timeline = ?
            WHERE id = ?
        ');
        $stmtUpdateEmp->execute([
            $newPosition,
            $revisedSalary,
            json_encode($timeline),
            $empId
        ]);

        // 5. Update users table position if userId exists
        if (!empty($emp['userId'])) {
            $stmtUpdateUser = $conn->prepare('UPDATE users SET position = ? WHERE id = ?');
            $stmtUpdateUser->execute([$newPosition, $emp['userId']]);
        }

        // 6. Generate and queue promotion letter email if requested
        if ($sendEmail && !empty($emp['email'])) {
            $templatePath = __DIR__ . '/../src/Templates/promotion_letter_email.html';
            if (file_exists($templatePath)) {
                $template = file_get_contents($templatePath);

                // Construct dynamic terms breakdown HTML for letter
                $termsBreakdownHtml = '';
                if ($positionChanged) {
                    $termsBreakdownHtml .= '
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368; width: 45%;">
                    Previous Designation:
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #5f6368; text-align: right;">
                    ' . htmlspecialchars($oldPosition) . '
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #137333; font-weight: 600;">
                    Promoted Designation:
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 14px; font-weight: 700; color: #1a73e8; text-align: right;">
                    ' . htmlspecialchars($newPosition) . '
                  </td>
                </tr>';
                } else {
                    $termsBreakdownHtml .= '
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368; width: 45%;">
                    Official Designation:
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #1f1f1f; text-align: right;">
                    ' . htmlspecialchars($newPosition) . ' <span style="font-size: 11px; background-color: #f1f3f4; color: #444746; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">Current Role</span>
                  </td>
                </tr>';
                }

                if ($salaryChanged) {
                    $termsBreakdownHtml .= '
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368;">
                    Previous Monthly Salary:
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #5f6368; text-align: right; text-decoration: line-through;">
                    ₹' . number_format($oldSalary, 2) . '
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #137333; font-weight: 600;">
                    Revised Monthly Salary:
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 15px; font-weight: 700; color: #137333; text-align: right;">
                    ₹' . number_format($revisedSalary, 2) . ' <span style="font-size: 11px; background-color: #e6f4ea; border: 1px solid #ceead6; color: #137333; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">' . htmlspecialchars($hikeBadge) . '</span>
                  </td>
                </tr>';
                } else {
                    $termsBreakdownHtml .= '
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; color: #5f6368;">
                    Base Monthly Salary:
                  </td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid #eef0f2; font-size: 13px; font-weight: 600; color: #1f1f1f; text-align: right;">
                    ₹' . number_format($revisedSalary, 2) . ' <span style="font-size: 11px; background-color: #f1f3f4; color: #444746; padding: 2px 8px; border-radius: 100px; margin-left: 4px;">Retained (Unchanged)</span>
                  </td>
                </tr>';
                }

                $placeholders = [
                    '{{letterBadge}}' => htmlspecialchars($letterBadge),
                    '{{letterHeading}}' => htmlspecialchars($letterHeading),
                    '{{letterSubheading}}' => $letterSubheading,
                    '{{openingParagraph}}' => $openingParagraph,
                    '{{closingNote}}' => $closingNote,
                    '{{termsBreakdownHtml}}' => $termsBreakdownHtml,
                    '{{firstName}}' => htmlspecialchars($emp['firstName'] ?? 'Employee'),
                    '{{employeeName}}' => htmlspecialchars($empFullName),
                    '{{employeeId}}' => htmlspecialchars($emp['employeeId'] ?? ''),
                    '{{oldPosition}}' => htmlspecialchars($oldPosition),
                    '{{newPosition}}' => htmlspecialchars($newPosition),
                    '{{oldSalary}}' => number_format($oldSalary, 2),
                    '{{newSalary}}' => number_format($revisedSalary, 2),
                    '{{hikePercentage}}' => htmlspecialchars($hikeBadge),
                    '{{effectiveDate}}' => htmlspecialchars($formattedEffectiveDate),
                    '{{notes}}' => htmlspecialchars(!empty($notes) ? $notes : 'In recognition of your exceptional performance, dedication, and leadership.'),
                    '{{currentYear}}' => date('Y')
                ];

                $emailBody = str_replace(
                    array_keys($placeholders),
                    array_values($placeholders),
                    $template
                );

                $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
                $stmtQueue->execute([$emp['email'], $emailSubject, $emailBody]);
            }
        }

        $conn->commit();

        \App\Utils\Cache::delete('dashboard_stats');

        $response->getBody()->write(json_encode([
            'message' => 'Employee promoted successfully and promotion letter queued',
            'position' => $newPosition,
            'salary' => $revisedSalary,
            'timeline' => $timeline,
            'emailQueued' => $sendEmail && !empty($emp['email'])
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => 'Failed to promote employee: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'employees'));

