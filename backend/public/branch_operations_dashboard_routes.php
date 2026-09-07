<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/**
 * Branch Operations Dashboard Routes
 * Scoped strictly to the logged-in employee's branch stored on leads & applications
 */
$app->get('/api/branch-operations/dashboard', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');

    try {
        $db = new Database();
        $conn = $db->getConnection();

        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $userId = is_object($decodedToken)
            ? ($decodedToken->id ?? $decodedToken->user_id ?? null)
            : ($decodedToken['id'] ?? $decodedToken['user_id'] ?? null);

        if (!$userId) {
            $response->getBody()->write(json_encode(['error' => 'Unauthorized user']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        // Fetch user's assigned branch matching employee_profile_routes.php
        $empStmt = $conn->prepare('
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email, e.department, e.position, e.branch,
                   b.name as branch_name
            FROM employee e
            LEFT JOIN branches b ON e.branch::uuid = b.id
            WHERE e."userId" = ? LIMIT 1
        ');
        $empStmt->execute([$userId]);
        $emp = $empStmt->fetch(PDO::FETCH_ASSOC);

        if (!$emp) {
            $response->getBody()->write(json_encode(['error' => 'Employee profile not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $userBranch = $emp['branch'] ?? null;
        $userBranchName = $emp['branch_name'] ?? 'Assigned Branch';

        if (empty($userBranch)) {
            $response->getBody()->write(json_encode([
                'branch' => ['id' => null, 'name' => 'No Branch Assigned'],
                'stats' => [
                    'total_leads_month' => 0,
                    'percent_change_total' => 0,
                    'active_opportunities' => 0,
                    'percent_change_active' => 0,
                    'converted_leads' => 0,
                    'percent_change_converted' => 0,
                ],
                'creators' => [],
                'recentLeads' => [],
                'recentApplications' => [],
                'dailyData' => [],
                'monthlyData' => []
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        // Fetch strictly the distinct creators who created leads and applications belonging to this branch
        $creatorsStmt = $conn->prepare("
            SELECT DISTINCT
                e.\"userId\" as user_id,
                e.\"firstName\",
                e.\"lastName\",
                e.email,
                active_creators.has_loans,
                active_creators.has_sales
            FROM (
                SELECT uid,
                       bool_or(is_loan) as has_loans,
                       bool_or(is_sale) as has_sales
                FROM (
                    SELECT created_by::uuid as uid, true as is_loan, false as is_sale FROM public.loan_leads WHERE branch = :branch AND created_by IS NOT NULL
                    UNION ALL
                    SELECT created_by::uuid as uid, true as is_loan, false as is_sale FROM public.loan_applications WHERE branch = :branch AND created_by IS NOT NULL
                    UNION ALL
                    SELECT created_by::uuid as uid, false as is_loan, true as is_sale FROM public.sale_leads WHERE branch = :branch AND created_by IS NOT NULL
                ) combined
                GROUP BY uid
            ) active_creators
            JOIN public.employee e ON active_creators.uid = e.\"userId\"
            ORDER BY e.\"firstName\" ASC, e.\"lastName\" ASC
        ");
        $creatorsStmt->execute([':branch' => $userBranch]);
        $creatorsRows = $creatorsStmt->fetchAll(PDO::FETCH_ASSOC);

        $creators = array_map(function($c) {
            $fullName = trim(($c['firstName'] ?? '') . ' ' . ($c['lastName'] ?? ''));
            return [
                'userId' => (string)$c['user_id'],
                'name' => $fullName ?: ($c['email'] ?? 'Employee'),
                'email' => $c['email'] ?? '',
                'has_loans' => (bool)($c['has_loans'] ?? true),
                'has_sales' => (bool)($c['has_sales'] ?? false),
            ];
        }, $creatorsRows);

        // Optional filter by employee creator and pipeline
        $queryParams = $request->getQueryParams();
        $selectedEmployee = trim($queryParams['employee_id'] ?? $queryParams['created_by'] ?? '');
        $selectedPipeline = strtolower(trim($queryParams['pipeline'] ?? 'all'));

        $empFilter = "";
        $params = [':branch' => $userBranch];

        if (!empty($selectedEmployee) && $selectedEmployee !== 'all') {
            $empFilter = " AND created_by = :emp_id";
            $params[':emp_id'] = $selectedEmployee;
        }

        // Define the target leads table expression based on pipeline
        if ($selectedPipeline === 'sales') {
            $leadsTable = "(SELECT id, name, phone, address, status, product_type as loan_type, branch, created_at, created_by, true as is_sale, 'Sales' as pipeline_name FROM public.sale_leads WHERE branch = :branch $empFilter)";
        } elseif ($selectedPipeline === 'loans') {
            $leadsTable = "(SELECT id, name, phone, address, status, loan_type, branch, created_at, created_by, false as is_sale, 'Loans' as pipeline_name FROM public.loan_leads WHERE branch = :branch $empFilter)";
        } else {
            $leadsTable = "(
                SELECT id, name, phone, address, status, loan_type, branch, created_at, created_by, false as is_sale, 'Loans' as pipeline_name FROM public.loan_leads WHERE branch = :branch $empFilter
                UNION ALL
                SELECT id, name, phone, address, status, product_type as loan_type, branch, created_at, created_by, true as is_sale, 'Sales' as pipeline_name FROM public.sale_leads WHERE branch = :branch $empFilter
            )";
        }

        // 1. Total Leads This Month
        $stmt = $conn->prepare("
            SELECT COUNT(*) as total
            FROM $leadsTable l
            WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
        ");
        $stmt->execute($params);
        $totalLeadsMonth = $stmt->fetchColumn() ?: 0;

        // 2. Active Opportunities
        $stmt = $conn->prepare("
            SELECT COUNT(*) as active
            FROM $leadsTable l
            WHERE status IN ('New', 'Active', 'In Progress', 'Follow Up', 'Contacted')
        ");
        $stmt->execute($params);
        $activeOpportunities = $stmt->fetchColumn() ?: 0;

        // 3. Converted Leads (Members)
        $stmt = $conn->prepare("
            SELECT COUNT(*) as converted
            FROM $leadsTable l
            WHERE status = 'Converted'
        ");
        $stmt->execute($params);
        $convertedLeads = $stmt->fetchColumn() ?: 0;

        // 4. Daily Trends (Last 7 Days)
        $stmt = $conn->prepare("
            WITH last_7_days AS (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS d
            )
            SELECT
                to_char(d, 'Dy') as name,
                COALESCE(SUM(CASE WHEN l.status != 'Converted' THEN 1 ELSE 0 END), 0) as leads,
                COALESCE(SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END), 0) as converted
            FROM last_7_days
            LEFT JOIN $leadsTable l ON date(l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = d
            GROUP BY d
            ORDER BY d ASC;
        ");
        $stmt->execute($params);
        $dailyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Monthly Trends (Last 6 Months)
        $stmt = $conn->prepare("
            WITH last_6_months AS (
                SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month'::interval)::date AS m
            )
            SELECT
                to_char(m, 'Mon') as name,
                COALESCE(SUM(CASE WHEN l.status != 'Converted' THEN 1 ELSE 0 END), 0) as leads,
                COALESCE(SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END), 0) as converted
            FROM last_6_months
            LEFT JOIN $leadsTable l ON date_trunc('month', l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = m
            GROUP BY m
            ORDER BY m ASC;
        ");
        $stmt->execute($params);
        $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 6. Last Month comparison for Percent Change
        $stmtLastMonth = $conn->prepare("
            SELECT COUNT(*) as total
            FROM $leadsTable l
            WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        ");
        $stmtLastMonth->execute($params);
        $lastMonthTotal = $stmtLastMonth->fetchColumn() ?: 0;
        $percentChangeTotal = 0;
        if ($lastMonthTotal > 0) {
            $percentChangeTotal = round((($totalLeadsMonth - $lastMonthTotal) / $lastMonthTotal) * 100);
        } elseif ($totalLeadsMonth > 0) {
            $percentChangeTotal = 100;
        }

        // 7. Recent 10 Leads
        $recentLeadsStmt = $conn->prepare("
            SELECT
                l.id,
                l.name,
                l.phone,
                l.address,
                l.loan_type,
                l.status,
                l.branch,
                l.created_at,
                l.is_sale,
                l.pipeline_name,
                TRIM(CONCAT(e.\"firstName\", ' ', e.\"lastName\")) as creator_name
            FROM $leadsTable l
            LEFT JOIN public.employee e ON l.created_by::uuid = e.\"userId\"
            ORDER BY l.created_at DESC
            LIMIT 10
        ");
        $recentLeadsStmt->execute($params);
        $recentLeads = $recentLeadsStmt->fetchAll(PDO::FETCH_ASSOC);

        // 8. Recent 10 Loan Applications (or empty if sales-only)
        if ($selectedPipeline === 'sales') {
            $recentApps = [];
        } else {
            $recentAppsStmt = $conn->prepare("
                SELECT
                    a.id,
                    a.application_id,
                    a.lead_id,
                    a.loan_type,
                    a.status,
                    a.form_data,
                    a.branch,
                    a.created_at,
                    TRIM(CONCAT(e.\"firstName\", ' ', e.\"lastName\")) as creator_name
                FROM public.loan_applications a
                LEFT JOIN public.employee e ON a.created_by::uuid = e.\"userId\"
                WHERE a.branch = :branch $empFilter
                ORDER BY a.created_at DESC
                LIMIT 10
            ");
            $recentAppsStmt->execute($params);
            $recentApps = $recentAppsStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // OPTIMIZATION: the original code called getBranchLoanDocumentsFromTable()
        // once per application inside this loop (10 extra queries for 10 recent
        // apps). Batched into a single query when the batch helper is available
        // (defined alongside getBranchLoanDocumentsFromTable in the branch
        // applications routes file), falling back to the original per-row calls
        // if it isn't loaded, exactly as the original defensive
        // function_exists() check did.
        $docsByAppId = function_exists('getBranchLoanDocumentsBatch')
            ? getBranchLoanDocumentsBatch($conn, $recentApps)
            : null;

        foreach ($recentApps as &$app) {
            if (isset($app['form_data']) && is_string($app['form_data'])) {
                $app['form_data'] = json_decode($app['form_data'], true);
            }
            if ($docsByAppId !== null && function_exists('resolveBranchLoanDocumentsForRow')) {
                $appDocs = resolveBranchLoanDocumentsForRow($docsByAppId, $app['application_id'] ?? null, $app['id'] ?? null, $app['lead_id'] ?? null);
                if (is_array($app['form_data'])) {
                    $app['form_data']['documents'] = $appDocs;
                }
                $app['documents'] = $appDocs;
            } elseif (function_exists('getBranchLoanDocumentsFromTable')) {
                $appDocs = getBranchLoanDocumentsFromTable($conn, $app['application_id'] ?? null, $app['id'] ?? null, $app['lead_id'] ?? null);
                if (is_array($app['form_data'])) {
                    $app['form_data']['documents'] = $appDocs;
                }
                $app['documents'] = $appDocs;
            }
        }
        unset($app);

        $response->getBody()->write(json_encode([
            'branch' => [
                'id' => $userBranch,
                'name' => $userBranchName
            ],
            'stats' => [
                'total_leads_month' => (int)$totalLeadsMonth,
                'percent_change_total' => $percentChangeTotal,
                'active_opportunities' => (int)$activeOpportunities,
                'percent_change_active' => 5,
                'converted_leads' => (int)$convertedLeads,
                'percent_change_converted' => 12
            ],
            'creators' => $creators,
            'recentLeads' => $recentLeads,
            'recentApplications' => $recentApps,
            'dailyData' => array_map(function($row) {
                return [
                    'name' => $row['name'],
                    'leads' => (int)$row['leads'],
                    'converted' => (int)$row['converted']
                ];
            }, $dailyData),
            'monthlyData' => array_map(function($row) {
                return [
                    'name' => $row['name'],
                    'leads' => (int)$row['leads'],
                    'converted' => (int)$row['converted']
                ];
            }, $monthlyData)
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\PDOException $e) {
        error_log("Database error fetching branch operations dashboard: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while fetching branch dashboard data']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error fetching branch operations dashboard: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching branch dashboard data']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

/**
 * Branch Operations Leads Listing Route
 * Fetches all leads for the user's branch with pipeline, employee creator, status, and search filters.
 * Read-only directory view without the 10-lead limit.
 */
$app->get('/api/branch-operations/leads', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');

    try {
        $db = new Database();
        $conn = $db->getConnection();

        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $userId = is_object($decodedToken)
            ? ($decodedToken->id ?? $decodedToken->user_id ?? null)
            : ($decodedToken['id'] ?? $decodedToken['user_id'] ?? null);

        if (!$userId) {
            $response->getBody()->write(json_encode(['error' => 'Unauthorized user']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        // Fetch user's assigned branch
        $empStmt = $conn->prepare('
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email, e.department, e.position, e.branch,
                   b.name as branch_name
            FROM employee e
            LEFT JOIN branches b ON e.branch::uuid = b.id
            WHERE e."userId" = ? LIMIT 1
        ');
        $empStmt->execute([$userId]);
        $emp = $empStmt->fetch(PDO::FETCH_ASSOC);

        if (!$emp) {
            $response->getBody()->write(json_encode(['error' => 'Employee profile not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $userBranch = $emp['branch'] ?? null;
        $userBranchName = $emp['branch_name'] ?? 'Assigned Branch';

        if (empty($userBranch)) {
            $response->getBody()->write(json_encode([
                'success' => true,
                'branch' => ['id' => null, 'name' => 'No Branch Assigned'],
                'creators' => [],
                'leads' => [],
                'counts' => [
                    'All' => 0,
                    'New' => 0,
                    'Follow Up' => 0,
                    'Converted' => 0,
                    'Not Interested' => 0,
                    'loans' => 0,
                    'sales' => 0,
                ]
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        // Fetch creators for this branch so the dropdown filter can be populated
        $creatorsStmt = $conn->prepare("
            SELECT DISTINCT
                e.\"userId\" as user_id,
                e.\"firstName\",
                e.\"lastName\",
                e.email,
                active_creators.has_loans,
                active_creators.has_sales
            FROM (
                SELECT uid,
                       bool_or(is_loan) as has_loans,
                       bool_or(is_sale) as has_sales
                FROM (
                    SELECT created_by::uuid as uid, true as is_loan, false as is_sale FROM public.loan_leads WHERE branch = :branch AND created_by IS NOT NULL
                    UNION ALL
                    SELECT created_by::uuid as uid, true as is_loan, false as is_sale FROM public.loan_applications WHERE branch = :branch AND created_by IS NOT NULL
                    UNION ALL
                    SELECT created_by::uuid as uid, false as is_loan, true as is_sale FROM public.sale_leads WHERE branch = :branch AND created_by IS NOT NULL
                ) combined
                GROUP BY uid
            ) active_creators
            JOIN public.employee e ON active_creators.uid = e.\"userId\"
            ORDER BY e.\"firstName\" ASC, e.\"lastName\" ASC
        ");
        $creatorsStmt->execute([':branch' => $userBranch]);
        $creatorsRows = $creatorsStmt->fetchAll(PDO::FETCH_ASSOC);

        $creators = array_map(function($c) {
            $fullName = trim(($c['firstName'] ?? '') . ' ' . ($c['lastName'] ?? ''));
            return [
                'userId' => (string)$c['user_id'],
                'name' => $fullName ?: ($c['email'] ?? 'Employee'),
                'email' => $c['email'] ?? '',
                'has_loans' => (bool)($c['has_loans'] ?? true),
                'has_sales' => (bool)($c['has_sales'] ?? false),
            ];
        }, $creatorsRows);

        // Query parameters
        $queryParams = $request->getQueryParams();
        $selectedEmployee = trim($queryParams['employee_id'] ?? $queryParams['created_by'] ?? '');
        $selectedPipeline = strtolower(trim($queryParams['pipeline'] ?? 'all'));
        $selectedStatus = trim($queryParams['status'] ?? 'All');
        $searchTerm = trim($queryParams['search'] ?? '');

        $empFilter = "";
        $baseParams = [':branch' => $userBranch];

        if (!empty($selectedEmployee) && $selectedEmployee !== 'all') {
            $empFilter = " AND created_by = :emp_id";
            $baseParams[':emp_id'] = $selectedEmployee;
        }

        // Base leads tables based on pipeline
        if ($selectedPipeline === 'sales') {
            $leadsTable = "(SELECT id, name, phone, address, status, product_type as loan_type, branch, created_at, created_by, true as is_sale, 'Sales' as pipeline_name FROM public.sale_leads WHERE branch = :branch $empFilter)";
        } elseif ($selectedPipeline === 'loans') {
            $leadsTable = "(SELECT id, name, phone, address, status, loan_type, branch, created_at, created_by, false as is_sale, 'Loans' as pipeline_name FROM public.loan_leads WHERE branch = :branch $empFilter)";
        } else {
            $leadsTable = "(
                SELECT id, name, phone, address, status, loan_type, branch, created_at, created_by, false as is_sale, 'Loans' as pipeline_name FROM public.loan_leads WHERE branch = :branch $empFilter
                UNION ALL
                SELECT id, name, phone, address, status, product_type as loan_type, branch, created_at, created_by, true as is_sale, 'Sales' as pipeline_name FROM public.sale_leads WHERE branch = :branch $empFilter
            )";
        }

        // Calculate status and pipeline counts for this branch (respecting employee filter)
        $countsStmt = $conn->prepare("
            SELECT
                COUNT(*) as total,
                COALESCE(SUM(CASE WHEN is_sale = false THEN 1 ELSE 0 END), 0) as count_loans,
                COALESCE(SUM(CASE WHEN is_sale = true THEN 1 ELSE 0 END), 0) as count_sales,
                COALESCE(SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END), 0) as count_new,
                COALESCE(SUM(CASE WHEN status IN ('Follow Up', 'Contacted', 'Active', 'In Progress') THEN 1 ELSE 0 END), 0) as count_follow_up,
                COALESCE(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as count_converted,
                COALESCE(SUM(CASE WHEN status = 'Not Interested' THEN 1 ELSE 0 END), 0) as count_not_interested
            FROM $leadsTable l
        ");
        $countsStmt->execute($baseParams);
        $countsRow = $countsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $counts = [
            'All' => (int)($countsRow['total'] ?? 0),
            'New' => (int)($countsRow['count_new'] ?? 0),
            'Follow Up' => (int)($countsRow['count_follow_up'] ?? 0),
            'Converted' => (int)($countsRow['count_converted'] ?? 0),
            'Not Interested' => (int)($countsRow['count_not_interested'] ?? 0),
            'loans' => (int)($countsRow['count_loans'] ?? 0),
            'sales' => (int)($countsRow['count_sales'] ?? 0),
        ];

        // Construct main leads query with status and search filters
        $queryParamsList = $baseParams;
        $whereClauses = [];

        if (!empty($selectedStatus) && $selectedStatus !== 'All') {
            if ($selectedStatus === 'Follow Up') {
                $whereClauses[] = "l.status IN ('Follow Up', 'Contacted', 'Active', 'In Progress')";
            } else {
                $whereClauses[] = "l.status = :status_filter";
                $queryParamsList[':status_filter'] = $selectedStatus;
            }
        }

        if (!empty($searchTerm)) {
            $whereClauses[] = "(
                l.name ILIKE :search
                OR l.phone ILIKE :search
                OR l.address ILIKE :search
                OR l.loan_type ILIKE :search
                OR e.\"firstName\" ILIKE :search
                OR e.\"lastName\" ILIKE :search
                OR CONCAT(e.\"firstName\", ' ', e.\"lastName\") ILIKE :search
            )";
            $queryParamsList[':search'] = '%' . $searchTerm . '%';
        }

        $extraWhere = !empty($whereClauses) ? " WHERE " . implode(" AND ", $whereClauses) : "";

        $leadsStmt = $conn->prepare("
            SELECT
                l.id,
                l.name,
                l.phone,
                l.address,
                l.loan_type,
                l.status,
                l.branch,
                l.created_at,
                l.created_by,
                l.is_sale,
                l.pipeline_name,
                TRIM(CONCAT(e.\"firstName\", ' ', e.\"lastName\")) as creator_name
            FROM $leadsTable l
            LEFT JOIN public.employee e ON l.created_by::uuid = e.\"userId\"
            $extraWhere
            ORDER BY l.created_at DESC
        ");
        $leadsStmt->execute($queryParamsList);
        $leads = $leadsStmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'success' => true,
            'branch' => [
                'id' => $userBranch,
                'name' => $userBranchName
            ],
            'creators' => $creators,
            'leads' => $leads,
            'counts' => $counts
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\PDOException $e) {
        error_log("Database error fetching branch operations leads: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while fetching leads']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error fetching branch operations leads: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching leads']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

