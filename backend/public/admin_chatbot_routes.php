<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

require_once __DIR__ . '/sec004_gemini_security.php';

/** @var \Slim\App $app */
$app->post('/api/admin/chatbot/query', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');

    if ($user->role !== 'admin') {
        $response->getBody()->write(json_encode(['error' => 'Unauthorized access']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $body = (array)$request->getParsedBody();
    $message = trim($body['message'] ?? '');

    if (empty($message)) {
        $response->getBody()->write(json_encode(['error' => 'Message is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    if (!$conn) {
        $response->getBody()->write(json_encode(['error' => 'Database connection unavailable']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }

    // =========================================================================
    // 1. EMPLOYEES: Full details from Admin Employees page
    // =========================================================================
    $employees = [];
    try {
        $empStmt = $conn->query('
            SELECT e.*,
                   b.name as "branchName",
                   m."firstName" as "managerFirstName", m."lastName" as "managerLastName", m.email as "managerEmail"
            FROM employee e
            LEFT JOIN employee m ON e."managerId" = m.id::text
            LEFT JOIN branches b ON (b.id::text = e.branch OR LOWER(b.name) = LOWER(e.branch))
            ORDER BY e."firstName" ASC, e."lastName" ASC
        ');
        $employees = $empStmt ? $empStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 2. ATTENDANCE: Today\'s stats & recent logs from Admin Attendance page
    // =========================================================================
    $attStats = ['present_today' => 0, 'leave_today' => 0, 'late_today' => 0, 'total_today' => 0];
    $todayAttendanceLogs = [];
    try {
        $attStmt = $conn->query("
            SELECT 
                COUNT(*) as total_today,
                SUM(CASE WHEN LOWER(TRIM(status)) LIKE 'present%' THEN 1 ELSE 0 END) as present_today,
                SUM(CASE WHEN LOWER(TRIM(status)) LIKE '%leave%' THEN 1 ELSE 0 END) as leave_today,
                SUM(CASE WHEN LOWER(TRIM(status)) LIKE '%late%' THEN 1 ELSE 0 END) as late_today
            FROM attendance
            WHERE date = CURRENT_DATE
        ");
        if ($attStmt) {
            $row = $attStmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $attStats['total_today'] = (int)($row['total_today'] ?? 0);
                $attStats['present_today'] = (int)($row['present_today'] ?? 0);
                $attStats['leave_today'] = (int)($row['leave_today'] ?? 0);
                $attStats['late_today'] = (int)($row['late_today'] ?? 0);
            }
        }

        $logsStmt = $conn->query('
            SELECT a.status, a."checkIn", a."checkOut", a.hours,
                   e."firstName", e."lastName", e."employeeId"
            FROM attendance a
            JOIN employee e ON a."employeeId" = e."userId"
            WHERE a.date = CURRENT_DATE
            ORDER BY a."checkIn" DESC NULLS LAST
            LIMIT 15
        ');
        $todayAttendanceLogs = $logsStmt ? $logsStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 3. LEAVES: Requests & status from Admin Leaves page
    // =========================================================================
    $leaveStats = ['total' => 0, 'pending' => 0, 'approved' => 0, 'rejected' => 0];
    $recentLeaves = [];
    try {
        $leaveSummaryStmt = $conn->query("
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN LOWER(TRIM(status)) = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN LOWER(TRIM(status)) = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN LOWER(TRIM(status)) = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM leaves
        ");
        if ($leaveSummaryStmt) {
            $lRow = $leaveSummaryStmt->fetch(PDO::FETCH_ASSOC);
            if ($lRow) {
                $leaveStats['total'] = (int)($lRow['total'] ?? 0);
                $leaveStats['pending'] = (int)($lRow['pending'] ?? 0);
                $leaveStats['approved'] = (int)($lRow['approved'] ?? 0);
                $leaveStats['rejected'] = (int)($lRow['rejected'] ?? 0);
            }
        }

        $recentLeavesStmt = $conn->query('
            SELECT l.id, l."leaveType", l."startDate", l."endDate", l.days, l.reason, l.status, l."appliedDate",
                   e."firstName", e."lastName", e."employeeId"
            FROM leaves l
            LEFT JOIN employee e ON l."employeeId" = e."userId"
            ORDER BY (CASE WHEN LOWER(TRIM(l.status)) = \'pending\' THEN 0 ELSE 1 END), l."appliedDate" DESC
            LIMIT 10
        ');
        $recentLeaves = $recentLeavesStmt ? $recentLeavesStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 4. EXPENSES: Claims & amounts from Admin Expenses page
    // =========================================================================
    $expenseStats = ['totalAmount' => 0, 'totalCount' => 0, 'pendingAmount' => 0, 'pendingCount' => 0, 'approvedAmount' => 0, 'approvedCount' => 0];
    $recentExpenses = [];
    try {
        $expStmt = $conn->query("
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COUNT(*) as total_count,
                COALESCE(SUM(CASE WHEN LOWER(TRIM(status)) = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'pending' THEN 1 END), 0) as pending_count,
                COALESCE(SUM(CASE WHEN LOWER(TRIM(status)) = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'approved' THEN 1 END), 0) as approved_count
            FROM expenses
        ");
        if ($expStmt) {
            $eRow = $expStmt->fetch(PDO::FETCH_ASSOC);
            if ($eRow) {
                $expenseStats['totalAmount'] = (float)$eRow['total_amount'];
                $expenseStats['totalCount'] = (int)$eRow['total_count'];
                $expenseStats['pendingAmount'] = (float)$eRow['pending_amount'];
                $expenseStats['pendingCount'] = (int)$eRow['pending_count'];
                $expenseStats['approvedAmount'] = (float)$eRow['approved_amount'];
                $expenseStats['approvedCount'] = (int)$eRow['approved_count'];
            }
        }

        $recentExpStmt = $conn->query('
            SELECT ex.title, ex.amount, ex.category, ex.status, ex.created_at,
                   e."firstName", e."lastName", e."employeeId"
            FROM expenses ex
            LEFT JOIN employee e ON ex.user_id = e."userId"
            ORDER BY ex.created_at DESC
            LIMIT 10
        ');
        $recentExpenses = $recentExpStmt ? $recentExpStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 5. ASSETS: Inventory & allocations from Admin Assets page
    // =========================================================================
    $assetStats = ['total' => 0, 'available' => 0, 'assigned' => 0, 'maintenance' => 0];
    $assetsList = [];
    try {
        $assetStmt = $conn->query("
            SELECT 
                COUNT(*) as total,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'available' THEN 1 END), 0) as available,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'assigned' THEN 1 END), 0) as assigned,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'maintenance' THEN 1 END), 0) as maintenance
            FROM assets
        ");
        if ($assetStmt) {
            $aRow = $assetStmt->fetch(PDO::FETCH_ASSOC);
            if ($aRow) {
                $assetStats['total'] = (int)$aRow['total'];
                $assetStats['available'] = (int)$aRow['available'];
                $assetStats['assigned'] = (int)$aRow['assigned'];
                $assetStats['maintenance'] = (int)$aRow['maintenance'];
            }
        }

        $listAssetStmt = $conn->query('
            SELECT a.name, a.category, a.serial_number, a.status,
                   e."firstName", e."lastName", e."employeeId"
            FROM assets a
            LEFT JOIN employee e ON (a.assigned_to = e."userId" OR a.assigned_to = e.id::text)
            ORDER BY a.name ASC
            LIMIT 20
        ');
        $assetsList = $listAssetStmt ? $listAssetStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 6. PAYROLL: Overview from Admin Payroll page
    // =========================================================================
    $payrollStats = ['total_payslips' => 0, 'total_net_payroll' => 0, 'paid_count' => 0, 'pending_count' => 0];
    $recentPayslips = [];
    try {
        $payStmt = $conn->query("
            SELECT 
                COUNT(*) as total_payslips,
                COALESCE(SUM(\"netSalary\"), 0) as total_net_payroll,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'paid' THEN 1 END), 0) as paid_count,
                COALESCE(COUNT(CASE WHEN LOWER(TRIM(status)) = 'pending' THEN 1 END), 0) as pending_count
            FROM payslips
        ");
        if ($payStmt) {
            $pRow = $payStmt->fetch(PDO::FETCH_ASSOC);
            if ($pRow) {
                $payrollStats['total_payslips'] = (int)$pRow['total_payslips'];
                $payrollStats['total_net_payroll'] = (float)$pRow['total_net_payroll'];
                $payrollStats['paid_count'] = (int)$pRow['paid_count'];
                $payrollStats['pending_count'] = (int)$pRow['pending_count'];
            }
        }

        $recentPayStmt = $conn->query('
            SELECT p.month, p.year, p."netSalary", p.status,
                   e."firstName", e."lastName", e."employeeId"
            FROM payslips p
            LEFT JOIN employee e ON p."employeeId" = e."userId"
            ORDER BY p.year DESC, p.month DESC
            LIMIT 10
        ');
        $recentPayslips = $recentPayStmt ? $recentPayStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 7. HOLIDAYS: Upcoming dates from Admin Holidays page
    // =========================================================================
    $upcomingHolidays = [];
    try {
        $holStmt = $conn->query('
            SELECT "holidayDate", "holidayName"
            FROM company_holidays
            WHERE "isActive" = 1 AND "holidayDate" >= CURRENT_DATE
            ORDER BY "holidayDate" ASC
            LIMIT 10
        ');
        $upcomingHolidays = $holStmt ? $holStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 8. RECRUITMENT & CANDIDATES: From Admin Recruitment page
    // =========================================================================
    $candidates = [];
    try {
        $candStmt = $conn->query("
            SELECT id, \"firstName\", \"lastName\", email, role, created_at
            FROM users
            WHERE role = 'candidate'
            ORDER BY created_at DESC
            LIMIT 15
        ");
        $candidates = $candStmt ? $candStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 9. ASSESSMENTS & TRAININGS: From Admin Assessments & Training pages
    // =========================================================================
    $assessments = [];
    try {
        $assStmt = $conn->query('
            SELECT id, title, department, duration_minutes, questions_count, is_active
            FROM assessments
            ORDER BY created_at DESC
            LIMIT 10
        ');
        $assessments = $assStmt ? $assStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    $trainingVideos = [];
    try {
        $trainStmt = $conn->query('
            SELECT id, title, category, duration, is_active
            FROM training_videos
            ORDER BY created_at DESC
            LIMIT 10
        ');
        $trainingVideos = $trainStmt ? $trainStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 10. AUDIT LOGS: Recent admin operations from Admin Audit page
    // =========================================================================
    $auditLogs = [];
    try {
        $auditStmt = $conn->query('
            SELECT timestamp, action_type, actor_name, entity_type, new_values
            FROM audit_logs
            ORDER BY timestamp DESC
            LIMIT 8
        ');
        $auditLogs = $auditStmt ? $auditStmt->fetchAll(PDO::FETCH_ASSOC) : [];
    } catch (\Throwable $t) {}

    // =========================================================================
    // 11. BUSINESS APPS: Loans & Sales stats
    // =========================================================================
    $businessAppsStats = ['loans' => 0, 'sales' => 0];
    try {
        $loanStmt = $conn->query('SELECT COUNT(*) FROM loan_leads');
        if ($loanStmt) $businessAppsStats['loans'] = (int)$loanStmt->fetchColumn();
        $saleStmt = $conn->query('SELECT COUNT(*) FROM sales_leads');
        if ($saleStmt) $businessAppsStats['sales'] = (int)$saleStmt->fetchColumn();
    } catch (\Throwable $t) {}

    // Bundle all module data
    $adminData = [
        'employees' => $employees,
        'attendanceStats' => $attStats,
        'todayAttendanceLogs' => $todayAttendanceLogs,
        'leaveStats' => $leaveStats,
        'recentLeaves' => $recentLeaves,
        'expenseStats' => $expenseStats,
        'recentExpenses' => $recentExpenses,
        'assetStats' => $assetStats,
        'assetsList' => $assetsList,
        'payrollStats' => $payrollStats,
        'recentPayslips' => $recentPayslips,
        'upcomingHolidays' => $upcomingHolidays,
        'candidates' => $candidates,
        'assessments' => $assessments,
        'trainingVideos' => $trainingVideos,
        'auditLogs' => $auditLogs,
        'businessApps' => $businessAppsStats
    ];

    // SEC-004: HRMS records remain in $adminData for local authenticated answers.
    // External AI receives only static, preapproved general HR FAQ prompts.
    $geminiApiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY') ?? '';
    $aiResponseText = null;

    if (!empty($geminiApiKey)) {
        $aiResponseText = sec004CallGeminiPublicFaq($geminiApiKey, $message);
    }

    // SEC-004: A general HR FAQ must remain a definition even if Gemini is
    // disabled or unavailable; personal questions continue to the local engine.
    if (empty($aiResponseText)) {
        $aiResponseText = sec004LocalFaqResponse($message);
    }

    // Seamless Fallback Rule Engine across ALL Admin Pages
    if (empty($aiResponseText)) {
        $aiResponseText = fallbackAdminLocalRuleEngine($message, $adminData);
    }

    $suggestedActions = [
        "List all active employees",
        "Attendance today",
        "Pending leave requests",
        "Expense claims overview",
        "Company assets status",
        "Show salaries & payroll"
    ];

    $response->getBody()->write(json_encode([
        'response' => $aiResponseText,
        'suggested_actions' => array_slice($suggestedActions, 0, 5)
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware());

/**
 * Universal fallback rule engine for Admin queries.
 * Integrates live data queries across ALL admin pages:
 * - Employees & Headcount
 * - Attendance & Today's punches
 * - Leaves & Approvals
 * - Expenses & Claims
 * - Assets & Device Allocation
 * - Payroll & Payslips
 * - Company Holidays
 * - Recruitment & Candidates
 * - Assessments & Training
 * - Audit Logs & Activity
 */
function fallbackAdminLocalRuleEngine($message, array $data) {
    $msg = strtolower(trim($message));
    $cleanQuery = preg_replace('/[^a-z0-9\s]/', ' ', $msg);
    $cleanQuery = trim(preg_replace('/\s+/', ' ', $cleanQuery));

    $employees = $data['employees'] ?? [];
    $attStats = $data['attendanceStats'] ?? [];
    $todayAttendanceLogs = $data['todayAttendanceLogs'] ?? [];
    $leaveStats = $data['leaveStats'] ?? [];
    $recentLeaves = $data['recentLeaves'] ?? [];
    $expenseStats = $data['expenseStats'] ?? [];
    $recentExpenses = $data['recentExpenses'] ?? [];
    $assetStats = $data['assetStats'] ?? [];
    $assetsList = $data['assetsList'] ?? [];
    $payrollStats = $data['payrollStats'] ?? [];
    $recentPayslips = $data['recentPayslips'] ?? [];
    $upcomingHolidays = $data['upcomingHolidays'] ?? [];
    $candidates = $data['candidates'] ?? [];
    $assessments = $data['assessments'] ?? [];
    $trainingVideos = $data['trainingVideos'] ?? [];
    $auditLogs = $data['auditLogs'] ?? [];
    $businessApps = $data['businessApps'] ?? [];

    $totalEmployees = count($employees);
    $activeEmployees = array_filter($employees, fn($e) => strtolower($e['status'] ?? 'active') === 'active');
    $activeCount = count($activeEmployees);
    $inactiveCount = $totalEmployees - $activeCount;

    // Collect unique departments and branches
    $departmentsMap = [];
    $branchesMap = [];
    foreach ($employees as $e) {
        $d = trim($e['department'] ?? 'General');
        if (!empty($d)) $departmentsMap[$d] = ($departmentsMap[$d] ?? 0) + 1;
        $b = !empty($e['branchName']) ? $e['branchName'] : ($e['branch'] ?: 'Corporate Office');
        if (!empty($b)) $branchesMap[$b] = ($branchesMap[$b] ?? 0) + 1;
    }

    // =========================================================================
    // 1. GREETINGS & CAPABILITIES
    // =========================================================================
    if (preg_match('/\b(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i', $msg)) {
        $res = "Hello **Administrator**.\n\n";
        $res .= "I am your comprehensive **Admin HR Assistant**, connected to all **" . count($employees) . "** employees and all portal modules.\n\n";
        $res .= "Here is what I can pull for you instantly:\n";
        $res .= "* **Employees**: \"Who is Rahul?\", \"Show Dhashna details\", \"List all active employees\"\n";
        $res .= "* **Attendance**: \"Attendance today\", \"Who is late today?\", \"Present count\"\n";
        $res .= "* **Leaves**: \"Pending leave requests\", \"Approved leaves\", \"Who is on leave?\"\n";
        $res .= "* **Expenses**: \"Show expenses overview\", \"Pending expense claims\"\n";
        $res .= "* **Assets**: \"Company assets overview\", \"Available laptops\", \"Who has what asset?\"\n";
        $res .= "* **Payroll**: \"Show salaries overview\", \"Highest salary\", \"Total payroll\"\n";
        $res .= "* **Recruitment**: \"Show candidate applicants\", \"Job pipeline\"\n";
        $res .= "* **Holidays**: \"Upcoming holidays\", \"Company calendar\"\n";
        $res .= "* **Training & Tests**: \"Show assessments\", \"Training courses\"\n";
        $res .= "* **Audit Logs**: \"Recent activities\", \"Who made changes?\"\n\n";
        $res .= "What would you like to view?";
        return $res;
    }

    // =========================================================================
    // 2. EXPENSES (ADMIN EXPENSES PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'expense') || str_contains($msg, 'claims') ||
        str_contains($msg, 'reimbursement')
    ) {
        $res = "### Admin Expenses Summary\n";
        $res .= "* **Total Submitted Claims**: **{$expenseStats['totalCount']}** (Value: **₹" . number_format($expenseStats['totalAmount']) . "**)\n";
        $res .= "* **Pending Approvals**: **{$expenseStats['pendingCount']}** claims awaiting review (Value: **₹" . number_format($expenseStats['pendingAmount']) . "**)\n";
        $res .= "* **Approved Claims**: **{$expenseStats['approvedCount']}** (Value: **₹" . number_format($expenseStats['approvedAmount']) . "**)\n";

        if (!empty($recentExpenses)) {
            $res .= "\n**Recent Expense Submissions:**\n";
            foreach (array_slice($recentExpenses, 0, 5) as $ex) {
                $eName = trim(($ex['firstName'] ?? '') . ' ' . ($ex['lastName'] ?? ''));
                if (empty($eName)) $eName = 'Employee';
                $statusFormatted = ucfirst($ex['status'] ?: 'Pending');
                $res .= "* **{$ex['title']}** - ₹" . number_format((float)$ex['amount']) . " | Category: {$ex['category']} | By: **{$eName}** | Status: **{$statusFormatted}**\n";
            }
        }
        return $res;
    }

    // =========================================================================
    // 3. ASSETS & HARDWARE ALLOCATION (ADMIN ASSETS PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'asset') || str_contains($msg, 'laptop') ||
        str_contains($msg, 'hardware') || str_contains($msg, 'device') ||
        str_contains($msg, 'equipment')
    ) {
        $res = "### Company Assets & Inventory Overview\n";
        $res .= "* **Total Assets in System**: **{$assetStats['total']}**\n";
        $res .= "* **Currently Assigned to Employees**: **{$assetStats['assigned']}**\n";
        $res .= "* **Available for Allocation**: **{$assetStats['available']}**\n";
        $res .= "* **In Maintenance / Repair**: **{$assetStats['maintenance']}**\n";

        if (!empty($assetsList)) {
            $res .= "\n**Sample Assets & Allocation:**\n";
            foreach (array_slice($assetsList, 0, 6) as $as) {
                $holder = trim(($as['firstName'] ?? '') . ' ' . ($as['lastName'] ?? ''));
                $assignedText = !empty($holder) ? "Assigned to **{$holder}**" : "Available";
                $res .= "* **{$as['name']}** ({$as['category']}) - S/N: `{$as['serial_number']}` | Status: {$as['status']} | {$assignedText}\n";
            }
        }
        return $res;
    }

    // =========================================================================
    // 4. LEAVES & TIME OFF (ADMIN LEAVES PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'leave') || str_contains($msg, 'vacation') ||
        str_contains($msg, 'time off')
    ) {
        $res = "### Admin Leaves & Requests Overview\n";
        $res .= "* **Pending Approvals**: **{$leaveStats['pending']}** applications awaiting admin action\n";
        $res .= "* **Approved Leaves**: **{$leaveStats['approved']}**\n";
        $res .= "* **Rejected Leaves**: **{$leaveStats['rejected']}**\n";
        $res .= "* **Total Lifetime Requests**: **{$leaveStats['total']}**\n";

        if (!empty($recentLeaves)) {
            $res .= "\n**Recent / Pending Leave Applications:**\n";
            foreach (array_slice($recentLeaves, 0, 5) as $lv) {
                $applicant = trim(($lv['firstName'] ?? '') . ' ' . ($lv['lastName'] ?? ''));
                if (empty($applicant)) $applicant = 'Employee';
                $statusFormatted = ucfirst($lv['status'] ?: 'Pending');
                $res .= "* **{$applicant}** (`{$lv['employeeId']}`) - {$lv['leaveType']} ({$lv['days']} day(s) from {$lv['startDate']} to {$lv['endDate']}) | Status: **{$statusFormatted}**\n";
            }
        }
        return $res;
    }

    // =========================================================================
    // 5. ATTENDANCE & TODAY\'S PUNCHES (ADMIN ATTENDANCE PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'attendance') || str_contains($msg, 'present today') ||
        str_contains($msg, 'absent today') || str_contains($msg, 'on leave today') ||
        str_contains($msg, 'late today') || str_contains($msg, 'checked in') ||
        str_contains($msg, 'punches')
    ) {
        $res = "### Today's Organization Attendance Summary\n";
        $res .= "* **Total Active Workforce**: **{$activeCount}** employees\n";
        $res .= "* **Present Today**: **{$attStats['present_today']}**\n";
        $res .= "* **On Leave Today**: **{$attStats['leave_today']}**\n";
        $res .= "* **Late Check-ins Today**: **{$attStats['late_today']}**\n";

        if ($activeCount > 0 && $attStats['present_today'] > 0) {
            $rate = round(($attStats['present_today'] / $activeCount) * 100, 1);
            $res .= "* **Overall Daily Attendance Rate**: **{$rate}%**\n";
        }

        if (!empty($todayAttendanceLogs)) {
            $res .= "\n**Recent Check-ins Today:**\n";
            foreach (array_slice($todayAttendanceLogs, 0, 6) as $log) {
                $eName = trim(($log['firstName'] ?? '') . ' ' . ($log['lastName'] ?? ''));
                $checkIn = !empty($log['checkIn']) ? date('h:i A', strtotime($log['checkIn'])) : 'N/A';
                $res .= "* **{$eName}** (`{$log['employeeId']}`) - Check-In: {$checkIn} | Status: {$log['status']}\n";
            }
        }
        return $res;
    }

    // =========================================================================
    // 6. PAYROLL & SALARIES (ADMIN PAYROLL PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'salary overview') || str_contains($msg, 'salaries overview') ||
        str_contains($msg, 'show salaries') || str_contains($msg, 'payroll') ||
        str_contains($msg, 'total payroll') || str_contains($msg, 'average salary') ||
        str_contains($msg, 'highest salary') || str_contains($msg, 'lowest salary') ||
        str_contains($msg, 'payslip')
    ) {
        $salaries = [];
        $totalPayroll = 0;
        foreach ($employees as $e) {
            $sal = (float)($e['salary'] ?? 0);
            if ($sal > 0) {
                $salaries[] = [
                    'name' => trim(($e['firstName'] ?? '') . ' ' . ($e['lastName'] ?? '')),
                    'empId' => $e['employeeId'],
                    'role' => $e['position'],
                    'dept' => $e['department'],
                    'salary' => $sal
                ];
                $totalPayroll += $sal;
            }
        }

        usort($salaries, fn($a, $b) => $b['salary'] <=> $a['salary']);
        $countSal = count($salaries);
        $avgSal = $countSal > 0 ? round($totalPayroll / $countSal) : 0;
        $highest = $salaries[0] ?? null;

        $res = "### Admin Payroll & Salary Analytics\n";
        $res .= "* **Total Monthly Employee Payroll**: **₹" . number_format($totalPayroll) . "**\n";
        $res .= "* **Average Base Salary**: **₹" . number_format($avgSal) . "**\n";
        $res .= "* **Total Processed Payslips in Records**: **{$payrollStats['total_payslips']}** (Value: **₹" . number_format($payrollStats['total_net_payroll']) . "**)\n";
        if ($highest) {
            $res .= "* **Top Earner**: **{$highest['name']}** ({$highest['role']} - {$highest['dept']}) at **₹" . number_format($highest['salary']) . "**\n";
        }

        $res .= "\n**Top Compensated Profiles:**\n";
        foreach (array_slice($salaries, 0, 5) as $s) {
            $res .= "* **{$s['name']}** (`{$s['empId']}`): ₹" . number_format($s['salary']) . " ({$s['role']} - {$s['dept']})\n";
        }
        return $res;
    }

    // =========================================================================
    // 7. UPCOMING HOLIDAYS (ADMIN HOLIDAYS PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'holiday') || str_contains($msg, 'calendar') ||
        str_contains($msg, 'festival') || str_contains($msg, 'off days')
    ) {
        $res = "### Upcoming Company Holidays\n";
        if (!empty($upcomingHolidays)) {
            foreach ($upcomingHolidays as $h) {
                $formattedDate = date('D, d M Y', strtotime($h['holidayDate']));
                $res .= "* **{$h['holidayName']}**: {$formattedDate}\n";
            }
        } else {
            $res .= "No upcoming holidays scheduled in the company calendar for the rest of the period.\n";
        }
        return $res;
    }

    // =========================================================================
    // 8. RECRUITMENT & APPLICANTS (ADMIN RECRUITMENT PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'candidate') || str_contains($msg, 'applicant') ||
        str_contains($msg, 'recruitment') || str_contains($msg, 'hiring') ||
        str_contains($msg, 'job')
    ) {
        $res = "### Recruitment & Candidate Pipeline\n";
        $res .= "* **Total Registered Candidates**: **" . count($candidates) . "** in portal\n";

        if (!empty($candidates)) {
            $res .= "\n**Recent Candidate Profiles:**\n";
            foreach (array_slice($candidates, 0, 5) as $c) {
                $cName = trim(($c['firstName'] ?? '') . ' ' . ($c['lastName'] ?? ''));
                $res .= "* **{$cName}** ({$c['email']}) - Registered: " . date('d M Y', strtotime($c['created_at'])) . "\n";
            }
        }
        return $res;
    }

    // =========================================================================
    // 9. ASSESSMENTS & TRAINING (ADMIN ASSESSMENTS & TRAINING PAGES)
    // =========================================================================
    if (
        str_contains($msg, 'assessment') || str_contains($msg, 'test') ||
        str_contains($msg, 'training') || str_contains($msg, 'course') ||
        str_contains($msg, 'video')
    ) {
        $res = "### Admin Assessments & Training Modules\n";
        $res .= "* **Active Assessments Available**: **" . count($assessments) . "** tests\n";
        $res .= "* **Training Courses / Videos**: **" . count($trainingVideos) . "** modules\n";

        if (!empty($assessments)) {
            $res .= "\n**Available Assessments:**\n";
            foreach (array_slice($assessments, 0, 4) as $ass) {
                $res .= "* **{$ass['title']}** ({$ass['department']}) - {$ass['questions_count']} questions | {$ass['duration_minutes']} min\n";
            }
        }
        if (!empty($trainingVideos)) {
            $res .= "\n**Training Videos:**\n";
            foreach (array_slice($trainingVideos, 0, 4) as $tr) {
                $res .= "* **{$tr['title']}** ({$tr['category']}) - {$tr['duration']} min\n";
            }
        }
        return $res;
    }

    // =========================================================================
    // 10. AUDIT LOGS & RECENT ADMIN ACTIVITY (ADMIN AUDIT PAGE)
    // =========================================================================
    if (
        str_contains($msg, 'audit') || str_contains($msg, 'recent activity') ||
        str_contains($msg, 'history') || str_contains($msg, 'logs') ||
        str_contains($msg, 'who changed')
    ) {
        $res = "### Recent Administrative Activity & Audit Trail\n";
        if (!empty($auditLogs)) {
            foreach ($auditLogs as $log) {
                $actor = $log['actor_name'] ?: 'System';
                $entity = ucfirst(strtolower(rtrim($log['entity_type'] ?? 'Item', 's')));
                $action = strtoupper($log['action_type'] ?? 'Action');
                $time = date('d M, h:i A', strtotime($log['timestamp']));
                $res .= "* `{$time}` - **{$actor}** performed **{$action}** on {$entity}\n";
            }
        } else {
            $res .= "No recent audit activity records captured.\n";
        }
        return $res;
    }

    // =========================================================================
    // 11. WHO REPORTS TO [MANAGER NAME] / DIRECT REPORTS
    // =========================================================================
    if (
        preg_match('/(?:who reports to|reports to|reportees of|subordinates of|team of|direct reports of)\s+([a-z0-9\s]+)/i', $msg, $m) ||
        (str_contains($msg, 'reports to') || str_contains($msg, 'who report to'))
    ) {
        $targetManager = '';
        if (!empty($m[1])) {
            $targetManager = trim($m[1]);
        } else {
            $words = explode(' ', str_replace(['who', 'reports', 'to', 'report', 'the', 'manager'], '', $msg));
            $targetManager = trim(implode(' ', array_filter($words)));
        }

        if (!empty($targetManager)) {
            $matchedReports = [];
            foreach ($employees as $e) {
                $mFirst = strtolower($e['managerFirstName'] ?? '');
                $mLast = strtolower($e['managerLastName'] ?? '');
                $mFull = trim("{$mFirst} {$mLast}");
                if (
                    (!empty($mFirst) && str_contains($mFirst, $targetManager)) ||
                    (!empty($mLast) && str_contains($mLast, $targetManager)) ||
                    (!empty($mFull) && str_contains($mFull, $targetManager)) ||
                    (!empty($targetManager) && (str_contains($mFirst, $targetManager) || str_contains($targetManager, $mFirst)))
                ) {
                    $matchedReports[] = $e;
                }
            }

            if (!empty($matchedReports)) {
                $mgrDisplayName = trim(($matchedReports[0]['managerFirstName'] ?? '') . ' ' . ($matchedReports[0]['managerLastName'] ?? ''));
                $res = "### Direct Reports for **{$mgrDisplayName}** (" . count($matchedReports) . " Employees)\n";
                foreach ($matchedReports as $r) {
                    $rName = trim(($r['firstName'] ?? '') . ' ' . ($r['lastName'] ?? ''));
                    $rBranch = !empty($r['branchName']) ? $r['branchName'] : ($r['branch'] ?: 'Corporate Office');
                    $res .= "* **{$rName}** (`{$r['employeeId']}`) - {$r['position']} | Dept: {$r['department']} | Branch: {$rBranch}\n";
                }
                return $res;
            } else {
                return "No employees currently report directly to **\"" . ucwords($targetManager) . "\"** in the system.";
            }
        }
    }

    // =========================================================================
    // 12. MANAGERS DIRECTORY
    // =========================================================================
    if (
        str_contains($msg, 'all managers') || str_contains($msg, 'list managers') ||
        str_contains($msg, 'who are the managers') || str_contains($msg, 'management team')
    ) {
        $managers = [];
        foreach ($employees as $e) {
            $mName = trim(($e['managerFirstName'] ?? '') . ' ' . ($e['managerLastName'] ?? ''));
            if (!empty($mName)) {
                $managers[$mName] = ($managers[$mName] ?? 0) + 1;
            }
        }
        arsort($managers);
        $res = "### Organization Managers & Team Sizes\n";
        foreach ($managers as $mgr => $cnt) {
            $res .= "* **{$mgr}**: {$cnt} direct report(s)\n";
        }
        return $res;
    }

    // =========================================================================
    // 13. SPECIFIC EMPLOYEE SEARCH (BY NAME, EMPLOYEE ID, OR EMAIL)
    // =========================================================================
    $foundEmployee = null;
    $candidateMatches = [];

    $stopWords = [
        'who', 'is', 'are', 'the', 'tell', 'me', 'about', 'show', 'details', 'of',
        'for', 'what', 'give', 'can', 'you', 'find', 'profile', 'info', 'record',
        'records', 'employee', 'staff', 'person', 'user', 'a', 'an', 'please',
        'salary', 'pay', 'compensation', 'package', 'manager', 'reports', 'to',
        'supervisor', 'boss', 'contact', 'phone', 'mobile', 'call', 'number',
        'email', 'mail', 'attendance', 'present', 'absent', 'leave', 'leaves'
    ];

    // 1. Match by exact employee ID (e.g. EMP001, EMP-8D48C9)
    foreach ($employees as $emp) {
        $empCode = strtolower(trim($emp['employeeId'] ?? ''));
        if (!empty($empCode) && (preg_match('/\b' . preg_quote($empCode, '/') . '\b/i', $msg) || str_contains($msg, $empCode))) {
            $foundEmployee = $emp;
            break;
        }
    }

    // 2. Match by email
    if (!$foundEmployee) {
        foreach ($employees as $emp) {
            $email = strtolower(trim($emp['email'] ?? ''));
            if (!empty($email) && str_contains($msg, $email)) {
                $foundEmployee = $emp;
                break;
            }
        }
    }

    // 3. Match by full name
    if (!$foundEmployee) {
        foreach ($employees as $emp) {
            $fn = strtolower(trim($emp['firstName'] ?? ''));
            $ln = strtolower(trim($emp['lastName'] ?? ''));
            $full = trim("{$fn} {$ln}");
            if (!empty($full) && strlen($full) >= 4 && preg_match('/\b' . preg_quote($full, '/') . '\b/i', $msg)) {
                $foundEmployee = $emp;
                break;
            }
        }
    }

    // 4. Token-based matching (handles multi-word first names like "Gowtham Chowdary" when searching "Gowtham")
    if (!$foundEmployee) {
        $queryWords = preg_split('/[\s,\.\?\!\-\_]+/', $cleanQuery);
        $meaningfulWords = array_values(array_filter($queryWords, function($w) use ($stopWords) {
            return strlen($w) >= 3 && !in_array($w, $stopWords);
        }));

        if (!empty($meaningfulWords)) {
            $scoredEmployees = [];

            foreach ($employees as $emp) {
                $fn = strtolower(trim($emp['firstName'] ?? ''));
                $ln = strtolower(trim($emp['lastName'] ?? ''));
                $full = trim("{$fn} {$ln}");

                $nameTokens = array_filter(preg_split('/[\s,\.\-]+/', $full), fn($t) => strlen($t) >= 2);

                $matchScore = 0;
                foreach ($meaningfulWords as $qw) {
                    foreach ($nameTokens as $token) {
                        if ($token === $qw) {
                            $matchScore += 10;
                        }
                    }
                }

                if ($matchScore > 0) {
                    $scoredEmployees[] = [
                        'employee' => $emp,
                        'score' => $matchScore
                    ];
                }
            }

            usort($scoredEmployees, fn($a, $b) => $b['score'] <=> $a['score']);

            if (!empty($scoredEmployees)) {
                if (count($scoredEmployees) === 1 || ($scoredEmployees[0]['score'] > $scoredEmployees[1]['score'])) {
                    $foundEmployee = $scoredEmployees[0]['employee'];
                } else {
                    $topScore = $scoredEmployees[0]['score'];
                    foreach ($scoredEmployees as $item) {
                        if ($item['score'] >= $topScore) {
                            $candidateMatches[] = $item['employee'];
                        }
                    }
                }
            }
        }
    }

    if ($foundEmployee) {
        $fullName = trim(($foundEmployee['firstName'] ?? '') . ' ' . ($foundEmployee['lastName'] ?? ''));
        $branchName = !empty($foundEmployee['branchName']) ? $foundEmployee['branchName'] : ($foundEmployee['branch'] ?: 'Corporate Office');
        $managerName = trim(($foundEmployee['managerFirstName'] ?? '') . ' ' . ($foundEmployee['managerLastName'] ?? ''));
        if (empty($managerName)) $managerName = 'Not assigned';

        // Check if user asked specifically for Salary
        if (str_contains($msg, 'salary') || str_contains($msg, 'pay') || str_contains($msg, 'compensation') || str_contains($msg, 'package')) {
            $salFormatted = !empty($foundEmployee['salary']) ? '₹' . number_format((float)$foundEmployee['salary']) : 'Not set';
            $res = "### Salary Details: **{$fullName}** (`{$foundEmployee['employeeId']}`)\n";
            $res .= "* **Employee Name**: **{$fullName}**\n";
            $res .= "* **Designation**: {$foundEmployee['position']}\n";
            $res .= "* **Department**: {$foundEmployee['department']}\n";
            $res .= "* **Current Salary**: **{$salFormatted}**\n";
            $res .= "* **Employment Status**: " . ucfirst($foundEmployee['status'] ?: 'Active') . "\n";
            $res .= "* **Assigned Branch**: {$branchName}\n";
            return $res;
        }

        // Check if user asked specifically for Attendance
        if (str_contains($msg, 'attendance') || str_contains($msg, 'present') || str_contains($msg, 'punch') || str_contains($msg, 'check in') || str_contains($msg, 'late')) {
            $attRecord = null;
            foreach ($todayAttendanceLogs as $log) {
                if (($log['employeeId'] ?? '') === ($foundEmployee['employeeId'] ?? '')) {
                    $attRecord = $log;
                    break;
                }
            }
            $res = "### Today's Attendance: **{$fullName}** (`{$foundEmployee['employeeId']}`)\n";
            $res .= "* **Employee Name**: **{$fullName}**\n";
            $res .= "* **Designation**: {$foundEmployee['position']}\n";
            if ($attRecord) {
                $checkIn = !empty($attRecord['checkIn']) ? date('h:i A', strtotime($attRecord['checkIn'])) : 'N/A';
                $checkOut = !empty($attRecord['checkOut']) ? date('h:i A', strtotime($attRecord['checkOut'])) : 'Not checked out yet';
                $res .= "* **Today's Status**: **" . ucfirst($attRecord['status'] ?: 'Present') . "**\n";
                $res .= "* **Check-In Time**: {$checkIn}\n";
                $res .= "* **Check-Out Time**: {$checkOut}\n";
                if (!empty($attRecord['hours'])) {
                    $res .= "* **Total Hours**: {$attRecord['hours']} hrs\n";
                }
            } else {
                $res .= "* **Today's Status**: **Not marked present / No punch recorded today** (" . date('d M Y') . ")\n";
                $res .= "* **Designated Shift**: " . ($foundEmployee['shiftTime'] ?: 'Standard 09:30 AM - 06:30 PM') . "\n";
            }
            return $res;
        }

        // Check if user asked specifically for Reporting Manager
        if (str_contains($msg, 'manager') || str_contains($msg, 'reports to') || str_contains($msg, 'supervisor') || str_contains($msg, 'boss')) {
            $res = "### Reporting Manager: **{$fullName}** (`{$foundEmployee['employeeId']}`)\n";
            $res .= "* **Employee**: **{$fullName}** ({$foundEmployee['position']})\n";
            $res .= "* **Reporting Manager**: **{$managerName}**" . (!empty($foundEmployee['managerEmail']) ? " ({$foundEmployee['managerEmail']})" : '') . "\n";
            $res .= "* **Department**: {$foundEmployee['department']}\n";
            $res .= "* **Branch**: {$branchName}\n";
            return $res;
        }

        // Check if user asked specifically for Contact Info
        if (str_contains($msg, 'phone') || str_contains($msg, 'contact') || str_contains($msg, 'mobile') || str_contains($msg, 'email') || str_contains($msg, 'mail')) {
            $res = "### Contact Information: **{$fullName}** (`{$foundEmployee['employeeId']}`)\n";
            $res .= "* **Full Name**: **{$fullName}**\n";
            $res .= "* **Official Email**: {$foundEmployee['email']}" . (!empty($foundEmployee['workEmail']) ? " / {$foundEmployee['workEmail']}" : '') . "\n";
            $res .= "* **Phone Number**: " . ($foundEmployee['phone'] ?: 'Not recorded in profile') . "\n";
            $res .= "* **Department**: {$foundEmployee['department']}\n";
            $res .= "* **Branch**: {$branchName}\n";
            return $res;
        }

        // Check if user asked specifically for Leaves
        if (str_contains($msg, 'leave') || str_contains($msg, 'vacation') || str_contains($msg, 'time off')) {
            $empLeaves = [];
            foreach ($recentLeaves as $rl) {
                if (($rl['employeeId'] ?? '') === ($foundEmployee['employeeId'] ?? '')) {
                    $empLeaves[] = $rl;
                }
            }
            $res = "### Leave Records: **{$fullName}** (`{$foundEmployee['employeeId']}`)\n";
            $res .= "* **Employee Name**: **{$fullName}**\n";
            $res .= "* **Department**: {$foundEmployee['department']}\n";
            if (!empty($empLeaves)) {
                $res .= "\n**Recent Applications:**\n";
                foreach ($empLeaves as $el) {
                    $st = ucfirst($el['status'] ?: 'Pending');
                    $res .= "* **{$el['leaveType']}** ({$el['days']} day(s) from {$el['startDate']} to {$el['endDate']}) - Status: **{$st}**\n";
                }
            } else {
                $res .= "* **Status**: No recent leave applications found for this employee.\n";
            }
            return $res;
        }

        // Full Profile Card
        $salFormatted = !empty($foundEmployee['salary']) ? '₹' . number_format((float)$foundEmployee['salary']) : 'N/A';
        $res = "### Employee Profile: **{$fullName}**\n";
        $res .= "* **Full Name**: **{$fullName}**\n";
        $res .= "* **Employee ID**: **{$foundEmployee['employeeId']}**\n";
        $res .= "* **Designation**: **{$foundEmployee['position']}**\n";
        $res .= "* **Department**: **{$foundEmployee['department']}**\n";
        $res .= "* **Assigned Branch**: **{$branchName}**\n";
        $res .= "* **Employment Status**: **" . ucfirst($foundEmployee['status'] ?: 'Active') . "**\n";
        $res .= "* **Employment Type**: " . ($foundEmployee['employmentType'] ?: 'Full-Time') . "\n";
        $res .= "* **Reporting Manager**: {$managerName}" . (!empty($foundEmployee['managerEmail']) ? " ({$foundEmployee['managerEmail']})" : '') . "\n";
        $res .= "* **Work Email**: {$foundEmployee['email']}\n";
        $res .= "* **Phone**: " . ($foundEmployee['phone'] ?: 'Not recorded') . "\n";
        $res .= "* **Salary**: {$salFormatted}\n";
        $res .= "* **Date of Joining**: " . ($foundEmployee['joinDate'] ?: 'N/A') . "\n";
        $res .= "* **Shift Timings**: " . ($foundEmployee['shiftTime'] ?: 'Standard 09:30 AM - 06:30 PM') . "\n";
        return $res;
    } elseif (count($candidateMatches) > 1) {
        $res = "Found **" . count($candidateMatches) . "** employees matching your search:\n\n";
        foreach ($candidateMatches as $c) {
            $cName = trim(($c['firstName'] ?? '') . ' ' . ($c['lastName'] ?? ''));
            $cBranch = !empty($c['branchName']) ? $c['branchName'] : ($c['branch'] ?: 'Corporate Office');
            $cSal = !empty($c['salary']) ? ' | Salary: ₹' . number_format((float)$c['salary']) : '';
            $res .= "* **{$cName}** (`{$c['employeeId']}`) - {$c['position']} | {$c['department']} | {$cBranch}{$cSal}\n";
        }
        return $res;
    }

    // =========================================================================
    // 14. SPECIFIC DEPARTMENT FILTER
    // =========================================================================
    foreach ($departmentsMap as $deptName => $count) {
        $deptLower = strtolower($deptName);
        if (
            preg_match('/\b' . preg_quote($deptLower, '/') . '\b/i', $msg) ||
            str_contains($msg, $deptLower . ' department') ||
            str_contains($msg, 'in ' . $deptLower)
        ) {
            $deptEmployees = array_filter($employees, function($e) use ($deptName) {
                return strcasecmp($e['department'] ?? '', $deptName) === 0;
            });
            $res = "### **{$deptName} Department** (" . count($deptEmployees) . " Employees)\n";
            foreach ($deptEmployees as $emp) {
                $eName = trim(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));
                $eBranch = !empty($emp['branchName']) ? $emp['branchName'] : ($emp['branch'] ?: 'Corporate Office');
                $eStatus = ucfirst($emp['status'] ?: 'Active');
                $res .= "* **{$eName}** (`{$emp['employeeId']}`) - {$emp['position']} | Branch: {$eBranch} | Status: {$eStatus}\n";
            }
            return $res;
        }
    }

    // =========================================================================
    // 15. SPECIFIC BRANCH FILTER
    // =========================================================================
    foreach ($branchesMap as $branchName => $count) {
        $branchLower = strtolower($branchName);
        if (
            preg_match('/\b' . preg_quote($branchLower, '/') . '\b/i', $msg) ||
            str_contains($msg, $branchLower . ' branch') ||
            str_contains($msg, 'in ' . $branchLower)
        ) {
            $branchEmployees = array_filter($employees, function($e) use ($branchName) {
                $b = !empty($e['branchName']) ? $e['branchName'] : ($e['branch'] ?: 'Corporate Office');
                return strcasecmp($b, $branchName) === 0;
            });
            $res = "### **{$branchName} Branch** (" . count($branchEmployees) . " Employees)\n";
            foreach ($branchEmployees as $emp) {
                $eName = trim(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));
                $eStatus = ucfirst($emp['status'] ?: 'Active');
                $res .= "* **{$eName}** (`{$emp['employeeId']}`) - {$emp['position']} | Dept: {$emp['department']} | Status: {$eStatus}\n";
            }
            return $res;
        }
    }

    // =========================================================================
    // 16. HEADCOUNT & TOTAL STATS
    // =========================================================================
    if (
        str_contains($msg, 'total') || str_contains($msg, 'headcount') ||
        str_contains($msg, 'how many employee') || str_contains($msg, 'active employee') ||
        str_contains($msg, 'employee count')
    ) {
        $res = "### Organization Headcount & Portal Summary\n";
        $res .= "* **Total Employees Registered**: **{$totalEmployees}**\n";
        $res .= "* **Active Employees**: **{$activeCount}**\n";
        $res .= "* **Inactive / Probation**: **{$inactiveCount}**\n";
        $res .= "* **Total Departments**: **" . count($departmentsMap) . "**\n";
        $res .= "* **Active Branch Locations**: **" . count($branchesMap) . "**\n";
        $res .= "* **Total Company Assets**: **{$assetStats['total']}**\n";
        $res .= "* **Pending Leave Applications**: **{$leaveStats['pending']}**\n";
        $res .= "* **Pending Expense Claims**: **{$expenseStats['pendingCount']}** (₹" . number_format($expenseStats['pendingAmount']) . ")\n";
        return $res;
    }

    // =========================================================================
    // 17. LIST ALL EMPLOYEES / COMPLETE DIRECTORY
    // =========================================================================
    if (
        str_contains($msg, 'list all') || str_contains($msg, 'show all') ||
        str_contains($msg, 'all employee') || str_contains($msg, 'employee directory') ||
        str_contains($msg, 'all staff') || str_contains($msg, 'everyone') ||
        str_contains($msg, 'list employees')
    ) {
        $res = "### Complete Employee Directory (" . count($employees) . " Total)\n";
        foreach ($employees as $emp) {
            $fullName = trim(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));
            $branch = !empty($emp['branchName']) ? $emp['branchName'] : ($emp['branch'] ?: 'Corporate Office');
            $status = ucfirst($emp['status'] ?: 'Active');
            $res .= "* **{$fullName}** (`{$emp['employeeId']}`) - {$emp['position']} | **{$emp['department']}** | {$branch} | Status: {$status}\n";
        }
        return $res;
    }

    // =========================================================================
    // 18. SMART FUZZY / SUBSTRING MATCH
    // =========================================================================
    $fuzzyMatches = [];
    foreach ($employees as $emp) {
        $haystack = strtolower(implode(' ', [
            $emp['firstName'] ?? '',
            $emp['lastName'] ?? '',
            $emp['position'] ?? '',
            $emp['department'] ?? '',
            $emp['branchName'] ?? '',
            $emp['branch'] ?? '',
            $emp['employeeId'] ?? ''
        ]));
        if (str_contains($haystack, $cleanQuery)) {
            $fuzzyMatches[] = $emp;
        }
    }

    if (!empty($fuzzyMatches)) {
        $res = "Found **" . count($fuzzyMatches) . "** record(s) matching \"{$message}\":\n\n";
        foreach (array_slice($fuzzyMatches, 0, 10) as $f) {
            $fName = trim(($f['firstName'] ?? '') . ' ' . ($f['lastName'] ?? ''));
            $fBranch = !empty($f['branchName']) ? $f['branchName'] : ($f['branch'] ?: 'Corporate Office');
            $res .= "* **{$fName}** (`{$f['employeeId']}`) - {$f['position']} | Dept: {$f['department']} | Branch: {$fBranch} | Status: " . ucfirst($f['status'] ?: 'Active') . "\n";
        }
        return $res;
    }

    // =========================================================================
    // 19. HELPFUL COMPREHENSIVE DEFAULT
    // =========================================================================
    $res = "I am ready to help you with data across all admin pages.\n\n";
    $res .= "You can ask me about:\n";
    $res .= "* **Employees**: \"Show details of Rahul\", \"List all active employees\"\n";
    $res .= "* **Attendance**: \"Attendance today\", \"Who is late?\"\n";
    $res .= "* **Leaves**: \"Pending leave requests\", \"Approved leaves\"\n";
    $res .= "* **Expenses**: \"Show expense claims\", \"Pending expenses\"\n";
    $res .= "* **Assets**: \"Company assets overview\", \"Available laptops\"\n";
    $res .= "* **Payroll**: \"Show salaries overview\", \"Total payroll\"\n";
    $res .= "* **Recruitment**: \"Show candidates in pipeline\"\n";
    $res .= "* **Holidays**: \"Upcoming holidays calendar\"\n";
    $res .= "* **Audit**: \"Recent admin activity logs\"\n\n";
    $res .= "Total **{$totalEmployees}** employees and **" . count($departmentsMap) . "** departments are loaded.";
    return $res;
}
