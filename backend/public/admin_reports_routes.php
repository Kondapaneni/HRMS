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

// GET /api/admin/reports/employees
$app->get('/api/admin/reports/employees', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $format = $queryParams['format'] ?? 'csv';

    $db = new Database();
    $conn = $db->getConnection();

    try {
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

        if ($format === 'json') {
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $filename = "employee_directory_" . date('Y-m-d') . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// GET /api/admin/reports/attendance
$app->get('/api/admin/reports/attendance', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $month = $queryParams['month'] ?? date('Y-m'); // Expected format: YYYY-MM
    $format = $queryParams['format'] ?? 'csv';

    $startDate = $month . '-01';
    $endDate = date('Y-m-t', strtotime($startDate));

    $db = new Database();
    $conn = $db->getConnection();

    try {
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

        if ($format === 'json') {
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $filename = "attendance_report_" . $month . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

// GET /api/admin/reports/payroll
$app->get('/api/admin/reports/payroll', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $month = $queryParams['month'] ?? date('Y-m'); // Expected format: YYYY-MM
    $format = $queryParams['format'] ?? 'csv';

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $parts = explode('-', $month);
        $reqYear = isset($parts[0]) ? (int)$parts[0] : (int)date('Y');
        $reqMonth = isset($parts[1]) ? (int)$parts[1] : (int)date('m');

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

        if ($format === 'json') {
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response->getBody()->write(json_encode($data));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        $filename = "payroll_report_" . $month . ".csv";
        return streamCsvOutput($response, $filename, $stmt);

    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());
