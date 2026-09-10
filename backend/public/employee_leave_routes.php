<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

require_once __DIR__ . '/attendance_helpers.php';

// Get Employee Leaves and Balance
/** @var \Slim\App $app */
$app->get('/api/employee/leaves', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();

    $params = $request->getQueryParams();
    $page = max(1, (int)($params['page'] ?? 1));
    $limit = max(1, min(100, (int)($params['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    try {
        $countQuery = "SELECT COUNT(*) FROM leaves WHERE \"employeeId\" = ?";
        $stmtCount = $conn->prepare($countQuery);
        $stmtCount->execute([$decodedToken->id]);
        $totalCount = (int)$stmtCount->fetchColumn();
        // Fetch Balance
        $stmtBalance = $conn->prepare('SELECT id, "employeeId", "paidTotal", "paidUsed", "unpaidUsed" FROM leave_balances WHERE "employeeId" = ? LIMIT 1');
        $stmtBalance->execute([$decodedToken->id]);
        $balance = $stmtBalance->fetch();

        if (!$balance) {
            // Default if not exists
            $balance = ['paidTotal' => 12, 'paidUsed' => 0, 'unpaidUsed' => 0];
        }

        // Fetch Leave History
        $stmtLeaves = $conn->prepare('SELECT id, "employeeId", "leaveType", "startDate", "endDate", days, reason, status, "appliedDate", "approvedBy" FROM leaves WHERE "employeeId" = ? ORDER BY "startDate" DESC LIMIT ? OFFSET ?');
        $stmtLeaves->execute([$decodedToken->id, $limit, $offset]);
        $history = $stmtLeaves->fetchAll();

        // Calculate total approved from DB
        $stmtApproved = $conn->prepare('SELECT SUM(days) FROM leaves WHERE "employeeId" = ? AND status = \'approved\'');
        $stmtApproved->execute([$decodedToken->id]);
        $totalApproved = (int)$stmtApproved->fetchColumn();

        $resData = [
            'balance' => [
                'paidTotal' => (int)$balance['paidTotal'],
                'paidUsed' => (int)$balance['paidUsed'],
                'unpaidUsed' => (int)$balance['unpaidUsed'],
                'totalApproved' => $totalApproved
            ],
            'history' => $history,
            'pagination' => [
                'total' => $totalCount,
                'page' => $page,
                'limit' => $limit,
                'totalPages' => ceil($totalCount / $limit)
            ]
        ];

        $response->getBody()->write(json_encode($resData));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));

// Apply for Leave
$app->post('/api/employee/leaves/apply', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();

    $leaveType = $data['leaveType'] ?? 'paid';
    $startDate = $data['startDate'] ?? '';
    $endDate = $data['endDate'] ?? '';
    $reason = $data['reason'] ?? '';

    $db = new Database();
    $conn = $db->getConnection();

    try {
        if (!$startDate || !$endDate || strlen($reason) < 10) {
            throw new Exception("Invalid data. Reason must be at least 10 characters.");
        }
        if ($startDate < date('Y-m-d') || $endDate < $startDate) {
            throw new Exception("Invalid dates.");
        }

        $start = new DateTime($startDate);
        $end = new DateTime($endDate);

        $weekOffDays = getEmployeeWeekOffDays($conn, $decodedToken->id);
        $holidaysMap = getActiveHolidaysMap($conn);

        // Calculate Days excluding weekOffs and company holidays
        $days = 0;
        $current = clone $start;
        while ($current <= $end) {
            $dateStr = $current->format('Y-m-d');
            $dayOfWeekName = strtolower($current->format('l'));
            
            $isWeekend = in_array($dayOfWeekName, $weekOffDays);
            $isHoliday = isset($holidaysMap[$dateStr]);
            
            if (!$isWeekend && !$isHoliday) {
                $days++;
            }
            $current->modify('+1 day');
        }

        if ($days === 0) {
            throw new Exception("Selected range contains no valid working days.");
        }

        if ($leaveType === 'paid') {
            if ($days > 1) {
                throw new Exception("Paid leave can only be applied for one day per month.");
            }
            // Check if paid leave already requested/approved this month
            $monthStart = $start->format('Y-m-01');
            $monthEnd = $start->format('Y-m-t');

            $stmtCheck = $conn->prepare('
                SELECT COUNT(*) FROM leaves 
                WHERE "employeeId" = ? AND "leaveType" = \'paid\' 
                AND "startDate" >= ? AND "startDate" <= ?
                AND LOWER(status) NOT IN (\'rejected\', \'cancelled\', \'canceled\')
            ');
            $stmtCheck->execute([$decodedToken->id, $monthStart, $monthEnd]);
            if ($stmtCheck->fetchColumn() > 0) {
                throw new Exception("Paid leave already requested or used this month.");
            }
        }

        // Check overlaps
        $stmtOverlap = $conn->prepare('
            SELECT COUNT(*) FROM leaves
            WHERE "employeeId" = ? AND LOWER(status) NOT IN (\'rejected\', \'cancelled\', \'canceled\')
            AND ("startDate" <= ? AND "endDate" >= ?)
        ');
        $stmtOverlap->execute([$decodedToken->id, $endDate, $startDate]);
        if ($stmtOverlap->fetchColumn() > 0) {
            throw new Exception("Leave already requested or approved for selected dates.");
        }

        $conn->beginTransaction();

        $stmtInsert = $conn->prepare('
            INSERT INTO leaves ("employeeId", "leaveType", "startDate", "endDate", days, reason)
            VALUES (?, ?, ?, ?, ?, ?)
        ');
        $stmtInsert->execute([$decodedToken->id, $leaveType, $startDate, $endDate, $days, $reason]);

        // Automatically create balance row if it doesn't exist
        $stmtBalCheck = $conn->prepare('SELECT id FROM leave_balances WHERE "employeeId" = ?');
        $stmtBalCheck->execute([$decodedToken->id]);
        if (!$stmtBalCheck->fetch()) {
            $conn->prepare('INSERT INTO leave_balances ("employeeId") VALUES (?)')->execute([$decodedToken->id]);
        }

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Leave request submitted successfully.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

    } catch (Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));

// Cancel a Leave
$app->put('/api/employee/leaves/{id}/cancel', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $leaveId = $args['id'];
    
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmtCheck = $conn->prepare('SELECT status FROM leaves WHERE id = ? AND "employeeId" = ?');
        $stmtCheck->execute([$leaveId, $decodedToken->id]);
        $leave = $stmtCheck->fetch();

        if (!$leave) {
            throw new Exception("Leave record not found.");
        }

        if ($leave['status'] !== 'pending') {
            throw new Exception("Only pending leaves can be cancel.");
        }

        $stmtUpdate = $conn->prepare("UPDATE leaves SET status = 'cancelled' WHERE id = ?");
        $stmtUpdate->execute([$leaveId]);

        $response->getBody()->write(json_encode(['message' => 'Leave cancelled successfully.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));
