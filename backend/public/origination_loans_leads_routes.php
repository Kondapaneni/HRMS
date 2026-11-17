<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Security\OriginationAccess;

// Protect these routes with AuthMiddleware if needed
$app->post('/api/leads', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $user = $request->getAttribute('user');
    
    $name = trim($data['name'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $address = trim($data['address'] ?? '');
    $loan_type = !empty($data['loan_type']) ? trim($data['loan_type']) : null;

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
        if (!OriginationAccess::isAdmin($user) && !$userBranch) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

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
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

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

        $userBranch = OriginationAccess::branch($conn, (string)$user->id);
        if (!OriginationAccess::isAdmin($user) && !$userBranch) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        $sql = "
            SELECT id, name, phone, address, loan_type, status, branch, created_at
            FROM public.loan_leads
            WHERE created_by = :uid
        ";
        $params = [':uid' => $user->id];
        if (!OriginationAccess::isAdmin($user)) {
            $sql .= " AND branch = :user_branch";
            $params[':user_branch'] = $userBranch;
        }

        if (!empty($search)) {
            // Native PostgreSQL cannot bind one repeated named placeholder.
            $sql .= " AND (name ILIKE :search_name OR phone ILIKE :search_phone OR address ILIKE :search_address OR loan_type ILIKE :search_loan_type)";
            foreach ([':search_name', ':search_phone', ':search_address', ':search_loan_type'] as $placeholder) {
                $params[$placeholder] = '%' . $search . '%';
            }
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
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

$app->put('/api/leads/{id}/status', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $leadId = $args['id'];
    $data = $request->getParsedBody();
    $status = trim($data['status'] ?? '');
    $loan_type = trim($data['loan_type'] ?? '');

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

        $userBranch = OriginationAccess::branch($conn, (string)$user->id);
        if (!OriginationAccess::isAdmin($user) && !$userBranch) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // The UPDATE itself repeats ownership and current branch restrictions.
        // A separate SELECT followed by an unscoped UPDATE would be vulnerable
        // to ownership/branch changes between those two statements.
        $scope = OriginationAccess::isAdmin($user) ? '' : ' AND branch = ?';
        $args = !empty($loan_type)
            ? [$status, $loan_type, $leadId, $user->id]
            : [$status, $leadId, $user->id];
        if (!OriginationAccess::isAdmin($user)) $args[] = $userBranch;
        $sql = !empty($loan_type)
            ? 'UPDATE public.loan_leads SET status = ?, loan_type = ? WHERE id = ? AND created_by = ?' . $scope
            : 'UPDATE public.loan_leads SET status = ? WHERE id = ? AND created_by = ?' . $scope;
        $stmt = $conn->prepare($sql);
        $stmt->execute($args);
        if ($stmt->rowCount() === 0) {
            $response->getBody()->write(json_encode(['error' => 'Lead not found or access denied']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

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
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));
