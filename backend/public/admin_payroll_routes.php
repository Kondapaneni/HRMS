<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get all payslips for admin
$app->get('/api/admin/payroll', function (Request $request, Response $response, $args) {
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

    $query = '
        SELECT p.*, 
               e."firstName" as "empFirstName", e."lastName" as "empLastName", e."employeeId" as "empCode"
        FROM payslips p
        LEFT JOIN employee e ON p."employeeId"::varchar = e."userId"::varchar
        ' . $whereClause . '
        ORDER BY p.year DESC, p.month DESC
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
    $payslips = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countQuery = 'SELECT COUNT(*) FROM payslips p LEFT JOIN employee e ON p."employeeId"::varchar = e."userId"::varchar ' . $whereClause;
    $stmtCount = $conn->prepare($countQuery);
    $paramIndex = 1;
    foreach ($sqlParams as $param) {
        $stmtCount->bindValue($paramIndex++, $param);
    }
    $stmtCount->execute();
    $totalCount = $stmtCount->fetchColumn();

    $stmtStats = $conn->query('
        SELECT 
            SUM("netSalary") as "totalPayroll",
            COUNT(CASE WHEN status = \'generated\' THEN 1 END) as "processed",
            COUNT(CASE WHEN status = \'pending\' THEN 1 END) as "pending",
            AVG("netSalary") as "avgSalary"
        FROM payslips
    ');
    $statsData = $stmtStats->fetch(PDO::FETCH_ASSOC);
    $stats = [
        'totalPayroll' => $statsData['totalPayroll'] ? (float)$statsData['totalPayroll'] : 0,
        'processed' => (int)$statsData['processed'],
        'pending' => (int)$statsData['pending'],
        'avgSalary' => $statsData['avgSalary'] ? (float)$statsData['avgSalary'] : 0
    ];

    $formattedPayslips = array_map(function($p) {
        return [
            'id' => $p['id'],
            'employeeId' => $p['employeeId'],
            'employeeName' => trim(($p['empFirstName'] ?? '') . ' ' . ($p['empLastName'] ?? '')),
            'employeeCode' => $p['empCode'],
            'month' => (int)$p['month'],
            'year' => (int)$p['year'],
            'netSalary' => (float)$p['netSalary'],
            'status' => $p['status'],
            'earnings' => json_decode($p['earningsJson'], true),
            'deductions' => json_decode($p['deductionsJson'], true),
            'details' => json_decode($p['detailsJson'], true)
        ];
    }, $payslips);

    $response->getBody()->write(json_encode([
        'payslips' => $formattedPayslips,
        'total' => $totalCount,
        'stats' => $stats
    ]));
    
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin'], 'payroll'));

// Generate payslip
$app->post('/api/admin/payroll/generate', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $employeeId = $data['employeeId'] ?? null;
    $month = isset($data['month']) ? (int)$data['month'] : null;
    $year = isset($data['year']) ? (int)$data['year'] : null;

    if (!$employeeId || !$month || !$year) {
        $response->getBody()->write(json_encode(['error' => 'Missing required fields']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    // Check duplicate
    $stmt = $conn->prepare('SELECT id FROM payslips WHERE "employeeId" = ? AND month = ? AND year = ?');
    $stmt->execute([$employeeId, $month, $year]);
    if ($stmt->fetchColumn()) {
        $response->getBody()->write(json_encode(['error' => 'Payslip already exists for this period']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Get employee
    $stmtEmp = $conn->prepare('SELECT e.*, b.name as branch_name FROM employee e LEFT JOIN branches b ON e.branch = b.id::text WHERE e."userId"::varchar = ?');
    $stmtEmp->execute([$employeeId]);
    $employee = $stmtEmp->fetch(PDO::FETCH_ASSOC);

    if (!$employee) {
        $response->getBody()->write(json_encode(['error' => 'Employee not found']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $salary = (float)($employee['salary'] ?? 0);
    if ($salary <= 0) {
        $response->getBody()->write(json_encode(['error' => 'Employee salary must be greater than 0']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Default Settings
    $config = [
        'basic_percentage' => 40.0,
        'hra_percentage' => 20.0,
        'conveyance_allowance' => 1600.00,
        'pf_percentage' => 0.12,
        'employee_esi_percentage' => 0.0075,
        'employer_esi_percentage' => 0.0325,
        'esi_threshold' => 20000.00
    ];

    $monthStart = sprintf('%04d-%02d-01', $year, $month);
    $monthEnd = date('Y-m-t', strtotime($monthStart));
    $totalWorkingDays = (int)date('t', strtotime($monthStart));

    // Get Missing Days
    $stmtMissing = $conn->prepare('SELECT COUNT(*) FROM attendance WHERE "employeeId" = ? AND status = \'missed\' AND date BETWEEN ? AND ?');
    $stmtMissing->execute([$employeeId, $monthStart, $monthEnd]);
    $missingDays = (int)$stmtMissing->fetchColumn();

    // Get Unpaid Leaves
    $stmtLeaves = $conn->prepare('SELECT SUM(days) FROM leaves WHERE "employeeId" = ? AND LOWER("leaveType") = \'unpaid\' AND status = \'approved\' AND "startDate" <= ? AND "endDate" >= ?');
    $stmtLeaves->execute([$employeeId, $monthEnd, $monthStart]);
    $unpaidLeaveDays = (int)$stmtLeaves->fetchColumn();

    $lossOfPayDays = min($unpaidLeaveDays + $missingDays, $totalWorkingDays);
    $payableDays = max(0, $totalWorkingDays - $lossOfPayDays);

    $adjustedSalary = 0.0;
    $conveyance = 0.0;

    if ($totalWorkingDays > 0) {
        $adjustedSalary = round($salary * ($payableDays / $totalWorkingDays), 2);
        $conveyance = round($config['conveyance_allowance'] * ($payableDays / $totalWorkingDays), 2);
    }

    $basicSalary = floor($adjustedSalary * ($config['basic_percentage'] / 100) * 100) / 100;
    $hra = round($adjustedSalary * ($config['hra_percentage'] / 100), 2);
    $medical = round($adjustedSalary - ($basicSalary + $hra + $conveyance), 2);

    $pfAmount = (int)round($basicSalary * $config['pf_percentage']);
    $professionalTax = ($salary <= 20000.0) ? 150 : 200;

    $employeeEsi = ($salary <= $config['esi_threshold']) ? (int)round($adjustedSalary * $config['employee_esi_percentage']) : 0;
    $employerEsi = ($salary <= $config['esi_threshold']) ? (int)ceil($adjustedSalary * $config['employer_esi_percentage']) : 0;
    $totalEsi = $employeeEsi + $employerEsi;

    $totalDeductions = $pfAmount + $totalEsi + $professionalTax;
    $netSalary = (int)floor(max(0, $adjustedSalary - $totalDeductions));

    $earnings = [
        ['label' => 'Basic Salary', 'value' => $basicSalary],
        ['label' => 'HRA', 'value' => $hra],
        ['label' => 'Conveyance', 'value' => $conveyance],
        ['label' => 'Medical Allowance', 'value' => $medical]
    ];

    $deductions = [
        ['label' => 'Provident Fund', 'value' => $pfAmount],
        ['label' => 'Employee ESI', 'value' => $employeeEsi],
        ['label' => 'Employer ESI', 'value' => $employerEsi],
        ['label' => 'Professional Tax', 'value' => $professionalTax]
    ];

    $details = [
        'employeeNumber' => $employee['employeeId'],
        'dateJoined' => !empty($employee['joinDate']) ? date('d M Y', strtotime($employee['joinDate'])) : 'N/A',
        'designation' => $employee['position'] ?? '',
        'monthlySalary' => $salary,
        'totalWorkingDays' => $totalWorkingDays,
        'lossOfPayDays' => $lossOfPayDays,
        'daysPayable' => $payableDays,
        'dateOfBirth' => !empty($employee['dateOfBirth']) ? date('d M Y', strtotime($employee['dateOfBirth'])) : 'N/A',
        'panNumber' => !empty($employee['panNumber']) ? $employee['panNumber'] : 'N/A',
        'location' => !empty($employee['branch_name']) ? $employee['branch_name'] : 'N/A',
        'paymentMode' => 'Bank Transfer'
    ];

    // Insert into DB
    $stmtInsert = $conn->prepare('
        INSERT INTO payslips (id, "employeeId", month, year, "earningsJson", "deductionsJson", "detailsJson", "netSalary", status)
        VALUES (gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, \'generated\') RETURNING id
    ');

    $stmtInsert->execute([
        $employeeId,
        $month,
        $year,
        json_encode($earnings, JSON_UNESCAPED_UNICODE),
        json_encode($deductions, JSON_UNESCAPED_UNICODE),
        json_encode($details, JSON_UNESCAPED_UNICODE),
        $netSalary
    ]);

    $response->getBody()->write(json_encode(['message' => 'Payslip generated successfully']));
    return $response->withHeader('Content-Type', 'application/json');
})->add(new AuthMiddleware(['admin'], 'payroll'));

