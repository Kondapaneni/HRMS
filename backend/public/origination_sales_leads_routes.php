<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

$app->group('/api/sales', function (\Slim\Routing\RouteCollectorProxy $group) {

    // List sales leads with optional search and filter
    $group->get('/leads', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $params = $request->getQueryParams();
        $search = trim($params['search'] ?? '');
        $status = trim($params['status'] ?? '');

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $sql = "
                SELECT id, lead_number, name, company_name, phone, email, product_interest, deal_value, status, notes, branch, created_at, updated_at
                FROM public.sales_leads
                WHERE created_by = :uid
            ";
            $bindings = [':uid' => $user->id];

            if ($status && $status !== 'all') {
                $sql .= " AND status = :status";
                $bindings[':status'] = $status;
            }

            if ($search !== '') {
                $sql .= " AND (name ILIKE :search OR company_name ILIKE :search OR phone ILIKE :search OR email ILIKE :search OR product_interest ILIKE :search OR lead_number ILIKE :search)";
                $bindings[':search'] = '%' . $search . '%';
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $conn->prepare($sql);
            $stmt->execute($bindings);
            $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $leads
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\Exception $e) {
            error_log("Error fetching sales leads: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Failed to fetch sales leads']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // Create a new sales lead
    $group->post('/leads', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $data = $request->getParsedBody() ?? json_decode($request->getBody()->getContents(), true) ?? [];

        $name = trim($data['name'] ?? '');
        $companyName = trim($data['company_name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $email = trim($data['email'] ?? '');
        $productInterest = trim($data['product_interest'] ?? 'Enterprise Suite');
        $dealValue = (float)($data['deal_value'] ?? 0);
        $status = trim($data['status'] ?? 'New');
        $notes = trim($data['notes'] ?? '');
        $branch = trim($data['branch'] ?? ($user->branch ?? ''));

        if (empty($name)) {
            $response->getBody()->write(json_encode(['error' => 'Client / Contact Name is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }
        if (empty($phone)) {
            $response->getBody()->write(json_encode(['error' => 'Phone number is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $leadNumber = 'SL-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

            $stmt = $conn->prepare("
                INSERT INTO public.sales_leads (
                    lead_number, name, company_name, phone, email, product_interest, deal_value, status, notes, branch, created_by
                ) VALUES (
                    :lead_number, :name, :company_name, :phone, :email, :product_interest, :deal_value, :status, :notes, :branch, :created_by
                ) RETURNING *
            ");

            $stmt->execute([
                ':lead_number' => $leadNumber,
                ':name' => $name,
                ':company_name' => $companyName,
                ':phone' => $phone,
                ':email' => $email,
                ':product_interest' => $productInterest,
                ':deal_value' => $dealValue,
                ':status' => $status,
                ':notes' => $notes,
                ':branch' => $branch,
                ':created_by' => $user->id
            ]);

            $newLead = $stmt->fetch(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Sales lead originated successfully',
                'data' => $newLead
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (\Exception $e) {
            error_log("Error creating sales lead: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Failed to create sales lead: ' . $e->getMessage()]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // Update sales lead status / deal stage
    $group->put('/leads/{id}/status', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $id = $args['id'];
        $data = $request->getParsedBody() ?? json_decode($request->getBody()->getContents(), true) ?? [];

        $status = trim($data['status'] ?? '');
        $dealValue = isset($data['deal_value']) ? (float)$data['deal_value'] : null;

        if (empty($status)) {
            $response->getBody()->write(json_encode(['error' => 'Status is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            if ($dealValue !== null) {
                $stmt = $conn->prepare("
                    UPDATE public.sales_leads
                    SET status = :status, deal_value = :deal_value, updated_at = timezone('utc'::text, now())
                    WHERE id = :id AND created_by = :uid
                    RETURNING *
                ");
                $stmt->execute([':status' => $status, ':deal_value' => $dealValue, ':id' => $id, ':uid' => $user->id]);
            } else {
                $stmt = $conn->prepare("
                    UPDATE public.sales_leads
                    SET status = :status, updated_at = timezone('utc'::text, now())
                    WHERE id = :id AND created_by = :uid
                    RETURNING *
                ");
                $stmt->execute([':status' => $status, ':id' => $id, ':uid' => $user->id]);
            }

            $updatedLead = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$updatedLead) {
                $response->getBody()->write(json_encode(['error' => 'Sales lead not found or unauthorized']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Sales lead updated successfully',
                'data' => $updatedLead
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\Exception $e) {
            error_log("Error updating sales lead status: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Failed to update sales lead status']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

})->add(new \App\Middleware\AuthMiddleware());
