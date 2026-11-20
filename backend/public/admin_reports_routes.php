<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/**
 * Generate CSV output from a PDO statement
 */
function streamCsvOutput(Response $response, $filename, $stmt) {
    $response = $response
        ->withHeader('Content-Type', 'text/csv; charset=utf-8')
        ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
        ->withHeader('Pragma', 'no-cache')
        ->withHeader('Expires', '0');

    $stream = fopen('php://temp', 'r+');
    
    // Fetch first row to get column headers
    $firstRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($firstRow) {
        // Write headers
        fputcsv($stream, array_keys($firstRow));
        // Write first row data
        fputcsv($stream, array_values($firstRow));
        
        // Write remaining rows
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($stream, array_values($row));
        }
    } else {
        fputcsv($stream, ['No data found']);
    }

    rewind($stream);
    $response->getBody()->write(stream_get_contents($stream));
    fclose($stream);

    return $response->withStatus(200);
}

// Aggregated analytics always use the FULL authorized dataset. Detail lists
// remain paginated and CSV exports remain full-stream downloads.
$app->get('/api/admin/reports/analytics', function (Request $request, Response $response) {
    $params = $request->getQueryParams();
    $attendanceMonth = (string)($params['attendanceMonth'] ?? date('Y-m'));
    $payrollMonth = (string)($params['payrollMonth'] ?? date('Y-m'));
    foreach ([$attendanceMonth, $payrollMonth] as $month) {
        if (!preg_match('/^\\d{4}-(0[1-9]|1[0-2])$/', $month)) {
            $response->getBody()->write(json_encode(['error' => 'Invalid reporting month']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
    }
    $start = $attendanceMonth . '-01';
    $end = date('Y-m-t', strtotime($start));
    [$year, $month] = array_map('intval', explode('-', $payrollMonth));
    try {
        $db = new Database();
        $conn = $db->getConnection();
        if (!$conn) throw new RuntimeException('Database unavailable');
        $totalEmployees = (int)$conn->query('SELECT COUNT(*) FROM employee')->fetchColumn();
        $departments = $conn->query(
            "SELECT COALESCE(NULLIF(TRIM(department), ''), 'Unassigned') AS name, COUNT(*) AS total
             FROM employee GROUP BY 1 ORDER BY 1"
        )->fetchAll(PDO::FETCH_ASSOC);
        $positions = $conn->query(
            "SELECT COALESCE(NULLIF(TRIM(position), ''), 'Staff') AS name, COUNT(*) AS total
             FROM employee GROUP BY 1 ORDER BY 1"
        )->fetchAll(PDO::FETCH_ASSOC);
        $attendanceStmt = $conn->prepare(
            "SELECT a.date::text AS date, COUNT(*) AS total,
                    SUM(CASE WHEN LOWER(COALESCE(a.status, '')) LIKE '%present%' THEN 1 ELSE 0 END) AS present,
                    SUM(CASE WHEN LOWER(COALESCE(a.status, '')) LIKE '%present%' THEN 0 ELSE 1 END) AS absent
             FROM attendance a JOIN employee e ON a.\"employeeId\" = e.\"userId\"
             WHERE a.date >= ? AND a.date <= ? GROUP BY a.date ORDER BY a.date"
        );
        $attendanceStmt->execute([$start, $end]);
        $attendance = $attendanceStmt->fetchAll(PDO::FETCH_ASSOC);
        $attendanceCount = array_sum(array_map(static fn($row) => (int)$row['total'], $attendance));
        $payrollStmt = $conn->prepare(
            "SELECT COALESCE(NULLIF(TRIM(e.department), ''), 'Unassigned') AS dept,
                    COUNT(*) AS total,
                    SUM(COALESCE(e.salary, 0)) AS basic_salary,
                    SUM(COALESCE(p.\"netSalary\", 0)) AS net_salary,
                    SUM(GREATEST(0, COALESCE(e.salary, 0) - COALESCE(p.\"netSalary\", 0))) AS deductions
             FROM payslips p JOIN employee e ON p.\"employeeId\" = e.\"userId\"
             WHERE p.year = ? AND p.month = ? GROUP BY 1 ORDER BY 1"
        );
        $payrollStmt->execute([$year, $month]);
        $payroll = $payrollStmt->fetchAll(PDO::FETCH_ASSOC);
        $payrollCount = array_sum(array_map(static fn($row) => (int)$row['total'], $payroll));
        $response->getBody()->write(json_encode([
            'totalEmployees' => $totalEmployees,
            'departments' => $departments,
            'positions' => $positions,
            'attendance' => $attendance,
            'attendanceTotal' => $attendanceCount,
            'payroll' => $payroll,
            'payrollTotal' => $payrollCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Throwable $e) {
        error_log('Admin aggregate reports failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Reporting data unavailable']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin']));

// GET /api/admin/reports/employees
$app->get('/api/admin/reports/employees', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $format = $queryParams['format'] ?? 'csv';
    $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 100;
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 100;
    if ($offset < 0) $offset = 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        if ($format === 'json') {
            $stmt = $conn->prepare('
                SELECT 
                    COALESCE(e."employeeId", e."userId"::text) as "Employee Code",
                    e."userId"::text as "Employee ID",
                    e."firstName" as "First Name",
                    e."lastName" as "Last Name",
                    e.email as "Email",
                    COALESCE(e.department, \'Unassigned\') as "Department",
                    COALESCE(e.position, \'Staff\') as "Position",
                    COALESCE(e.status, \'active\') as "Status",
                    COALESCE(e."joinDate"::text, \'\') as "Join Date",
                    COALESCE(e.salary, 0) as "Salary"
                FROM employee e
                ORDER BY e."firstName" ASC
                LIMIT ? OFFSET ?
            ');
            $stmt->bindValue(1, $limit, PDO::PARAM_INT);
            $stmt->bindValue(2, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalCount = (int)$conn->query('SELECT COUNT(*) FROM employee')->fetchColumn();

            $response->getBody()->write(json_encode([
                'data' => $data,
                'total' => $totalCount
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $stmt = $conn->query('
            SELECT 
                COALESCE(e."employeeId", e."userId"::text) as "Employee Code",
                e."userId"::text as "Employee ID",
                e."firstName" as "First Name",
                e."lastName" as "Last Name",
                e.email as "Email",
                COALESCE(e.department, \'Unassigned\') as "Department",
                COALESCE(e.position, \'Staff\') as "Position",
                COALESCE(e.status, \'active\') as "Status",
                COALESCE(e."joinDate"::text, \'\') as "Join Date",
                COALESCE(e.salary, 0) as "Salary"
            FROM employee e
            ORDER BY e."firstName" ASC
        ');

        $filename = "employee_directory_" . date('Y-m-d') . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// GET /api/admin/reports/attendance
$app->get('/api/admin/reports/attendance', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $month = $queryParams['month'] ?? date('Y-m'); // Expected format: YYYY-MM
    $format = $queryParams['format'] ?? 'csv';
    $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 100;
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 100;
    if ($offset < 0) $offset = 0;

    $startDate = $month . '-01';
    $endDate = date('Y-m-t', strtotime($startDate));

    $db = new Database();
    $conn = $db->getConnection();

    try {
        if ($format === 'json') {
            $stmt = $conn->prepare('
                SELECT 
                    e."firstName" as "First Name",
                    e."lastName" as "Last Name",
                    COALESCE(e.department, \'Unassigned\') as "Department",
                    a.date::text as "Date",
                    COALESCE(a.status, \'absent\') as "Status",
                    COALESCE(a."checkIn"::text, \'-\') as "Check In",
                    COALESCE(a."checkOut"::text, \'-\') as "Check Out",
                    COALESCE(a.hours::text, \'0\') as "Working Hours"
                FROM attendance a
                JOIN employee e ON a."employeeId" = e."userId"
                WHERE a.date::text >= ? AND a.date::text <= ?
                ORDER BY a.date DESC, e."firstName" ASC
                LIMIT ? OFFSET ?
            ');
            $stmt->bindValue(1, $startDate);
            $stmt->bindValue(2, $endDate);
            $stmt->bindValue(3, $limit, PDO::PARAM_INT);
            $stmt->bindValue(4, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmtCount = $conn->prepare('SELECT COUNT(*) FROM attendance a JOIN employee e ON a."employeeId" = e."userId" WHERE a.date::text >= ? AND a.date::text <= ?');
            $stmtCount->execute([$startDate, $endDate]);
            $totalCount = (int)$stmtCount->fetchColumn();

            $response->getBody()->write(json_encode([
                'data' => $data,
                'total' => $totalCount
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $stmt = $conn->prepare('
            SELECT 
                e."firstName" as "First Name",
                e."lastName" as "Last Name",
                COALESCE(e.department, \'Unassigned\') as "Department",
                a.date::text as "Date",
                COALESCE(a.status, \'absent\') as "Status",
                COALESCE(a."checkIn"::text, \'-\') as "Check In",
                COALESCE(a."checkOut"::text, \'-\') as "Check Out",
                COALESCE(a.hours::text, \'0\') as "Working Hours"
            FROM attendance a
            JOIN employee e ON a."employeeId" = e."userId"
            WHERE a.date::text >= ? AND a.date::text <= ?
            ORDER BY a.date DESC, e."firstName" ASC
        ');
        $stmt->execute([$startDate, $endDate]);

        $filename = "attendance_report_" . $month . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));

// GET /api/admin/reports/payroll
$app->get('/api/admin/reports/payroll', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $month = $queryParams['month'] ?? date('Y-m'); // Expected format: YYYY-MM
    $format = $queryParams['format'] ?? 'csv';
    $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 100;
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 100;
    if ($offset < 0) $offset = 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $parts = explode('-', $month);
        $reqYear = isset($parts[0]) ? (int)$parts[0] : (int)date('Y');
        $reqMonth = isset($parts[1]) ? (int)$parts[1] : (int)date('m');

        if ($format === 'json') {
            $stmt = $conn->prepare('
                SELECT 
                    e."firstName" as "First Name",
                    e."lastName" as "Last Name",
                    COALESCE(e.department, \'Unassigned\') as "Department",
                    p.month as "Month",
                    p.year as "Year",
                    COALESCE(e.salary, 0) as "Basic Salary",
                    COALESCE(p."netSalary", 0) as "Net Salary",
                    GREATEST(0, COALESCE(e.salary, 0) - COALESCE(p."netSalary", 0)) as "Deductions",
                    COALESCE(p.status, \'pending\') as "Payment Status"
                FROM payslips p
                JOIN employee e ON p."employeeId" = e."userId"
                WHERE p.month = ? AND p.year = ?
                ORDER BY e."firstName" ASC
                LIMIT ? OFFSET ?
            ');
            $stmt->bindValue(1, $reqMonth, PDO::PARAM_INT);
            $stmt->bindValue(2, $reqYear, PDO::PARAM_INT);
            $stmt->bindValue(3, $limit, PDO::PARAM_INT);
            $stmt->bindValue(4, $offset, PDO::PARAM_INT);
            $stmt->execute();
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmtCount = $conn->prepare('SELECT COUNT(*) FROM payslips p JOIN employee e ON p."employeeId" = e."userId" WHERE p.month = ? AND p.year = ?');
            $stmtCount->execute([$reqMonth, $reqYear]);
            $totalCount = (int)$stmtCount->fetchColumn();

            $response->getBody()->write(json_encode([
                'data' => $data,
                'total' => $totalCount
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $stmt = $conn->prepare('
            SELECT 
                e."firstName" as "First Name",
                e."lastName" as "Last Name",
                COALESCE(e.department, \'Unassigned\') as "Department",
                p.month as "Month",
                p.year as "Year",
                COALESCE(e.salary, 0) as "Basic Salary",
                COALESCE(p."netSalary", 0) as "Net Salary",
                GREATEST(0, COALESCE(e.salary, 0) - COALESCE(p."netSalary", 0)) as "Deductions",
                COALESCE(p.status, \'pending\') as "Payment Status"
            FROM payslips p
            JOIN employee e ON p."employeeId" = e."userId"
            WHERE p.month = ? AND p.year = ?
            ORDER BY e."firstName" ASC
        ');
        $stmt->execute([$reqMonth, $reqYear]);

        $filename = "payroll_report_" . $month . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
