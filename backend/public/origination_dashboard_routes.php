<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

// Protect these routes with AuthMiddleware if needed
$app->group('/api/leads', function (\Slim\Routing\RouteCollectorProxy $group) {
    
    // Create a new lead
    $group->post('', function (Request $request, Response $response, $args) {
        $data = $request->getParsedBody();
        $user = $request->getAttribute('user');
        
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $address = trim($data['address'] ?? '');

        if (empty($name) || empty($phone) || empty($address)) {
            $response->getBody()->write(json_encode(['error' => 'Name, Phone, and Address are Required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();
            
            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $stmt = $conn->prepare('
                INSERT INTO public.loan_leads (name, phone, address, status, created_by)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id, name, phone, address, status, created_at
            ');
            
            $stmt->execute([$name, $phone, $address, 'New', $user->id]);
            $lead = $stmt->fetch(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'message' => 'Lead added successfully',
                'lead' => $lead
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
            
        } catch (\PDOException $e) {
            error_log("Database error creating lead: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while saving lead']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error creating lead: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while saving the lead']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // Get dashboard stats
    $group->get('/dashboard', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        try {
            $db = new Database();
            $conn = $db->getConnection();
            
            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $stmt = $conn->prepare("
                SELECT COUNT(*) as total 
                FROM public.loan_leads 
                WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)
                AND created_by = :uid
            ");
            $stmt->execute([':uid' => $user->id]);
            $totalLeadsMonth = $stmt->fetchColumn() ?: 0;

            $stmt = $conn->prepare("
                SELECT COUNT(*) as active 
                FROM public.loan_leads 
                WHERE status IN ('New', 'Active', 'In Progress')
                AND created_by = :uid
            ");
            $stmt->execute([':uid' => $user->id]);
            $activeOpportunities = $stmt->fetchColumn() ?: 0;

            $stmt = $conn->prepare("
                SELECT COUNT(*) as converted 
                FROM public.loan_leads 
                WHERE status = 'Converted'
                AND created_by = :uid
            ");
            $stmt->execute([':uid' => $user->id]);
            $convertedLeads = $stmt->fetchColumn() ?: 0;

            // Daily Trends (Last 7 Days)
            $stmt = $conn->prepare("
                WITH last_7_days AS (
                    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date AS d
                )
                SELECT 
                    to_char(d, 'Dy') as name,
                    COALESCE(SUM(CASE WHEN status != 'Converted' THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as converted
                FROM last_7_days
                LEFT JOIN public.loan_leads ON date(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = d AND created_by = :uid
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
                    COALESCE(SUM(CASE WHEN status != 'Converted' THEN 1 ELSE 0 END), 0) as leads,
                    COALESCE(SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END), 0) as converted
                FROM last_6_months
                LEFT JOIN public.loan_leads ON date_trunc('month', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = m AND created_by = :uid
                GROUP BY m
                ORDER BY m ASC;
            ");
            $stmt->execute([':uid' => $user->id]);
            $monthlyData = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmtLastMonth = $conn->prepare("
                SELECT COUNT(*) as total 
                FROM public.loan_leads 
                WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
                AND created_by = :uid
            ");
            $stmtLastMonth->execute([':uid' => $user->id]);
            $totalLeadsLastMonth = $stmtLastMonth->fetchColumn() ?: 0;
            $percentChangeTotal = $totalLeadsLastMonth > 0 
                ? round((($totalLeadsMonth - $totalLeadsLastMonth) / $totalLeadsLastMonth) * 100) 
                : ($totalLeadsMonth > 0 ? 100 : 0);

            $response->getBody()->write(json_encode([
                'stats' => [
                    'total_leads_month' => (int)$totalLeadsMonth,
                    'percent_change_total' => $percentChangeTotal,
                    'active_opportunities' => (int)$activeOpportunities,
                    'percent_change_active' => 5, // static for now
                    'converted_leads' => (int)$convertedLeads,
                    'percent_change_converted' => 12 // static for now
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
            error_log("Database error fetching dashboard data: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while fetching dashboard data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error fetching dashboard data: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching dashboard data']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

})->add(new \App\Middleware\AuthMiddleware()); // Use the existing AuthMiddleware for security
