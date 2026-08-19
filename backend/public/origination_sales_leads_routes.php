<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

$app->group('/api/sales', function (\Slim\Routing\RouteCollectorProxy $group) {

    // List sales leads with optional search and filter
    $getLeadsHandler = function (Request $request, Response $response, $args) {
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
                SELECT id, name, phone, address, status, product_type, branch, created_at, created_by
                FROM public.sale_leads
                WHERE created_by = :uid
            ";
            $bindings = [':uid' => $user->id];

            if ($status && $status !== 'all' && $status !== 'All') {
                $sql .= " AND status = :status";
                $bindings[':status'] = $status;
            }

            if ($search !== '') {
                $sql .= " AND (name ILIKE :search OR phone ILIKE :search OR address ILIKE :search OR product_type ILIKE :search)";
                $bindings[':search'] = '%' . $search . '%';
            }

            $sql .= " ORDER BY created_at DESC";

            $stmt = $conn->prepare($sql);
            $stmt->execute($bindings);
            $leads = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'success' => true,
                'data' => $leads,
                'leads' => $leads
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\Exception $e) {
            error_log("Error fetching sales leads: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Failed to fetch sales leads']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    };

    $group->get('/leads', $getLeadsHandler);
    $group->get('/leads/list', $getLeadsHandler);

    // Create a new sales lead (name, phone, address)
    $group->post('/leads', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $data = $request->getParsedBody() ?? json_decode($request->getBody()->getContents(), true) ?? [];

        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');
        $address = trim($data['address'] ?? '');
        $status = trim($data['status'] ?? 'New');
        $productType = isset($data['product_type']) && !empty(trim($data['product_type'])) ? trim($data['product_type']) : null;
        $branch = trim($data['branch'] ?? ($user->branch ?? ''));

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

            // Resolve branch from employee record if missing
            if (empty($branch)) {
                $branchStmt = $conn->prepare('SELECT branch FROM public.employee WHERE "userId" = ? LIMIT 1');
                $branchStmt->execute([$user->id]);
                $emp = $branchStmt->fetch(PDO::FETCH_ASSOC);
                $branch = $emp['branch'] ?? 'Main Branch';
            }

            $stmt = $conn->prepare("
                INSERT INTO public.sale_leads (
                    name, phone, address, status, product_type, branch, created_by
                ) VALUES (
                    :name, :phone, :address, :status, :product_type, :branch, :created_by
                ) RETURNING *
            ");

            $stmt->execute([
                ':name' => $name,
                ':phone' => $phone,
                ':address' => $address,
                ':status' => $status,
                ':product_type' => $productType,
                ':branch' => $branch,
                ':created_by' => $user->id
            ]);

            $newLead = $stmt->fetch(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Sales lead added successfully',
                'data' => $newLead,
                'lead' => $newLead
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (\Exception $e) {
            error_log("Error creating sales lead: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Failed to create sales lead: ' . $e->getMessage()]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // Update sales lead status & product_type
    $group->put('/leads/{id}/status', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $id = $args['id'];
        $data = $request->getParsedBody() ?? json_decode($request->getBody()->getContents(), true) ?? [];

        $status = trim($data['status'] ?? '');
        $productType = trim($data['product_type'] ?? '');

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

            if (!empty($productType)) {
                $stmt = $conn->prepare("UPDATE public.sale_leads SET status = :status, product_type = :product_type WHERE id = :id AND created_by = :uid RETURNING *");
                $stmt->execute([
                    ':status' => $status,
                    ':product_type' => $productType,
                    ':id' => $id,
                    ':uid' => $user->id
                ]);
            } else {
                $stmt = $conn->prepare("UPDATE public.sale_leads SET status = :status WHERE id = :id AND created_by = :uid RETURNING *");
                $stmt->execute([
                    ':status' => $status,
                    ':id' => $id,
                    ':uid' => $user->id
                ]);
            }

            $updatedLead = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$updatedLead) {
                $response->getBody()->write(json_encode(['error' => 'Sales lead not found or unauthorized']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Sales lead updated successfully',
                'data' => $updatedLead,
                'lead' => $updatedLead
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\Exception $e) {
            error_log("Error updating sales lead status: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Failed to update sales lead status']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

})->add(new \App\Middleware\AuthMiddleware());
