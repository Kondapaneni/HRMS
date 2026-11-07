<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use Slim\Psr7\Stream;

/**
 * Generate CSV output from a PDO statement
 */
function streamCsvOutput(Response $response, $filename, $stmt) {
    $response = $response
        ->withHeader('Content-Type', 'text/csv; charset=utf-8')
        ->withHeader('Content-Disposition', 'attachment; filename="' . $filename . '"')
        ->withHeader('Pragma', 'no-cache')
        ->withHeader('Expires', '0');

    $stream = fopen('php://temp/maxmemory:2097152', 'r+');
    
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
    return $response->withBody(new Stream($stream))->withStatus(200);
}

// GET /api/admin/reports/employees
$app->get('/api/admin/reports/employees', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $format = $queryParams['format'] ?? 'csv';
    $limit = max(1, min(10000, (int)($queryParams['limit'] ?? 100)));
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    $offset = max(0, min(1000000, $offset));

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
            LIMIT ? OFFSET ?
        ');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();

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
            LIMIT ? OFFSET ?
        ');
        $stmt->bindValue(1, $startDate);
        $stmt->bindValue(2, $endDate);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT);
        $stmt->bindValue(4, $offset, PDO::PARAM_INT);
        $stmt->execute();

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
            LIMIT ? OFFSET ?
        ');
        $stmt->bindValue(1, $reqMonth, PDO::PARAM_INT);
        $stmt->bindValue(2, $reqYear, PDO::PARAM_INT);
        $stmt->bindValue(3, $limit, PDO::PARAM_INT);
        $stmt->bindValue(4, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $filename = "payroll_report_" . $month . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
