<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;


function holidayImageStorageUpload($file): string
{
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        throw new InvalidArgumentException('Choose an image smaller than 5 MB.');
    }
    $stream = $file->getStream();
    $contents = $stream->getContents();
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) throw new DomainException('Only JPEG, PNG, or WEBP images are allowed.');

    $baseUrl = rtrim((string)($_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: ''), '/');
    $serviceKey = (string)($_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
    if (!$baseUrl || !$serviceKey) throw new RuntimeException('Holiday image storage is not configured.');

    $filename = bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
    $url = $baseUrl . '/storage/v1/object/holidays/' . rawurlencode($filename);
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Authorization: Bearer {$serviceKey}\r\napikey: {$serviceKey}\r\nContent-Type: {$mime}\r\nx-upsert: false\r\nCache-Control: no-store\r\n",
        'content' => $contents,
        'timeout' => 25,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    $status = (int)($matches[1] ?? 0);
    if ($status < 200 || $status >= 300) {
        error_log('Holiday image upload failed with status ' . $status);
        throw new RuntimeException('Unable to upload the holiday image.');
    }
    return '/Holiday/' . $filename;
}

$app->post('/api/admin/holidays/image', function (Request $request, Response $response) {
    try {
        $path = holidayImageStorageUpload($request->getUploadedFiles()['file'] ?? null);
        $response->getBody()->write(json_encode(['image_url' => $path]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (InvalidArgumentException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    } catch (DomainException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    } catch (Throwable $e) {
        error_log('Holiday image upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload the holiday image right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

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
        $response->getBody()->write(json_encode(['error' => 'An unexpected error occurred. Please try again.']));
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

        \App\Utils\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Holiday saved successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'An unexpected error occurred. Please try again.']));
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

        $response->getBody()->write(json_encode(['message' => 'Holiday deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'An unexpected error occurred. Please try again.']));
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
        $response->getBody()->write(json_encode(['error' => 'An unexpected error occurred. Please try again.']));
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

        \App\Utils\Cache::delete('dashboard_stats');
        $response->getBody()->write(json_encode(['message' => 'Holiday restored successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'An unexpected error occurred. Please try again.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

