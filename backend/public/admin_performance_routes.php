<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

require_once __DIR__ . '/performance_helpers.php';

/** @var \Slim\App $app */
$app->get('/api/admin/performance', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $employeeIdParam = $params['id'] ?? '';

    if (empty($employeeIdParam)) {
        // Return 400 or empty structure if no ID selected
        $response->getBody()->write(json_encode(['error' => 'Employee ID is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Get employee details
    $stmt = $conn->prepare('
        SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email,
               e.department, e.position, e.status, e.avatar, e."joinDate", e."managerId", e."weekOff"
        FROM employee e WHERE e.id = ?
    ');
    $stmt->execute([$employeeIdParam]);
    $employee = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$employee) {
        $response->getBody()->write(json_encode(['error' => 'Employee not found']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $today = date('Y-m-d');
    $months = buildMonthIntervals(6, $today);
    $periodStart = $months[0]['start'];
    $periodEnd = $months[count($months) - 1]['end'];

    // Get company holidays
    $holStmt = $conn->query('SELECT "holidayDate" FROM company_holidays WHERE "isActive" = 1');
    $holidaysRows = $holStmt->fetchAll(PDO::FETCH_ASSOC);
    $holidays = [];
    foreach ($holidaysRows as $h) {
        $holidays[$h['holidayDate']] = true;
    }

    // Get peers and subordinates
    $peers = getPeerEmployees($conn, $employee['managerId'], $employee['department'], $employee['id']);
    $subordinateTree = getSubordinateTree($conn, $employee['id']);
    $reporting = flattenEmployeePerformanceTree($subordinateTree);

    $allEmployeeIds = array_unique(array_merge(
        [$employee['userId']],
        array_column($peers, 'userId'),
        array_column($reporting, 'userId')
    ));

    $attendanceByEmployee = [];

    if (!empty($allEmployeeIds)) {
        $placeholders = implode(',', array_fill(0, count($allEmployeeIds), '?'));
        
        // Fetch Attendance
        $attendanceSql = "SELECT \"employeeId\", date, status, \"checkIn\", hours FROM attendance WHERE \"employeeId\" IN ({$placeholders}) AND date BETWEEN ? AND ?";
        $attStmt = $conn->prepare($attendanceSql);
        $attStmt->execute(array_merge($allEmployeeIds, [$periodStart, $periodEnd]));
        $attendanceRows = $attStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($attendanceRows as $row) {
            $userId = $row['employeeId']; // in attendance table, employeeId is actually userId
            $date = substr($row['date'], 0, 10);
            $attendanceByEmployee[$userId][$date] = [
                'status' => $row['status'],
                'checkIn' => $row['checkIn'],
                'hours' => (float)($row['hours'] ?? 0),
            ];
        }
    }

    $currentMetrics = buildMetrics($employee, $months, $holidays, $attendanceByEmployee, $today);
    $currentMonthSummary = buildCurrentMonthSummary($employee, $today, $holidays, $attendanceByEmployee);

    $peerMetrics = [];
    foreach ($peers as $peer) {
        $peerMetrics[] = [
            'employee' => $peer,
            'metrics' => buildMetrics($peer, $months, $holidays, $attendanceByEmployee, $today),
            'summary' => buildCurrentMonthSummary($peer, $today, $holidays, $attendanceByEmployee),
        ];
    }

    $reportMetrics = [];
    foreach ($reporting as $report) {
        $reportMetrics[] = [
            'employee' => $report,
            'metrics' => buildMetrics($report, $months, $holidays, $attendanceByEmployee, $today),
            'summary' => buildCurrentMonthSummary($report, $today, $holidays, $attendanceByEmployee),
        ];
    }

    usort($peerMetrics, fn($a, $b) => $b['summary']['attendancePct'] <=> $a['summary']['attendancePct']);
    usort($reportMetrics, fn($a, $b) => $b['summary']['attendancePct'] <=> $a['summary']['attendancePct']);

    $peerAverageAttendance = calculatePerformanceAverage(array_column($peerMetrics, 'summary'), 'attendancePct');
    $peerAverageLeaveUsage = calculatePerformanceAverage(array_column($peerMetrics, 'summary'), 'leavePct');
    $reportAverageAttendance = calculatePerformanceAverage(array_column($reportMetrics, 'summary'), 'attendancePct');
    $reportAverageLeaveUsage = calculatePerformanceAverage(array_column($reportMetrics, 'summary'), 'leavePct');

    $allTeamMetrics = array_merge($peerMetrics, $reportMetrics);
    $highestAttendance = null;
    $mostLeaveTaken = null;
    if (!empty($allTeamMetrics)) {
        $highestAttendance = $allTeamMetrics[0];
        $mostLeaveTaken = array_reduce($allTeamMetrics, function ($carry, $item) {
            if ($carry === null || $item['summary']['totalLeave'] > $carry['summary']['totalLeave']) {
                return $item;
            }
            return $carry;
        });
    }

    $response->getBody()->write(json_encode([
        'employee' => $employee,
        'currentMetrics' => $currentMetrics,
        'currentMonthSummary' => $currentMonthSummary,
        'peerMetrics' => $peerMetrics,
        'reportMetrics' => $reportMetrics,
        'peerAverageAttendance' => $peerAverageAttendance,
        'peerAverageLeaveUsage' => $peerAverageLeaveUsage,
        'reportAverageAttendance' => $reportAverageAttendance,
        'reportAverageLeaveUsage' => $reportAverageLeaveUsage,
        'highestAttendance' => $highestAttendance,
        'mostLeaveTaken' => $mostLeaveTaken
    ]));

    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware(['admin']));
