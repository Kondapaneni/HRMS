<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */
$app->post('/api/employee/chatbot/query', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $userId = $user->id;

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

    // 1. Fetch current employee profile
    $empStmt = $conn->prepare('
        SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email,
               e.department, e.position, e.status, e."joinDate", e."managerId", e."shiftTime",
               e."weekOff", e."workMode", e.branch, e.salary,
               b.name as "branchName",
               m."firstName" as "managerFirstName", m."lastName" as "managerLastName", m.email as "managerEmail"
        FROM employee e
        LEFT JOIN employee m ON e."managerId" = m.id::text
        LEFT JOIN branches b ON (b.id::text = e.branch OR LOWER(b.name) = LOWER(e.branch))
        WHERE e."userId" = ?
        LIMIT 1
    ');
    $empStmt->execute([$userId]);
    $employee = $empStmt->fetch(PDO::FETCH_ASSOC);

    if (!$employee) {
        $response->getBody()->write(json_encode([
            'response' => "I could not find an active employee profile associated with your account. Please reach out to HR.",
            'suggested_actions' => []
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    $empInternalId = $employee['id'];

    // 2. Fetch leave balances & recent leaves
    $balStmt = $conn->prepare('
        SELECT "paidTotal", "paidUsed", "unpaidUsed"
        FROM leave_balances
        WHERE "employeeId" = ?
        LIMIT 1
    ');
    $balStmt->execute([$userId]);
    $balance = $balStmt->fetch(PDO::FETCH_ASSOC);

    $paidTotal = (int)($balance['paidTotal'] ?? 12);
    $paidUsed = (int)($balance['paidUsed'] ?? 0);
    $unpaidUsed = (int)($balance['unpaidUsed'] ?? 0);
    $paidRemaining = max(0, $paidTotal - $paidUsed);

    $leavesStmt = $conn->prepare('
        SELECT "leaveType", "startDate", "endDate", days, reason, status, "appliedDate"
        FROM leaves
        WHERE "employeeId" = ?
        ORDER BY "appliedDate" DESC, "createdAt" DESC
        LIMIT 5
    ');
    $leavesStmt->execute([$userId]);
    $recentLeaves = $leavesStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Fetch attendance context
    $today = date('Y-m-d');
    $currentMonthStart = date('Y-m-01');
    $currentMonthEnd = date('Y-m-t');

    // Today's attendance
    $todayStmt = $conn->prepare('
        SELECT date, status, "checkIn", "checkOut", hours, "isRegularized"
        FROM attendance
        WHERE "employeeId" = ? AND date = ?
        LIMIT 1
    ');
    $todayStmt->execute([$userId, $today]);
    $todayAtt = $todayStmt->fetch(PDO::FETCH_ASSOC);

    // Current month stats
    $monthAttStmt = $conn->prepare('
        SELECT status, hours, "checkIn"
        FROM attendance
        WHERE "employeeId" = ? AND date BETWEEN ? AND ?
    ');
    $monthAttStmt->execute([$userId, $currentMonthStart, $currentMonthEnd]);
    $monthRecords = $monthAttStmt->fetchAll(PDO::FETCH_ASSOC);

    $monthPresent = 0;
    $monthLeaves = 0;
    $monthTotalHours = 0.0;
    $monthLateCount = 0;
    foreach ($monthRecords as $rec) {
        $st = strtolower($rec['status'] ?? '');
        if (str_contains($st, 'present')) {
            $monthPresent++;
            $monthTotalHours += (float)($rec['hours'] ?? 0);
            if (str_contains($st, 'late')) {
                $monthLateCount++;
            }
        } elseif (str_contains($st, 'leave')) {
            $monthLeaves++;
        }
    }

    // 4. Fetch latest payslip
    $payStmt = $conn->prepare('
        SELECT month, year, "netSalary", status, "earningsJson", "deductionsJson"
        FROM payslips
        WHERE "employeeId" = ?
        ORDER BY year DESC, month DESC
        LIMIT 1
    ');
    $payStmt->execute([$userId]);
    $latestPayslip = $payStmt->fetch(PDO::FETCH_ASSOC);

    // 5. Fetch assigned assets
    $assetStmt = $conn->prepare('
        SELECT name, category, serial_number, status
        FROM assets
        WHERE assigned_to = ? OR assigned_to = ?
    ');
    $assetStmt->execute([$userId, $empInternalId]);
    $assignedAssets = $assetStmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Fetch upcoming company holidays
    $holStmt = $conn->prepare('
        SELECT "holidayDate", "holidayName"
        FROM company_holidays
        WHERE "isActive" = 1 AND "holidayDate" >= ?
        ORDER BY "holidayDate" ASC
        LIMIT 6
    ');
    $holStmt->execute([$today]);
    $upcomingHolidays = $holStmt->fetchAll(PDO::FETCH_ASSOC);

    // 7. Fetch submitted expenses
    $expStmt = $conn->prepare('
        SELECT title, amount, category, status, created_at
        FROM expenses
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 5
    ');
    $expStmt->execute([$userId]);
    $recentExpenses = $expStmt->fetchAll(PDO::FETCH_ASSOC);

    // Build context summary for the AI prompt
    $managerName = trim(($employee['managerFirstName'] ?? '') . ' ' . ($employee['managerLastName'] ?? ''));
    if (empty($managerName)) $managerName = 'Not currently assigned';

    $resolvedBranch = !empty($employee['branchName'])
        ? $employee['branchName']
        : (!empty($employee['branch']) && !preg_match('/^[0-9a-fA-F-]{36}$/', $employee['branch'])
            ? $employee['branch']
            : 'Corporate Office');

    $contextText = "CURRENT LOGGED-IN EMPLOYEE DATA:\n";
    $contextText .= "- Name: {$employee['firstName']} {$employee['lastName']}\n";
    $contextText .= "- Employee Code: {$employee['employeeId']}\n";
    $contextText .= "- Email: {$employee['email']}\n";
    $contextText .= "- Department: {$employee['department']}\n";
    $contextText .= "- Position: {$employee['position']}\n";
    $contextText .= "- Assigned Branch / Location: {$resolvedBranch}\n";
    $contextText .= "- Join Date: {$employee['joinDate']}\n";
    $contextText .= "- Shift Schedule: " . ($employee['shiftTime'] ?: 'Standard 09:30 AM - 06:30 PM') . "\n";
    $contextText .= "- Week Off: " . ($employee['weekOff'] ?: 'Sunday') . "\n";
    $contextText .= "- Reporting Manager: {$managerName}" . (!empty($employee['managerEmail']) ? " ({$employee['managerEmail']})" : '') . "\n";
    $contextText .= "- Work Mode: " . ($employee['workMode'] ?: 'On-site') . "\n";

    $contextText .= "\nLEAVE BALANCES & HISTORY:\n";
    $contextText .= "- Paid Leave Balance: {$paidRemaining} remaining (Total Quota: {$paidTotal}, Used: {$paidUsed})\n";
    $contextText .= "- Unpaid Leaves Used: {$unpaidUsed}\n";
    if (!empty($recentLeaves)) {
        $contextText .= "- Recent Leave Applications:\n";
        foreach ($recentLeaves as $lv) {
            $contextText .= "  * {$lv['leaveType']} ({$lv['startDate']} to {$lv['endDate']}, {$lv['days']} day(s)) - Status: {$lv['status']} (Reason: {$lv['reason']})\n";
        }
    } else {
        $contextText .= "- Recent Leave Applications: None on record.\n";
    }

    $contextText .= "\nATTENDANCE SUMMARY (TODAY & THIS MONTH):\n";
    $contextText .= "- Today ({$today}): " . ($todayAtt ? "Status: {$todayAtt['status']}, Check-in: " . ($todayAtt['checkIn'] ?: 'None') . ", Check-out: " . ($todayAtt['checkOut'] ?: 'Pending') . ", Hours: {$todayAtt['hours']}" : "Not checked in yet.") . "\n";
    $contextText .= "- This Month (" . date('F Y') . "): {$monthPresent} days marked present, {$monthLeaves} days leave, {$monthLateCount} late arrivals, {$monthTotalHours} total logged hours.\n";

    $contextText .= "\nPAYROLL & COMPENSATION:\n";
    if ($latestPayslip) {
        $monthName = date('F', mktime(0, 0, 0, (int)$latestPayslip['month'], 10));
        $contextText .= "- Latest Payslip: {$monthName} {$latestPayslip['year']}\n";
        $contextText .= "- Net Salary: ₹" . number_format((float)$latestPayslip['netSalary'], 2) . " (Status: {$latestPayslip['status']})\n";
    } else {
        $contextText .= "- Base Salary: " . ($employee['salary'] ? "₹" . number_format((float)$employee['salary'], 2) : "Configured by HR") . "\n";
        $contextText .= "- Latest Payslip: No generated payslips found yet.\n";
    }

    $contextText .= "\nASSIGNED HARDWARE / ASSETS:\n";
    if (!empty($assignedAssets)) {
        foreach ($assignedAssets as $ast) {
            $contextText .= "- {$ast['name']} ({$ast['category']}, Serial: {$ast['serial_number']}, Status: {$ast['status']})\n";
        }
    } else {
        $contextText .= "- No company assets currently assigned.\n";
    }

    $contextText .= "\nUPCOMING COMPANY HOLIDAYS:\n";
    if (!empty($upcomingHolidays)) {
        foreach ($upcomingHolidays as $h) {
            $contextText .= "- {$h['holidayDate']}: {$h['holidayName']}\n";
        }
    } else {
        $contextText .= "- No upcoming company holidays scheduled for the rest of the year.\n";
    }

    if (!empty($recentExpenses)) {
        $contextText .= "\nRECENT EXPENSE CLAIMS:\n";
        foreach ($recentExpenses as $exp) {
            $contextText .= "- {$exp['title']} (₹{$exp['amount']}, Category: {$exp['category']}, Status: {$exp['status']})\n";
        }
    }

    // 8. Fetch Feature Access & Business Apps Data (if permitted)
    $userRole = $user->role ?? 'employee';
    $isAdmin = ($userRole === 'admin');

    $faStmt = $conn->prepare('
        SELECT "canAttendance", "canLeave", "canPayroll", "canEmployees", "canRecruitment",
               "canAssets", "canLoanOrigination", "canSalesOrigination", "canBranchOperations", "canAdminAssessments"
        FROM user_feature_access
        WHERE "userId" = ?
        LIMIT 1
    ');
    $faStmt->execute([$userId]);
    $featureAccess = $faStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $canLoanOrigination = $isAdmin || !empty($featureAccess['canLoanOrigination']);
    $canSalesOrigination = $isAdmin || !empty($featureAccess['canSalesOrigination']);
    $canBranchOperations = $isAdmin || !empty($featureAccess['canBranchOperations']);

    // Loans Origination Data
    $userLoans = [];
    $loansStats = ['total' => 0, 'by_status' => []];
    if ($canLoanOrigination) {
        $lStmt = $conn->prepare('
            SELECT application_id, loan_type, status, form_data, created_at
            FROM public.loan_applications
            WHERE created_by = ?
            ORDER BY created_at DESC
            LIMIT 10
        ');
        $lStmt->execute([$userId]);
        $rawLoans = $lStmt->fetchAll(PDO::FETCH_ASSOC);
        $loansStats['total'] = count($rawLoans);
        foreach ($rawLoans as $l) {
            $st = $l['status'] ?: 'Draft';
            $loansStats['by_status'][$st] = ($loansStats['by_status'][$st] ?? 0) + 1;
            $fData = is_string($l['form_data']) ? json_decode($l['form_data'], true) : ($l['form_data'] ?? []);
            $userLoans[] = [
                'application_id' => $l['application_id'] ?: 'N/A',
                'applicant_name' => $fData['applicant_name'] ?? $fData['business_name'] ?? 'Applicant',
                'loan_type' => $l['loan_type'] ?: 'Loan',
                'status' => $st,
                'created_at' => substr($l['created_at'] ?? '', 0, 10)
            ];
        }
    }

    // Sales Origination Data
    $userSales = [];
    $salesStats = ['total' => 0, 'by_status' => []];
    if ($canSalesOrigination) {
        $sStmt = $conn->prepare('
            SELECT name, phone, product_type, status, created_at
            FROM public.sale_leads
            WHERE created_by = ?::uuid
            ORDER BY created_at DESC
            LIMIT 10
        ');
        $sStmt->execute([$userId]);
        $rawSales = $sStmt->fetchAll(PDO::FETCH_ASSOC);
        $salesStats['total'] = count($rawSales);
        foreach ($rawSales as $s) {
            $st = $s['status'] ?: 'New';
            $salesStats['by_status'][$st] = ($salesStats['by_status'][$st] ?? 0) + 1;
            $userSales[] = [
                'name' => $s['name'],
                'product_type' => $s['product_type'] ?: 'General Product',
                'status' => $st,
                'phone' => $s['phone'],
                'created_at' => substr($s['created_at'] ?? '', 0, 10)
            ];
        }
    }

    // Branch Operations Data
    $branchApps = [];
    $branchAppsStats = ['total' => 0, 'by_status' => []];
    if ($canBranchOperations && !empty($employee['branch'])) {
        $bStmt = $conn->prepare('
            SELECT application_id, loan_type, status, form_data, created_at
            FROM public.loan_applications
            WHERE branch = :branch
            ORDER BY created_at DESC
            LIMIT 10
        ');
        $bStmt->execute([':branch' => $employee['branch']]);
        $rawBranch = $bStmt->fetchAll(PDO::FETCH_ASSOC);
        $branchAppsStats['total'] = count($rawBranch);
        foreach ($rawBranch as $ba) {
            $st = $ba['status'] ?: 'In Review';
            $branchAppsStats['by_status'][$st] = ($branchAppsStats['by_status'][$st] ?? 0) + 1;
            $fData = is_string($ba['form_data']) ? json_decode($ba['form_data'], true) : ($ba['form_data'] ?? []);
            $branchApps[] = [
                'application_id' => $ba['application_id'] ?: 'N/A',
                'applicant_name' => $fData['applicant_name'] ?? $fData['business_name'] ?? 'Applicant',
                'loan_type' => $ba['loan_type'] ?: 'Loan',
                'status' => $st,
                'created_at' => substr($ba['created_at'] ?? '', 0, 10)
            ];
        }
    }

    // Assessments Data
    $userAssessments = [];
    try {
        $assStmt = $conn->prepare('
            SELECT a.id, a.title, a.assessment_date, a.questions_count, a.duration_minutes
            FROM assessments a
            WHERE a.status = \'Active\'
              AND (a.assigned_employee_ids @> :uidJson::jsonb OR a.assigned_employee_ids @> :empIdJson::jsonb)
            ORDER BY a.created_at DESC
            LIMIT 5
        ');
        $assStmt->execute([
            ':uidJson' => json_encode([$userId]),
            ':empIdJson' => json_encode([(string)$employee['id']])
        ]);
        $userAssessments = $assStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (\Exception $e) {
        $userAssessments = [];
    }

    // Training Videos Data
    $userVideos = [];
    try {
        $vStmt = $conn->prepare('
            SELECT tv.id, tv.title, COALESCE(etp.completed, false) as is_completed
            FROM training_videos tv
            LEFT JOIN employee_training_progress etp ON etp.video_id = tv.id AND (etp.user_id = :uid OR etp.employee_id = :empId)
            WHERE tv.assigned_employee_ids @> :uidJson::jsonb OR tv.assigned_employee_ids @> :empIdJson::jsonb
            ORDER BY tv.created_at DESC
            LIMIT 5
        ');
        $vStmt->execute([
            ':uid' => $userId,
            ':empId' => $employee['id'],
            ':uidJson' => json_encode([$userId]),
            ':empIdJson' => json_encode([(string)$employee['id']])
        ]);
        $userVideos = $vStmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (\Exception $e) {
        $userVideos = [];
    }

    $businessAppsData = [
        'canLoanOrigination' => $canLoanOrigination,
        'canSalesOrigination' => $canSalesOrigination,
        'canBranchOperations' => $canBranchOperations,
        'userLoans' => $userLoans,
        'loansStats' => $loansStats,
        'userSales' => $userSales,
        'salesStats' => $salesStats,
        'branchApps' => $branchApps,
        'branchAppsStats' => $branchAppsStats,
        'userAssessments' => $userAssessments,
        'userVideos' => $userVideos,
    ];

    $contextText .= "\nBUSINESS APPS ACCESS & DATA (Scope: Authenticated User Only):\n";
    $contextText .= "- Loans Origination: " . ($canLoanOrigination ? "ENABLED (Access Granted)" : "DISABLED (No Access)") . "\n";
    if ($canLoanOrigination) {
        $contextText .= "  * Total Loan Applications Created: {$loansStats['total']}\n";
        if (!empty($loansStats['by_status'])) {
            $contextText .= "  * Status Counts: " . json_encode($loansStats['by_status']) . "\n";
        }
        if (!empty($userLoans)) {
            $contextText .= "  * Recent Applications:\n";
            foreach ($userLoans as $l) {
                $contextText .= "    - App ID: {$l['application_id']}, Applicant: {$l['applicant_name']}, Type: {$l['loan_type']}, Status: {$l['status']}, Date: {$l['created_at']}\n";
            }
        }
    }

    $contextText .= "- Sales Origination: " . ($canSalesOrigination ? "ENABLED (Access Granted)" : "DISABLED (No Access)") . "\n";
    if ($canSalesOrigination) {
        $contextText .= "  * Total Sales Leads: {$salesStats['total']}\n";
        if (!empty($salesStats['by_status'])) {
            $contextText .= "  * Status Counts: " . json_encode($salesStats['by_status']) . "\n";
        }
        if (!empty($userSales)) {
            $contextText .= "  * Recent Leads:\n";
            foreach ($userSales as $s) {
                $contextText .= "    - Name: {$s['name']}, Product: {$s['product_type']}, Status: {$s['status']}, Date: {$s['created_at']}\n";
            }
        }
    }

    $contextText .= "- Branch Operations: " . ($canBranchOperations ? "ENABLED (Access Granted for branch: {$resolvedBranch})" : "DISABLED (No Access)") . "\n";
    if ($canBranchOperations) {
        $contextText .= "  * Total Applications at Branch: {$branchAppsStats['total']}\n";
        if (!empty($branchAppsStats['by_status'])) {
            $contextText .= "  * Status Counts: " . json_encode($branchAppsStats['by_status']) . "\n";
        }
        if (!empty($branchApps)) {
            $contextText .= "  * Recent Branch Applications:\n";
            foreach ($branchApps as $ba) {
                $contextText .= "    - App ID: {$ba['application_id']}, Applicant: {$ba['applicant_name']}, Type: {$ba['loan_type']}, Status: {$ba['status']}\n";
            }
        }
    }

    if (!empty($userAssessments)) {
        $contextText .= "- Assigned Assessments: " . count($userAssessments) . " active\n";
        foreach ($userAssessments as $a) {
            $contextText .= "  * Title: {$a['title']}, Date: " . ($a['assessment_date'] ?: 'Open') . ", Duration: {$a['duration_minutes']} min, Questions: {$a['questions_count']}\n";
        }
    }

    if (!empty($userVideos)) {
        $completedVids = count(array_filter($userVideos, fn($v) => !empty($v['is_completed'])));
        $contextText .= "- Assigned Training Videos: " . count($userVideos) . " total, {$completedVids} completed.\n";
    }

    // Try Gemini API first if configured
    $geminiApiKey = $_ENV['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY') ?? '';
    $aiResponseText = null;

    if (!empty($geminiApiKey)) {
        $aiResponseText = callGeminiAssistant($geminiApiKey, $contextText, $message, $history);
    }

    // If Gemini wasn't called or failed, fall back to our rich local rule-based intent engine
    if (empty($aiResponseText)) {
        $aiResponseText = fallbackLocalRuleEngine($message, $employee, $paidRemaining, $paidTotal, $paidUsed, $recentLeaves, $todayAtt, $monthPresent, $monthTotalHours, $latestPayslip, $assignedAssets, $upcomingHolidays, $managerName, $resolvedBranch, $businessAppsData);
    }

    // Dynamic suggested follow-up chips based on permissions
    $suggestedActions = [
        "What is my leave balance?",
        "Show my attendance this month",
        "Which branch am I assigned to?"
    ];
    if ($canLoanOrigination) {
        $suggestedActions[] = "Show my loan applications";
    }
    if ($canSalesOrigination) {
        $suggestedActions[] = "Show my sales leads";
    }
    if ($canBranchOperations) {
        $suggestedActions[] = "What applications are in Branch Operations?";
    }
    $suggestedActions[] = "What business apps do I have access to?";
    $suggestedActions[] = "When is the next company holiday?";
    $suggestedActions = array_slice($suggestedActions, 0, 5);

    $response->getBody()->write(json_encode([
        'response' => $aiResponseText,
        'suggested_actions' => $suggestedActions
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware());

/**
 * Call Gemini 3.6 Flash model with prompt grounding and history
 */
function callGeminiAssistant($apiKey, $contextText, $userMessage, array $history = []) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

    $systemInstruction = "You are the Acme HRMS AI Assistant. You are currently chatting with an employee inside their corporate portal.
SECURITY & PRIVACY BOUNDARY:
- You ONLY answer questions using the authenticated employee's own data provided below, and standard Acme HR policies.
- Under NO circumstances reveal or extrapolate data about other employees. If asked about another employee or organization-wide restricted data, politely refuse and state that you can only answer questions about their own records.
- CRITICAL: Never display or mention database UUIDs, technical codes, internal hash IDs, or \"branch code\" (e.g. 55b41227-9025-4204-9088-e1762f3096e0). Always use friendly human-readable names (e.g. for branch, simply state the branch name such as 'Gurunak Colony' or 'Corporate Office'). Do NOT refer to it as a 'branch code' or output any alphanumeric IDs.
- CRITICAL FORMATTING RULE: Do NOT include any emojis, emoticons, or symbol icons in your responses. Keep headers, lists, and status indicators purely textual, professional, and clean.
- BUSINESS APPS ACCESS PERMISSIONS:
  * When the employee inquires about Business Apps (Loan Origination, Sales Origination, Branch Operations, Assessments, Training Videos):
    - If the feature is ENABLED / Access Granted for them, give comprehensive answers, status breakdowns, counts, and recent records strictly from the data provided in their context.
    - If the feature is DISABLED / No Access, politely inform them that their user account does not currently have permission to access that business app, and advise them to contact an administrator if they require access.
    - If asked \"what business apps do I have access to\" or \"my apps\", summarize the apps they have permission for.
- Be concise, professional, friendly, and structured. Use markdown formatting (bold text, bullet points, numbers) for readability.
- If the employee asks how to take an action (e.g. apply for leave, punch attendance, download payslip, claim expense, view business apps), guide them to the appropriate portal page (e.g. Leaves > Apply Leave, Attendance punch button, Payroll > Download Payslip, Business Apps section in sidebar).

" . $contextText;

    $contents = [];

    // System instruction in contents or via system_instruction
    $payload = [
        "system_instruction" => [
            "parts" => [["text" => $systemInstruction]]
        ],
        "contents" => []
    ];

    // Append history (last 6 turns max to keep token cost low and latency fast)
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

    // Current user message
    $payload['contents'][] = [
        "role" => "user",
        "parts" => [["text" => $userMessage]]
    ];

    $jsonPayload = json_encode($payload);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "x-goog-api-key: " . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200 && !empty($raw)) {
        $res = json_decode($raw, true);
        $candidateText = $res['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!empty($candidateText)) {
            return trim($candidateText);
        }
    }

    return null;
}

/**
 * Built-in fallback intent and rule engine for offline or API limit scenarios
 */
function fallbackLocalRuleEngine($message, $employee, $paidRemaining, $paidTotal, $paidUsed, $recentLeaves, $todayAtt, $monthPresent, $monthTotalHours, $latestPayslip, $assignedAssets, $upcomingHolidays, $managerName, $resolvedBranch = 'Corporate Office', array $bApps = []) {
    $msg = strtolower(trim($message));

    $canLoan = !empty($bApps['canLoanOrigination']);
    $canSales = !empty($bApps['canSalesOrigination']);
    $canBranch = !empty($bApps['canBranchOperations']);
    $userLoans = $bApps['userLoans'] ?? [];
    $loansStats = $bApps['loansStats'] ?? ['total' => 0, 'by_status' => []];
    $userSales = $bApps['userSales'] ?? [];
    $salesStats = $bApps['salesStats'] ?? ['total' => 0, 'by_status' => []];
    $branchApps = $bApps['branchApps'] ?? [];
    $branchAppsStats = $bApps['branchAppsStats'] ?? ['total' => 0, 'by_status' => []];
    $userAssessments = $bApps['userAssessments'] ?? [];
    $userVideos = $bApps['userVideos'] ?? [];

    // Greetings
    if (preg_match('/\b(hi|hello|hey|good morning|good afternoon|greetings)\b/i', $msg)) {
        return "Hello **{$employee['firstName']}**.\n\nI am your Acme HRMS Assistant. You can ask me questions regarding your **branch location**, **business apps**, **leave balances**, **attendance records**, **payslips**, **shift schedule**, **assigned assets**, or **upcoming company holidays**.\n\nHow can I help you today?";
    }

    // What business apps do I have access to / apps access
    if (preg_match('/\b(business apps?|my apps?|what apps?|app access|feature access|my permissions?)\b/i', $msg) && !str_contains($msg, 'application')) {
        $res = "### Your Business Apps & Feature Access\n";
        $res .= "* **Loans Origination**: " . ($canLoan ? "**Active** ({$loansStats['total']} applications created)" : "*No Access*") . "\n";
        $res .= "* **Sales Origination**: " . ($canSales ? "**Active** ({$salesStats['total']} leads registered)" : "*No Access*") . "\n";
        $res .= "* **Branch Operations**: " . ($canBranch ? "**Active** at {$resolvedBranch} ({$branchAppsStats['total']} applications)" : "*No Access*") . "\n";
        $res .= "* **Assessments**: " . (!empty($userAssessments) ? "**" . count($userAssessments) . " Active Assessment(s)**" : "None currently scheduled") . "\n";
        $res .= "* **Training Videos**: " . (!empty($userVideos) ? "**" . count($userVideos) . " Video Module(s)**" : "None currently assigned") . "\n";
        $res .= "\nYou can access enabled apps directly from the **Business Apps** section on your sidebar.";
        return $res;
    }

    // Loan Origination
    if (str_contains($msg, 'loan') || str_contains($msg, 'origination') || str_contains($msg, 'borrower') || str_contains($msg, 'applicant')) {
        if (!$canLoan) {
            return "Notice: You currently do not have access permissions for the **Loan Origination** business app in your employee profile. Please contact your manager or HR administrator to request access.";
        }
        $res = "### Loan Origination Overview\n";
        $res .= "* **Total Applications Created**: **{$loansStats['total']}**\n";
        if (!empty($loansStats['by_status'])) {
            $res .= "* **Status Summary**:\n";
            foreach ($loansStats['by_status'] as $statusName => $count) {
                $res .= "  - {$statusName}: **{$count}**\n";
            }
        }
        if (!empty($userLoans)) {
            $res .= "\n**Recent Loan Applications:**\n";
            foreach (array_slice($userLoans, 0, 5) as $l) {
                $res .= "* **{$l['application_id']}**: {$l['applicant_name']} ({$l['loan_type']}) — *{$l['status']}* ({$l['created_at']})\n";
            }
        }
        $res .= "\nYou can view and manage full loan files in **Business Apps > Loans Origination**.";
        return $res;
    }

    // Sales Origination
    if (str_contains($msg, 'sale') || str_contains($msg, 'sales') || str_contains($msg, 'lead') || str_contains($msg, 'merchant')) {
        if (!$canSales) {
            return "Notice: You currently do not have access permissions for the **Sales Origination** business app in your employee profile. Please contact your manager or HR administrator to request access.";
        }
        $res = "### Sales Origination Pipeline\n";
        $res .= "* **Total Sales Leads**: **{$salesStats['total']}**\n";
        if (!empty($salesStats['by_status'])) {
            $res .= "* **Status Summary**:\n";
            foreach ($salesStats['by_status'] as $statusName => $count) {
                $res .= "  - {$statusName}: **{$count}**\n";
            }
        }
        if (!empty($userSales)) {
            $res .= "\n**Recent Leads:**\n";
            foreach (array_slice($userSales, 0, 5) as $s) {
                $res .= "* **{$s['name']}** ({$s['product_type']}) — *{$s['status']}* (Phone: {$s['phone']})\n";
            }
        }
        $res .= "\nYou can register new leads in **Business Apps > Sales Origination**.";
        return $res;
    }

    // Branch Operations
    if (str_contains($msg, 'branch operation') || str_contains($msg, 'branch app') || str_contains($msg, 'branch review') || str_contains($msg, 'branch pipeline') || (str_contains($msg, 'branch') && (str_contains($msg, 'loan') || str_contains($msg, 'application') || str_contains($msg, 'queue')))) {
        if (!$canBranch) {
            return "Notice: You currently do not have access permissions for the **Branch Operations** business app in your employee profile. Please contact your manager or HR administrator to request access.";
        }
        $res = "### Branch Operations Pipeline\n";
        $res .= "* **Assigned Branch**: **{$resolvedBranch}**\n";
        $res .= "* **Total Applications in Branch Queue**: **{$branchAppsStats['total']}**\n";
        if (!empty($branchApps)) {
            $res .= "\n**Recent Applications at Branch:**\n";
            foreach (array_slice($branchApps, 0, 5) as $ba) {
                $res .= "* **{$ba['application_id']}**: {$ba['applicant_name']} ({$ba['loan_type']}) — *{$ba['status']}*\n";
            }
        }
        $res .= "\nYou can review applications in **Business Apps > Branch Operations**.";
        return $res;
    }

    // Assessments
    if (str_contains($msg, 'assessment') || str_contains($msg, 'exam') || str_contains($msg, 'test') || str_contains($msg, 'quiz')) {
        $res = "### Your Assessments\n";
        if (!empty($userAssessments)) {
            $res .= "You have **" . count($userAssessments) . "** active assessment(s) assigned:\n";
            foreach ($userAssessments as $a) {
                $res .= "* **{$a['title']}**: Date: " . ($a['assessment_date'] ?: 'Available now') . " | {$a['duration_minutes']} mins | {$a['questions_count']} questions\n";
            }
            $res .= "\nYou can take your assessments under **Business Apps > Assessments**.";
        } else {
            $res .= "You have no active assessments scheduled at this time.";
        }
        return $res;
    }

    // Training
    if (str_contains($msg, 'training') || str_contains($msg, 'video') || str_contains($msg, 'course') || str_contains($msg, 'lms')) {
        $res = "### Training & Learning Modules\n";
        if (!empty($userVideos)) {
            $completed = count(array_filter($userVideos, fn($v) => !empty($v['is_completed'])));
            $res .= "You have **" . count($userVideos) . "** training module(s) assigned (**{$completed}** completed):\n";
            foreach ($userVideos as $v) {
                $statusIcon = !empty($v['is_completed']) ? 'Completed' : 'Pending';
                $res .= "* **{$v['title']}** — [{$statusIcon}]\n";
            }
            $res .= "\nYou can watch training modules under **Business Apps > Training Videos**.";
        } else {
            $res .= "You currently have no training video modules assigned.";
        }
        return $res;
    }

    // Branch / Location / Office
    if (str_contains($msg, 'branch') || str_contains($msg, 'barach') || str_contains($msg, 'location') || str_contains($msg, 'office')) {
        $res = "### Assigned Branch & Office\n";
        $res .= "* **Assigned Branch**: **{$resolvedBranch}**\n";
        $res .= "* **Department**: " . ($employee['department'] ?: 'N/A') . "\n";
        $res .= "* **Work Mode**: " . ($employee['workMode'] ?: 'On-site') . "\n";
        return $res;
    }

    // Leaves
    if (str_contains($msg, 'leave') || str_contains($msg, 'vacation') || str_contains($msg, 'time off') || str_contains($msg, 'holiday balance')) {
        $res = "### Leave Summary\n";
        $res .= "* **Remaining Paid Leaves**: **{$paidRemaining}** day(s)\n";
        $res .= "* **Total Annual Quota**: {$paidTotal} days\n";
        $res .= "* **Paid Leaves Used**: {$paidUsed} days\n\n";

        if (!empty($recentLeaves)) {
            $res .= "**Recent Applications:**\n";
            foreach ($recentLeaves as $l) {
                $res .= "- **{$l['leaveType']}** ({$l['startDate']} to {$l['endDate']}): *{$l['status']}*\n";
            }
        }
        $res .= "\nYou can apply for a new leave request under the **Leaves > Apply Leave** page.";
        return $res;
    }

    // Attendance
    if (str_contains($msg, 'attendance') || str_contains($msg, 'punch') || str_contains($msg, 'check in') || str_contains($msg, 'check out') || str_contains($msg, 'hours') || str_contains($msg, 'working hours')) {
        $res = "### Attendance Overview\n";
        if ($todayAtt) {
            $res .= "* **Today's Status**: **{$todayAtt['status']}**\n";
            $res .= "* **Punch In**: " . ($todayAtt['checkIn'] ?: 'None recorded') . "\n";
            $res .= "* **Punch Out**: " . ($todayAtt['checkOut'] ?: 'In progress') . "\n";
            $res .= "* **Logged Hours**: " . ($todayAtt['hours'] ? $todayAtt['hours'] . " hrs" : '0 hrs') . "\n\n";
        } else {
            $res .= "* **Today's Status**: You have not punched in yet today.\n\n";
        }

        $res .= "**This Month (" . date('F Y') . "):**\n";
        $res .= "* **Days Present**: {$monthPresent} days\n";
        $res .= "* **Total Hours Logged**: {$monthTotalHours} hours\n";
        $res .= "\nYou can view your full calendar and punch records under the **Attendance** section.";
        return $res;
    }

    // Salary / Payslip
    if (str_contains($msg, 'salary') || str_contains($msg, 'payslip') || str_contains($msg, 'pay') || str_contains($msg, 'compensation') || str_contains($msg, 'earnings')) {
        $res = "### Payroll & Salary Information\n";
        if ($latestPayslip) {
            $monthName = date('F', mktime(0, 0, 0, (int)$latestPayslip['month'], 10));
            $res .= "* **Latest Payslip**: {$monthName} {$latestPayslip['year']}\n";
            $res .= "* **Net Take-Home Pay**: **₹" . number_format((float)$latestPayslip['netSalary'], 2) . "**\n";
            $res .= "* **Status**: {$latestPayslip['status']}\n";
            $res .= "\nYou can download the complete PDF breakdown under the **Payroll** tab.";
        } else {
            $res .= "* **Base Salary**: " . ($employee['salary'] ? "₹" . number_format((float)$employee['salary'], 2) : "Configured by HR") . "\n";
            $res .= "* No published payslips are currently available for download.";
        }
        return $res;
    }

    // Shift / Timings
    if (str_contains($msg, 'shift') || str_contains($msg, 'timing') || str_contains($msg, 'schedule') || str_contains($msg, 'week off') || str_contains($msg, 'weekend')) {
        $res = "### Work Schedule\n";
        $res .= "* **Shift Timings**: " . ($employee['shiftTime'] ?: '09:30 AM - 06:30 PM') . "\n";
        $res .= "* **Designated Week Off**: **" . ($employee['weekOff'] ?: 'Sunday') . "**\n";
        $res .= "* **Work Mode**: " . ($employee['workMode'] ?: 'On-site') . "\n";
        $res .= "* **Assigned Branch**: **{$resolvedBranch}**\n";
        return $res;
    }

    // Manager / Department / Profile
    if (str_contains($msg, 'manager') || str_contains($msg, 'boss') || str_contains($msg, 'supervisor') || str_contains($msg, 'who is my') || str_contains($msg, 'department') || str_contains($msg, 'profile') || str_contains($msg, 'designation') || str_contains($msg, 'role')) {
        $res = "### Your Employment Profile\n";
        $res .= "* **Name**: {$employee['firstName']} {$employee['lastName']} ({$employee['employeeId']})\n";
        $res .= "* **Department**: {$employee['department']}\n";
        $res .= "* **Designation**: {$employee['position']}\n";
        $res .= "* **Branch**: **{$resolvedBranch}**\n";
        $res .= "* **Reporting Manager**: **{$managerName}**" . (!empty($employee['managerEmail']) ? " ({$employee['managerEmail']})" : '') . "\n";
        $res .= "* **Joining Date**: {$employee['joinDate']}\n";
        return $res;
    }

    // Assets / Hardware
    if (str_contains($msg, 'asset') || str_contains($msg, 'laptop') || str_contains($msg, 'device') || str_contains($msg, 'hardware') || str_contains($msg, 'equipment')) {
        $res = "### Assigned Company Assets\n";
        if (!empty($assignedAssets)) {
            foreach ($assignedAssets as $ast) {
                $res .= "* **{$ast['name']}** ({$ast['category']}) - Serial No: `{$ast['serial_number']}`\n";
            }
        } else {
            $res .= "You currently have no physical company assets assigned in the system.\n";
        }
        return $res;
    }

    // Company Holidays
    if (str_contains($msg, 'holiday') || str_contains($msg, 'festival') || str_contains($msg, 'calendar') || str_contains($msg, 'next holiday')) {
        $res = "### Upcoming Company Holidays\n";
        if (!empty($upcomingHolidays)) {
            foreach ($upcomingHolidays as $h) {
                $formattedDate = date('D, M j, Y', strtotime($h['holidayDate']));
                $res .= "* **{$h['holidayName']}**: {$formattedDate}\n";
            }
        } else {
            $res .= "There are no further holidays scheduled for the current period.";
        }
        return $res;
    }

    // Privacy guard
    if (str_contains($msg, 'other employee') || str_contains($msg, 'someone else') || str_contains($msg, 'all employee') || str_contains($msg, 'who is') && !str_contains($msg, 'manager')) {
        return "Privacy Notice: For data security and confidentiality, I can only provide information directly concerning your own employee records (your leaves, attendance, payroll, assets, schedule, and business apps). I cannot display or search records of other staff members.";
    }

    // General fallback
    return "I can help you with details regarding your **leaves**, **attendance**, **latest payslips**, **business apps**, **shift timings**, **assigned assets**, or **upcoming company holidays**.\n\nPlease select one of the suggested questions below or ask specifically about your records.";
}
