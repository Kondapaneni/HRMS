<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/**
 * All avatar writes go through the backend. The avatars bucket remains public
 * for legacy/profile image display, but browser clients cannot upload or delete.
 */
function avatarStorageUpload($file): array
{
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        throw new InvalidArgumentException('Choose an image smaller than 5 MB.');
    }

    $stream = $file->getStream();
    $contents = $stream->getContents();
    $finfo = new \finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->buffer($contents);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) {
        throw new DomainException('Only JPEG, PNG, or WEBP images are allowed.');
    }

    $baseUrl = rtrim((string)($_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: ''), '/');
    $serviceKey = (string)($_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
    if (!$baseUrl || !$serviceKey) {
        throw new RuntimeException('Secure avatar storage is not configured.');
    }

    $filename = bin2hex(random_bytes(20)) . '.' . $allowed[$mime];
    $url = $baseUrl . '/storage/v1/object/avatars/' . rawurlencode($filename);
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Authorization: Bearer {$serviceKey}\r\napikey: {$serviceKey}\r\nContent-Type: {$mime}\r\nCache-Control: no-store\r\n",
        'content' => $contents,
        'timeout' => 25,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    $status = (int)($matches[1] ?? 0);
    if ($status < 200 || $status >= 300) {
        error_log('Avatar storage upload failed with status ' . $status);
        throw new RuntimeException('Unable to securely upload avatar.');
    }

    return ['url' => '/Avatar/' . $filename, 'filename' => $filename];
}

function avatarStorageResponse(Response $response, string $message, int $status)
{
    $response->getBody()->write(json_encode(['error' => $message]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
}

$app->post('/api/employee/profile/avatar', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    try {
        $uploaded = avatarStorageUpload($request->getUploadedFiles()['file'] ?? null);
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare('UPDATE employee SET avatar = ? WHERE "userId" = ?');
        $stmt->execute([$uploaded['url'], $user->id]);
        if ($stmt->rowCount() < 1) {
            return avatarStorageResponse($response, 'Employee profile was not found.', 404);
        }
        $response->getBody()->write(json_encode(['message' => 'Avatar updated successfully', 'avatar' => $uploaded['url']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (InvalidArgumentException $e) {
        return avatarStorageResponse($response, $e->getMessage(), 400);
    } catch (DomainException $e) {
        return avatarStorageResponse($response, $e->getMessage(), 415);
    } catch (Throwable $e) {
        error_log('Employee avatar upload failed: ' . $e->getMessage());
        return avatarStorageResponse($response, 'Unable to upload profile photo right now.', 503);
    }
})->add(new AuthMiddleware(['employee']));

$app->post('/api/admin/employees/{id}/avatar', function (Request $request, Response $response, $args) {
    try {
        $uploaded = avatarStorageUpload($request->getUploadedFiles()['file'] ?? null);
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare('UPDATE employee SET avatar = ? WHERE id = ?');
        $stmt->execute([$uploaded['url'], $args['id']]);
        if ($stmt->rowCount() < 1) {
            $check = $conn->prepare('SELECT 1 FROM employee WHERE id = ?');
            $check->execute([$args['id']]);
            if (!$check->fetchColumn()) return avatarStorageResponse($response, 'Employee was not found.', 404);
        }
        $response->getBody()->write(json_encode(['message' => 'Avatar updated successfully', 'avatar' => $uploaded['url']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (InvalidArgumentException $e) {
        return avatarStorageResponse($response, $e->getMessage(), 400);
    } catch (DomainException $e) {
        return avatarStorageResponse($response, $e->getMessage(), 415);
    } catch (Throwable $e) {
        error_log('Admin employee avatar upload failed: ' . $e->getMessage());
        return avatarStorageResponse($response, 'Unable to upload employee photo right now.', 503);
    }
})->add(new AuthMiddleware(['admin'], 'employees'));

$app->post('/api/candidate/profile/avatar', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    try {
        $uploaded = avatarStorageUpload($request->getUploadedFiles()['file'] ?? null);
        $db = new Database();
        $conn = $db->getConnection();
        $find = $conn->prepare('SELECT id FROM candidate_profiles WHERE user_id = ? LIMIT 1');
        $find->execute([$user->id]);
        if ($find->fetchColumn()) {
            $save = $conn->prepare('UPDATE candidate_profiles SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
            $save->execute([$uploaded['url'], $user->id]);
        } else {
            $save = $conn->prepare('INSERT INTO candidate_profiles (user_id, avatar_url) VALUES (?, ?)');
            $save->execute([$user->id, $uploaded['url']]);
        }
        $response->getBody()->write(json_encode(['message' => 'Avatar updated successfully', 'avatar' => $uploaded['url']]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (InvalidArgumentException $e) {
        return avatarStorageResponse($response, $e->getMessage(), 400);
    } catch (DomainException $e) {
        return avatarStorageResponse($response, $e->getMessage(), 415);
    } catch (Throwable $e) {
        error_log('Candidate avatar upload failed: ' . $e->getMessage());
        return avatarStorageResponse($response, 'Unable to upload profile photo right now.', 503);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));
