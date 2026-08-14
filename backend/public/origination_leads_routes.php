<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

// Protect these routes with AuthMiddleware if needed
$app->post('/api/leads', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $user = $request->getAttribute('user');
    
    $name = trim($data['name'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? '');
    $loan_type = trim($data['loan_type'] ?? 'Personal Loan');

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

        // Resolve creator employee's branch
        $branchStmt = $conn->prepare('SELECT branch FROM public.employee WHERE "userId" = ? LIMIT 1');
        $branchStmt->execute([$user->id]);
        $emp = $branchStmt->fetch(PDO::FETCH_ASSOC);
        $userBranch = $emp['branch'] ?? null;

        $stmt = $conn->prepare('
            INSERT INTO public.loan_leads (name, phone, address, loan_type, status, branch, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, name, phone, address, loan_type, status, branch, created_at
        ');
        
        $stmt->execute([$name, $phone, $address, $loan_type, 'New', $userBranch, $user->id, date('Y-m-d H:i:s')]);
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
})->add(new \App\Middleware\AuthMiddleware());

$app->get('/api/leads/list', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $queryParams = $request->getQueryParams();
    $search = $queryParams['search'] ?? '';

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $sql = "
            SELECT id, name, phone, address, loan_type, status, branch, created_at
            FROM public.loan_leads
            WHERE created_by = :uid
        ";
        $params = [':uid' => $user->id];

        if (!empty($search)) {
            $sql .= " AND (name ILIKE :search OR phone ILIKE :search OR address ILIKE :search)";
            $params[':search'] = '%' . $search . '%';
        }

        $sql .= " ORDER BY created_at DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        
        $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode([
            'success' => true,
            'leads' => $leads
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        
    } catch (\PDOException $e) {
        error_log("Database error fetching leads: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while fetching leads']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error fetching leads: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching leads']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware());

$app->put('/api/leads/{id}/status', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $leadId = $args['id'];
    $data = $request->getParsedBody();
    $status = trim($data['status'] ?? '');

    if (empty($status)) {
        $response->getBody()->write(json_encode(['error' => 'Status is Required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        // Verify ownership (optional but good practice)
        $checkStmt = $conn->prepare('SELECT id FROM public.loan_leads WHERE id = ? AND created_by = ?');
        $checkStmt->execute([$leadId, $user->id]);
        if (!$checkStmt->fetch()) {
            $response->getBody()->write(json_encode(['error' => 'Lead not found or access denied']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $stmt = $conn->prepare('
            UPDATE public.loan_leads 
            SET status = ? 
            WHERE id = ?
        ');
        $stmt->execute([$status, $leadId]);

        $response->getBody()->write(json_encode([
            'message' => 'Status updated successfully'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        
    } catch (\PDOException $e) {
        error_log("Database error updating lead status: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while updating status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error updating lead status: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while updating status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware());
