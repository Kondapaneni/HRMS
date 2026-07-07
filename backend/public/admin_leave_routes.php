<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

function queueLeaveEmail($conn, $empId, $leaveType, $startDate, $endDate, $status) {
    $stmtEmp = $conn->prepare('SELECT "firstName", "lastName", email FROM users WHERE id = ?');
    $stmtEmp->execute([$empId]);
    $employee = $stmtEmp->fetch(PDO::FETCH_ASSOC);

    if ($employee && !empty($employee['email'])) {
        $templatePath = __DIR__ . '/../src/Templates/leave_email.html';
        if (file_exists($templatePath)) {
            $emailContent = file_get_contents($templatePath);
            $employeeName = trim(($employee['firstName'] ?? '') . ' ' . ($employee['lastName'] ?? ''));
            $emailContent = str_replace('{{employeeName}}', htmlspecialchars($employeeName), $emailContent);
            $emailContent = str_replace('{{status}}', htmlspecialchars(ucfirst($status)), $emailContent);
            $emailContent = str_replace('{{leaveType}}', htmlspecialchars(ucfirst($leaveType)), $emailContent);
            $emailContent = str_replace('{{startDate}}', date('F j, Y', strtotime($startDate)), $emailContent);
            $emailContent = str_replace('{{endDate}}', date('F j, Y', strtotime($endDate)), $emailContent);
            $emailContent = str_replace('{{currentYear}}', date('Y'), $emailContent);
            
            $subject = "Leave Request " . ucfirst($status);
            $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
            $stmtQueue->execute([$employee['email'], $subject, $emailContent]);
        }
    }
}

// Get all leaves for admin
function insertSandwichLeave($conn, $employeeId, $dateStr, $adminId) {
    $stmtCheck = $conn->prepare('SELECT id FROM leaves WHERE "employeeId" = ? AND CAST("startDate" AS DATE) <= ? AND CAST("endDate" AS DATE) >= ? AND status ILIKE \'approved\'');
    $stmtCheck->execute([$employeeId, $dateStr, $dateStr]);
    if ($stmtCheck->fetchColumn()) return; 

    $stmtInsert = $conn->prepare('
        INSERT INTO leaves ("employeeId", "leaveType", "startDate", "endDate", days, reason, status, "approvedBy")
        VALUES (?, \'unpaid\', ?, ?, 1, \'Sandwich Policy\', \'approved\', ?)
        RETURNING id
    ');
    $stmtInsert->execute([$employeeId, $dateStr, $dateStr, $adminId]);
    
    $conn->prepare('UPDATE leave_balances SET "unpaidUsed" = "unpaidUsed" + 1 WHERE "employeeId" = ?')->execute([$employeeId]);

    $stmtAtt = $conn->prepare('
        INSERT INTO attendance ("employeeId", "date", status, hours, "isRegularized", "checkIn", "checkOut")
        VALUES (?, ?, \'sandwich leave\', 0, false, null, null)
        ON CONFLICT ("employeeId", "date") 
        DO UPDATE SET status = \'sandwich leave\', hours = 0, "isRegularized" = false, "checkIn" = null, "checkOut" = null
    ');
    $stmtAtt->execute([$employeeId, $dateStr]);
}

function applySandwichPolicy($conn, $employeeId, $startDate, $endDate, $adminId) {
    $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
    $stmt->execute([$employeeId]);
    $weekOff = $stmt->fetchColumn() ?: 'sunday';
    $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));
    
    // Backward check
    $prevDate = strtotime('-1 day', strtotime($startDate));
    $sandwichedBefore = [];
    while (true) {
        $dateStr = date('Y-m-d', $prevDate);
        $dayName = strtolower(date('l', $prevDate));
        
        $isWeekend = in_array($dayName, $weekOffDays);
        $stmtHol = $conn->prepare('SELECT COUNT(*) FROM company_holidays WHERE "holidayDate" = ? AND "isActive" = 1');
        $stmtHol->execute([$dateStr]);
        $isHoliday = $stmtHol->fetchColumn() > 0;
        
        if ($isWeekend || $isHoliday) {
            $sandwichedBefore[] = $dateStr;
            $prevDate = strtotime('-1 day', $prevDate);
        } else {
            $stmtLeave = $conn->prepare('SELECT COUNT(*) FROM leaves WHERE "employeeId" = ? AND CAST("startDate" AS DATE) <= ? AND CAST("endDate" AS DATE) >= ? AND status ILIKE \'approved\'');
            $stmtLeave->execute([$employeeId, $dateStr, $dateStr]);
            if ($stmtLeave->fetchColumn() > 0 && count($sandwichedBefore) > 0) {
                foreach ($sandwichedBefore as $sd) {
                    insertSandwichLeave($conn, $employeeId, $sd, $adminId);
                }
            }
            break;
        }
    }
    
    // Forward check
    $nextDate = strtotime('+1 day', strtotime($endDate));
    $sandwichedAfter = [];
    while (true) {
        $dateStr = date('Y-m-d', $nextDate);
        $dayName = strtolower(date('l', $nextDate));
        
        $isWeekend = in_array($dayName, $weekOffDays);
        $stmtHol = $conn->prepare('SELECT COUNT(*) FROM company_holidays WHERE "holidayDate" = ? AND "isActive" = 1');
        $stmtHol->execute([$dateStr]);
        $isHoliday = $stmtHol->fetchColumn() > 0;
        
        if ($isWeekend || $isHoliday) {
            $sandwichedAfter[] = $dateStr;
            $nextDate = strtotime('+1 day', $nextDate);
        } else {
            $stmtLeave = $conn->prepare('SELECT COUNT(*) FROM leaves WHERE "employeeId" = ? AND CAST("startDate" AS DATE) <= ? AND CAST("endDate" AS DATE) >= ? AND status ILIKE \'approved\'');
            $stmtLeave->execute([$employeeId, $dateStr, $dateStr]);
            if ($stmtLeave->fetchColumn() > 0 && count($sandwichedAfter) > 0) {
                foreach ($sandwichedAfter as $sd) {
                    insertSandwichLeave($conn, $employeeId, $sd, $adminId);
                }
            }
            break;
        }
    }
    
    // Inner check (for blocks spanning over weekends)
    $currentDate = strtotime($startDate);
    $endDateTime = strtotime($endDate);
    while ($currentDate <= $endDateTime) {
        $dateStr = date('Y-m-d', $currentDate);
        $dayName = strtolower(date('l', $currentDate));
        
        $isWeekend = in_array($dayName, $weekOffDays);
        $stmtHol = $conn->prepare('SELECT COUNT(*) FROM company_holidays WHERE "holidayDate" = ? AND "isActive" = 1');
        $stmtHol->execute([$dateStr]);
        $isHoliday = $stmtHol->fetchColumn() > 0;
        
        if ($isWeekend || $isHoliday) {
            insertSandwichLeave($conn, $employeeId, $dateStr, $adminId);
        }
        $currentDate = strtotime('+1 day', $currentDate);
    }
}

/** @var \Slim\App $app */
$app->get('/api/admin/leaves', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : 0;
    $search = $params['search'] ?? '';

    $whereClause = "";
    $sqlParams = [];

    if (!empty($search)) {
        $whereClause = 'WHERE e."firstName" ILIKE ? OR e."lastName" ILIKE ? OR e."employeeId" ILIKE ?';
        $searchTerm = "%{$search}%";
        $sqlParams = [$searchTerm, $searchTerm, $searchTerm];
    }

    // Get leaves with pagination
    $query = '
        SELECT l.*, 
               e."firstName" as "empFirstName", e."lastName" as "empLastName", e."employeeId" as "empCode",
               u."firstName" as "appFirstName", u."lastName" as "appLastName"
        FROM leaves l
        LEFT JOIN employee e ON l."employeeId" = e."userId"
        LEFT JOIN users u ON l."approvedBy" = u.id
        ' . $whereClause . '
        ORDER BY l."startDate" DESC
        LIMIT ? OFFSET ?
    ';
    
    $stmt = $conn->prepare($query);
    
    $paramIndex = 1;
    foreach ($sqlParams as $param) {
        $stmt->bindValue($paramIndex++, $param);
    }
    $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
    $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $leaves = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get total count for pagination
    $countQuery = 'SELECT COUNT(*) FROM leaves l LEFT JOIN employee e ON l."employeeId" = e."userId" ' . $whereClause;
    $stmtCount = $conn->prepare($countQuery);
    $paramIndex = 1;
    foreach ($sqlParams as $param) {
        $stmtCount->bindValue($paramIndex++, $param);
    }
    $stmtCount->execute();
    $totalCount = $stmtCount->fetchColumn();

    // Get stats
    $stmtStats = $conn->query('
        SELECT status, COUNT(*) as count 
        FROM leaves 
        GROUP BY status
    ');
    $statsData = $stmtStats->fetchAll(PDO::FETCH_ASSOC);
    $stats = [
        'approved' => 0,
        'pending' => 0,
        'rejected' => 0,
        'total' => $totalCount
    ];
    foreach ($statsData as $row) {
        $status = strtolower($row['status']);
        if (isset($stats[$status])) {
            $stats[$status] = (int)$row['count'];
        }
    }

    // Format the response properly
    $formattedLeaves = array_map(function($leave) {
        return [
            'id' => $leave['id'],
            'employeeName' => trim(($leave['empFirstName'] ?? '') . ' ' . ($leave['empLastName'] ?? '')),
            'employeeCode' => $leave['empCode'],
            'leaveType' => $leave['leaveType'],
            'startDate' => $leave['startDate'],
            'endDate' => $leave['endDate'],
            'days' => $leave['days'],
            'reason' => $leave['reason'],
            'status' => strtolower($leave['status']),
            'approvedByName' => $leave['appFirstName'] ? trim(($leave['appFirstName'] ?? '') . ' ' . ($leave['appLastName'] ?? '')) : ($leave['approvedBy'] == 'system-auto-approved' ? 'System Auto Approved' : null)
        ];
    }, $leaves);

    $response->getBody()->write(json_encode([
        'leaves' => $formattedLeaves,
        'total' => $totalCount,
        'stats' => $stats
    ]));
    
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin'], 'leave'));

// Approve leave
$app->post('/api/admin/leaves/{id}/approve', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $id = $args['id'];
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Begin transaction
    $conn->beginTransaction();
    try {
        // Fetch the leave first to check its details
        $stmtLeave = $conn->prepare('SELECT * FROM leaves WHERE id = ?');
        $stmtLeave->execute([$id]);
        $leaveToApprove = $stmtLeave->fetch(PDO::FETCH_ASSOC);

        if (!$leaveToApprove) {
            throw new Exception("Leave not found");
        }

        $empId = $leaveToApprove['employeeId'];
        
        // Check for conflicting attendance records
        $stmtCheckAtt = $conn->prepare('SELECT id FROM attendance WHERE "employeeId" = ? AND date >= ? AND date <= ? AND "checkIn" IS NOT NULL LIMIT 1');
        $stmtCheckAtt->execute([$empId, $leaveToApprove['startDate'], $leaveToApprove['endDate']]);
        if ($stmtCheckAtt->fetch()) {
            throw new Exception("Cannot approve leave. The employee has already checked in on one or more of these dates.");
        }

        $isPaid = strtolower($leaveToApprove['leaveType']) === 'paid';
        
        if ($isPaid) {
            // Check if there is already an approved Paid leave in this month
            $monthStart = date('Y-m-01', strtotime($leaveToApprove['startDate']));
            $monthEnd = date('Y-m-t', strtotime($leaveToApprove['startDate']));

            $stmtCheck = $conn->prepare('
                SELECT COUNT(*) FROM leaves 
                WHERE "employeeId" = ? AND "leaveType" = \'Paid\' 
                AND "startDate" >= ? AND "startDate" <= ?
                AND status ILIKE \'approved\'
                AND id != ?
            ');
            $stmtCheck->execute([$empId, $monthStart, $monthEnd, $id]);
            
            if ($stmtCheck->fetchColumn() > 0) {
                // Force to Unpaid
                $conn->prepare('UPDATE leaves SET "leaveType" = \'unpaid\' WHERE id = ?')->execute([$id]);
                $leaveToApprove['leaveType'] = 'unpaid';
            }
        }

        $stmtEmpOff = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
        $stmtEmpOff->execute([$empId]);
        $weekOff = $stmtEmpOff->fetchColumn() ?: 'sunday';
        $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));
        
        // Find contiguous blocks of working days
        $currentDate = strtotime($leaveToApprove['startDate']);
        $endDate = strtotime($leaveToApprove['endDate']);
        
        $blocks = [];
        $currentBlockStart = null;
        $currentBlockEnd = null;
        $currentBlockDays = 0;
        
        while ($currentDate <= $endDate) {
            $dateStr = date('Y-m-d', $currentDate);
            $dayOfWeekName = strtolower(date('l', $currentDate));
            $isWeekend = in_array($dayOfWeekName, $weekOffDays);
            
            $stmtHol = $conn->prepare('SELECT COUNT(*) FROM company_holidays WHERE "holidayDate" = ? AND "isActive" = 1');
            $stmtHol->execute([$dateStr]);
            $isHoliday = $stmtHol->fetchColumn() > 0;
            
            if (!$isWeekend && !$isHoliday) {
                if ($currentBlockStart === null) {
                    $currentBlockStart = $dateStr;
                }
                $currentBlockEnd = $dateStr;
                $currentBlockDays++;
            } else {
                if ($currentBlockStart !== null) {
                    $blocks[] = [
                        'start' => $currentBlockStart,
                        'end' => $currentBlockEnd,
                        'days' => $currentBlockDays
                    ];
                    $currentBlockStart = null;
                    $currentBlockEnd = null;
                    $currentBlockDays = 0;
                }
            }
            $currentDate = strtotime('+1 day', $currentDate);
        }
        if ($currentBlockStart !== null) {
            $blocks[] = [
                'start' => $currentBlockStart,
                'end' => $currentBlockEnd,
                'days' => $currentBlockDays
            ];
        }

        if (count($blocks) === 0) {
            throw new Exception("Leave contains only non-working days. Please verify dates.");
        }

        $approvedLeaves = [];

        // Modify the first block to reuse the existing ID
        $stmtUpdateFirst = $conn->prepare('UPDATE leaves SET "startDate" = ?, "endDate" = ?, days = ?, status = \'approved\', "approvedBy" = ? WHERE id = ? RETURNING *');
        $stmtUpdateFirst->execute([$blocks[0]['start'], $blocks[0]['end'], $blocks[0]['days'], $decodedToken->id, $id]);
        $approvedLeaves[] = $stmtUpdateFirst->fetch(PDO::FETCH_ASSOC);

        // Insert remaining blocks as new records
        for ($i = 1; $i < count($blocks); $i++) {
            $stmtInsertBlock = $conn->prepare('
                INSERT INTO leaves ("employeeId", "leaveType", "startDate", "endDate", days, reason, status, "approvedBy")
                VALUES (?, ?, ?, ?, ?, ?, \'approved\', ?)
                RETURNING *
            ');
            $stmtInsertBlock->execute([
                $empId,
                $leaveToApprove['leaveType'],
                $blocks[$i]['start'],
                $blocks[$i]['end'],
                $blocks[$i]['days'],
                $leaveToApprove['reason'],
                $decodedToken->id
            ]);
            $approvedLeaves[] = $stmtInsertBlock->fetch(PDO::FETCH_ASSOC);
        }

        // Process each approved block
        foreach ($approvedLeaves as $leave) {
            // Delete associated attendance records generated by this leave block
            $conn->prepare('DELETE FROM attendance WHERE "employeeId" = ? AND date >= ? AND date <= ? AND status = \'leave\'')->execute([$leave['employeeId'], $leave['startDate'], $leave['endDate']]);
            
            // 1. Update Leave Balance
            $empId = $leave['employeeId'];
            $days = (int)$leave['days'];
            $isPaid = strtolower($leave['leaveType']) === 'paid';
            
            // Check if balance exists
            $stmtBal = $conn->prepare('SELECT id FROM leave_balances WHERE "employeeId" = ? LIMIT 1');
            $stmtBal->execute([$empId]);
            $balanceId = $stmtBal->fetchColumn();
            
            if (!$balanceId) {
                // Insert default balance if missing
                $stmtInsertBal = $conn->prepare('INSERT INTO leave_balances (id, "employeeId", "paidTotal", "paidUsed", "unpaidUsed") VALUES (gen_random_uuid(), ?, 12, 0, 0)');
                $stmtInsertBal->execute([$empId]);
            }
            
            // Deduct days
            if ($isPaid) {
                $conn->prepare('UPDATE leave_balances SET "paidUsed" = "paidUsed" + ? WHERE "employeeId" = ?')->execute([$days, $empId]);
            } else {
                $conn->prepare('UPDATE leave_balances SET "unpaidUsed" = "unpaidUsed" + ? WHERE "employeeId" = ?')->execute([$days, $empId]);
            }

            // Generate Attendance Records for this contiguous working block
            $currentDate = strtotime($leave['startDate']);
            $endDate = strtotime($leave['endDate']);
            $attendanceStatus = strtolower($leave['leaveType']) . ' leave'; // 'paid leave' or 'unpaid leave'

            while ($currentDate <= $endDate) {
                $dateStr = date('Y-m-d', $currentDate);
                $dayOfWeekName = strtolower(date('l', $currentDate));
                if (!in_array($dayOfWeekName, $weekOffDays)) {
                    $stmtAtt = $conn->prepare('
                        INSERT INTO attendance ("employeeId", "date", status, hours, "isRegularized", "checkIn", "checkOut")
                        VALUES (?, ?, ?, 0, false, null, null)
                        ON CONFLICT ("employeeId", "date") 
                        DO UPDATE SET status = EXCLUDED.status, hours = 0, "isRegularized" = false, "checkIn" = null, "checkOut" = null
                    ');
                    $stmtAtt->execute([$empId, $dateStr, $attendanceStatus]);
                }
                $currentDate = strtotime('+1 day', $currentDate);
            }

            // Apply Sandwich Policy automatically (this will slot the Unpaid leave exactly in between blocks if they are adjacent)
            applySandwichPolicy($conn, $empId, $leave['startDate'], $leave['endDate'], $decodedToken->id);
        }

        // Queue email notification for the original requested date range
        queueLeaveEmail(
            $conn, 
            $leaveToApprove['employeeId'], 
            $leaveToApprove['leaveType'], 
            $leaveToApprove['startDate'], 
            $leaveToApprove['endDate'], 
            'approved'
        );

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Leave approved successfully']));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => 'Failed to approve leave: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'leave'));

// Reject leave
$app->post('/api/admin/leaves/{id}/reject', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $id = $args['id'];
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Fetch leave details before rejecting to send email
    $stmtLeave = $conn->prepare('SELECT "employeeId", "leaveType", "startDate", "endDate" FROM leaves WHERE id = ?');
    $stmtLeave->execute([$id]);
    $leaveToReject = $stmtLeave->fetch(PDO::FETCH_ASSOC);

    $stmt = $conn->prepare('UPDATE leaves SET status = \'rejected\', "approvedBy" = ? WHERE id = ?');
    $stmt->execute([$decodedToken->id, $id]);
    
    if ($leaveToReject) {
        queueLeaveEmail(
            $conn, 
            $leaveToReject['employeeId'], 
            $leaveToReject['leaveType'], 
            $leaveToReject['startDate'], 
            $leaveToReject['endDate'], 
            'rejected'
        );
    }

    $response->getBody()->write(json_encode(['message' => 'Leave rejected successfully']));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin'], 'leave'));

