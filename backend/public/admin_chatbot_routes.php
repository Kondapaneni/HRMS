<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */
$app->post('/api/admin/chatbot/query', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');

    if ($user->role !== 'admin') {
        $response->getBody()->write(json_encode(['error' => 'Unauthorized access']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $body = (array)$request->getParsedBody();
    $message = trim($body['message'] ?? '');
    $history = is_array($body['history'] ?? null) ? $body['history'] : [];

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

    // 1. Fetch all employees with full joined details
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

    // 2. Fetch today\'s attendance stats
    $attStats = ['present_count' => 0, 'leave_count' => 0];
    try {
        $attStmt = $conn->query("
            SELECT 
                SUM(CASE WHEN LOWER(TRIM(status)) LIKE 'present%' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN LOWER(TRIM(status)) LIKE '%leave%' THEN 1 ELSE 0 END) as leave_count
            FROM attendance
            WHERE date = CURRENT_DATE
        ");
        if ($attStmt) {
            $row = $attStmt->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                $attStats['present_count'] = (int)($row['present_count'] ?? 0);
                $attStats['leave_count'] = (int)($row['leave_count'] ?? 0);
            }
        }
    } catch (\Throwable $t) {}

    // 3. Fetch pending leaves count
    $pendingLeaves = 0;
    try {
        $leaveStmt = $conn->query("
            SELECT COUNT(*) as pending_count FROM leaves WHERE LOWER(TRIM(status)) = 'pending'
        ");
        if ($leaveStmt) {
            $pendingLeaves = (int)$leaveStmt->fetchColumn();
        }
    } catch (\Throwable $t) {}

    // 4. Build context string for Gemini prompt
    $contextText = "ORGANIZATION METRICS:\n";
    $contextText .= "- Total Employees: " . count($employees) . "\n";
    $contextText .= "- Present Today: {$attStats['present_count']}\n";
    $contextText .= "- On Leave Today: {$attStats['leave_count']}\n";
    $contextText .= "- Pending Leave Requests: {$pendingLeaves}\n\n";

    $contextText .= "ALL EMPLOYEES DATA IN THE SYSTEM:\n";
    foreach ($employees as $emp) {
        $fullName = trim(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));
        $managerName = trim(($emp['managerFirstName'] ?? '') . ' ' . ($emp['managerLastName'] ?? ''));
        if (empty($managerName)) $managerName = 'None';
        $branch = !empty($emp['branchName']) ? $emp['branchName'] : ($emp['branch'] ?: 'Corporate Office');
        
        $contextText .= "- Name: {$fullName}, EmpID: {$emp['employeeId']}, Email: {$emp['email']}, Phone: {$emp['phone']}, Dept: {$emp['department']}, Role: {$emp['position']}, Status: {$emp['status']}, Branch: {$branch}, Manager: {$managerName}, Salary: {$emp['salary']}, JoinDate: {$emp['joinDate']}\n";
    }

    $geminiApiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY') ?? '';
    $aiResponseText = null;

    if (!empty($geminiApiKey)) {
        $aiResponseText = callGeminiAdminAssistant($geminiApiKey, $contextText, $message, $history);
    }

    // Seamless Fallback Rule Engine if AI service is not available or fails
    if (empty($aiResponseText)) {
        $aiResponseText = fallbackAdminLocalRuleEngine($message, $employees, $attStats, $pendingLeaves);
    }

    $suggestedActions = [
        "List all active employees",
        "Total employees & headcount",
        "Show IT department",
        "Corporate branch employees",
        "Show salaries overview",
        "Attendance today"
    ];

    $response->getBody()->write(json_encode([
        'response' => $aiResponseText,
        'suggested_actions' => array_slice($suggestedActions, 0, 5)
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware());

function callGeminiAdminAssistant($apiKey, $contextText, $userMessage, array $history = []) {
    $models = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-2.5-flash'
    ];

    $systemInstruction = "You are the Acme HRMS Admin AI Assistant. You are currently chatting with the Administrator inside their corporate portal.

CORE SCOPE & SELF DATA INSTRUCTION:
- You answer all questions regarding the organization and ALL employees' data.
- When the Administrator asks about employees, answer directly, thoroughly, and accurately using the data provided below.
- You can summarize data, count employees, or list employees by specific criteria (department, branch, manager, salary, status) if asked.
- CRITICAL FORMATTING RULE: Do NOT include any emojis, emoticons, or symbol icons in your responses. Keep headers, lists, and status indicators purely textual, professional, and clean.
- Be concise, professional, friendly, and structured. Use markdown formatting (bold text, bullet points, numbers) for readability.

" . $contextText;

    $payload = [
        "system_instruction" => [
            "parts" => [["text" => $systemInstruction]]
        ],
        "contents" => []
    ];

    $slicedHistory = array_slice($history, -6);
    foreach ($slicedHistory as $h) {
        $role = ($h['role'] ?? '') === 'user' ? 'user' : 'model';
        $text = trim($h['content'] ?? '');
        if (!empty($text)) {
            $payload['contents'][] = [
                "role" => $role,
                "parts" => [["text" => $text]]
            ];
        }
    }

    $payload['contents'][] = [
        "role" => "user",
        "parts" => [["text" => $userMessage]]
    ];

    $jsonPayload = json_encode($payload);

    foreach ($models as $modelName) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent?key=" . $apiKey;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "x-goog-api-key: " . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);

        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($raw)) {
            $res = json_decode($raw, true);
            $parts = $res['candidates'][0]['content']['parts'] ?? [];
            $textParts = [];
            foreach ($parts as $p) {
                if (!empty($p['text']) && empty($p['thought'])) {
                    $textParts[] = $p['text'];
                }
            }
            if (!empty($textParts)) {
                return trim(implode("\n", $textParts));
            }
        }
    }

    return null;
}

/**
 * Comprehensive fallback rule and intent engine for Admin queries.
 * Provides complete data access across all employees, departments, branches, salaries, and attendance.
 */
function fallbackAdminLocalRuleEngine($message, array $employees, array $attStats = [], int $pendingLeaves = 0) {
    $msg = strtolower(trim($message));
    $cleanQuery = preg_replace('/[^a-z0-9\s]/', ' ', $msg);
    $cleanQuery = trim(preg_replace('/\s+/', ' ', $cleanQuery));

    // Precompute common lists
    $activeEmployees = array_filter($employees, function($e) {
        return strtolower($e['status'] ?? 'active') === 'active';
    });
    $totalCount = count($employees);
    $activeCount = count($activeEmployees);
    $inactiveCount = $totalCount - $activeCount;

    // Collect unique departments and branches
    $departmentsMap = [];
    $branchesMap = [];
    foreach ($employees as $e) {
        $d = trim($e['department'] ?? 'General');
        if (!empty($d)) {
            $departmentsMap[$d] = ($departmentsMap[$d] ?? 0) + 1;
        }
        $b = !empty($e['branchName']) ? $e['branchName'] : ($e['branch'] ?: 'Corporate Office');
        if (!empty($b)) {
            $branchesMap[$b] = ($branchesMap[$b] ?? 0) + 1;
        }
    }

    // 1. GREETINGS & INTRO
    if (preg_match('/\b(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b/i', $msg)) {
        $res = "Hello **Administrator**.\n\n";
        $res .= "I am your **Admin HR Assistant**. I have complete access to the organization database and can answer queries about all **{$totalCount}** employees.\n\n";
        $res .= "Here is what you can ask me:\n";
        $res .= "* **Find any employee**: \"Who is Rahul?\", \"Show Dhashna profile\", \"Details of EMP001\"\n";
        $res .= "* **Employee Specific Data**: \"What is Rahul's salary?\", \"Rahul's manager\", \"Rahul's phone / email\"\n";
        $res .= "* **Department Staff**: \"Show employees in IT\", \"HR department list\"\n";
        $res .= "* **Branch Staff**: \"Corporate branch employees\", \"List branches\"\n";
        $res .= "* **Reporting & Managers**: \"Who reports to John?\", \"List all managers\"\n";
        $res .= "* **Payroll & Salaries**: \"Show salaries overview\", \"Highest salary\"\n";
        $res .= "* **Headcount & Attendance**: \"Total employees\", \"Attendance today\"\n\n";
        $res .= "How can I help you today?";
        return $res;
    }

    // 2. TODAY\'S ATTENDANCE & LEAVES
    if (
        str_contains($msg, 'attendance') || str_contains($msg, 'present today') ||
        str_contains($msg, 'absent today') || str_contains($msg, 'on leave today') ||
        str_contains($msg, 'pending leave') || str_contains($msg, 'leave request')
    ) {
        $presentToday = $attStats['present_count'] ?? 0;
        $onLeaveToday = $attStats['leave_count'] ?? 0;
        $res = "### Today's Attendance & Leave Summary\n";
        $res .= "* **Total Active Workforce**: **{$activeCount}** employees\n";
        $res .= "* **Marked Present Today**: **{$presentToday}**\n";
        $res .= "* **On Approved Leave Today**: **{$onLeaveToday}**\n";
        $res .= "* **Pending Leave Applications**: **{$pendingLeaves}** awaiting review\n";
        if ($presentToday > 0 && $activeCount > 0) {
            $pct = round(($presentToday / $activeCount) * 100, 1);
            $res .= "* **Attendance Rate**: **{$pct}%**\n";
        }
        return $res;
    }

    // 3. WHO REPORTS TO [MANAGER NAME] / DIRECT REPORTS
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

    // 4. LIST ALL MANAGERS & TEAM SIZES
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
        $res = "### Organization Managers & Direct Reports\n";
        foreach ($managers as $mgr => $cnt) {
            $res .= "* **{$mgr}**: {$cnt} direct report(s)\n";
        }
        return $res;
    }

    // 5. SALARY OVERVIEW & PAYROLL STATS
    if (
        str_contains($msg, 'salary overview') || str_contains($msg, 'salaries overview') ||
        str_contains($msg, 'show salaries') || str_contains($msg, 'payroll') ||
        str_contains($msg, 'total payroll') || str_contains($msg, 'average salary') ||
        str_contains($msg, 'highest salary') || str_contains($msg, 'salary distribution')
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

        $res = "### Organization Payroll & Salary Overview\n";
        $res .= "* **Total Monthly Payroll**: **₹" . number_format($totalPayroll) . "**\n";
        $res .= "* **Average Employee Salary**: **₹" . number_format($avgSal) . "**\n";
        if ($highest) {
            $res .= "* **Highest Compensated**: **{$highest['name']}** ({$highest['role']} - {$highest['dept']}) at **₹" . number_format($highest['salary']) . "**\n";
        }
        $res .= "\n**Top Compensated Roles:**\n";
        foreach (array_slice($salaries, 0, 5) as $s) {
            $res .= "* **{$s['name']}** (`{$s['empId']}`): ₹" . number_format($s['salary']) . " ({$s['role']})\n";
        }
        $res .= "\n*To check a specific employee's compensation, ask: \"What is [Name]'s salary?\"*";
        return $res;
    }

    // 6. SPECIFIC EMPLOYEE SEARCH (BY NAME, EMPLOYEE ID, OR EMAIL)
    // Check if any employee name or ID appears in the message
    $foundEmployee = null;
    $candidateMatches = [];

    foreach ($employees as $emp) {
        $fn = strtolower(trim($emp['firstName'] ?? ''));
        $ln = strtolower(trim($emp['lastName'] ?? ''));
        $full = trim("{$fn} {$ln}");
        $empCode = strtolower(trim($emp['employeeId'] ?? ''));
        $email = strtolower(trim($emp['email'] ?? ''));

        // Match by exact employee ID (e.g. EMP001)
        if (!empty($empCode) && preg_match('/\b' . preg_quote($empCode, '/') . '\b/i', $msg)) {
            $foundEmployee = $emp;
            break;
        }

        // Match by full name
        if (!empty($full) && strlen($full) >= 4 && str_contains($msg, $full)) {
            $foundEmployee = $emp;
            break;
        }

        // Match by first name (whole word)
        if (!empty($fn) && strlen($fn) >= 3 && preg_match('/\b' . preg_quote($fn, '/') . '\b/i', $msg)) {
            $candidateMatches[] = $emp;
        } elseif (!empty($ln) && strlen($ln) >= 3 && preg_match('/\b' . preg_quote($ln, '/') . '\b/i', $msg)) {
            $candidateMatches[] = $emp;
        }
    }

    if (!$foundEmployee && count($candidateMatches) === 1) {
        $foundEmployee = $candidateMatches[0];
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
        $res .= "\n*To view full profile, type the full name or employee ID.*";
        return $res;
    }

    // 7. SPECIFIC DEPARTMENT FILTER (e.g. IT, HR, Sales, Marketing, etc.)
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

    // 8. LIST ALL DEPARTMENTS
    if (
        str_contains($msg, 'all departments') || str_contains($msg, 'list departments') ||
        str_contains($msg, 'what departments') || str_contains($msg, 'show departments')
    ) {
        $res = "### Organization Departments & Headcount\n";
        foreach ($departmentsMap as $dName => $cnt) {
            $res .= "* **{$dName}**: {$cnt} employee(s)\n";
        }
        return $res;
    }

    // 9. SPECIFIC BRANCH FILTER
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

    // 10. LIST ALL BRANCHES
    if (
        str_contains($msg, 'all branches') || str_contains($msg, 'list branches') ||
        str_contains($msg, 'what branches') || str_contains($msg, 'show branches')
    ) {
        $res = "### Organization Branches & Employee Distribution\n";
        foreach ($branchesMap as $bName => $cnt) {
            $res .= "* **{$bName}**: {$cnt} employee(s)\n";
        }
        return $res;
    }

    // 11. HEADCOUNT & TOTAL STATS
    if (
        str_contains($msg, 'total') || str_contains($msg, 'headcount') ||
        str_contains($msg, 'how many employee') || str_contains($msg, 'active employee') ||
        str_contains($msg, 'employee count')
    ) {
        $res = "### Organization Headcount Overview\n";
        $res .= "* **Total Employees Registered**: **{$totalCount}**\n";
        $res .= "* **Active Employees**: **{$activeCount}**\n";
        $res .= "* **Inactive / Resigned / Probation**: **{$inactiveCount}**\n";
        $res .= "* **Total Functional Departments**: **" . count($departmentsMap) . "**\n";
        $res .= "* **Active Branch Locations**: **" . count($branchesMap) . "**\n";
        $res .= "\n*Ask: \"List all active employees\" or \"Show [Department] department\" for full breakdown.*";
        return $res;
    }

    // 12. LIST ALL EMPLOYEES / COMPLETE DIRECTORY
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

    // 13. SMART FUZZY / SUBSTRING MATCH
    // If the query contains words matching role, position, or partial names
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
        if (count($fuzzyMatches) > 10) {
            $res .= "\n*Showing top 10 of " . count($fuzzyMatches) . " results.*";
        }
        return $res;
    }

    // 14. HELPFUL DEFAULT GUIDANCE (NEVER REJECT OR DISPLAY A BLUNT ERROR)
    $sampleNames = [];
    foreach (array_slice($employees, 0, 4) as $e) {
        $sampleNames[] = trim(($e['firstName'] ?? '') . ' ' . ($e['lastName'] ?? ''));
    }
    $sampleNamesStr = implode(', ', array_filter($sampleNames));

    $res = "I am ready to help you explore employee and organization data.\n\n";
    $res .= "You can ask me questions such as:\n";
    if (!empty($sampleNamesStr)) {
        $res .= "* **Employee Search**: \"Who is " . ($employees[0]['firstName'] ?? 'an employee') . "?\", \"Show details of " . ($employees[1]['firstName'] ?? 'staff') . "\"\n";
        $res .= "* **Salary Queries**: \"What is " . ($employees[0]['firstName'] ?? 'Rahul') . "'s salary?\", \"Show salaries overview\"\n";
    }
    $res .= "* **Directory**: \"List all active employees\", \"Total headcount\"\n";
    $res .= "* **Departments**: \"Show employees in IT\", \"List all departments\"\n";
    $res .= "* **Branches**: \"Corporate branch employees\", \"List branches\"\n";
    $res .= "* **Attendance**: \"Attendance today\", \"Pending leaves\"\n\n";
    $res .= "Total **{$totalCount}** employees are currently registered in the database.";
    return $res;
}
