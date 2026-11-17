<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Security\OriginationAccess;

/**
 * Endpoints for Loan Origination Members
 * Members are borrowers converted from leads (status = 'Converted')
 */

// GET /api/members - List all members (grouped by phone)
$app->get('/api/members', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $queryParams = $request->getQueryParams();
    $search = trim($queryParams['search'] ?? '');

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        // SEC-018: The feature gate is not an object-scoped authorization
        // gate. Both creator and *current* employee branch must match.
        $userId = OriginationAccess::userId($user);
        $userBranch = $userId ? OriginationAccess::branch($conn, $userId) : null;
        if (!$userId || (!OriginationAccess::isAdmin($user) && !$userBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        [$memberScope, $memberArgs] = OriginationAccess::loanScope($user, $userBranch);

        $sql = "
            SELECT id, name, phone, address, loan_type, status, branch, created_at, created_by
            FROM public.loan_leads
            WHERE status = 'Converted'
        " . $memberScope;
        $params = $memberArgs;

        if (!empty($search)) {
            // Positional parameters work with real PostgreSQL native prepares.
            $sql .= " AND (name ILIKE ? OR phone ILIKE ? OR address ILIKE ?)";
            $term = '%' . $search . '%';
            array_push($params, $term, $term, $term);
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by phone number into unified member profiles
        $membersMap = [];
        foreach ($leads as $lead) {
            $phone = $lead['phone'];
            if (!isset($membersMap[$phone])) {
                $membersMap[$phone] = [
                    'id' => $phone,
                    'lead_id' => $lead['id'],
                    'name' => $lead['name'],
                    'phone' => $phone,
                    'address' => $lead['address'],
                    'branch' => $lead['branch'] ?? null,
                    'status' => 'Converted',
                    'created_at' => $lead['created_at'],
                    'loans' => []
                ];
            }
            $membersMap[$phone]['loans'][] = [
                'id' => $lead['id'],
                'lead_id' => $lead['id'],
                'loan_type' => $lead['loan_type'],
                'created_at' => $lead['created_at'],
                'branch' => $lead['branch'] ?? null
            ];
        }

        $members = array_values($membersMap);

        $response->getBody()->write(json_encode([
            'success' => true,
            'members' => $members
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error fetching members: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to fetch members']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], ['loanOrigination', 'salesOrigination']));

// GET /api/members/{phone} - Get member details by phone
$app->get('/api/members/{phone}', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $phone = trim($args['phone']);

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        // SEC-018: The feature gate is not an object-scoped authorization
        // gate. Both creator and *current* employee branch must match.
        $userId = OriginationAccess::userId($user);
        $userBranch = $userId ? OriginationAccess::branch($conn, $userId) : null;
        if (!$userId || (!OriginationAccess::isAdmin($user) && !$userBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        [$memberScope, $memberArgs] = OriginationAccess::loanScope($user, $userBranch);

        $stmt = $conn->prepare("
            SELECT id, name, phone, address, loan_type, status, branch, created_at, created_by
            FROM public.loan_leads
            WHERE phone = ? AND status = 'Converted'
            " . $memberScope . "
            ORDER BY created_at DESC
        ");
        $stmt->execute(array_merge([$phone], $memberArgs));
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($leads)) {
            $response->getBody()->write(json_encode(['error' => 'Member not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $first = $leads[0];
        $member = [
            'id' => $phone,
            'lead_id' => $first['id'],
            'name' => $first['name'],
            'phone' => $phone,
            'address' => $first['address'],
            'branch' => $first['branch'] ?? null,
            'status' => 'Converted',
            'created_at' => $first['created_at'],
            'loans' => []
        ];

        $leadIds = [];
        foreach ($leads as $l) {
            $leadIds[] = (string)$l['id'];
            $member['loans'][] = [
                'id' => $l['id'],
                'lead_id' => $l['id'],
                'loan_type' => $l['loan_type'],
                'created_at' => $l['created_at'],
                'branch' => $l['branch'] ?? null
            ];
        }

        // Fetch applications for these leads
        if (!empty($leadIds)) {
            $placeholders = implode(',', array_fill(0, count($leadIds), '?'));
            $appStmt = $conn->prepare("
                SELECT id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
                FROM public.loan_applications
                WHERE lead_id IN ($placeholders)
                " . $memberScope . "
                ORDER BY created_at DESC
            ");
            // Each linked application must independently pass the member's
            // creator AND branch restrictions, even for a shared legacy lead.
            $appStmt->execute(array_merge($leadIds, $memberArgs));
            $apps = $appStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($apps as &$app) {
                if (isset($app['form_data']) && is_string($app['form_data'])) {
                    $app['form_data'] = json_decode($app['form_data'], true);
                }
                if (isset($app['signatures']) && is_string($app['signatures'])) {
                    $app['signatures'] = json_decode($app['signatures'], true);
                }
            }
            $member['applications'] = $apps;
        } else {
            $member['applications'] = [];
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'member' => $member
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error fetching member details: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to fetch member details']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], ['loanOrigination', 'salesOrigination']));
