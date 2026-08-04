<?php

use App\Middleware\AuthMiddleware;
use App\Config\Database;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function logAttendanceAudit($conn, $userId, $action, $entityType, $entityId, $oldValue, $newValue, $description) {
    // Audit table does not exist in the database, ignoring to prevent transaction aborts.
    return;
}

function applyShiftStatusModifiers($baseStatus, $checkIn, $checkOut, $shiftLabel, $shiftTimesMap) {
    // The status is now stored correctly in the database on punch/regularize.
    return $baseStatus;
}

function getShiftTimesMap($conn) {
    $stmtShifts = $conn->query('SELECT id, "shiftLabel", "startTime", "endTime" FROM shift_times');
    $shifts = $stmtShifts->fetchAll(PDO::FETCH_ASSOC);
    $shiftTimesMap = [];
    foreach ($shifts as $s) {
        $shiftTimesMap[$s['shiftLabel']] = $s;
    }
    return $shiftTimesMap;
}

function getActiveHolidaysMap($conn) {
    static $map = null;
    if ($map !== null) return $map;
    
    $stmt = $conn->query('SELECT "holidayDate" FROM company_holidays WHERE "isActive" = 1');
    $holidays = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $map = array_flip($holidays);
    return $map;
}

function getNextLeaveWorkingDate($conn, $employeeId, $dateStr) {
    $current = strtotime('+1 day', strtotime($dateStr));
    
    // Get weekOff
    $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
    $stmt->execute([$employeeId]);
    $weekOff = $stmt->fetchColumn() ?: 'sunday';
    $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));
    
    while (true) {
        $date = date('Y-m-d', $current);
        $dayName = strtolower(date('l', $current));
        
        $isWeekend = in_array($dayName, $weekOffDays);
        if ($isWeekend) {
            $current = strtotime('+1 day', $current);
            continue;
        }
        
        $holidaysMap = getActiveHolidaysMap($conn);
        $isHoliday = isset($holidaysMap[$date]);
        if ($isHoliday) {
            $current = strtotime('+1 day', $current);
            continue;
        }
        
        return $date;
    }
}

function getPreviousLeaveWorkingDate($conn, $employeeId, $dateStr) {
    $current = strtotime('-1 day', strtotime($dateStr));
    
    // Get weekOff
    $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
    $stmt->execute([$employeeId]);
    $weekOff = $stmt->fetchColumn() ?: 'sunday';
    $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));
    
    while (true) {
        $date = date('Y-m-d', $current);
        $dayName = strtolower(date('l', $current));
        
        $isWeekend = in_array($dayName, $weekOffDays);
        if ($isWeekend) {
            $current = strtotime('-1 day', $current);
            continue;
        }
        
        $holidaysMap = getActiveHolidaysMap($conn);
        $isHoliday = isset($holidaysMap[$date]);
        if ($isHoliday) {
            $current = strtotime('-1 day', $current);
            continue;
        }
        
        return $date;
    }
}

function calculateWorkingDaysBetween($conn, $employeeId, $startDate, $endDate) {
    if ($startDate > $endDate) return 0;
    
    $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
    $stmt->execute([$employeeId]);
    $weekOff = $stmt->fetchColumn() ?: 'sunday';
    $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));
    
    $current = strtotime($startDate);
    $end = strtotime($endDate);
    $days = 0;
    
    while ($current <= $end) {
        $date = date('Y-m-d', $current);
        $dayName = strtolower(date('l', $current));
        
        $isWeekend = in_array($dayName, $weekOffDays);
        
        $holidaysMap = getActiveHolidaysMap($conn);
        $isHoliday = isset($holidaysMap[$date]);
        
        if (!$isWeekend && !$isHoliday) {
            $days++;
        }
        $current = strtotime('+1 day', $current);
    }
    return $days;
}

function generateUUIDv4() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000, mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
}

function adjustApprovedLeaveRecordForDate($conn, $employeeId, $date, $adminId) {
    // Check if it's a weekend or holiday, if so, no leave deduction anyway
    $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
    $stmt->execute([$employeeId]);
    $weekOff = $stmt->fetchColumn() ?: 'sunday';
    $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));
    $dayName = strtolower(date('l', strtotime($date)));
    if (in_array($dayName, $weekOffDays)) return true;
    
    $holidaysMap = getActiveHolidaysMap($conn);
    if (isset($holidaysMap[$date])) return true;

    $stmtFindLeave = $conn->prepare('SELECT id, "employeeId", "leaveType", "startDate", "endDate", days, reason, status, "appliedDate", "approvedBy" FROM leaves WHERE "employeeId" = ? AND CAST("startDate" AS DATE) <= ? AND CAST("endDate" AS DATE) >= ? AND status ILIKE \'approved\'');
    $stmtFindLeave->execute([$employeeId, $date, $date]);
    $leave = $stmtFindLeave->fetch(PDO::FETCH_ASSOC);

    if (!$leave) {
        return false;
    }

    $removedDays = 0;
    $leaveType = $leave['leaveType'];

    if ($leave['startDate'] === $leave['endDate'] && $leave['startDate'] === $date) {
        $removedDays = calculateWorkingDaysBetween($conn, $employeeId, $leave['startDate'], $leave['endDate']);
        $stmt = $conn->prepare("DELETE FROM leaves WHERE id = ?");
        $stmt->execute([$leave['id']]);
        logAttendanceAudit($conn, $adminId, 'delete', 'leave', $leave['id'], $leave, null, 'Deleted single-day leave to regularize attendance.');
    } elseif ($leave['startDate'] === $date) {
        $removedDays = 1;
        $newStart = getNextLeaveWorkingDate($conn, $employeeId, $date);
        if ($newStart > $leave['endDate']) {
            $stmt = $conn->prepare("DELETE FROM leaves WHERE id = ?");
            $stmt->execute([$leave['id']]);
            logAttendanceAudit($conn, $adminId, 'delete', 'leave', $leave['id'], $leave, null, 'Deleted leave because no working days left after regularization.');
        } else {
            $newDays = calculateWorkingDaysBetween($conn, $employeeId, $newStart, $leave['endDate']);
            $stmt = $conn->prepare("UPDATE leaves SET \"startDate\" = ?, days = ? WHERE id = ?");
            $stmt->execute([$newStart, $newDays, $leave['id']]);
            
            $newLeave = $leave;
            $newLeave['startDate'] = $newStart;
            $newLeave['days'] = $newDays;
            logAttendanceAudit($conn, $adminId, 'update', 'leave', $leave['id'], $leave, $newLeave, 'Adjusted leave start date to regularize attendance.');
        }
    } elseif ($leave['endDate'] === $date) {
        $removedDays = 1;
        $newEnd = getPreviousLeaveWorkingDate($conn, $employeeId, $date);
        if ($newEnd < $leave['startDate']) {
            $stmt = $conn->prepare("DELETE FROM leaves WHERE id = ?");
            $stmt->execute([$leave['id']]);
            logAttendanceAudit($conn, $adminId, 'delete', 'leave', $leave['id'], $leave, null, 'Deleted leave because no working days left after regularization.');
        } else {
            $newDays = calculateWorkingDaysBetween($conn, $employeeId, $leave['startDate'], $newEnd);
            $stmt = $conn->prepare("UPDATE leaves SET \"endDate\" = ?, days = ? WHERE id = ?");
            $stmt->execute([$newEnd, $newDays, $leave['id']]);
            
            $newLeave = $leave;
            $newLeave['endDate'] = $newEnd;
            $newLeave['days'] = $newDays;
            logAttendanceAudit($conn, $adminId, 'update', 'leave', $leave['id'], $leave, $newLeave, 'Adjusted leave end date to regularize attendance.');
        }
    } else {
        $removedDays = 1;
        $oldEnd = $leave['endDate'];
        $newEnd = getPreviousLeaveWorkingDate($conn, $employeeId, $date);
        $firstDays = calculateWorkingDaysBetween($conn, $employeeId, $leave['startDate'], $newEnd);
        $stmt = $conn->prepare("UPDATE leaves SET \"endDate\" = ?, days = ? WHERE id = ?");
        $stmt->execute([$newEnd, $firstDays, $leave['id']]);
        
        $newLeave1 = $leave;
        $newLeave1['endDate'] = $newEnd;
        $newLeave1['days'] = $firstDays;
        logAttendanceAudit($conn, $adminId, 'update', 'leave', $leave['id'], $leave, $newLeave1, 'Split multi-day leave (part 1).');

        $secondStart = getNextLeaveWorkingDate($conn, $employeeId, $date);
        if ($secondStart <= $oldEnd) {
            $secondDays = calculateWorkingDaysBetween($conn, $employeeId, $secondStart, $oldEnd);
            $newId = generateUUIDv4();
            $stmt = $conn->prepare("INSERT INTO leaves (id, \"employeeId\", \"leaveType\", \"startDate\", \"endDate\", days, reason, status, \"appliedDate\", \"approvedBy\") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$newId, $employeeId, $leave['leaveType'], $secondStart, $oldEnd, $secondDays, $leave['reason'], $leave['status'], $leave['appliedDate'] ?? date('Y-m-d'), $leave['approvedBy']]);
            
            $stmtNewLeave = $conn->prepare('SELECT id, "employeeId", "leaveType", "startDate", "endDate", days, reason, status, "appliedDate", "approvedBy" FROM leaves WHERE id = ?');
            $stmtNewLeave->execute([$newId]);
            $newLeave2 = $stmtNewLeave->fetch(PDO::FETCH_ASSOC);
            logAttendanceAudit($conn, $adminId, 'create', 'leave', $newId, null, $newLeave2, 'Split multi-day leave (part 2).');
        }
    }

    if ($removedDays > 0) {
        if (strtolower($leaveType) === 'paid') {
            $conn->prepare('UPDATE leave_balances SET "paidUsed" = GREATEST(0, "paidUsed" - ?) WHERE "employeeId" = ?')->execute([$removedDays, $employeeId]);
        } elseif (strtolower($leaveType) === 'unpaid') {
            $conn->prepare('UPDATE leave_balances SET "unpaidUsed" = GREATEST(0, "unpaidUsed" - ?) WHERE "employeeId" = ?')->execute([$removedDays, $employeeId]);
        }
    }

    return true;
}


// GET /api/admin/attendance
/** @var \Slim\App $app */
$app->get('/api/admin/attendance', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $date = $queryParams['date'] ?? date('Y-m-d');
    $search = $queryParams['search'] ?? '';
    $page = max(1, (int)($queryParams['page'] ?? 1));
    $limit = max(1, (int)($queryParams['limit'] ?? 10));
    $offset = ($page - 1) * $limit;

    $db = new Database();
    $conn = $db->getConnection();
    
    $shiftTimesMap = getShiftTimesMap($conn);

    try {

        // Build employee query
        $empSql = "SELECT id, \"userId\", \"employeeId\" as \"employeeCode\", \"firstName\", \"lastName\", \"weekOff\", \"shiftTime\", \"joinDate\" FROM employee WHERE status = 'active'";
        $empParams = [];

        if (!empty($search)) {
            $empSql .= " AND (\"firstName\" ILIKE ? OR \"lastName\" ILIKE ? OR \"employeeId\" ILIKE ?)";
            $searchTerm = "%{$search}%";
            $empParams = [$searchTerm, $searchTerm, $searchTerm];
        }

        // Count total for pagination
        $countSql = "SELECT COUNT(*) FROM ($empSql) as t";
        $stmtCount = $conn->prepare($countSql);
        $stmtCount->execute($empParams);
        $total = $stmtCount->fetchColumn();

        // Fetch paginated employees
        $empSql .= " ORDER BY \"firstName\" ASC, \"lastName\" ASC LIMIT ? OFFSET ?";
        $empParams[] = $limit;
        $empParams[] = $offset;

        $stmtEmp = $conn->prepare($empSql);
        $stmtEmp->execute($empParams);
        $employees = $stmtEmp->fetchAll(PDO::FETCH_ASSOC);

        if (empty($employees)) {
            $response->getBody()->write(json_encode([
                'attendance' => [],
                'pagination' => [
                    'total' => 0,
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => 0
                ]
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        // We use userId because attendance records are tied to the users table id
        $userIds = array_map(function($e) { return $e['userId'] ?? $e['id']; }, $employees);
        $placeholders = implode(',', array_fill(0, count($userIds), '?'));

        // Fetch attendance for these employees on the given date
        $attSql = "SELECT id as \"attendanceRecordId\", \"employeeId\", date, \"checkIn\", \"checkOut\", hours, status, \"isRegularized\" FROM attendance WHERE date = ? AND \"employeeId\" IN ($placeholders)";
        $attParams = array_merge([$date], $userIds);
        $stmtAtt = $conn->prepare($attSql);
        $stmtAtt->execute($attParams);
        $attendanceRecords = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

        $attMap = [];
        foreach ($attendanceRecords as $att) {
            $attMap[$att['employeeId']] = $att;
        }

        // Fetch approved leaves for these employees on the given date
        $leaveSql = "SELECT \"employeeId\" FROM leaves WHERE status ILIKE 'approved' AND CAST(\"startDate\" AS DATE) <= ? AND CAST(\"endDate\" AS DATE) >= ? AND \"employeeId\" IN ($placeholders)";
        $leaveParams = array_merge([$date, $date], $userIds);
        $stmtLeave = $conn->prepare($leaveSql);
        $stmtLeave->execute($leaveParams);
        $leaves = $stmtLeave->fetchAll(PDO::FETCH_ASSOC);

        $leaveMap = [];
        foreach ($leaves as $lv) {
            $leaveMap[$lv['employeeId']] = true;
        }

        // Fetch holiday for the date
        $stmtHols = $conn->prepare('SELECT id, "holidayDate", "holidayName", "holidayImage", "isActive" FROM company_holidays WHERE "holidayDate" = ? AND "isActive" = 1');
        $stmtHols->execute([$date]);
        $holiday = $stmtHols->fetch(PDO::FETCH_ASSOC);

        $dayName = strtolower(date('l', strtotime($date)));
        $todayStr = date('Y-m-d');

        $rows = [];
        foreach ($employees as $emp) {
            $userId = $emp['userId'] ?? $emp['id']; // Map to userId
            
            $weekOffStr = strtolower($emp['weekOff'] ?? 'sunday');
            $weekOffDays = array_map('trim', explode(',', $weekOffStr));
            $isWeekend = in_array($dayName, $weekOffDays);

            $baseRow = [
                'employeeId' => $userId,
                'employeeCode' => $emp['employeeCode'],
                'employeeName' => trim($emp['firstName'] . ' ' . $emp['lastName']),
                'date' => $date,
                'shiftTime' => $emp['shiftTime'] ?? null
            ];

            // If the date is before the employee's join date, mark as not-joined
            if (!empty($emp['joinDate']) && $date < $emp['joinDate']) {
                $rows[] = array_merge($baseRow, [
                    'id' => 'not-joined-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'not-joined'
                ]);
                continue;
            }

            if (isset($attMap[$userId])) {
                $rec = $attMap[$userId];
                $status = $rec['status'];
                if ($holiday && $status === 'not-marked') {
                    $status = 'holiday';
                }
                
                $status = applyShiftStatusModifiers($status, $rec['checkIn'], $rec['checkOut'], $emp['shiftTime'] ?? null, $shiftTimesMap);
                
                $row = array_merge($baseRow, [
                    'id' => 'att-' . $rec['attendanceRecordId'],
                    'attendanceRecordId' => $rec['attendanceRecordId'],
                    'checkIn' => $rec['checkIn'],
                    'checkOut' => $rec['checkOut'],
                    'hours' => $rec['hours'],
                    'status' => $status,
                    'isRegularized' => $rec['isRegularized'] ?? false
                ]);
                
                if ($holiday) {
                    $row['holidayName'] = $holiday['holidayName'];
                    $row['holidayImage'] = $holiday['holidayImage'];
                }
                
                $rows[] = $row;
            } elseif ($holiday) {
                $rows[] = array_merge($baseRow, [
                    'id' => 'holiday-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'holiday',
                    'holidayName' => $holiday['holidayName'],
                    'holidayImage' => $holiday['holidayImage']
                ]);
            } elseif ($isWeekend) {
                $rows[] = array_merge($baseRow, [
                    'id' => 'weekend-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'weekend'
                ]);
            } elseif (isset($leaveMap[$userId])) {
                $rows[] = array_merge($baseRow, [
                    'id' => 'leave-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'leave'
                ]);
            } elseif ($date > $todayStr) {
                $rows[] = array_merge($baseRow, [
                    'id' => 'future-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'future'
                ]);
            } elseif ($date < $todayStr) {
                $rows[] = array_merge($baseRow, [
                    'id' => 'missing-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'missing'
                ]);
            } else {
                $rows[] = array_merge($baseRow, [
                    'id' => 'not-marked-' . $date . '-' . $userId,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'not-marked'
                ]);
            }
        }

        $response->getBody()->write(json_encode([
            'attendance' => $rows,
            'pagination' => [
                'total' => $total,
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
})->add(new AuthMiddleware(['admin'], 'attendance'));

// GET /api/admin/geolocations
$app->get('/api/admin/geolocations', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    try {
        $stmt = $conn->query('SELECT id, name, latitude, longitude, radius FROM geofences ORDER BY id ASC');
        $geo = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response->getBody()->write(json_encode($geo));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// POST /api/admin/geolocations
$app->post('/api/admin/geolocations', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    $name = trim($data['location_name'] ?? '');
    $lat = (float)($data['latitude'] ?? 0);
    $lng = (float)($data['longitude'] ?? 0);
    $rad = (int)($data['radius'] ?? 100);

    if (!$name || !$lat || !$lng) {
        $response->getBody()->write(json_encode(['error' => 'Name, latitude, and longitude are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $stmt = $conn->prepare('INSERT INTO geofences (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)');
        $stmt->execute([$name, $lat, $lng, $rad]);
        $response->getBody()->write(json_encode(['message' => 'Geo location added successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// PUT /api/admin/geolocations/{id}
$app->put('/api/admin/geolocations/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    $name = trim($data['location_name'] ?? '');
    $lat = (float)($data['latitude'] ?? 0);
    $lng = (float)($data['longitude'] ?? 0);
    $rad = (int)($data['radius'] ?? 100);

    if (!$name || !$lat || !$lng) {
        $response->getBody()->write(json_encode(['error' => 'Name, latitude, and longitude are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $stmt = $conn->prepare('UPDATE geofences SET name = ?, latitude = ?, longitude = ?, radius = ? WHERE id = ?');
        $stmt->execute([$name, $lat, $lng, $rad, $id]);
        $response->getBody()->write(json_encode(['message' => 'Geo location updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// DELETE /api/admin/geolocations/{id}
$app->delete('/api/admin/geolocations/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();
    try {
        $stmt = $conn->prepare('DELETE FROM geofences WHERE id = ?');
        $stmt->execute([$id]);
        $response->getBody()->write(json_encode(['message' => 'Geo location deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// GET /api/admin/shifttimes
$app->get('/api/admin/shifttimes', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    try {
        $stmt = $conn->query('SELECT id, "shiftLabel", "startTime", "endTime" FROM shift_times ORDER BY id ASC');
        $shifts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response->getBody()->write(json_encode($shifts));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// POST /api/admin/shifttimes
$app->post('/api/admin/shifttimes', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    $start = trim($data['start_time'] ?? '');
    $end = trim($data['end_time'] ?? '');

    if (!$start || !$end) {
        $response->getBody()->write(json_encode(['error' => 'Start and end time are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $stmt = $conn->prepare('INSERT INTO shift_times ("shiftLabel", "startTime", "endTime") VALUES (?, ?, ?)');
        $label = date('h:i A', strtotime($start)) . ' to ' . date('h:i A', strtotime($end));
        $stmt->execute([$label, $start, $end]);
        $response->getBody()->write(json_encode(['message' => 'Shift time added successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// PUT /api/admin/shifttimes/{id}
$app->put('/api/admin/shifttimes/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    $start = trim($data['start_time'] ?? '');
    $end = trim($data['end_time'] ?? '');

    if (!$start || !$end) {
        $response->getBody()->write(json_encode(['error' => 'Start and end time are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $stmt = $conn->prepare('UPDATE shift_times SET "shiftLabel" = ?, "startTime" = ?, "endTime" = ? WHERE id = ?');
        $label = date('h:i A', strtotime($start)) . ' to ' . date('h:i A', strtotime($end));
        $stmt->execute([$label, $start, $end, $id]);
        $response->getBody()->write(json_encode(['message' => 'Shift time updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// DELETE /api/admin/shifttimes/{id}
$app->delete('/api/admin/shifttimes/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();
    try {
        $stmt = $conn->prepare('DELETE FROM shift_times WHERE id = ?');
        $stmt->execute([$id]);
        $response->getBody()->write(json_encode(['message' => 'Shift time deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// POST /api/admin/attendance/regularize
$app->post('/api/admin/attendance/regularize', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();
    
    $adminUser = $request->getAttribute('user');
    $adminId = $adminUser ? $adminUser->id : null;
    
    $attendanceId = trim($data['attendanceId'] ?? '');
    $employeeId = trim($data['employeeId'] ?? '');
    $date = trim($data['date'] ?? '');
    $status = trim($data['status'] ?? '');
    $checkInTime = trim($data['checkIn'] ?? '');
    $checkOutTime = trim($data['checkOut'] ?? '');
    $hoursInput = trim($data['hours'] ?? '');

    $allowedStatuses = ['present', 'leave', 'not-marked'];
    if (!in_array($status, $allowedStatuses, true)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid status selected.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (!$employeeId || !$date) {
        $response->getBody()->write(json_encode(['error' => 'Employee ID and date are required.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $checkIn = null;
    $checkOut = null;
    $hours = null;

    if ($status === 'present') {
        if (!$checkInTime) {
            $response->getBody()->write(json_encode(['error' => 'Check-in time is required for Present status.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $checkIn = $date . ' ' . $checkInTime . ':00';
        
        if ($checkOutTime) {
            $checkOut = $date . ' ' . $checkOutTime . ':00';
            if (strtotime($checkOut) <= strtotime($checkIn)) {
                $response->getBody()->write(json_encode(['error' => 'Check-out must be after check-in.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
            }
            $hours = round((strtotime($checkOut) - strtotime($checkIn)) / 3600, 2);
        } else {
            $hours = 0;
        }
        
        if ($hoursInput !== '') {
            $hours = max(0, round((float)$hoursInput, 2));
        }

        // Calculate late/early/missing based on shift
        $stmtEmpShift = $conn->prepare('SELECT e."shiftTime", s."startTime", s."endTime" FROM employee e LEFT JOIN shift_times s ON e."shiftTime" = s."shiftLabel" WHERE e."userId" = ?');
        $stmtEmpShift->execute([$employeeId]);
        $empShift = $stmtEmpShift->fetch(PDO::FETCH_ASSOC);
        
        if ($empShift && !empty($empShift['startTime']) && !empty($empShift['endTime'])) {
            $checkInTimeStr = date('H:i:s', strtotime($checkIn));
            $isLate = ($checkInTimeStr > $empShift['startTime']);

            if (!$checkOutTime) {
                $status = $isLate ? 'present (late+checkout missing)' : 'present (checkout missing)';
            } else {
                $checkOutTimeStr = date('H:i:s', strtotime($checkOut));
                $isEarly = ($checkOutTimeStr < $empShift['endTime']);
                
                if ($isLate && $isEarly) {
                    $status = 'present (early+late)';
                } elseif ($isLate) {
                    $status = 'present (late)';
                } elseif ($isEarly) {
                    $status = 'present (early)';
                }
            }
        } else {
            if (!$checkOutTime) {
                $status = 'present (checkout missing)';
            }
        }
    }

    try {
        $conn->beginTransaction();

        $stmtOldAtt = $conn->prepare('SELECT id, "employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized", "checkInPhoto", "checkOutPhoto", "checkInLat", "checkInLng", "checkInAddress", "checkOutLat", "checkOutLng", "checkOutAddress" FROM attendance WHERE "employeeId" = ? AND date = ?');
        $stmtOldAtt->execute([$employeeId, $date]);
        $oldAtt = $stmtOldAtt->fetch(PDO::FETCH_ASSOC);

        if (strpos($status, 'present') === 0) {
            adjustApprovedLeaveRecordForDate($conn, $employeeId, $date, $adminId);

            if ($oldAtt) {
                $stmtUpdate = $conn->prepare('UPDATE attendance SET status = ?, "checkIn" = ?, "checkOut" = ?, hours = ?, "isRegularized" = ? WHERE id = ?');
                $stmtUpdate->execute([$status, $checkIn, $checkOut, $hours, 'true', $oldAtt['id']]);
                
                $stmtNewAtt = $conn->prepare('SELECT id, "employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized", "checkInPhoto", "checkOutPhoto", "checkInLat", "checkInLng", "checkInAddress", "checkOutLat", "checkOutLng", "checkOutAddress" FROM attendance WHERE id = ?');
                $stmtNewAtt->execute([$oldAtt['id']]);
                $newAtt = $stmtNewAtt->fetch(PDO::FETCH_ASSOC);
                
                logAttendanceAudit($conn, $adminId, 'update', 'attendance', $oldAtt['id'], $oldAtt, $newAtt, 'Regularized attendance.');
            } else {
                $stmtInsert = $conn->prepare('INSERT INTO attendance ("employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized") VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id');
                $stmtInsert->execute([$employeeId, $date, $status, $checkIn, $checkOut, $hours, 'true']);
                $newId = $stmtInsert->fetchColumn();
                
                $stmtNewAtt = $conn->prepare('SELECT id, "employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized", "checkInPhoto", "checkOutPhoto", "checkInLat", "checkInLng", "checkInAddress", "checkOutLat", "checkOutLng", "checkOutAddress" FROM attendance WHERE id = ?');
                $stmtNewAtt->execute([$newId]);
                $newAtt = $stmtNewAtt->fetch(PDO::FETCH_ASSOC);
                
                logAttendanceAudit($conn, $adminId, 'create', 'attendance', $newId, null, $newAtt, 'Regularized attendance.');
            }
        } elseif ($status === 'not-marked') {
            if ($oldAtt) {
                $conn->prepare('DELETE FROM attendance WHERE id = ?')->execute([$oldAtt['id']]);
                logAttendanceAudit($conn, $adminId, 'delete', 'attendance', $oldAtt['id'], $oldAtt, null, 'Deleted attendance record.');
            }
            adjustApprovedLeaveRecordForDate($conn, $employeeId, $date, $adminId);
        } elseif ($status === 'leave') {
            // We just need to find the old attendance and update it, no need to delete.
            // But we do need to create the leave record.
            
            $stmtFindLeave = $conn->prepare('SELECT id, "leaveType" FROM leaves WHERE "employeeId" = ? AND CAST("startDate" AS DATE) <= ? AND CAST("endDate" AS DATE) >= ? AND status ILIKE \'approved\'');
            $stmtFindLeave->execute([$employeeId, $date, $date]);
            $existingLeave = $stmtFindLeave->fetch(PDO::FETCH_ASSOC);
            
            if (!$existingLeave) {
                $monthStart = date('Y-m-01', strtotime($date));
                $monthEnd = date('Y-m-t', strtotime($date));
                
                $stmtPaidLeave = $conn->prepare('SELECT COUNT(*) FROM leaves WHERE "employeeId" = ? AND "leaveType" = \'Paid\' AND status ILIKE \'approved\' AND CAST("startDate" AS DATE) <= ? AND CAST("endDate" AS DATE) >= ?');
                $stmtPaidLeave->execute([$employeeId, $monthEnd, $monthStart]);
                $hasPaidLeaveThisMonth = $stmtPaidLeave->fetchColumn() > 0;

                $leaveType = 'Unpaid';
                if (!$hasPaidLeaveThisMonth) {
                    $stmtBalance = $conn->prepare('SELECT "paidTotal", "paidUsed" FROM leave_balances WHERE "employeeId" = ? LIMIT 1');
                    $stmtBalance->execute([$employeeId]);
                    $balance = $stmtBalance->fetch(PDO::FETCH_ASSOC);
                    if (!$balance || ((int)$balance['paidTotal'] - (int)$balance['paidUsed']) > 0) {
                        $leaveType = 'Paid';
                    }
                }
                
                $stmtInsLeave = $conn->prepare('INSERT INTO leaves ("employeeId", "leaveType", "startDate", "endDate", days, reason, status, "approvedBy") VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
                $stmtInsLeave->execute([$employeeId, $leaveType, $date, $date, 1, 'Regularized to Leave by Admin', 'approved', $adminId]);
                $newLeaveId = $stmtInsLeave->fetchColumn();
                
                if ($leaveType === 'Paid') {
                    $conn->prepare('UPDATE leave_balances SET "paidUsed" = "paidUsed" + 1 WHERE "employeeId" = ?')->execute([$employeeId]);
                } else {
                    $conn->prepare('UPDATE leave_balances SET "unpaidUsed" = "unpaidUsed" + 1 WHERE "employeeId" = ?')->execute([$employeeId]);
                }
                
                $stmtNewLeave = $conn->prepare('SELECT id, "employeeId", "leaveType", "startDate", "endDate", days, reason, status, "appliedDate", "approvedBy" FROM leaves WHERE id = ?');
                $stmtNewLeave->execute([$newLeaveId]);
                $newLeave = $stmtNewLeave->fetch(PDO::FETCH_ASSOC);
                
                logAttendanceAudit($conn, $adminId, 'create', 'leave', $newLeaveId, null, $newLeave, 'Regularized attendance to leave.');
            }

            $finalLeaveType = $existingLeave ? $existingLeave['leaveType'] : $leaveType;
            $attendanceStatus = strtolower($finalLeaveType) . ' leave';
            
            // Always ensure an attendance record exists for the leave
            if ($oldAtt) {
                $stmtAtt = $conn->prepare('
                    UPDATE attendance 
                    SET status = ?, hours = 0, "isRegularized" = false, "checkIn" = null, "checkOut" = null 
                    WHERE id = ?
                ');
                $stmtAtt->execute([$attendanceStatus, $oldAtt['id']]);
            } else {
                $stmtAtt = $conn->prepare('
                    INSERT INTO attendance ("employeeId", "date", status, hours, "isRegularized", "checkIn", "checkOut")
                    VALUES (?, ?, ?, 0, false, null, null)
                ');
                $stmtAtt->execute([$employeeId, $date, $attendanceStatus]);
            }
        }

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Attendance regularized successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// GET /api/admin/attendance/employee/{id}
$app->get('/api/admin/attendance/employee/{id}', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $employeeId = $args['id'];
    $queryParams = $request->getQueryParams();
    $month = $queryParams['month'] ?? date('Y-m'); // e.g. 2026-06

    try {
        // Fetch employee details to verify existence
        $stmtEmp = $conn->prepare('SELECT id, "employeeId" as "employeeCode", "firstName", "lastName", "weekOff", "shiftTime", "joinDate" FROM employee WHERE "userId" = ?');
        $stmtEmp->execute([$employeeId]);
        $employee = $stmtEmp->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            // Fallback: check if id passed was actually employee table id
            $stmtEmp2 = $conn->prepare('SELECT id, "userId", "employeeId" as "employeeCode", "firstName", "lastName", "weekOff", "shiftTime", "joinDate" FROM employee WHERE id = ?');
            $stmtEmp2->execute([$employeeId]);
            $employee = $stmtEmp2->fetch(PDO::FETCH_ASSOC);
            if ($employee) {
                $employeeId = $employee['userId'] ?? $employee['id'];
            } else {
                $response->getBody()->write(json_encode(['error' => 'Employee not found']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }
        }

        $startDate = $month . '-01';
        $endDate = date('Y-m-t', strtotime($startDate));

        $shiftTimesMap = getShiftTimesMap($conn);

        // Fetch attendance records for the month
        $attSql = "SELECT id as \"attendanceRecordId\", \"employeeId\", date, \"checkIn\", \"checkOut\", hours, status, \"isRegularized\" FROM attendance WHERE \"employeeId\" = ? AND date >= ? AND date <= ?";
        $stmtAtt = $conn->prepare($attSql);
        $stmtAtt->execute([$employeeId, $startDate, $endDate]);
        $attendanceRecords = $stmtAtt->fetchAll(PDO::FETCH_ASSOC);

        $attMap = [];
        foreach ($attendanceRecords as $att) {
            $attMap[$att['date']] = $att;
        }

        // Fetch company holidays for the month
        $stmtHols = $conn->prepare('SELECT id, "holidayDate", "holidayName", "holidayImage", "isActive" FROM company_holidays WHERE "holidayDate" >= ? AND "holidayDate" <= ? AND "isActive" = 1');
        $stmtHols->execute([$startDate, $endDate]);
        $holidays = $stmtHols->fetchAll(PDO::FETCH_ASSOC);

        $holidayMap = [];
        foreach ($holidays as $hol) {
            $holidayMap[$hol['holidayDate']] = $hol;
        }

        // Fetch approved leaves for the month
        // We only care about overlaps
        $leaveSql = "SELECT \"startDate\", \"endDate\", \"leaveType\" FROM leaves WHERE \"employeeId\" = ? AND status ILIKE 'approved' AND CAST(\"startDate\" AS DATE) <= ? AND CAST(\"endDate\" AS DATE) >= ?";
        $stmtLeave = $conn->prepare($leaveSql);
        $stmtLeave->execute([$employeeId, $endDate, $startDate]);
        $leaves = $stmtLeave->fetchAll(PDO::FETCH_ASSOC);

        $leaveDates = [];
        foreach ($leaves as $lv) {
            $current = strtotime($lv['startDate']);
            $endLv = strtotime($lv['endDate']);
            while ($current <= $endLv) {
                $leaveDates[date('Y-m-d', $current)] = strtolower($lv['leaveType']) . ' leave';
                $current = strtotime('+1 day', $current);
            }
        }

        // Generate day-by-day array
        $currentDate = strtotime($startDate);
        $endDateTime = strtotime($endDate);
        
        $todayStr = date('Y-m-d');
        
        $weekOffStr = strtolower($employee['weekOff'] ?? 'sunday');
        $weekOffDays = array_map('trim', explode(',', $weekOffStr));
        
        $days = [];
        while ($currentDate <= $endDateTime) {
            $dateStr = date('Y-m-d', $currentDate);
            $dayName = strtolower(date('l', $currentDate));
            $isWeekend = in_array($dayName, $weekOffDays);
            
            $baseDay = [
                'date' => $dateStr,
                'employeeId' => $employeeId,
                'employeeCode' => $employee['employeeCode'],
                'employeeName' => trim($employee['firstName'] . ' ' . $employee['lastName'])
            ];

            if (!empty($employee['joinDate']) && $dateStr < $employee['joinDate']) {
                $days[] = array_merge($baseDay, [
                    'id' => 'not-joined-' . $dateStr,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'not-joined'
                ]);
            } elseif (isset($leaveDates[$dateStr]) || (isset($attMap[$dateStr]) && strpos(strtolower($attMap[$dateStr]['status']), 'leave') !== false)) {
                $leaveStatus = isset($attMap[$dateStr]) && strpos(strtolower($attMap[$dateStr]['status']), 'leave') !== false ? strtolower($attMap[$dateStr]['status']) : $leaveDates[$dateStr];
                $days[] = array_merge($baseDay, [
                    'id' => 'leave-' . $dateStr,
                    'attendanceRecordId' => isset($attMap[$dateStr]) ? $attMap[$dateStr]['attendanceRecordId'] : null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => $leaveStatus
                ]);
            } elseif (isset($attMap[$dateStr]) && (!empty($attMap[$dateStr]['checkIn']) || (isset($attMap[$dateStr]['isRegularized']) && ($attMap[$dateStr]['isRegularized'] === true || $attMap[$dateStr]['isRegularized'] === 'true' || $attMap[$dateStr]['isRegularized'] === 'yes')))) {
                $rec = $attMap[$dateStr];
                $status = applyShiftStatusModifiers($rec['status'], $rec['checkIn'], $rec['checkOut'], $employee['shiftTime'] ?? null, $shiftTimesMap);
                $days[] = array_merge($baseDay, [
                    'id' => 'att-' . $rec['attendanceRecordId'],
                    'attendanceRecordId' => $rec['attendanceRecordId'],
                    'checkIn' => $rec['checkIn'],
                    'checkOut' => $rec['checkOut'],
                    'hours' => $rec['hours'],
                    'status' => $status,
                    'isRegularized' => $rec['isRegularized'] ?? false
                ]);
            } elseif (isset($holidayMap[$dateStr])) {
                $days[] = array_merge($baseDay, [
                    'id' => 'holiday-' . $dateStr,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'holiday',
                    'holidayName' => $holidayMap[$dateStr]['holidayName'],
                    'holidayImage' => $holidayMap[$dateStr]['holidayImage']
                ]);
            } elseif ($isWeekend) {
                $days[] = array_merge($baseDay, [
                    'id' => 'weekend-' . $dateStr,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'weekend'
                ]);
            } elseif (isset($attMap[$dateStr])) {
                $rec = $attMap[$dateStr];
                $status = applyShiftStatusModifiers($rec['status'], $rec['checkIn'], $rec['checkOut'], $employee['shiftTime'] ?? null, $shiftTimesMap);
                $days[] = array_merge($baseDay, [
                    'id' => 'att-' . $rec['attendanceRecordId'],
                    'attendanceRecordId' => $rec['attendanceRecordId'],
                    'checkIn' => $rec['checkIn'],
                    'checkOut' => $rec['checkOut'],
                    'hours' => $rec['hours'],
                    'status' => $status,
                    'isRegularized' => $rec['isRegularized'] ?? false
                ]);
            } elseif ($dateStr > $todayStr) {
                $days[] = array_merge($baseDay, [
                    'id' => 'future-' . $dateStr,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'future'
                ]);
            } elseif ($dateStr < $todayStr) {
                // Past date, no attendance, no leave, not weekend
                $days[] = array_merge($baseDay, [
                    'id' => 'missing-' . $dateStr,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'missing'
                ]);
            } else {
                // Today, no attendance yet
                $days[] = array_merge($baseDay, [
                    'id' => 'not-marked-' . $dateStr,
                    'attendanceRecordId' => null,
                    'checkIn' => null,
                    'checkOut' => null,
                    'hours' => null,
                    'status' => 'not-marked'
                ]);
            }
            
            $currentDate = strtotime('+1 day', $currentDate);
        }

        $response->getBody()->write(json_encode([
            'employee' => $employee,
            'attendance' => $days
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// GET /api/admin/attendance/location/{id}
$app->get('/api/admin/attendance/location/{id}', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $id = $args['id'];
    
    if (strpos($id, 'att-') === 0) {
        $id = substr($id, 4);
    }
    
    try {
        $stmt = $conn->prepare('SELECT id, "employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized", "checkInPhoto", "checkOutPhoto", "checkInLat", "checkInLng", "checkInAddress", "checkOutLat", "checkOutLng", "checkOutAddress" FROM attendance WHERE id = ?');
        $stmt->execute([$id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$record) {
            $response->getBody()->write(json_encode(['error' => 'Attendance record not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }
        
        $stmt = $conn->prepare('SELECT id, "userId", "employeeId" as "employeeCode", "firstName", "lastName" FROM employee WHERE id = ? OR "userId" = ?');
        $stmt->execute([$record['employeeId'], $record['employeeId']]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $stmt = $conn->prepare('SELECT id, "attendanceId", "employeeId", "punchTime", latitude, longitude, address, photo FROM attendance_punches WHERE "attendanceId" = ? ORDER BY "punchTime" ASC');
        $stmt->execute([$id]);
        $punches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response->getBody()->write(json_encode([
            'record' => $record,
            'employee' => $employee,
            'punches' => $punches,
            'googleMapsApiKey' => $_ENV['GOOGLE_MAPS_API_KEY'] ?? ''
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));
