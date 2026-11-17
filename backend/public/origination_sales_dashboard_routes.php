<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

// Sales Origination Dashboard Route Group
$app->group('/api/sales', function (\Slim\Routing\RouteCollectorProxy $group) {

    // Get dashboard stats
    $group->get('/dashboard', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            // Single query with conditional aggregation for high performance
            $stmt = $conn->prepare("
                SELECT
                    COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END), 0) AS total_leads_month,
                    COALESCE(SUM(CASE WHEN date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month') THEN 1 ELSE 0 END), 0) AS total_leads_last_month,
                    COALESCE(SUM(CASE WHEN status IN ('New', 'Active', 'In Progress', 'Contacted', 'Proposal Sent', 'Negotiation') THEN 1 ELSE 0 END), 0) AS active_opportunities,
                    COALESCE(SUM(CASE WHEN status IN ('Converted', 'Won') THEN 1 ELSE 0 END), 0) AS converted_leads
                FROM public.sale_leads
                WHERE created_by = :uid
            ");
            $stmt->execute([':uid' => $user->id]);
            $counts = $stmt->fetch(PDO::FETCH_ASSOC);

            $totalLeadsMonth = $counts['total_leads_month'] ?? 0;
            $totalLeadsLastMonth = $counts['total_leads_last_month'] ?? 0;
            $activeOpportunities = $counts['active_opportunities'] ?? 0;
            $convertedLeads = $counts['converted_leads'] ?? 0;

            // Daily Trends (Last 7 Days)
            $stmt = $conn->prepare("
                WITH last_7_days AS (
                    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS d
                )
                SELECT
                    to_char(d, 'Dy') as name,
                    COALESCE(SUM(CASE WHEN status NOT IN ('Converted', 'Won') THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status IN ('Converted', 'Won') THEN 1 ELSE 0 END), 0) as converted
                FROM last_7_days
                LEFT JOIN public.sale_leads ON date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = d AND created_by = :uid
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
                    COALESCE(SUM(CASE WHEN status NOT IN ('Converted', 'Won') THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status IN ('Converted', 'Won') THEN 1 ELSE 0 END), 0) as converted
                FROM last_6_months
                LEFT JOIN public.sale_leads ON date_trunc('month', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = m AND created_by = :uid
                GROUP BY m
                ORDER BY m ASC;
            ");
            $stmt->execute([':uid' => $user->id]);
            $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $percentChangeTotal = $totalLeadsLastMonth > 0
                ? round((($totalLeadsMonth - $totalLeadsLastMonth) / $totalLeadsLastMonth) * 100)
                : ($totalLeadsMonth > 0 ? 100 : 0);

            $response->getBody()->write(json_encode([
                'stats' => [
                    'total_leads_month' => (int)$totalLeadsMonth,
                    'percent_change_total' => $percentChangeTotal,
                    'active_opportunities' => (int)$activeOpportunities,
                    'percent_change_active' => 5,
                    'converted_leads' => (int)$convertedLeads,
                    'percent_change_converted' => 12
                ],
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
            error_log("Database error fetching sales dashboard data: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while fetching sales dashboard data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error fetching sales dashboard data: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching sales dashboard data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

})->add(new \App\Middleware\AuthMiddleware(['admin'], 'salesOrigination'));
