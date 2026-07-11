<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/holidays - Get all holidays or filter by month
/** @var \Slim\App $app */
$app->get('/api/admin/holidays', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $month = $params['month'] ?? ''; // e.g. '2026-05'

    try {
        $sql = 'SELECT "id", "holidayDate", "holidayName", "holidayImage", "isActive" FROM company_holidays WHERE "isActive" = 1';
        $bindings = [];

        if ($month) {
            $startDate = $month . '-01';
            $endDate = date('Y-m-d', strtotime($startDate . ' +1 month'));
            $sql .= ' AND "holidayDate" >= ? AND "holidayDate" < ?';
            $bindings[] = $startDate;
            $bindings[] = $endDate;
        }

        $sql .= ' ORDER BY "holidayDate" ASC';

        $stmt = $conn->prepare($sql);
        $stmt->execute($bindings);
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode($holidays));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// POST /api/admin/holidays - Add or Update a holiday
$app->post('/api/admin/holidays', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $data = json_decode($request->getBody()->getContents(), true);

    $date = $data['date'] ?? '';
    $name = $data['name'] ?? '';
    $image = $data['image'] ?? null;

    if (!$date || !$name) {
        $response->getBody()->write(json_encode(['error' => 'Date and Name are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        // Check if holiday already exists
        $stmt = $conn->prepare('SELECT "id" FROM company_holidays WHERE "holidayDate" = ? LIMIT 1');
        $stmt->execute([$date]);
        $existing = $stmt->fetchColumn();

        if ($existing) {
            // Update
            $updateSql = 'UPDATE company_holidays SET "holidayName" = ?, "isActive" = 1';
            $updateBindings = [$name];
            
            if ($image !== null) {
                $updateSql .= ', "holidayImage" = ?';
                $updateBindings[] = $image;
            }
            
            $updateSql .= ' WHERE "id" = ?';
            $updateBindings[] = $existing;
            
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->execute($updateBindings);
        } else {
            // Insert
            $insertStmt = $conn->prepare('INSERT INTO company_holidays ("id", "holidayDate", "holidayName", "holidayImage", "isActive") VALUES (gen_random_uuid(), ?, ?, ?, 1)');
            $insertStmt->execute([$date, $name, $image]);
        }

        \App\Config\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Holiday saved successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// DELETE /api/admin/holidays/{date}
$app->delete('/api/admin/holidays/{date}', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $date = $args['date'];

    try {
        $stmt = $conn->prepare('UPDATE company_holidays SET "isActive" = 0 WHERE "holidayDate" = ?');
        $stmt->execute([$date]);

        \App\Config\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Holiday removed successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// GET /api/admin/holidays/archived
$app->get('/api/admin/holidays/archived', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('SELECT "id", "holidayDate", "holidayName", "holidayImage", "isActive" FROM company_holidays WHERE "isActive" = 0 ORDER BY "holidayDate" DESC');
        $stmt->execute();
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode($holidays));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// PUT /api/admin/holidays/{date}/restore
$app->put('/api/admin/holidays/{date}/restore', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $date = $args['date'];

    try {
        $stmt = $conn->prepare('UPDATE company_holidays SET "isActive" = 1 WHERE "holidayDate" = ?');
        $stmt->execute([$date]);

        \App\Config\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Holiday restored successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

