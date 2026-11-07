<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;

use App\Config\Database;

// Candidate document storage is accessed only through authenticated API routes.
function candidateStorageRequest(string $method, string $objectPath, string $serviceKey, string $baseUrl, ?string $body = null, string $contentType = 'application/octet-stream')
{
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = $baseUrl . '/storage/v1/object/candidate_documents/' . implode('/', $segments);
    $headers = [
        'Authorization: Bearer ' . $serviceKey,
        'apikey: ' . $serviceKey,
        'Content-Type: ' . $contentType,
        'Cache-Control: no-store'
    ];
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $body ?? '',
        'timeout' => 25,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    return ['status' => (int)($matches[1] ?? 0), 'body' => $result === false ? '' : $result];
}

function candidateDocumentObjectPath(string $storedPath): ?string
{
    if (str_starts_with($storedPath, 'storage:candidate_documents/')) {
        $path = substr($storedPath, strlen('storage:candidate_documents/'));
    } elseif (str_contains($storedPath, '/Candidate-Document/')) {
        $path = substr($storedPath, strpos($storedPath, '/Candidate-Document/') + strlen('/Candidate-Document/'));
    } elseif (str_starts_with($storedPath, '/Candidate-Document/')) {
        $path = substr($storedPath, strlen('/Candidate-Document/'));
    } else {
        return null;
    }
    if ($path === '' || str_contains($path, '..') || preg_match('/[^A-Za-z0-9_./-]/', $path)) return null;
    return $path;
}


function resumeStorageRequest(string $method, string $objectPath, string $serviceKey, string $baseUrl, ?string $body = null, string $contentType = 'application/octet-stream')
{
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/resumes/' . implode('/', $segments);
    $headers = ['Authorization: Bearer ' . $serviceKey, 'apikey: ' . $serviceKey, 'Content-Type: ' . $contentType, 'Cache-Control: no-store'];
    $context = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => $body ?? '', 'timeout' => 25, 'ignore_errors' => true]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    return ['status' => (int)($matches[1] ?? 0), 'body' => $result === false ? '' : $result];
}

function resumeObjectPath(array $resume): ?string
{
    $stored = (string)($resume['storagePath'] ?? '');
    if (str_starts_with($stored, 'storage:resumes/')) $path = substr($stored, strlen('storage:resumes/'));
    elseif (str_contains($stored, '/Resume/')) $path = substr($stored, strpos($stored, '/Resume/') + strlen('/Resume/'));
    else return null;
    if ($path === '' || str_contains($path, '..') || preg_match('/[^A-Za-z0-9_./-]/', $path)) return null;
    return $path;
}

function resumeSignedUrl(string $objectPath, string $serviceKey, string $baseUrl): ?string
{
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/sign/resumes/' . implode('/', $segments);
    $body = json_encode(['expiresIn' => 60]);
    $context = stream_context_create(['http' => ['method' => 'POST', 'header' => "Authorization: Bearer {$serviceKey}\r\napikey: {$serviceKey}\r\nContent-Type: application/json\r\n", 'content' => $body, 'timeout' => 15, 'ignore_errors' => true]]);
    $result = @file_get_contents($url, false, $context);
    if ($result === false) return null;
    $data = json_decode($result, true);
    $signed = $data['signedURL'] ?? $data['signedUrl'] ?? null;
    if (!$signed) return null;
    return str_starts_with($signed, 'http') ? $signed : rtrim($baseUrl, '/') . '/storage/v1' . (str_starts_with($signed, '/') ? $signed : '/' . $signed);
}

// Get Candidate Profile
/** @var \Slim\App $app */
$app->get('/api/candidate/profile', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('SELECT id, user_id, phone, address, current_title, experience, resume_url, avatar_url, created_at, updated_at FROM candidate_profiles WHERE user_id = ?');
        $stmt->execute([$decodedToken->id]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        // Decode jsonb fields so they are returned as arrays, not double-encoded strings
        if ($profile && isset($profile['resume_url']) && is_string($profile['resume_url'])) {
            $profile['resume_url'] = json_decode($profile['resume_url'], true);
        }

        $response->getBody()->write(json_encode(['profile' => $profile ?: null]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Upsert Candidate Profile
$app->put('/api/candidate/profile', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('SELECT id FROM candidate_profiles WHERE user_id = ?');
        $stmt->execute([$decodedToken->id]);
        $exists = $stmt->fetch();

        if ($exists) {
            $stmtUpdate = $conn->prepare('
                UPDATE candidate_profiles 
                SET phone = ?, address = ?, current_title = ?, experience = ?, resume_url = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ');
            $stmtUpdate->execute([
                $data['phone'] ?? null,
                $data['address'] ?? null,
                $data['currentTitle'] ?? null,
                $data['experience'] ?? null,
                isset($data['resumes']) ? json_encode($data['resumes']) : null,
                $data['avatar'] ?? null,
                $decodedToken->id
            ]);
        } else {
            $stmtInsert = $conn->prepare('
                INSERT INTO candidate_profiles (user_id, phone, address, current_title, experience, resume_url, avatar_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            $stmtInsert->execute([
                $decodedToken->id,
                $data['phone'] ?? null,
                $data['address'] ?? null,
                $data['currentTitle'] ?? null,
                $data['experience'] ?? null,
                isset($data['resumes']) ? json_encode($data['resumes']) : null,
                $data['avatar'] ?? null
            ]);
        }


        $response->getBody()->write(json_encode(['message' => 'Profile updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));


 // Resume upload: files are stored privately and referenced by opaque resume IDs.
$app->post('/api/candidate/resumes', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $file = ($request->getUploadedFiles()['file'] ?? null);
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        $response->getBody()->write(json_encode(['error' => 'Choose a resume smaller than 5 MB.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    $originalName = basename((string)$file->getClientFilename());
    $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowed = ['pdf' => ['application/pdf'], 'doc' => ['application/msword', 'application/octet-stream'], 'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip']];
    if (!isset($allowed[$extension])) {
        $response->getBody()->write(json_encode(['error' => 'Only PDF, DOC, and DOCX resumes are accepted.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }
    $contents = $file->getStream()->getContents();
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    if (!in_array($mime, $allowed[$extension], true)) {
        $response->getBody()->write(json_encode(['error' => 'The uploaded file content does not match its extension.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT resume_url FROM candidate_profiles WHERE user_id = ?');
        $stmt->execute([$user->id]);
        $stored = $stmt->fetchColumn();
        $resumes = is_string($stored) ? (json_decode($stored, true) ?: []) : (is_array($stored) ? $stored : []);
        if (count($resumes) >= 3) {
            $response->getBody()->write(json_encode(['error' => 'You can only upload a maximum of 3 resumes.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
        }
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $id = bin2hex(random_bytes(20));
        $objectPath = (string)$user->id . '/' . $id . '.' . $extension;
        $upload = resumeStorageRequest('POST', $objectPath, $serviceKey, $baseUrl, $contents, $mime);
        if ($upload['status'] < 200 || $upload['status'] >= 300) throw new RuntimeException('Resume storage upload failed.');
        $resume = ['id' => $id, 'name' => $originalName, 'storagePath' => 'storage:resumes/' . $objectPath, 'isPrimary' => count($resumes) === 0];
        $resumes[] = $resume;
        $save = $conn->prepare('INSERT INTO candidate_profiles (user_id, resume_url) VALUES (?, ?) ON CONFLICT (user_id) DO UPDATE SET resume_url = EXCLUDED.resume_url, updated_at = CURRENT_TIMESTAMP');
        $save->execute([$user->id, json_encode($resumes)]);
        $response->getBody()->write(json_encode(['resume' => $resume]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        if (isset($objectPath, $serviceKey, $baseUrl)) resumeStorageRequest('DELETE', $objectPath, $serviceKey, $baseUrl);
        error_log('Resume upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload resume.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Set primary resume; only IDs already present in the signed-in candidate profile are accepted.
$app->put('/api/candidate/resumes/{id}/primary', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    try {
        $db = new Database(); $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT resume_url FROM candidate_profiles WHERE user_id = ? FOR UPDATE');
        $stmt->execute([$user->id]);
        $stored = $stmt->fetchColumn();
        $resumes = is_string($stored) ? (json_decode($stored, true) ?: []) : (is_array($stored) ? $stored : []);
        $found = false;
        foreach ($resumes as &$resume) {
            if (($resume['id'] ?? null) === $args['id']) $found = true;
            $resume['isPrimary'] = (($resume['id'] ?? null) === $args['id']);
        }
        unset($resume);
        if (!$found) return $response->withStatus(404);
        $save = $conn->prepare('UPDATE candidate_profiles SET resume_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
        $save->execute([json_encode($resumes), $user->id]);
        $response->getBody()->write(json_encode(['resumes' => $resumes]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (Throwable $e) { error_log('Primary resume update failed: ' . $e->getMessage()); return $response->withStatus(503); }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Delete a resume owned by the signed-in candidate.
$app->delete('/api/candidate/resumes/{id}', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    try {
        $db = new Database(); $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT resume_url FROM candidate_profiles WHERE user_id = ? FOR UPDATE');
        $stmt->execute([$user->id]);
        $stored = $stmt->fetchColumn();
        $resumes = is_string($stored) ? (json_decode($stored, true) ?: []) : (is_array($stored) ? $stored : []);
        $removed = null;
        $resumes = array_values(array_filter($resumes, function ($resume) use ($args, &$removed) {
            if (($resume['id'] ?? null) === $args['id']) { $removed = $resume; return false; }
            return true;
        }));
        if (!$removed) return $response->withStatus(404);
        if (!empty($removed['isPrimary']) && count($resumes)) $resumes[0]['isPrimary'] = true;
        $save = $conn->prepare('UPDATE candidate_profiles SET resume_url = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
        $save->execute([json_encode($resumes), $user->id]);
        $objectPath = resumeObjectPath($removed);
        if ($objectPath) {
            [$baseUrl, $serviceKey] = attendanceStorageConfig();
            resumeStorageRequest('DELETE', $objectPath, $serviceKey, $baseUrl);
        }
        $response->getBody()->write(json_encode(['resumes' => $resumes]));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (Throwable $e) { error_log('Resume delete failed: ' . $e->getMessage()); return $response->withStatus(503); }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Candidate preview: resume ID is resolved only inside the current candidate's profile.
$app->get('/api/candidate/resumes/{id}/file', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    try {
        $db = new Database(); $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT resume_url FROM candidate_profiles WHERE user_id = ?');
        $stmt->execute([$user->id]);
        $stored = $stmt->fetchColumn();
        $resumes = is_string($stored) ? (json_decode($stored, true) ?: []) : (is_array($stored) ? $stored : []);
        $selected = null;
        foreach ($resumes as $resume) if (($resume['id'] ?? null) === $args['id']) { $selected = $resume; break; }
        if (!$selected) return $response->withStatus(404);
        $path = resumeObjectPath($selected);
        if (!$path) return $response->withStatus(404);
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $signed = resumeSignedUrl($path, $serviceKey, $baseUrl);
        if (!$signed) return $response->withStatus(404);
        return $response->withHeader('Location', $signed)->withHeader('Cache-Control', 'private, no-store')->withStatus(302);
    } catch (Throwable $e) { error_log('Candidate resume preview failed: ' . $e->getMessage()); return $response->withStatus(503); }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Mark Documents Tab as Seen
$app->put('/api/candidate/profile/documents-seen', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmtUpdate = $conn->prepare('
            UPDATE candidate_profiles 
            SET documents_tab_seen_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND documents_tab_seen_at IS NULL
        ');
        $stmtUpdate->execute([$decodedToken->id]);

        $response->getBody()->write(json_encode(['message' => 'Documents tab seen timestamp updated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Get Candidate Documents
$app->get('/api/candidate/documents', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('SELECT id, candidate_id, document_type, file_name, file_path, status, uploaded_at FROM candidate_documents WHERE candidate_id = ? ORDER BY uploaded_at DESC');
        $stmt->execute([$decodedToken->id]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['documents' => $documents]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));


 // Upload/replace a candidate document through the authenticated backend.
$app->post('/api/candidate/documents/upload', function (Request $request, Response $response) {
    $user = $request->getAttribute('user');
    $data = $request->getParsedBody() ?? [];
    $docTypeId = trim((string)($data['document_type'] ?? ''));
    $files = $request->getUploadedFiles();
    $file = $files['file'] ?? null;

    if (!preg_match('/^[a-z0-9_]{1,80}$/', $docTypeId) || !$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        $response->getBody()->write(json_encode(['error' => 'Choose a valid PDF document smaller than 5 MB.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $contents = $file->getStream()->getContents();
    $finfo = new \finfo(FILEINFO_MIME_TYPE);
    if ($finfo->buffer($contents) !== 'application/pdf' || !str_ends_with(strtolower((string)$file->getClientFilename()), '.pdf')) {
        $response->getBody()->write(json_encode(['error' => 'Only genuine PDF documents are accepted.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }

    $dbCommitted = false;
    try {
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $objectPath = (string)$user->id . '/' . bin2hex(random_bytes(20)) . '.pdf';
        $upload = candidateStorageRequest('POST', $objectPath, $serviceKey, $baseUrl, $contents, 'application/pdf');
        if ($upload['status'] < 200 || $upload['status'] >= 300) {
            error_log('Candidate document upload failed with status ' . $upload['status']);
            throw new RuntimeException('Storage upload failed.');
        }

        $db = new Database();
        $conn = $db->getConnection();
        $conn->beginTransaction();
        $existingStmt = $conn->prepare('SELECT file_path FROM candidate_documents WHERE candidate_id = ? AND document_type = ? FOR UPDATE');
        $existingStmt->execute([$user->id, $docTypeId]);
        $existingPath = $existingStmt->fetchColumn();

        $deleteStmt = $conn->prepare('DELETE FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
        $deleteStmt->execute([$user->id, $docTypeId]);
        $insertStmt = $conn->prepare('INSERT INTO candidate_documents (candidate_id, document_type, file_name, file_path) VALUES (?, ?, ?, ?) RETURNING id');
        $insertStmt->execute([$user->id, $docTypeId, basename((string)$file->getClientFilename()), 'storage:candidate_documents/' . $objectPath]);
        $newId = $insertStmt->fetchColumn();
        $conn->commit();
        $dbCommitted = true;

        if ($existingPath) {
            $oldObjectPath = candidateDocumentObjectPath((string)$existingPath);
            if ($oldObjectPath) candidateStorageRequest('DELETE', $oldObjectPath, $serviceKey, $baseUrl);
        }

        $getStmt = $conn->prepare('SELECT id, candidate_id, document_type, file_name, file_path, status, uploaded_at FROM candidate_documents WHERE id = ?');
        $getStmt->execute([$newId]);
        $document = $getStmt->fetch(PDO::FETCH_ASSOC);
        $response->getBody()->write(json_encode(['message' => 'Document uploaded', 'document' => $document]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        if (isset($conn) && $conn->inTransaction()) $conn->rollBack();
        if (!$dbCommitted && isset($objectPath, $serviceKey, $baseUrl)) candidateStorageRequest('DELETE', $objectPath, $serviceKey, $baseUrl);
        error_log('Candidate document upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload the document right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Download a candidate's own document. Admin review uses the separate admin route.
$app->get('/api/candidate/documents/{id}/file', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT file_path, file_name FROM candidate_documents WHERE id = ? AND candidate_id = ? LIMIT 1');
        $stmt->execute([$args['id'], $user->id]);
        $doc = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$doc) return $response->withStatus(404);
        $objectPath = candidateDocumentObjectPath((string)$doc['file_path']);
        if (!$objectPath) return $response->withStatus(404);
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $download = candidateStorageRequest('GET', $objectPath, $serviceKey, $baseUrl);
        if ($download['status'] !== 200) return $response->withStatus(404);
        $response->getBody()->write($download['body']);
        return $response->withHeader('Content-Type', 'application/pdf')
            ->withHeader('Content-Disposition', 'inline; filename="' . str_replace('"', '', basename($doc['file_name'])) . '"')
            ->withHeader('Cache-Control', 'private, no-store, max-age=0')
            ->withHeader('X-Content-Type-Options', 'nosniff');
    } catch (Throwable $e) {
        error_log('Candidate document download failed: ' . $e->getMessage());
        return $response->withStatus(503);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Upload/Replace Candidate Document (Record file details after frontend uploaded to Supabase Storage)
$app->post('/api/candidate/documents', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $docTypeId = $data['document_type'] ?? '';
    $fileName = $data['file_name'] ?? '';
    $filePath = $data['file_path'] ?? '';

    if (!$docTypeId || !$fileName || !$filePath) {
        $response->getBody()->write(json_encode(['error' => 'Missing required fields']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        // Delete existing document of this type
        $stmtDelete = $conn->prepare('DELETE FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
        $stmtDelete->execute([$decodedToken->id, $docTypeId]);
        
        $stmtInsert = $conn->prepare('INSERT INTO candidate_documents (candidate_id, document_type, file_name, file_path) VALUES (?, ?, ?, ?)');
        $stmtInsert->execute([$decodedToken->id, $docTypeId, $fileName, $filePath]);

        // Get the newly inserted record to return
        $stmtGet = $conn->prepare('SELECT id, candidate_id, document_type, file_name, file_path, status, uploaded_at FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
        $stmtGet->execute([$decodedToken->id, $docTypeId]);
        $newDoc = $stmtGet->fetch(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['message' => 'Document saved', 'document' => $newDoc]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Delete Candidate Document
$app->delete('/api/candidate/documents/{type}', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $docTypeId = $args['type'];
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmtFind = $conn->prepare('SELECT file_path FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
        $stmtFind->execute([$decodedToken->id, $docTypeId]);
        $storedPath = $stmtFind->fetchColumn();
        $stmtDelete = $conn->prepare('DELETE FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
        $stmtDelete->execute([$decodedToken->id, $docTypeId]);

        if ($storedPath) {
            try {
                $objectPath = candidateDocumentObjectPath((string)$storedPath);
                if ($objectPath) {
                    [$baseUrl, $serviceKey] = attendanceStorageConfig();
                    candidateStorageRequest('DELETE', $objectPath, $serviceKey, $baseUrl);
                }
            } catch (Throwable $storageError) {
                error_log('Candidate document cleanup failed: ' . $storageError->getMessage());
            }
        }

        $response->getBody()->write(json_encode(['message' => 'Document deleted']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Get Published Jobs for Candidate
$app->get('/api/candidate/jobs', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;
    $search = trim($params['search'] ?? '');
    
    try {
        $where = "WHERE status = 'Published'";
        $queryParams = [];
        if (!empty($search)) {
            $where .= ' AND (title ILIKE ? OR department ILIKE ? OR location ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $queryParams = [$searchTerm, $searchTerm, $searchTerm];
        }

        $stmt = $conn->prepare("SELECT id, title, department, location, type, status, description, experience, salary_min, salary_max, vacancy, skills, qualification, deadline, description_pdf_url, created_at, updated_at FROM jobs {$where} ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtCount = $conn->prepare("SELECT COUNT(*) FROM jobs {$where}");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        $response->getBody()->write(json_encode([
            'jobs' => $jobs,
            'total' => $totalCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Get Candidate Applications
$app->get('/api/candidate/applications', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;
    
    try {
        // Fetch applications with job details and timeline
        $stmt = $conn->prepare('
            SELECT a.*, j.title as job_title, j.department as job_department 
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id 
            WHERE a.candidate_id = ? 
            ORDER BY a.applied_date DESC
            LIMIT ? OFFSET ?
        ');
        $stmt->bindValue(1, $decodedToken->id);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtCount = $conn->prepare('SELECT COUNT(*) FROM applications WHERE candidate_id = ?');
        $stmtCount->execute([$decodedToken->id]);
        $totalCount = (int)$stmtCount->fetchColumn();

        $appIds = array_column($applications, 'id');
        $timelinesByApp = [];
        if (!empty($appIds)) {
            $inPlaceholders = implode(',', array_fill(0, count($appIds), '?'));
            $stmtTimeline = $conn->prepare("SELECT id, application_id, status_change, notes, created_at FROM application_timeline WHERE application_id IN ($inPlaceholders) ORDER BY created_at DESC");
            $stmtTimeline->execute($appIds);
            while ($row = $stmtTimeline->fetch(PDO::FETCH_ASSOC)) {
                $timelinesByApp[$row['application_id']][] = $row;
            }
        }

        foreach ($applications as &$app) {
            $app['application_timeline'] = $timelinesByApp[$app['id']] ?? [];
            
            // Format to match Supabase structure expectations
            $app['jobs'] = [
                'title' => $app['job_title'],
                'department' => $app['job_department']
            ];
            unset($app['job_title'], $app['job_department']);
        }
        unset($app);

        $response->getBody()->write(json_encode([
            'applications' => $applications,
            'total' => $totalCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));

// Apply for a Job
$app->post('/api/candidate/applications', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $jobId = $data['job_id'] ?? null;
    $resumeUrl = $data['resume_url'] ?? null;
    $noticePeriod = $data['notice_period'] ?? null;
    $coverNote = $data['cover_note'] ?? null;
    
    if (!$jobId) {
        $response->getBody()->write(json_encode(['error' => 'Job ID is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();

        $stmtInsertApp = $conn->prepare('
            INSERT INTO applications (job_id, candidate_id, resume_url, status, notice_period, cover_note) 
            VALUES (?, ?, ?, \'Applied\', ?, ?) RETURNING id
        ');
        $stmtInsertApp->execute([$jobId, $decodedToken->id, $resumeUrl, $noticePeriod, $coverNote]);
        $newAppId = $stmtInsertApp->fetchColumn();

        $stmtTimeline = $conn->prepare('INSERT INTO application_timeline (application_id, status_change, notes) VALUES (?, \'Applied\', \'Application submitted successfully.\')');
        $stmtTimeline->execute([$newAppId]);
        
        // Get user and job details for Candidate email notification
        $stmtUser = $conn->prepare('SELECT "firstName", email FROM users WHERE id = ?');
        $stmtUser->execute([$decodedToken->id]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);
        
        $stmtJob = $conn->prepare('SELECT title FROM jobs WHERE id = ?');
        $stmtJob->execute([$jobId]);
        $job = $stmtJob->fetch(PDO::FETCH_ASSOC);

        // Load the candidate application success email template
        $templatePath = __DIR__ . '/../src/Templates/candidate_application_success_email.html';
        if (file_exists($templatePath)) {
            $body = file_get_contents($templatePath);
            $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? '', '/');
            $dashboardLink = !empty($frontendUrl) ? ($frontendUrl . '/candidate/applications') : '/candidate/applications';
            
            $body = str_replace(
                ['{{firstName}}', '{{jobTitle}}', '{{dashboardLink}}', '{{currentYear}}'],
                [$user['firstName'] ?? 'Candidate', $job['title'] ?? 'Job', $dashboardLink, date('Y')],
                $body
            );
        } else {
            $body = "Thank you for applying for the " . ($job['title'] ?? 'Job') . " position. We have received your application.";
        }

        $subject = 'Application Received Successfully - ' . ($job['title'] ?? 'Position');
        
        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
        $stmtQueue->execute([$user['email'], $subject, $body]);

        $conn->commit();

        // Get the inserted app
        $stmtGet = $conn->prepare('SELECT id, job_id, candidate_id, resume_url, status, notice_period, cover_note, applied_date, updated_at FROM applications WHERE id = ?');
        $stmtGet->execute([$newAppId]);
        $newApp = $stmtGet->fetch(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['message' => 'Application submitted', 'application' => $newApp]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['candidate', 'employee']));
