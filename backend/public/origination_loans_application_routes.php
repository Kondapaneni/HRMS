<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

use App\Middleware\AuthMiddleware;

// Server-side Storage helpers. The browser never receives the service-role key.
function loanStorageObjectPath(string $reference, string $bucket): ?string
{
    $reference = trim($reference);
    $storagePrefix = 'storage:' . $bucket . '/';
    if (str_starts_with($reference, $storagePrefix)) {
        $path = substr($reference, strlen($storagePrefix));
    } else {
        $marker = $bucket === 'loan_documents' ? '/Loan-Document/' : '/Loan-Signature/';
        $position = strpos($reference, $marker);
        if ($position !== false) {
            $path = substr($reference, $position + strlen($marker));
        } else {
            $publicMarker = '/storage/v1/object/public/' . $bucket . '/';
            $position = strpos($reference, $publicMarker);
            if ($position === false) return null;
            $path = substr($reference, $position + strlen($publicMarker));
        }
    }

    if ($path === '' || str_starts_with($path, '/') || str_contains($path, '..') || preg_match('/[^A-Za-z0-9_./-]/', $path)) return null;
    if (preg_match('#(^|/)\.{1,2}(/|$)#', $path)) return null;
    return $path;
}

function loanStorageRequest(string $method, string $bucket, string $objectPath, string $serviceKey, string $baseUrl, ?string $body = null, string $contentType = 'application/octet-stream'): array
{
    if (!in_array($bucket, ['loan_documents', 'loan_signatures'], true)) {
        return ['status' => 400, 'body' => ''];
    }
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/' . $bucket . '/' . implode('/', $segments);
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
    preg_match('/\s(\d{3})\s/', $statusLine, $matches);
    return ['status' => (int)($matches[1] ?? 0), 'body' => $result === false ? '' : $result];
}

function loanStorageSignedUrl(string $bucket, string $objectPath, int $expiresIn = 900): ?string
{
    if (!in_array($bucket, ['loan_documents', 'loan_signatures'], true)) return null;
    [$baseUrl, $serviceKey] = attendanceStorageConfig();
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/sign/' . $bucket . '/' . implode('/', $segments);
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Authorization: Bearer {$serviceKey}\r\n" . "apikey: {$serviceKey}\r\nContent-Type: application/json\r\n",
        'content' => json_encode(['expiresIn' => $expiresIn]),
        'timeout' => 15,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    if ($result === false) return null;
    $data = json_decode($result, true);
    $signed = $data['signedURL'] ?? $data['signedUrl'] ?? null;
    if (!$signed) return null;
    return str_starts_with($signed, 'http')
        ? $signed
        : rtrim($baseUrl, '/') . '/storage/v1' . (str_starts_with($signed, '/') ? $signed : '/' . $signed);
}

function loanStorageSignedUrlFromReference(?string $reference, string $bucket, ?string $applicationUuid = null, bool $allowLegacyRoot = false): ?string
{
    if (!$reference) return null;
    $path = loanStorageObjectPath($reference, $bucket);
    if (!$path) return null;
    if ($applicationUuid !== null) {
        if (str_contains($path, '/')) {
            if (!str_starts_with($path, $applicationUuid . '/')) return null;
        } elseif (!$allowLegacyRoot) {
            return null;
        }
    }
    return loanStorageSignedUrl($bucket, $path);
}

function loanSignDocumentMap(array $documents, ?string $applicationUuid = null, bool $allowLegacyRoot = true): array
{
    foreach ($documents as $key => $document) {
        $reference = is_array($document) ? ($document['url'] ?? $document['proxy_url'] ?? null) : $document;
        $signed = loanStorageSignedUrlFromReference(is_string($reference) ? $reference : null, 'loan_documents', $applicationUuid, $allowLegacyRoot);
        if (!$signed) {
            unset($documents[$key]);
            continue;
        }
        $documents[$key] = array_merge(is_array($document) ? $document : [], [
            'url' => $signed,
            'slot_key' => is_array($document) ? ($document['slot_key'] ?? $key) : $key
        ]);
        unset($documents[$key]['proxy_url']);
    }
    return $documents;
}

function loanSignApplicationAssets(&$formData, &$signatures, ?string $applicationUuid = null): void
{
    if (!is_array($formData)) $formData = [];
    if (!is_array($signatures)) $signatures = [];
    foreach ($signatures as $key => $reference) {
        $signed = loanStorageSignedUrlFromReference(is_string($reference) ? $reference : null, 'loan_signatures', $applicationUuid, false);
        if ($signed) $signatures[$key] = $signed;
        else unset($signatures[$key]);
    }
    if (!empty($formData['timeline']) && is_array($formData['timeline'])) {
        foreach ($formData['timeline'] as &$event) {
            if (!is_array($event) || empty($event['signature'])) continue;
            $signed = loanStorageSignedUrlFromReference(is_string($event['signature']) ? $event['signature'] : null, 'loan_signatures', $applicationUuid, false);
            if ($signed) $event['signature'] = $signed;
            else unset($event['signature']);
        }
        unset($event);
    }
}

function loanFindOwnedApplication($conn, string $identifier, $user, bool $forUpdate = false): ?array
{
    $userId = is_object($user) ? (string)($user->id ?? '') : (string)($user['id'] ?? '');
    $role = is_object($user) ? (string)($user->role ?? '') : (string)($user['role'] ?? '');
    if ($userId === '') return null;
    $sql = '
        SELECT id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_by
        FROM public.loan_applications
        WHERE (id::text = ? OR application_id = ? OR lead_id = ?)
          AND (? = \'admin\' OR created_by = ?)
        ORDER BY created_at DESC
        LIMIT 1
    ';
    if ($forUpdate) $sql .= ' FOR UPDATE';
    $stmt = $conn->prepare($sql);
    $stmt->execute([$identifier, $identifier, $identifier, $role, $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}



/**
 * Helper function to fetch all documents for a loan application from public.loan_documents table.
 */
function getLoanDocumentsFromTable($conn, $appId, $uuidId = null, $leadId = null) {
    if (empty($appId) && empty($uuidId) && empty($leadId)) return [];

    $stmt = $conn->prepare('
        SELECT slot_key, url
        FROM public.loan_documents
        WHERE application_id = ? OR application_id = ? OR application_id = ?
        ORDER BY created_at ASC
    ');
    $stmt->execute([(string)$appId, (string)$uuidId, (string)$leadId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $docsMap = [];
    foreach ($rows as $r) {
        $docsMap[$r['slot_key']] = [
            'url' => $r['url'],
            'slot_key' => $r['slot_key']
        ];
    }
    return loanSignDocumentMap($docsMap, $uuidId, true);
}

/**
 * OPTIMIZATION: batched version of getLoanDocumentsFromTable for listing endpoints.
 * The original list endpoint called getLoanDocumentsFromTable() once per row (N+1
 * queries). This fetches every matching document in a single query, then resolves
 * per-row maps in PHP — same OR-across-3-ids matching, same created_at ASC
 * overwrite-order behaviour, just one round trip for the whole list.
 */
function getLoanDocumentsBatch($conn, array $rows) {
    $allIds = [];
    foreach ($rows as $r) {
        foreach ([$r['application_id'] ?? null, $r['id'] ?? null, $r['lead_id'] ?? null] as $v) {
            if (!empty($v)) $allIds[(string)$v] = true;
        }
    }
    $allIds = array_keys($allIds);
    if (empty($allIds)) return [];

    $placeholders = implode(',', array_fill(0, count($allIds), '?'));
    $stmt = $conn->prepare("
        SELECT application_id, slot_key, url, created_at
        FROM public.loan_documents
        WHERE application_id IN ($placeholders)
        ORDER BY created_at ASC
    ");
    $stmt->execute($allIds);
    $allDocs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $docsByAppId = [];
    foreach ($allDocs as $d) {
        $docsByAppId[$d['application_id']][] = $d;
    }
    return $docsByAppId;
}

/**
 * Resolves the per-row documents map from the batch result, preserving the
 * original OR-across-3-ids matching + created_at ASC overwrite order.
 */
function resolveLoanDocumentsForRow(array $docsByAppId, $appId, $uuidId = null, $leadId = null) {
    $matched = [];
    foreach ([$appId, $uuidId, $leadId] as $key) {
        if (!empty($key) && isset($docsByAppId[(string)$key])) {
            foreach ($docsByAppId[(string)$key] as $d) {
                $matched[] = $d;
            }
        }
    }
    usort($matched, fn($a, $b) => strtotime($a['created_at']) <=> strtotime($b['created_at']));

    $docsMap = [];
    foreach ($matched as $d) {
        $docsMap[$d['slot_key']] = [
            'url' => $d['url'],
            'slot_key' => $d['slot_key']
        ];
    }
    return loanSignDocumentMap($docsMap, $uuidId, true);
}

/**
 * Endpoint to submit or save draft for a loan application in DB table public.loan_applications.
 */
$app->post('/api/loans/applications', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $data = $request->getParsedBody();

    if (!is_array($data)) {
        $raw = (string)$request->getBody();
        $data = json_decode($raw, true) ?: [];
    }

    $loanType = trim($data['loan_type'] ?? 'Business Loan');
    $applicantName = trim($data['applicant_name'] ?? '');
    $phoneNumber = trim($data['phone_number'] ?? '');
    $status = trim($data['status'] ?? 'Created');
    $formData = $data['form_data'] ?? $data;
    $leadId = $data['lead_id'] ?? $formData['lead_id'] ?? null;
    // Documents are uploaded only through the owner-checked multipart endpoint.

    // Extract fallback name / phone from form_data if not top-level
    if (empty($applicantName) && !empty($formData['applicant_name'])) {
        $applicantName = trim($formData['applicant_name']);
    }
    if (empty($phoneNumber) && !empty($formData['phone_number'])) {
        $phoneNumber = trim($formData['phone_number']);
    }

    // Default placeholders for draft entries
    if ($status === 'Draft') {
        if (empty($applicantName)) $applicantName = 'Draft Application';
        if (empty($phoneNumber)) $phoneNumber = '0000000000';
    }

    if (empty($applicantName) || empty($phoneNumber)) {
        $response->getBody()->write(json_encode([
            'error' => 'Applicant Name and Phone Number are required.'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Preserve applicant_name & phone_number inside form_data json
    $formData['applicant_name'] = $applicantName;
    $formData['phone_number'] = $phoneNumber;

    try {
        $db = new Database();
        $conn = $db->getConnection();

        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        // Filter out empty string, null, or whitespace-only fields from form_data json payload
        $cleanedFormData = [];
        foreach ($formData as $k => $v) {
            if ($k === 'documents') continue; // Stored in dedicated loan_documents table
            if ($v !== null && !(is_string($v) && trim($v) === '')) {
                $cleanedFormData[$k] = $v;
            }
        }

        $jsonPayload = json_encode($cleanedFormData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        // Resolve user ID safely as string (supports both UUID strings and integer IDs)
        $createdById = null;
        if (is_object($user)) {
            $createdById = isset($user->id) ? (string)$user->id : (isset($user->user_id) ? (string)$user->user_id : null);
        } elseif (is_array($user)) {
            $createdById = isset($user['id']) ? (string)$user['id'] : (isset($user['user_id']) ? (string)$user['user_id'] : (isset($user['sub']) ? (string)$user['sub'] : null));
        }

        $createdByRole = is_object($user) ? (string)($user->role ?? '') : (string)($user['role'] ?? '');

        // Fetch user's branch from employee table
        $branchStmt = $conn->prepare('SELECT branch FROM public.employee WHERE "userId" = ? LIMIT 1');
        $branchStmt->execute([$createdById]);
        $emp = $branchStmt->fetch(PDO::FETCH_ASSOC);
        $userBranch = $emp['branch'] ?? null;

        $existingDraft = null;
        $appId = $data['id'] ?? $data['application_id'] ?? $formData['id'] ?? $formData['application_id'] ?? null;
        if (!empty($appId)) {
            $checkStmt = $conn->prepare('
                SELECT id, application_id FROM public.loan_applications
                WHERE (id::text = ? OR application_id = ?) AND status = \'Draft\'
                  AND (? = \'admin\' OR created_by = ?)
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $checkStmt->execute([(string)$appId, (string)$appId, $createdByRole, $createdById]);
            $existingDraft = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }

        if (!$existingDraft && !empty($leadId)) {
            $checkStmt = $conn->prepare('
                SELECT id, application_id FROM public.loan_applications
                WHERE lead_id = ? AND loan_type = ? AND status = \'Draft\'
                  AND (? = \'admin\' OR created_by = ?)
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $checkStmt->execute([$leadId, $loanType, $createdByRole, $createdById]);
            $existingDraft = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($existingDraft) {
            $stmt = $conn->prepare('
                UPDATE public.loan_applications
                SET status = ?, form_data = ?::jsonb, branch = COALESCE(branch, ?), updated_at = NOW()
                WHERE id = ?
                RETURNING id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
            ');
            $stmt->execute([
                $status,
                $jsonPayload,
                $userBranch,
                $existingDraft['id']
            ]);
        } else {
            $applicationId = 'LA' . random_int(100000, 999999);
            $stmt = $conn->prepare('
                INSERT INTO public.loan_applications (application_id, lead_id, loan_type, status, form_data, branch, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, NOW(), NOW())
                RETURNING id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
            ');

            $stmt->execute([
                $applicationId,
                $leadId,
                $loanType,
                $status,
                $jsonPayload,
                $userBranch,
                $createdById
            ]);
        }

        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($application) {
            if (isset($application['form_data']) && is_string($application['form_data'])) {
                $application['form_data'] = json_decode($application['form_data'], true);
            }
            if (isset($application['signatures']) && is_string($application['signatures'])) {
                $application['signatures'] = json_decode($application['signatures'], true);
            }

            $appId = $application['application_id'] ?: $application['id'];
            loanSignApplicationAssets($application['form_data'], $application['signatures'], (string)$application['id']);
            $application['documents'] = getLoanDocumentsFromTable($conn, $appId, $application['id'], $application['lead_id']);
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => $status === 'Draft' ? 'Loan application draft saved to database' : 'Loan application created successfully',
            'application' => $application
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

    } catch (\PDOException $e) {
        error_log("Database error submitting loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while saving to DB: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error submitting loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while saving to database']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Endpoint to list submitted & draft loan applications.
 */
$app->get('/api/loans/applications', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');

    try {
        $db = new Database();
        $conn = $db->getConnection();

        $userId = null;
        $userRole = 'employee';
        if (is_object($user)) {
            $userId = isset($user->id) ? (string)$user->id : null;
            $userRole = $user->role ?? 'employee';
        } elseif (is_array($user)) {
            $userId = isset($user['id']) ? (string)$user['id'] : null;
            $userRole = $user['role'] ?? 'employee';
        }

        $stmt = $conn->prepare('
            SELECT 
                la.id, 
                la.application_id, 
                la.lead_id, 
                la.loan_type, 
                la.status, 
                la.form_data, 
                la.branch, 
                b.name AS branch_name, 
                la.signatures, 
                la.created_at, 
                la.updated_at
            FROM public.loan_applications la
            LEFT JOIN public.branches b ON (
                la.branch = b.id::text OR 
                (la.branch ~ \'^[0-9a-fA-F-]{36}$\' AND la.branch::uuid = b.id)
            )
            WHERE la.created_by = ? OR ? = \'admin\'
            ORDER BY la.created_at DESC
        ');

        $stmt->execute([$userId, $userRole]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // OPTIMIZATION: fetch documents for every row in one query instead of
        // one query per row (was N+1 — a list of 50 applications meant 51 queries).
        $docsByAppId = getLoanDocumentsBatch($conn, $rows);

        foreach ($rows as &$row) {
            if (isset($row['form_data']) && is_string($row['form_data'])) {
                $row['form_data'] = json_decode($row['form_data'], true);
            }
            if (isset($row['signatures']) && is_string($row['signatures'])) {
                $row['signatures'] = json_decode($row['signatures'], true);
            }
            loanSignApplicationAssets($row['form_data'], $row['signatures'], (string)$row['id']);
            $row['documents'] = resolveLoanDocumentsForRow($docsByAppId, $row['application_id'], $row['id'], $row['lead_id']);
        }
        unset($row);

        $response->getBody()->write(json_encode([
            'success' => true,
            'applications' => $rows
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error fetching loan applications: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Error fetching loan applications']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Legacy metadata-only document writes are disabled. Files must be uploaded through
 * the multipart endpoint so ownership, MIME, size, and Storage object paths are verified.
 */
$app->post('/api/loans/applications/{id}/documents', function (Request $request, Response $response, $args) {
    $response->getBody()->write(json_encode(['error' => 'Use the secure document upload endpoint.']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(410);
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Upload a loan applicant/co-applicant/guarantor photo to private Storage.
 */
$app->post('/api/loans/applications/{id}/documents/{docKey}', function (Request $request, Response $response, $args) {
    $allowedSlots = ['applicant_photo', 'co_applicant_photo', 'guarantor_1_photo', 'guarantor_2_photo', 'guarantor_3_photo'];
    $slotKey = (string)$args['docKey'];
    if (!in_array($slotKey, $allowedSlots, true)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid document slot.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $file = $request->getUploadedFiles()['file'] ?? null;
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        $response->getBody()->write(json_encode(['error' => 'Choose an image smaller than 5 MB.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $contents = $file->getStream()->getContents();
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($extensions[$mime])) {
        $response->getBody()->write(json_encode(['error' => 'Only JPEG, PNG, or WEBP images are accepted.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }

    $uploadedPath = null;
    $baseUrl = null;
    $serviceKey = null;
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $user = $request->getAttribute('user');
        $appRow = loanFindOwnedApplication($conn, (string)$args['id'], $user);
        if (!$appRow) return $response->withStatus(404);

        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $uploadedPath = (string)$appRow['id'] . '/' . bin2hex(random_bytes(20)) . '.' . $extensions[$mime];
        $upload = loanStorageRequest('POST', 'loan_documents', $uploadedPath, $serviceKey, $baseUrl, $contents, $mime);
        if ($upload['status'] < 200 || $upload['status'] >= 300) {
            error_log('Loan document Storage upload failed with status ' . $upload['status']);
            throw new RuntimeException('Loan document upload failed.');
        }

        $identifiers = array_values(array_unique(array_filter([
            (string)($appRow['application_id'] ?? ''),
            (string)$appRow['id'],
            (string)($appRow['lead_id'] ?? '')
        ])));
        $appKey = (string)($appRow['application_id'] ?: $appRow['id']);
        $conn->beginTransaction();
        $lock = $conn->prepare('SELECT id FROM public.loan_applications WHERE id = ? FOR UPDATE');
        $lock->execute([$appRow['id']]);
        $existingSql = 'SELECT url FROM public.loan_documents WHERE application_id IN (' . implode(',', array_fill(0, count($identifiers), '?')) . ') AND slot_key = ? ORDER BY created_at DESC LIMIT 1 FOR UPDATE';
        $existingStmt = $conn->prepare($existingSql);
        $existingStmt->execute(array_merge($identifiers, [$slotKey]));
        $oldReference = $existingStmt->fetchColumn();

        $deleteSql = 'DELETE FROM public.loan_documents WHERE application_id IN (' . implode(',', array_fill(0, count($identifiers), '?')) . ') AND slot_key = ?';
        $deleteStmt = $conn->prepare($deleteSql);
        $deleteStmt->execute(array_merge($identifiers, [$slotKey]));

        $save = $conn->prepare('
            INSERT INTO public.loan_documents (application_id, slot_key, url, updated_at)
            VALUES (?, ?, ?, NOW())
            ON CONFLICT (application_id, slot_key) DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()
        ');
        $save->execute([$appKey, $slotKey, 'storage:loan_documents/' . $uploadedPath]);

        $signed = loanStorageSignedUrl('loan_documents', $uploadedPath);
        if (!$signed) throw new RuntimeException('Loan document preview URL could not be created.');
        $conn->commit();

        if ($oldReference) {
            $oldPath = loanStorageObjectPath((string)$oldReference, 'loan_documents');
            if ($oldPath && $oldPath !== $uploadedPath && (!str_contains($oldPath, '/') || str_starts_with($oldPath, (string)$appRow['id'] . '/'))) {
                loanStorageRequest('DELETE', 'loan_documents', $oldPath, $serviceKey, $baseUrl);
            }
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'document' => ['url' => $signed, 'slot_key' => $slotKey]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        if (isset($conn) && $conn->inTransaction()) $conn->rollBack();
        if ($uploadedPath && $serviceKey && $baseUrl) loanStorageRequest('DELETE', 'loan_documents', $uploadedPath, $serviceKey, $baseUrl);
        error_log('Loan document upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload the loan document right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Delete a document only after verifying the requesting user owns the application
 * (or is an admin) and remove its Storage object through the server-side service key.
 */
$app->delete('/api/loans/applications/{id}/documents/{docKey}', function (Request $request, Response $response, $args) {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $user = $request->getAttribute('user');
        $appRow = loanFindOwnedApplication($conn, (string)$args['id'], $user);
        if (!$appRow) return $response->withStatus(404);

        $identifiers = array_values(array_unique(array_filter([
            (string)($appRow['application_id'] ?? ''),
            (string)$appRow['id'],
            (string)($appRow['lead_id'] ?? '')
        ])));
        $lookupSql = 'SELECT url FROM public.loan_documents WHERE application_id IN (' . implode(',', array_fill(0, count($identifiers), '?')) . ') AND slot_key = ? ORDER BY created_at DESC LIMIT 1';
        $lookup = $conn->prepare($lookupSql);
        $lookup->execute(array_merge($identifiers, [(string)$args['docKey']]));
        $reference = $lookup->fetchColumn();
        if (!$reference) return $response->withStatus(404);

        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $objectPath = loanStorageObjectPath((string)$reference, 'loan_documents');
        if ($objectPath) {
            if (str_contains($objectPath, '/') && !str_starts_with($objectPath, (string)$appRow['id'] . '/')) {
                return $response->withStatus(404);
            }
            $deleted = loanStorageRequest('DELETE', 'loan_documents', $objectPath, $serviceKey, $baseUrl);
            if ($deleted['status'] >= 300 && $deleted['status'] !== 404) {
                error_log('Loan document Storage delete failed with status ' . $deleted['status']);
                return $response->withStatus(503);
            }
        }

        $deleteSql = 'DELETE FROM public.loan_documents WHERE application_id IN (' . implode(',', array_fill(0, count($identifiers), '?')) . ') AND slot_key = ?';
        $delete = $conn->prepare($deleteSql);
        $delete->execute(array_merge($identifiers, [(string)$args['docKey']]));

        $appKey = (string)($appRow['application_id'] ?: $appRow['id']);
        $remainingDocs = getLoanDocumentsFromTable($conn, $appKey, $appRow['id'], $appRow['lead_id']);
        $response->getBody()->write(json_encode(['success' => true, 'documents' => $remainingDocs]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Throwable $e) {
        error_log('Loan document delete failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Failed to delete document']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Transfer a loan application to Branch Operations and securely store its signature.
 */
$app->post('/api/loans/applications/{id}/transfer-to-branch', function (Request $request, Response $response, $args) {
    $uploadedPath = null;
    $baseUrl = null;
    $serviceKey = null;
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $user = $request->getAttribute('user');
        $appRow = loanFindOwnedApplication($conn, (string)$args['id'], $user);
        if (!$appRow) return $response->withStatus(404);

        $signatureRef = null;
        $file = $request->getUploadedFiles()['signature'] ?? null;
        if ($file) {
            if ($file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 2 * 1024 * 1024) {
                $response->getBody()->write(json_encode(['error' => 'Signature must be smaller than 2 MB.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
            }
            $contents = $file->getStream()->getContents();
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
            if ($mime !== 'image/png') {
                $response->getBody()->write(json_encode(['error' => 'Only PNG signatures are accepted.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
            }
            [$baseUrl, $serviceKey] = attendanceStorageConfig();
            $uploadedPath = (string)$appRow['id'] . '/' . bin2hex(random_bytes(20)) . '.png';
            $upload = loanStorageRequest('POST', 'loan_signatures', $uploadedPath, $serviceKey, $baseUrl, $contents, 'image/png');
            if ($upload['status'] < 200 || $upload['status'] >= 300) {
                error_log('Loan signature Storage upload failed with status ' . $upload['status']);
                throw new RuntimeException('Loan signature upload failed.');
            }
            $signatureRef = 'storage:loan_signatures/' . $uploadedPath;
        }

        $conn->beginTransaction();
        $lockedApp = loanFindOwnedApplication($conn, (string)$args['id'], $user, true);
        if (!$lockedApp || (string)$lockedApp['id'] !== (string)$appRow['id']) {
            $conn->rollBack();
            if ($uploadedPath && $serviceKey && $baseUrl) loanStorageRequest('DELETE', 'loan_signatures', $uploadedPath, $serviceKey, $baseUrl);
            return $response->withStatus(404);
        }

        $formData = is_string($lockedApp['form_data']) ? (json_decode($lockedApp['form_data'], true) ?: []) : ($lockedApp['form_data'] ?: []);
        if (!isset($formData['timeline']) || !is_array($formData['timeline'])) $formData['timeline'] = [];
        $formData['timeline'][] = [
            'stage' => 'Branch Operations',
            'timestamp' => gmdate('c'),
            'signature' => $signatureRef
        ];
        $jsonPayload = json_encode($formData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($signatureRef) {
            $signaturePayload = json_encode(['Origination' => $signatureRef]);
            $update = $conn->prepare("UPDATE public.loan_applications SET status = 'Under Review', form_data = ?::jsonb, signatures = COALESCE(signatures, '{}'::jsonb) || ?::jsonb, updated_at = NOW() WHERE id = ?");
            $update->execute([$jsonPayload, $signaturePayload, $lockedApp['id']]);
        } else {
            $update = $conn->prepare("UPDATE public.loan_applications SET status = 'Under Review', form_data = ?::jsonb, updated_at = NOW() WHERE id = ?");
            $update->execute([$jsonPayload, $lockedApp['id']]);
        }
        $conn->commit();

        $response->getBody()->write(json_encode(['success' => true, 'message' => 'Application transferred to Branch Operations.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Throwable $e) {
        if (isset($conn) && $conn->inTransaction()) $conn->rollBack();
        if ($uploadedPath && $serviceKey && $baseUrl) loanStorageRequest('DELETE', 'loan_signatures', $uploadedPath, $serviceKey, $baseUrl);
        error_log('Loan transfer failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to transfer the loan application right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Update a loan status without accepting caller-supplied signature URLs.
 */
$app->patch('/api/loans/applications/{id}/status', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    if (!is_array($data)) {
        $data = json_decode((string)$request->getBody(), true) ?: [];
    }

    $status = trim((string)($data['status'] ?? ''));
    $timelineEvent = $data['timelineEvent'] ?? null;
    if ($status === '') {
        $response->getBody()->write(json_encode(['error' => 'Status is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    if (!empty($data['signatureData']) || (is_array($timelineEvent) && !empty($timelineEvent['signature']))) {
        $response->getBody()->write(json_encode(['error' => 'Signatures must be uploaded through the secure transfer endpoint.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();
        $appRow = loanFindOwnedApplication($conn, (string)$args['id'], $request->getAttribute('user'));
        if (!$appRow) return $response->withStatus(404);

        $formData = is_string($appRow['form_data']) ? (json_decode($appRow['form_data'], true) ?: []) : ($appRow['form_data'] ?: []);
        if ($timelineEvent) {
            if (!is_array($timelineEvent)) return $response->withStatus(400);
            if (!isset($formData['timeline']) || !is_array($formData['timeline'])) $formData['timeline'] = [];
            $formData['timeline'][] = $timelineEvent;
        }

        $jsonPayload = json_encode($formData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $update = $conn->prepare('UPDATE public.loan_applications SET status = ?, form_data = ?::jsonb, updated_at = NOW() WHERE id = ?');
        $update->execute([$status, $jsonPayload, $appRow['id']]);

        $response->getBody()->write(json_encode(['success' => true, 'message' => 'Status updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Throwable $e) {
        error_log('Loan status update failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Failed to update application status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Delete a loan application only for its owner or an administrator.
 */
$app->delete('/api/loans/applications/{id}', function (Request $request, Response $response, $args) {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $user = $request->getAttribute('user');
        $appRow = loanFindOwnedApplication($conn, (string)$args['id'], $user);
        if (!$appRow) return $response->withStatus(404);

        $identifiers = array_values(array_unique(array_filter([
            (string)($appRow['application_id'] ?? ''),
            (string)$appRow['id'],
            (string)($appRow['lead_id'] ?? '')
        ])));
        [$baseUrl, $serviceKey] = attendanceStorageConfig();

        $docSql = 'SELECT url FROM public.loan_documents WHERE application_id IN (' . implode(',', array_fill(0, count($identifiers), '?')) . ')';
        $docStmt = $conn->prepare($docSql);
        $docStmt->execute($identifiers);
        foreach ($docStmt->fetchAll(PDO::FETCH_COLUMN) as $reference) {
            $objectPath = loanStorageObjectPath((string)$reference, 'loan_documents');
            if ($objectPath && (!str_contains($objectPath, '/') || str_starts_with($objectPath, (string)$appRow['id'] . '/'))) {
                loanStorageRequest('DELETE', 'loan_documents', $objectPath, $serviceKey, $baseUrl);
            }
        }

        $formData = is_string($appRow['form_data']) ? (json_decode($appRow['form_data'], true) ?: []) : ($appRow['form_data'] ?: []);
        $signatures = is_string($appRow['signatures']) ? (json_decode($appRow['signatures'], true) ?: []) : ($appRow['signatures'] ?: []);
        $signatureRefs = array_values(array_filter($signatures, 'is_string'));
        foreach (($formData['timeline'] ?? []) as $event) {
            if (is_array($event) && !empty($event['signature']) && is_string($event['signature'])) $signatureRefs[] = $event['signature'];
        }
        foreach (array_unique($signatureRefs) as $reference) {
            $objectPath = loanStorageObjectPath($reference, 'loan_signatures');
            if ($objectPath && str_starts_with($objectPath, (string)$appRow['id'] . '/')) {
                loanStorageRequest('DELETE', 'loan_signatures', $objectPath, $serviceKey, $baseUrl);
            }
        }

        $conn->beginTransaction();
        $deleteDocs = $conn->prepare('DELETE FROM public.loan_documents WHERE application_id IN (' . implode(',', array_fill(0, count($identifiers), '?')) . ')');
        $deleteDocs->execute($identifiers);
        $deleteApp = $conn->prepare('DELETE FROM public.loan_applications WHERE id = ?');
        $deleteApp->execute([$appRow['id']]);
        $conn->commit();

        $response->getBody()->write(json_encode(['success' => true, 'message' => 'Loan application deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Throwable $e) {
        if (isset($conn) && $conn->inTransaction()) $conn->rollBack();
        error_log('Loan application delete failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Error deleting loan application']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'loanOrigination'));
