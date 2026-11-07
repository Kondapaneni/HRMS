<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

 // Offer letters are stored privately and accessed only after application ownership checks.
function offerLetterStorageRequest(string $method, string $objectPath, string $serviceKey, string $baseUrl, ?string $body = null, string $contentType = 'application/octet-stream')
{
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/offer_letters/' . implode('/', $segments);
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

function offerLetterObjectPath(string $storedPath): ?string
{
    $storedPath = trim($storedPath);
    if (str_starts_with($storedPath, 'storage:offer_letters/')) {
        $path = substr($storedPath, strlen('storage:offer_letters/'));
    } elseif (str_contains($storedPath, '/Offer-Letter/')) {
        $path = substr($storedPath, strpos($storedPath, '/Offer-Letter/') + strlen('/Offer-Letter/'));
    } elseif (str_starts_with($storedPath, '/Offer-Letter/')) {
        $path = substr($storedPath, strlen('/Offer-Letter/'));
    } else {
        $path = $storedPath; // Verified legacy object name from candidate_offer_letters.
    }
    if ($path === '' || str_starts_with($path, '/') || str_contains($path, '..') || preg_match('/[^A-Za-z0-9_./-]/', $path)) return null;
    if (preg_match('#(^|/)\.{1,2}(/|$)#', $path)) return null;
    return $path;
}

function offerLetterSignedUrl(string $objectPath, string $serviceKey, string $baseUrl): ?string
{
    $segments = array_map('rawurlencode', explode('/', ltrim($objectPath, '/')));
    $url = rtrim($baseUrl, '/') . '/storage/v1/object/sign/offer_letters/' . implode('/', $segments);
    $body = json_encode(['expiresIn' => 60]);
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Authorization: Bearer {$serviceKey}\r\n" . "apikey: {$serviceKey}\r\nContent-Type: application/json\r\n",
        'content' => $body,
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


// Get all candidate users
/** @var \Slim\App $app */
$app->get('/api/admin/candidates', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = max(1, min(100, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($offset < 0) $offset = 0;
    $search = trim($params['search'] ?? '');

    $where = "WHERE role IN ('candidate', 'employee')";
    $queryParams = [];
    if (!empty($search)) {
        $where .= ' AND ("firstName" ILIKE ? OR "lastName" ILIKE ? OR email ILIKE ?)';
        $searchTerm = '%' . $search . '%';
        $queryParams = [$searchTerm, $searchTerm, $searchTerm];
    }
    
    try {
        $stmt = $conn->prepare("SELECT id, \"firstName\", \"lastName\", email FROM users {$where} ORDER BY \"firstName\" ASC, \"lastName\" ASC LIMIT ? OFFSET ?");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtCount = $conn->prepare("SELECT COUNT(*) FROM users {$where}");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        $response->getBody()->write(json_encode([
            'candidates' => $candidates,
            'total' => $totalCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));


 // Admin resume preview is authorized against the application and its candidate profile.
$app->get('/api/admin/applications/{id}/resume', function (Request $request, Response $response, $args) {
    try {
        $db = new Database(); $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT a.resume_url, cp.resume_url AS candidate_resumes FROM applications a JOIN candidate_profiles cp ON cp.user_id = a.candidate_id WHERE a.id = ? LIMIT 1');
        $stmt->execute([$args['id']]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || !$row['resume_url']) return $response->withStatus(404);
        $resumes = is_string($row['candidate_resumes']) ? (json_decode($row['candidate_resumes'], true) ?: []) : (is_array($row['candidate_resumes']) ? $row['candidate_resumes'] : []);
        $selected = null;
        foreach ($resumes as $resume) {
            if (($resume['id'] ?? null) === $row['resume_url'] || (($resume['url'] ?? null) && hash_equals((string)$resume['url'], (string)$row['resume_url']))) {
                $selected = $resume; break;
            }
        }
        if (!$selected) return $response->withStatus(404);
        $path = resumeObjectPath($selected);
        if (!$path) return $response->withStatus(404);
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $signed = resumeSignedUrl($path, $serviceKey, $baseUrl);
        if (!$signed) return $response->withStatus(404);
        return $response->withHeader('Location', $signed)->withHeader('Cache-Control', 'private, no-store')->withStatus(302);
    } catch (Throwable $e) {
        error_log('Admin application resume preview failed: ' . $e->getMessage());
        return $response->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));


// Upload or replace the offer letter for an application using a random candidate-scoped object path.
$app->post('/api/admin/applications/{id}/offer-letter', function (Request $request, Response $response, $args) {
    $file = $request->getUploadedFiles()['file'] ?? null;
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        $response->getBody()->write(json_encode(['error' => 'Choose an offer letter PDF smaller than 5 MB.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $originalName = basename((string)$file->getClientFilename());
    $contents = $file->getStream()->getContents();
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    if ($mime !== 'application/pdf' || strtolower(pathinfo($originalName, PATHINFO_EXTENSION)) !== 'pdf') {
        $response->getBody()->write(json_encode(['error' => 'Only genuine PDF offer letters are accepted.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }

    $uploadedPath = null;
    $serviceKey = null;
    $baseUrl = null;
    try {
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $db = new Database();
        $conn = $db->getConnection();

        $appStmt = $conn->prepare('SELECT candidate_id FROM applications WHERE id = ?');
        $appStmt->execute([$args['id']]);
        $candidateId = $appStmt->fetchColumn();
        if (!$candidateId) return $response->withStatus(404);

        $uploadedPath = (string)$candidateId . '/' . bin2hex(random_bytes(20)) . '.pdf';
        $upload = offerLetterStorageRequest('POST', $uploadedPath, $serviceKey, $baseUrl, $contents, 'application/pdf');
        if ($upload['status'] < 200 || $upload['status'] >= 300) {
            error_log('Offer letter storage upload failed with status ' . $upload['status']);
            throw new RuntimeException('Offer letter storage upload failed.');
        }

        $conn->beginTransaction();
        $lockApp = $conn->prepare('SELECT candidate_id FROM applications WHERE id = ? FOR UPDATE');
        $lockApp->execute([$args['id']]);
        $lockedCandidateId = $lockApp->fetchColumn();
        if (!$lockedCandidateId || (string)$lockedCandidateId !== (string)$candidateId) {
            $conn->rollBack();
            offerLetterStorageRequest('DELETE', $uploadedPath, $serviceKey, $baseUrl);
            return $response->withStatus(404);
        }

        $existingStmt = $conn->prepare('SELECT storage_path FROM candidate_offer_letters WHERE application_id = ? FOR UPDATE');
        $existingStmt->execute([$args['id']]);
        $oldPath = $existingStmt->fetchColumn();

        $save = $conn->prepare('
            INSERT INTO candidate_offer_letters (application_id, candidate_id, storage_path, file_name, uploaded_by)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (application_id) DO UPDATE SET
                candidate_id = EXCLUDED.candidate_id,
                storage_path = EXCLUDED.storage_path,
                file_name = EXCLUDED.file_name,
                uploaded_by = EXCLUDED.uploaded_by,
                created_at = CURRENT_TIMESTAMP
            RETURNING id
        ');
        $save->execute([$args['id'], $candidateId, $uploadedPath, $originalName, $request->getAttribute('user')->id]);
        $offerLetterId = $save->fetchColumn();
        $conn->commit();

        if ($oldPath && $oldPath !== $uploadedPath) {
            $oldObjectPath = offerLetterObjectPath((string)$oldPath);
            if ($oldObjectPath) offerLetterStorageRequest('DELETE', $oldObjectPath, $serviceKey, $baseUrl);
        }

        $response->getBody()->write(json_encode(['message' => 'Offer letter uploaded', 'id' => $offerLetterId]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        if (isset($conn) && $conn->inTransaction()) $conn->rollBack();
        if ($uploadedPath && $serviceKey && $baseUrl) offerLetterStorageRequest('DELETE', $uploadedPath, $serviceKey, $baseUrl);
        error_log('Offer letter upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload the offer letter right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Admin preview is authorized against the application-linked offer-letter record.
$app->get('/api/admin/applications/{id}/offer-letter', function (Request $request, Response $response, $args) {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT storage_path FROM candidate_offer_letters WHERE application_id = ? LIMIT 1');
        $stmt->execute([$args['id']]);
        $storedPath = $stmt->fetchColumn();
        $objectPath = $storedPath ? offerLetterObjectPath((string)$storedPath) : null;
        if (!$objectPath) return $response->withStatus(404);
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $signed = offerLetterSignedUrl($objectPath, $serviceKey, $baseUrl);
        if (!$signed) return $response->withStatus(404);
        return $response->withHeader('Location', $signed)->withHeader('Cache-Control', 'private, no-store')->withStatus(302);
    } catch (Throwable $e) {
        error_log('Admin offer letter preview failed: ' . $e->getMessage());
        return $response->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Send generic email to candidate
$app->post('/api/admin/send-email', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $data = json_decode($request->getBody()->getContents(), true);
    $toEmail = $data['to'] ?? '';
    $subject = $data['subject'] ?? '';
    $body = $data['body'] ?? '';
    
    if (empty($toEmail) || empty($subject) || empty($body)) {
        $response->getBody()->write(json_encode(['error' => 'Missing required fields']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    
    try {
        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
        $stmtQueue->execute([$toEmail, $subject, $body]);

        $response->getBody()->write(json_encode(['message' => 'Email queued successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));


// Job-description uploads are written by the server; the bucket is public-read only.
function jobDescriptionStorageUpload($file): string
{
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        throw new InvalidArgumentException('Choose a PDF smaller than 5 MB.');
    }
    $stream = $file->getStream();
    $contents = $stream->getContents();
    $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    if ($mime !== 'application/pdf' || substr($contents, 0, 5) !== '%PDF-') {
        throw new DomainException('Only valid PDF files are allowed.');
    }

    $baseUrl = rtrim((string)($_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: ''), '/');
    $serviceKey = (string)($_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
    if (!$baseUrl || !$serviceKey) throw new RuntimeException('Secure job-description storage is not configured.');

    $filename = bin2hex(random_bytes(20)) . '.pdf';
    $url = $baseUrl . '/storage/v1/object/job_descriptions/' . rawurlencode($filename);
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Authorization: Bearer {$serviceKey}\r\napikey: {$serviceKey}\r\nContent-Type: application/pdf\r\nx-upsert: false\r\nCache-Control: no-store\r\n",
        'content' => $contents,
        'timeout' => 30,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    $status = (int)($matches[1] ?? 0);
    if ($status < 200 || $status >= 300) {
        error_log('Job-description storage upload failed with status ' . $status);
        throw new RuntimeException('Unable to upload the job description.');
    }
    return '/Job-Description/' . $filename;
}

$app->post('/api/admin/jobs/description', function (Request $request, Response $response) {
    try {
        $path = jobDescriptionStorageUpload($request->getUploadedFiles()['file'] ?? null);
        $response->getBody()->write(json_encode(['description_pdf_url' => $path]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (InvalidArgumentException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    } catch (DomainException $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    } catch (Throwable $e) {
        error_log('Job-description upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload the job description right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Get all jobs
$app->get('/api/admin/jobs', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = max(1, min(100, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($offset < 0) $offset = 0;
    $search = trim($params['search'] ?? '');

    $where = '';
    $queryParams = [];
    if (!empty($search)) {
        $where = 'WHERE j.title ILIKE ? OR j.department ILIKE ? OR j.location ILIKE ?';
        $searchTerm = '%' . $search . '%';
        $queryParams = [$searchTerm, $searchTerm, $searchTerm];
    }
    
    try {
        // We need to fetch jobs along with the count of applications
        $stmt = $conn->prepare("
            SELECT j.*, 
                   (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applications_count
            FROM jobs j
            {$where}
            ORDER BY j.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format it similarly to Supabase `applications: [{ count }]` structure
        foreach ($jobs as &$job) {
            $job['applications'] = [['count' => (int)$job['applications_count']]];
            unset($job['applications_count']);
        }
        unset($job);

        $stmtCount = $conn->prepare("SELECT COUNT(*) FROM jobs j {$where}");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();
        $statsStmt = $conn->query("SELECT COUNT(*) FILTER (WHERE status = 'Published') AS open_positions FROM jobs");
        $statsRow = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        $response->getBody()->write(json_encode([
            'jobs' => $jobs,
            'total' => $totalCount,
            'stats' => ['openPositions' => (int)($statsRow['open_positions'] ?? 0)]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Create a new job
$app->post('/api/admin/jobs', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmtInsert = $conn->prepare('
            INSERT INTO jobs (
                title, department, location, type, status, description, 
                experience, salary_min, salary_max, vacancy, skills, qualification, 
                deadline, description_pdf_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
        ');
        
        // Handle empty strings for numeric/date fields
        $salaryMin = isset($data['salary_min']) && $data['salary_min'] !== '' ? $data['salary_min'] : null;
        $salaryMax = isset($data['salary_max']) && $data['salary_max'] !== '' ? $data['salary_max'] : null;
        $vacancy = isset($data['vacancy']) && $data['vacancy'] !== '' ? $data['vacancy'] : 1;
        $deadline = isset($data['deadline']) && $data['deadline'] !== '' ? $data['deadline'] : null;

        $stmtInsert->execute([
            $data['title'] ?? null,
            $data['department'] ?? null,
            $data['location'] ?? null,
            $data['type'] ?? null,
            $data['status'] ?? 'Draft',
            $data['description'] ?? null,
            $data['experience'] ?? null,
            $salaryMin,
            $salaryMax,
            $vacancy,
            $data['skills'] ?? null,
            $data['qualification'] ?? null,
            $deadline,
            $data['description_pdf_url'] ?? null
        ]);
        
        $newJob = $stmtInsert->fetch(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['message' => 'Job created', 'job' => $newJob]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Update a job status
$app->put('/api/admin/jobs/{id}/status', function (Request $request, Response $response, $args) {
    $jobId = $args['id'];
    $data = $request->getParsedBody();
    $status = $data['status'] ?? '';
    
    if (!$status) {
        $response->getBody()->write(json_encode(['error' => 'Status is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('UPDATE jobs SET status = ? WHERE id = ?');
        $stmt->execute([$status, $jobId]);

        $response->getBody()->write(json_encode(['message' => 'Job status updated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Get all applications
$app->get('/api/admin/applications', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = max(1, min(100, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($offset < 0) $offset = 0;
    $search = trim($params['search'] ?? '');

    try {
        $conditions = [];
        $queryParams = [];

        if ($search !== '') {
            $conditions[] = '(u."firstName" ILIKE ? OR u."lastName" ILIKE ? OR u.email ILIKE ? OR j.title ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $queryParams = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
        }
        $jobIdFilter = trim((string)($params['job_id'] ?? ''));
        $statusFilter = trim((string)($params['status'] ?? ''));
        if ($jobIdFilter !== '') {
            $conditions[] = 'a.job_id = ?';
            $queryParams[] = $jobIdFilter;
        }
        if ($statusFilter !== '') {
            $conditions[] = 'a.status = ?';
            $queryParams[] = $statusFilter;
        }
        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $sql = "
            SELECT a.*, j.title as job_title, j.department as job_department, j.location as job_location,
                   u.\"firstName\" AS candidate_first_name, u.\"lastName\" AS candidate_last_name, u.email AS candidate_email,
                   cp.phone AS candidate_phone, cp.experience AS candidate_experience,
                   (SELECT COUNT(*) FROM candidate_documents cd WHERE cd.candidate_id = a.candidate_id AND (cd.status = 'pending' OR cd.status IS NULL)) as pending_documents_count
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN users u ON a.candidate_id = u.id
            LEFT JOIN LATERAL (
                SELECT phone, experience
                FROM candidate_profiles
                WHERE user_id = a.candidate_id
                ORDER BY updated_at DESC NULLS LAST
                LIMIT 1
            ) cp ON TRUE
            {$where}
            ORDER BY a.applied_date DESC
            LIMIT ? OFFSET ?
        ";
        
        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtCount = $conn->prepare("
            SELECT COUNT(*) 
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN users u ON a.candidate_id = u.id
            {$where}
        ");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();
        $statsStmt = $conn->query("
            SELECT
                COUNT(*) AS total_applicants,
                COUNT(*) FILTER (WHERE status ILIKE '%Interview%') AS in_interview,
                COUNT(*) FILTER (WHERE status IN ('Hired', 'Selected', 'Converted to Employee')) AS hired_count
            FROM applications
        ");
        $statsRow = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

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
                'department' => $app['job_department'],
                'location' => $app['job_location']
            ];
            unset($app['job_title'], $app['job_department']);
        }
        unset($app);

        $response->getBody()->write(json_encode([
            'applications' => $applications,
            'total' => $totalCount,
            'stats' => [
                'totalApplicants' => (int)($statsRow['total_applicants'] ?? 0),
                'inInterview' => (int)($statsRow['in_interview'] ?? 0),
                'hiredCount' => (int)($statsRow['hired_count'] ?? 0)
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Update application status
$app->put('/api/admin/applications/{id}/status', function (Request $request, Response $response, $args) {
    $appId = $args['id'];
    $data = $request->getParsedBody();
    $status = $data['status'] ?? '';
    $notes = $data['notes'] ?? '';
    
    if (!$status) {
        $response->getBody()->write(json_encode(['error' => 'Status is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();

        $stmt = $conn->prepare('UPDATE applications SET status = ? WHERE id = ?');
        $stmt->execute([$status, $appId]);

        $stmtTimeline = $conn->prepare('INSERT INTO application_timeline (application_id, status_change, notes) VALUES (?, ?, ?)');
        $stmtTimeline->execute([$appId, $status, $notes]);

        $conn->commit();

        $response->getBody()->write(json_encode(['message' => 'Application status updated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Get single application by ID
$app->get('/api/admin/applications/{id}', function (Request $request, Response $response, $args) {
    $appId = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = "
            SELECT a.*, 
                   j.title as job_title, 
                   j.department as job_department,
                   j.location as job_location,
                   j.type as job_type,
                   u.\"firstName\", 
                   u.\"lastName\", 
                   u.email
            FROM applications a 
            LEFT JOIN jobs j ON a.job_id = j.id
            LEFT JOIN users u ON a.candidate_id = u.id
            WHERE a.id = ?
        ";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute([$appId]);
        $app = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$app) {
            $response->getBody()->write(json_encode(['error' => 'Application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $stmtTimeline = $conn->prepare('SELECT id, application_id, status_change, notes, created_at FROM application_timeline WHERE application_id = ? ORDER BY created_at DESC');
        $stmtTimeline->execute([$app['id']]);
        $app['application_timeline'] = $stmtTimeline->fetchAll(PDO::FETCH_ASSOC);
        
        // Format nested objects to match expected shape
        $app['jobs'] = [
            'title' => $app['job_title'] ?? '',
            'department' => $app['job_department'] ?? '',
            'location' => $app['job_location'] ?? '',
            'type' => $app['job_type'] ?? ''
        ];
        $app['users'] = [
            'firstName' => $app['firstName'] ?? '',
            'lastName' => $app['lastName'] ?? '',
            'email' => $app['email'] ?? ''
        ];

        $response->getBody()->write(json_encode(['application' => $app]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Fetch candidate profile for Admin
$app->get('/api/admin/candidate-profiles', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = max(1, min(100, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($offset < 0) $offset = 0;
    
    try {
        $stmt = $conn->prepare('SELECT id, user_id, phone, address, current_title, experience, resume_url, avatar_url, created_at, updated_at FROM candidate_profiles ORDER BY created_at DESC LIMIT ? OFFSET ?');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalCount = (int)$conn->query('SELECT COUNT(*) FROM candidate_profiles')->fetchColumn();

        $response->getBody()->write(json_encode([
            'profiles' => $profiles,
            'total' => $totalCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Fetch candidate documents for Admin
$app->get('/api/admin/candidate-documents', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = max(1, min(100, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($offset < 0) $offset = 0;
    $candidateId = $params['candidate_id'] ?? '';
    
    try {
        $where = '';
        $queryParams = [];
        if (!empty($candidateId)) {
            $where = 'WHERE candidate_id = ?';
            $queryParams[] = $candidateId;
        }

        $stmt = $conn->prepare("SELECT id, candidate_id, document_type, file_name, file_path, status, uploaded_at FROM candidate_documents {$where} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmtCount = $conn->prepare("SELECT COUNT(*) FROM candidate_documents {$where}");
        $paramIndex = 1;
        foreach ($queryParams as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        $response->getBody()->write(json_encode([
            'documents' => $documents,
            'total' => $totalCount
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));


 // Admin-only document preview/download. The file path is resolved from the database record.
$app->get('/api/admin/candidate-documents/{id}/file', function (Request $request, Response $response, $args) {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare('SELECT file_path, file_name FROM candidate_documents WHERE id = ? LIMIT 1');
        $stmt->execute([$args['id']]);
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
        error_log('Admin candidate document download failed: ' . $e->getMessage());
        return $response->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Update candidate document status
$app->put('/api/admin/candidate-documents/{id}/status', function (Request $request, Response $response, $args) {
    $docId = $args['id'];
    $data = $request->getParsedBody();
    $status = $data['status'] ?? '';
    
    if (!$status) {
        $response->getBody()->write(json_encode(['error' => 'Status is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('UPDATE candidate_documents SET status = ? WHERE id = ?');
        $stmt->execute([$status, $docId]);

        $response->getBody()->write(json_encode(['message' => 'Document status updated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Add application timeline event
$app->post('/api/admin/applications/{id}/timeline', function (Request $request, Response $response, $args) {
    $appId = $args['id'];
    $data = $request->getParsedBody();
    $statusChange = $data['status_change'] ?? '';
    $notes = $data['notes'] ?? '';
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('INSERT INTO application_timeline (application_id, status_change, notes) VALUES (?, ?, ?)');
        $stmt->execute([$appId, $statusChange, $notes]);

        $response->getBody()->write(json_encode(['message' => 'Timeline event added']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

