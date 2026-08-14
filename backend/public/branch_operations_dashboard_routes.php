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

        // Fetch distinct creators in this branch for the employee filter dropdown
        $creatorsStmt = $conn->prepare("
            SELECT DISTINCT 
                e.\"userId\" as user_id, 
                e.\"firstName\", 
                e.\"lastName\", 
                e.email
            FROM (
                SELECT created_by::uuid as uid FROM public.loan_leads WHERE branch = :branch AND created_by IS NOT NULL
                UNION
                SELECT created_by::uuid as uid FROM public.loan_applications WHERE branch = :branch AND created_by IS NOT NULL
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
                'email' => $c['email'] ?? ''
            ];
        }, $creatorsRows);

        // Optional filter by employee creator
        $queryParams = $request->getQueryParams();
        $selectedEmployee = trim($queryParams['employee_id'] ?? $queryParams['created_by'] ?? '');

        $empFilter = "";
        $params = [':branch' => $userBranch];

        if (!empty($selectedEmployee) && $selectedEmployee !== 'all') {
            $empFilter = " AND created_by = :emp_id";
            $params[':emp_id'] = $selectedEmployee;
        }

        // 1. Total Leads This Month
        $stmt = $conn->prepare("
            SELECT COUNT(*) as total 
            FROM public.loan_leads 
            WHERE branch = :branch
            AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
            $empFilter
        ");
        $stmt->execute($params);
        $totalLeadsMonth = $stmt->fetchColumn() ?: 0;

        // 2. Active Opportunities
        $stmt = $conn->prepare("
            SELECT COUNT(*) as active 
            FROM public.loan_leads 
            WHERE branch = :branch
            AND status IN ('New', 'Active', 'In Progress')
            $empFilter
        ");
        $stmt->execute($params);
        $activeOpportunities = $stmt->fetchColumn() ?: 0;

        // 3. Converted Leads (Members)
        $stmt = $conn->prepare("
            SELECT COUNT(*) as converted 
            FROM public.loan_leads 
            WHERE branch = :branch
            AND status = 'Converted'
            $empFilter
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
            LEFT JOIN public.loan_leads l ON date(l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = d 
                AND l.branch = :branch $empFilter
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
            LEFT JOIN public.loan_leads l ON date_trunc('month', l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = m 
                AND l.branch = :branch $empFilter
            GROUP BY m
            ORDER BY m ASC;
        ");
        $stmt->execute($params);
        $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 6. Last Month comparison for Percent Change
        $stmtLastMonth = $conn->prepare("
            SELECT COUNT(*) as total 
            FROM public.loan_leads 
            WHERE branch = :branch
            AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
            $empFilter
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
                TRIM(CONCAT(e.\"firstName\", ' ', e.\"lastName\")) as creator_name
            FROM public.loan_leads l
            LEFT JOIN public.employee e ON l.created_by::uuid = e.\"userId\"
            WHERE l.branch = :branch $empFilter
            ORDER BY l.created_at DESC
            LIMIT 10
        ");
        $recentLeadsStmt->execute($params);
        $recentLeads = $recentLeadsStmt->fetchAll(PDO::FETCH_ASSOC);

        // 8. Recent 10 Loan Applications
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

        foreach ($recentApps as &$app) {
            if (isset($app['form_data']) && is_string($app['form_data'])) {
                $app['form_data'] = json_decode($app['form_data'], true);
            }
            if (function_exists('getBranchLoanDocumentsFromTable')) {
                $appDocs = getBranchLoanDocumentsFromTable($conn, $app['application_id'] ?? null, $app['id'] ?? null, $app['lead_id'] ?? null);
                if (is_array($app['form_data'])) {
                    $app['form_data']['documents'] = $appDocs;
                }
                $app['documents'] = $appDocs;
            }
        }

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
