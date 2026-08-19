<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

$app->group('/api/sales', function (\Slim\Routing\RouteCollectorProxy $group) {

    // Get live Sales dashboard metrics and analytics
    $group->get('/dashboard', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            // Summary counts and financial metrics in a single aggregation query
            $stmt = $conn->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END), 0) AS total_leads_month,
                    COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN 1 ELSE 0 END), 0) AS total_leads_last_month,
                    COALESCE(SUM(CASE WHEN status IN ('New', 'Contacted', 'Proposal Sent', 'Negotiation') THEN 1 ELSE 0 END), 0) AS active_deals,
                    COALESCE(SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END), 0) AS won_deals,
                    COALESCE(SUM(CASE WHEN status != 'Lost' THEN deal_value ELSE 0 END), 0) AS pipeline_value,
                    COALESCE(SUM(CASE WHEN status = 'Won' THEN deal_value ELSE 0 END), 0) AS won_revenue
                FROM public.sales_leads
                WHERE created_by = :uid
            ");
            $stmt->execute([':uid' => $user->id]);
            $counts = $stmt->fetch(PDO::FETCH_ASSOC);

            $totalLeadsMonth = (int)($counts['total_leads_month'] ?? 0);
            $totalLeadsLastMonth = (int)($counts['total_leads_last_month'] ?? 0);
            $activeDeals = (int)($counts['active_deals'] ?? 0);
            $wonDeals = (int)($counts['won_deals'] ?? 0);
            $pipelineValue = (float)($counts['pipeline_value'] ?? 0);
            $wonRevenue = (float)($counts['won_revenue'] ?? 0);

            $percentChangeTotal = $totalLeadsLastMonth > 0
                ? round((($totalLeadsMonth - $totalLeadsLastMonth) / $totalLeadsLastMonth) * 100)
                : ($totalLeadsMonth > 0 ? 100 : 0);

            // Daily Trends (Last 7 Days)
            $stmt = $conn->prepare("
                WITH last_7_days AS (
                    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS d
                )
                SELECT
                    to_char(d, 'Dy') as name,
                    COALESCE(SUM(CASE WHEN status != 'Won' THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END), 0) as deals
                FROM last_7_days
                LEFT JOIN public.sales_leads ON date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = d AND created_by = :uid
                GROUP BY d
                ORDER BY d ASC;
            ");
            $stmt->execute([':uid' => $user->id]);
            $dailyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Monthly Trends (Last 6 Months)
            $stmt = $conn->prepare("
                WITH last_6_months AS (
                    SELECT generate_series(date_trunc('month', CURRENT_DATE) - INTERVAL '5 months', date_trunc('month', CURRENT_DATE), '1 month'::interval)::date AS m
                )
                SELECT
                    to_char(m, 'Mon') as name,
                    COALESCE(SUM(deal_value), 0) as revenue,
                    COALESCE(COUNT(id), 0) as leads,
                    COALESCE(SUM(CASE WHEN status = 'Won' THEN 1 ELSE 0 END), 0) as won
                FROM last_6_months
                LEFT JOIN public.sales_leads ON date_trunc('month', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = m AND created_by = :uid
                GROUP BY m
                ORDER BY m ASC;
            ");
            $stmt->execute([':uid' => $user->id]);
            $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Deal Stage Distribution
            $stmt = $conn->prepare("
                SELECT status, COUNT(*) as count, COALESCE(SUM(deal_value), 0) as value
                FROM public.sales_leads
                WHERE created_by = :uid
                GROUP BY status
            ");
            $stmt->execute([':uid' => $user->id]);
            $stageRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stageBreakdown = [
                'New' => ['count' => 0, 'value' => 0],
                'Contacted' => ['count' => 0, 'value' => 0],
                'Proposal Sent' => ['count' => 0, 'value' => 0],
                'Negotiation' => ['count' => 0, 'value' => 0],
                'Won' => ['count' => 0, 'value' => 0],
                'Lost' => ['count' => 0, 'value' => 0]
            ];
            foreach ($stageRows as $row) {
                $st = $row['status'] ?? 'New';
                if (isset($stageBreakdown[$st])) {
                    $stageBreakdown[$st] = [
                        'count' => (int)$row['count'],
                        'value' => (float)$row['value']
                    ];
                }
            }

            // Recent 5 Sales Leads
            $stmt = $conn->prepare("
                SELECT id, lead_number, name, company_name, phone, email, product_interest, deal_value, status, created_at
                FROM public.sales_leads
                WHERE created_by = :uid
                ORDER BY created_at DESC
                LIMIT 5
            ");
            $stmt->execute([':uid' => $user->id]);
            $recentLeads = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'stats' => [
                    'total_leads_month' => $totalLeadsMonth,
                    'percent_change_total' => $percentChangeTotal,
                    'active_deals' => $activeDeals,
                    'won_deals' => $wonDeals,
                    'pipeline_value' => $pipelineValue,
                    'won_revenue' => $wonRevenue,
                ],
                'dailyData' => array_map(function($row) {
                    return [
                        'name' => $row['name'],
                        'leads' => (int)$row['leads'],
                        'deals' => (int)$row['deals']
                    ];
                }, $dailyData),
                'monthlyData' => array_map(function($row) {
                    return [
                        'name' => $row['name'],
                        'revenue' => (float)$row['revenue'],
                        'leads' => (int)$row['leads'],
                        'won' => (int)$row['won']
                    ];
                }, $monthlyData),
                'stageBreakdown' => $stageBreakdown,
                'recentLeads' => $recentLeads
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\PDOException $e) {
            error_log("Database error fetching sales dashboard data: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while fetching sales dashboard data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error fetching sales dashboard data: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching sales dashboard data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

})->add(new \App\Middleware\AuthMiddleware());
