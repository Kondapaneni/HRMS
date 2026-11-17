<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

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

        $userId = null;
        $userRole = 'employee';
        if (is_object($user)) {
            $userId = isset($user->id) ? (string)$user->id : null;
            $userRole = $user->role ?? 'employee';
        } elseif (is_array($user)) {
            $userId = isset($user['id']) ? (string)$user['id'] : null;
            $userRole = $user['role'] ?? 'employee';
        }

        $sql = "
            SELECT id, name, phone, address, loan_type, status, branch, created_at, created_by
            FROM public.loan_leads
            WHERE status = 'Converted'
            AND (created_by = :uid OR :role = 'admin')
        ";
        $params = [
            ':uid' => $userId,
            ':role' => $userRole
        ];

        if (!empty($search)) {
            $sql .= " AND (name ILIKE :search OR phone ILIKE :search OR address ILIKE :search)";
            $params[':search'] = '%' . $search . '%';
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
        $response->getBody()->write(json_encode(['error' => 'Error fetching members: ' . $e->getMessage()]));
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

        $userId = null;
        $userRole = 'employee';
        if (is_object($user)) {
            $userId = isset($user->id) ? (string)$user->id : null;
            $userRole = $user->role ?? 'employee';
        } elseif (is_array($user)) {
            $userId = isset($user['id']) ? (string)$user['id'] : null;
            $userRole = $user['role'] ?? 'employee';
        }

        $stmt = $conn->prepare("
            SELECT id, name, phone, address, loan_type, status, branch, created_at, created_by
            FROM public.loan_leads
            WHERE phone = ? AND status = 'Converted'
            AND (created_by = ? OR ? = 'admin')
            ORDER BY created_at DESC
        ");
        $stmt->execute([$phone, $userId, $userRole]);
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
                ORDER BY created_at DESC
            ");
            $appStmt->execute($leadIds);
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
        $response->getBody()->write(json_encode(['error' => 'Error fetching member details: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], ['loanOrigination', 'salesOrigination']));
