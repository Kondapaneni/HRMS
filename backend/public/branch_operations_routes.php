<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Middleware\AuthMiddleware;

/**
 * Branch Operations Dashboard Routes
 * Scoped strictly to the logged-in user's assigned branch.
 */
$app->get('/api/branch-operations/dashboard', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $queryParams = $request->getQueryParams();
    
    $selectedOfficerId = !empty($queryParams['officerId']) && $queryParams['officerId'] !== 'all' ? $queryParams['officerId'] : null;
    $selectedLoanType = !empty($queryParams['loanType']) && $queryParams['loanType'] !== 'All' ? $queryParams['loanType'] : null;
    $timeframe = !empty($queryParams['timeframe']) ? $queryParams['timeframe'] : 'this_month';

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $userId = is_object($user) ? $user->id : ($user['id'] ?? null);

        // 1. Fetch current employee's branch
        $empStmt = $conn->prepare('
            SELECT e.id, e."employeeId", e."firstName", e."lastName", e.branch, e.department, e.position,
                   b.name as branch_name, b.id as branch_uuid
            FROM employee e
            LEFT JOIN branches b ON b.id::text = e.branch OR b.name = e.branch
            WHERE e."userId" = ?
            LIMIT 1
        ');
        $empStmt->execute([$userId]);
        $currentEmp = $empStmt->fetch(PDO::FETCH_ASSOC);

        $branchId = $currentEmp['branch'] ?? null;
        $branchName = $currentEmp['branch_name'] ?? $currentEmp['branch'] ?? 'Unassigned Branch';
        $branchUuid = $currentEmp['branch_uuid'] ?? $branchId;

        if (!$branchId) {
            $response->getBody()->write(json_encode([
                'success' => true,
                'branch' => [
                    'id' => null,
                    'name' => 'No Branch Assigned'
                ],
                'officers' => [],
                'stats' => [
                    'total_leads' => 0,
                    'percent_change_leads' => 0,
                    'active_opportunities' => 0,
                    'converted_leads' => 0,
                    'conversion_rate' => 0,
                    'total_applications' => 0,
                    'transferred_applications' => 0,
                    'submitted_applications' => 0,
                    'approved_applications' => 0,
                    'rejected_applications' => 0,
                ],
                'dailyData' => [],
                'monthlyData' => [],
                'loanTypeBreakdown' => [],
                'officerBreakdown' => [],
                'recentApplications' => []
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        // 2. Fetch all Origination Officers in the same branch dynamically
        $officersStmt = $conn->prepare('
            SELECT DISTINCT e.id as employee_row_id, e."userId", e."employeeId", e."firstName", e."lastName",
                   e.position, e.department, e.avatar, u.email
            FROM employee e
            JOIN users u ON u.id = e."userId"
            LEFT JOIN user_feature_access fa ON fa."userId" = u.id
            WHERE (e.branch = :branchId OR e.branch = :branchName OR e.branch = :branchUuid)
              AND (e.department = \'Loans\' OR fa."canLoanOrigination" = true)
              AND u."isActive" = true
            ORDER BY e."firstName" ASC
        ');
        $officersStmt->execute([
            ':branchId' => (string)$branchId,
            ':branchName' => (string)$branchName,
            ':branchUuid' => (string)$branchUuid
        ]);
        $officers = $officersStmt->fetchAll(PDO::FETCH_ASSOC);

        $branchOfficerUserIds = array_filter(array_column($officers, 'userId'));
        $branchOfficerEmpIds = array_filter(array_column($officers, 'employeeId'));

        // If no officers found in this branch
        if (empty($branchOfficerUserIds)) {
            $response->getBody()->write(json_encode([
                'success' => true,
                'branch' => [
                    'id' => $branchUuid ?: $branchId,
                    'name' => $branchName
                ],
                'officers' => [],
                'stats' => [
                    'total_leads' => 0,
                    'percent_change_leads' => 0,
                    'active_opportunities' => 0,
                    'converted_leads' => 0,
                    'conversion_rate' => 0,
                    'total_applications' => 0,
                    'transferred_applications' => 0,
                    'submitted_applications' => 0,
                    'approved_applications' => 0,
                    'rejected_applications' => 0,
                ],
                'dailyData' => [],
                'monthlyData' => [],
                'loanTypeBreakdown' => [],
                'officerBreakdown' => [],
                'recentApplications' => []
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        // Determine target officers for filtering
        $targetUserIds = $selectedOfficerId ? [$selectedOfficerId] : $branchOfficerUserIds;

        // Build SQL placeholders for created_by
        $userInClause = implode(',', array_fill(0, count($targetUserIds), '?'));

        // Date range conditions based on timeframe
        $timeframeLeadCondition = "AND 1=1";
        $timeframeAppCondition = "AND 1=1";
        $prevTimeframeLeadCondition = "AND 1=1";

        if ($timeframe === 'this_month') {
            $timeframeLeadCondition = "AND date_trunc('month', l.created_at) = date_trunc('month', CURRENT_DATE)";
            $timeframeAppCondition = "AND date_trunc('month', a.created_at) = date_trunc('month', CURRENT_DATE)";
            $prevTimeframeLeadCondition = "AND date_trunc('month', l.created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')";
        } elseif ($timeframe === 'last_7_days') {
            $timeframeLeadCondition = "AND l.created_at >= CURRENT_DATE - INTERVAL '7 days'";
            $timeframeAppCondition = "AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'";
            $prevTimeframeLeadCondition = "AND l.created_at >= CURRENT_DATE - INTERVAL '14 days' AND l.created_at < CURRENT_DATE - INTERVAL '7 days'";
        } elseif ($timeframe === 'last_6_months') {
            $timeframeLeadCondition = "AND l.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'";
            $timeframeAppCondition = "AND a.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'";
            $prevTimeframeLeadCondition = "AND l.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months' AND l.created_at < date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'";
        }

        // Loan type filter condition
        $leadLoanTypeCondition = "";
        $leadLoanTypeParams = [];
        $appLoanTypeCondition = "";
        $appLoanTypeParams = [];

        if ($selectedLoanType) {
            $leadLoanTypeCondition = "AND l.loan_type = ?";
            $leadLoanTypeParams = [$selectedLoanType];
            $appLoanTypeCondition = "AND a.loan_type = ?";
            $appLoanTypeParams = [$selectedLoanType];
        }

        // 3. Query Leads Aggregations
        $leadStatsQuery = "
            SELECT 
                COUNT(*) as total_leads,
                COALESCE(SUM(CASE WHEN l.status IN ('New', 'Active', 'In Progress', 'Follow Up') THEN 1 ELSE 0 END), 0) as active_opportunities,
                COALESCE(SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END), 0) as converted_leads
            FROM public.loan_leads l
            WHERE l.created_by::text IN ($userInClause)
            $timeframeLeadCondition
            $leadLoanTypeCondition
        ";
        $stmt = $conn->prepare($leadStatsQuery);
        $stmt->execute(array_merge($targetUserIds, $leadLoanTypeParams));
        $leadStats = $stmt->fetch(PDO::FETCH_ASSOC);

        $totalLeads = (int)($leadStats['total_leads'] ?? 0);
        $activeOpportunities = (int)($leadStats['active_opportunities'] ?? 0);
        $convertedLeads = (int)($leadStats['converted_leads'] ?? 0);
        $conversionRate = $totalLeads > 0 ? round(($convertedLeads / $totalLeads) * 100, 1) : 0;

        // Previous period leads count for trend %
        $prevLeadsQuery = "
            SELECT COUNT(*) as total_leads_prev
            FROM public.loan_leads l
            WHERE l.created_by::text IN ($userInClause)
            $prevTimeframeLeadCondition
            $leadLoanTypeCondition
        ";
        $stmtPrev = $conn->prepare($prevLeadsQuery);
        $stmtPrev->execute(array_merge($targetUserIds, $leadLoanTypeParams));
        $totalLeadsPrev = (int)$stmtPrev->fetchColumn();

        $percentChangeLeads = $totalLeadsPrev > 0
            ? round((($totalLeads - $totalLeadsPrev) / $totalLeadsPrev) * 100)
            : ($totalLeads > 0 ? 100 : 0);

        // 4. Query Applications Aggregations
        // Applications match created_by as userId OR employeeId
        $targetUserAndEmpIds = array_unique(array_merge($targetUserIds, $branchOfficerEmpIds));
        $appInClause = implode(',', array_fill(0, count($targetUserAndEmpIds), '?'));

        $appStatsQuery = "
            SELECT 
                COUNT(*) as total_applications,
                COALESCE(SUM(CASE WHEN a.status = 'Draft' THEN 1 ELSE 0 END), 0) as draft_applications,
                COALESCE(SUM(CASE WHEN a.status = 'Created' THEN 1 ELSE 0 END), 0) as created_applications,
                COALESCE(SUM(CASE WHEN a.status = 'Branch Operations' THEN 1 ELSE 0 END), 0) as transferred_applications,
                COALESCE(SUM(CASE WHEN a.status = 'Approved' THEN 1 ELSE 0 END), 0) as approved_applications,
                COALESCE(SUM(CASE WHEN a.status = 'Rejected' THEN 1 ELSE 0 END), 0) as rejected_applications
            FROM public.loan_applications a
            WHERE a.created_by::text IN ($appInClause)
            $timeframeAppCondition
            $appLoanTypeCondition
        ";
        $stmtApp = $conn->prepare($appStatsQuery);
        $stmtApp->execute(array_merge($targetUserAndEmpIds, $appLoanTypeParams));
        $appStats = $stmtApp->fetch(PDO::FETCH_ASSOC);

        $totalApplications = (int)($appStats['total_applications'] ?? 0);
        $draftApplications = (int)($appStats['draft_applications'] ?? 0);
        $createdApplications = (int)($appStats['created_applications'] ?? 0);
        $transferredApplications = (int)($appStats['transferred_applications'] ?? 0);
        $approvedApplications = (int)($appStats['approved_applications'] ?? 0);
        $rejectedApplications = (int)($appStats['rejected_applications'] ?? 0);

        // 5. Daily Trends (Last 7 Days)
        $dailyTrendsQuery = "
            WITH last_7_days AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS d
            ),
            daily_leads AS (
                SELECT 
                    date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as lead_date,
                    COALESCE(SUM(CASE WHEN status != 'Converted' THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as converted
                FROM public.loan_leads
                WHERE created_by::text IN ($userInClause)
                $leadLoanTypeCondition
                GROUP BY lead_date
            ),
            daily_apps AS (
                SELECT 
                    date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as app_date,
                    COUNT(*) as applications
                FROM public.loan_applications
                WHERE created_by::text IN ($appInClause)
                $appLoanTypeCondition
                GROUP BY app_date
            )
            SELECT 
                to_char(d.d, 'Dy') as name,
                to_char(d.d, 'DD Mon') as full_date,
                COALESCE(dl.leads, 0) as leads,
                COALESCE(dl.converted, 0) as converted,
                COALESCE(da.applications, 0) as applications
            FROM last_7_days d
            LEFT JOIN daily_leads dl ON dl.lead_date = d.d
            LEFT JOIN daily_apps da ON da.app_date = d.d
            ORDER BY d.d ASC;
        ";
        $stmtDaily = $conn->prepare($dailyTrendsQuery);
        $stmtDaily->execute(array_merge($targetUserIds, $leadLoanTypeParams, $targetUserAndEmpIds, $appLoanTypeParams));
        $dailyData = $stmtDaily->fetchAll(PDO::FETCH_ASSOC);

        // 6. Monthly Trends (Last 6 Months)
        $monthlyTrendsQuery = "
            WITH last_6_months AS (
                SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month'::interval)::date AS m
            ),
            monthly_leads AS (
                SELECT 
                    date_trunc('month', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as lead_month,
                    COALESCE(SUM(CASE WHEN status != 'Converted' THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as converted
                FROM public.loan_leads
                WHERE created_by::text IN ($userInClause)
                $leadLoanTypeCondition
                GROUP BY lead_month
            ),
            monthly_apps AS (
                SELECT 
                    date_trunc('month', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date as app_month,
                    COUNT(*) as applications
                FROM public.loan_applications
                WHERE created_by::text IN ($appInClause)
                $appLoanTypeCondition
                GROUP BY app_month
            )
            SELECT 
                to_char(m.m, 'Mon') as name,
                to_char(m.m, 'Mon YYYY') as full_month,
                COALESCE(ml.leads, 0) as leads,
                COALESCE(ml.converted, 0) as converted,
                COALESCE(ma.applications, 0) as applications
            FROM last_6_months m
            LEFT JOIN monthly_leads ml ON ml.lead_month = m.m
            LEFT JOIN monthly_apps ma ON ma.app_month = m.m
            ORDER BY m.m ASC;
        ";
        $stmtMonthly = $conn->prepare($monthlyTrendsQuery);
        $stmtMonthly->execute(array_merge($targetUserIds, $leadLoanTypeParams, $targetUserAndEmpIds, $appLoanTypeParams));
        $monthlyData = $stmtMonthly->fetchAll(PDO::FETCH_ASSOC);

        // 7. Loan Type Breakdown
        $loanTypeQuery = "
            SELECT 
                COALESCE(loan_type, 'Personal Loan') as loan_type,
                COUNT(*) as count
            FROM public.loan_leads l
            WHERE l.created_by::text IN ($userInClause)
            $timeframeLeadCondition
            GROUP BY loan_type
        ";
        $stmtLT = $conn->prepare($loanTypeQuery);
        $stmtLT->execute($targetUserIds);
        $loanTypeBreakdown = $stmtLT->fetchAll(PDO::FETCH_ASSOC);

        // 8. Individual Origination Officer Breakdown
        $officerBreakdown = [];
        foreach ($officers as $officer) {
            $oUid = $officer['userId'];
            $oEmpId = $officer['employeeId'];

            $oLeadStmt = $conn->prepare("
                SELECT 
                    COUNT(*) as total_leads,
                    COALESCE(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as converted_leads,
                    COALESCE(SUM(CASE WHEN status IN ('New', 'Active', 'In Progress', 'Follow Up') THEN 1 ELSE 0 END), 0) as active_leads
                FROM public.loan_leads l
                WHERE l.created_by::text = ?
                $timeframeLeadCondition
                $leadLoanTypeCondition
            ");
            $oLeadStmt->execute(array_merge([$oUid], $leadLoanTypeParams));
            $oLead = $oLeadStmt->fetch(PDO::FETCH_ASSOC);

            $oAppStmt = $conn->prepare("
                SELECT 
                    COUNT(*) as total_apps,
                    COALESCE(SUM(CASE WHEN status = 'Created' THEN 1 ELSE 0 END), 0) as created_apps,
                    COALESCE(SUM(CASE WHEN status = 'Branch Operations' THEN 1 ELSE 0 END), 0) as transferred_apps
                FROM public.loan_applications a
                WHERE (a.created_by::text = ? OR a.created_by::text = ?)
                $timeframeAppCondition
                $appLoanTypeCondition
            ");
            $oAppStmt->execute(array_merge([$oUid, $oEmpId], $appLoanTypeParams));
            $oApp = $oAppStmt->fetch(PDO::FETCH_ASSOC);

            $oTotalLeads = (int)($oLead['total_leads'] ?? 0);
            $oConverted = (int)($oLead['converted_leads'] ?? 0);
            $oConvRate = $oTotalLeads > 0 ? round(($oConverted / $oTotalLeads) * 100, 1) : 0;

            $officerBreakdown[] = [
                'userId' => $oUid,
                'employeeId' => $oEmpId,
                'name' => trim(($officer['firstName'] ?? '') . ' ' . ($officer['lastName'] ?? '')),
                'position' => $officer['position'] ?? 'Loan Officer',
                'avatar' => $officer['avatar'] ?? null,
                'email' => $officer['email'] ?? '',
                'total_leads' => $oTotalLeads,
                'converted_leads' => $oConverted,
                'active_leads' => (int)($oLead['active_leads'] ?? 0),
                'conversion_rate' => $oConvRate,
                'total_applications' => (int)($oApp['total_apps'] ?? 0),
                'created_applications' => (int)($oApp['created_apps'] ?? 0),
                'submitted_applications' => (int)($oApp['created_apps'] ?? 0),
                'transferred_applications' => (int)($oApp['transferred_apps'] ?? 0),
            ];
        }

        // 9. Recent Branch Loan Applications Feed
        $recentAppsQuery = "
            SELECT 
                a.id, a.application_id, a.lead_id, a.loan_type, a.status, a.form_data, a.created_at, a.created_by,
                e.\"firstName\", e.\"lastName\", e.avatar, e.position
            FROM public.loan_applications a
            LEFT JOIN employee e ON e.\"userId\"::text = a.created_by OR e.\"employeeId\" = a.created_by
            WHERE a.created_by::text IN ($appInClause)
            $appLoanTypeCondition
            ORDER BY a.created_at DESC
            LIMIT 10
        ";
        $stmtRecent = $conn->prepare($recentAppsQuery);
        $stmtRecent->execute(array_merge($targetUserAndEmpIds, $appLoanTypeParams));
        $recentAppsRows = $stmtRecent->fetchAll(PDO::FETCH_ASSOC);

        $recentApplications = [];
        foreach ($recentAppsRows as $rRow) {
            $formData = is_string($rRow['form_data']) ? json_decode($rRow['form_data'], true) : ($rRow['form_data'] ?? []);
            
            $applicantName = $formData['applicant_name'] ?? $formData['name'] ?? $formData['full_name'] ?? 'Applicant';
            $phoneNumber = $formData['phone_number'] ?? $formData['phone'] ?? $formData['mobile'] ?? '';
            $loanAmount = $formData['loan_amount'] ?? $formData['amount'] ?? $formData['requested_amount'] ?? null;

            $recentApplications[] = [
                'id' => $rRow['id'],
                'application_id' => $rRow['application_id'],
                'lead_id' => $rRow['lead_id'],
                'loan_type' => $rRow['loan_type'],
                'status' => $rRow['status'],
                'applicant_name' => $applicantName,
                'phone_number' => $phoneNumber,
                'loan_amount' => $loanAmount,
                'created_at' => $rRow['created_at'],
                'officer_name' => trim(($rRow['firstName'] ?? '') . ' ' . ($rRow['lastName'] ?? '')) ?: 'Loan Officer',
                'officer_avatar' => $rRow['avatar'] ?? null,
                'officer_position' => $rRow['position'] ?? 'Loan Officer',
            ];
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'branch' => [
                'id' => $branchUuid ?: $branchId,
                'name' => $branchName
            ],
            'officers' => array_map(function ($o) {
                return [
                    'userId' => $o['userId'],
                    'employeeId' => $o['employeeId'],
                    'name' => trim(($o['firstName'] ?? '') . ' ' . ($o['lastName'] ?? '')),
                    'position' => $o['position'] ?? 'Loan Officer',
                    'avatar' => $o['avatar'] ?? null,
                ];
            }, $officers),
            'selectedOfficer' => $selectedOfficerId,
            'stats' => [
                'total_leads' => $totalLeads,
                'percent_change_leads' => $percentChangeLeads,
                'active_opportunities' => $activeOpportunities,
                'converted_leads' => $convertedLeads,
                'conversion_rate' => $conversionRate,
                'total_applications' => $totalApplications,
                'draft_applications' => $draftApplications,
                'created_applications' => $createdApplications,
                'submitted_applications' => $createdApplications,
                'transferred_applications' => $transferredApplications,
                'approved_applications' => $approvedApplications,
                'rejected_applications' => $rejectedApplications,
            ],
            'dailyData' => $dailyData,
            'monthlyData' => $monthlyData,
            'loanTypeBreakdown' => $loanTypeBreakdown,
            'officerBreakdown' => $officerBreakdown,
            'recentApplications' => $recentApplications
        ]));

        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error in branch operations dashboard: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Failed to load branch operations dashboard: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'branchOperations'));
