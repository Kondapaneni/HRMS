<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Security\EmailSecurity;
use App\Utils\RateLimiter;

// Get all candidate users
/** @var \Slim\App $app */
$app->get('/api/admin/candidates', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = min(100, max(1, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset'])
        : (max(1, (int)($params['page'] ?? 1)) - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
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
            'total' => $totalCount,
            'pagination' => [
                'page' => $page, 'limit' => $limit, 'total' => $totalCount,
                'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($candidates) < $totalCount,
                'hasPreviousPage' => $offset > 0
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// SEC-015: Only a server-owned notification for an existing application may
// enter the email queue. No caller-supplied recipient, subject, HTML, or link.
$app->post('/api/admin/send-email', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    if (!is_array($data)
        || array_diff(array_keys($data), ['applicationId', 'type'])
        || !is_string($data['applicationId'] ?? null)
        || !is_string($data['type'] ?? null)) {
        $response->getBody()->write(json_encode(['error' => 'Only applicationId and notification type are allowed.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $conn = (new Database())->getConnection();
        $mail = EmailSecurity::recruitment(
            $conn,
            trim($data['applicationId']),
            trim($data['type'])
        );

        // A compromised admin/recruiter must not flood even known applicants.
        $actor = $request->getAttribute('user');
        $key = RateLimiter::userKey((string)$actor->id);
        if (!RateLimiter::checkLimit($conn, $key, 'recruitment_notification', 20, 60)) {
            $response->getBody()->write(json_encode(['error' => 'Notification quota exceeded. Try later.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
        }

        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
        $stmtQueue->execute([$mail['to'], $mail['subject'], $mail['body']]);
        RateLimiter::recordAttempt($conn, $key, 'recruitment_notification');

        $response->getBody()->write(json_encode(['message' => 'Application notification queued successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\InvalidArgumentException $e) {
        $response->getBody()->write(json_encode(['error' => 'Invalid application or notification type']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    } catch (\DomainException $e) {
        $missing = $e->getMessage() === 'Application not found';
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($missing ? 404 : 409);
    } catch (\Throwable $e) {
        error_log('SEC-015: recruitment notification failed');
        $response->getBody()->write(json_encode(['error' => 'Unable to queue notification']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Get all jobs
$app->get('/api/admin/jobs', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = min(100, max(1, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset'])
        : (max(1, (int)($params['page'] ?? 1)) - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
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
            ORDER BY j.created_at DESC, j.id DESC
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

        $response->getBody()->write(json_encode([
            'jobs' => $jobs,
            'total' => $totalCount,
            'pagination' => [
                'page' => $page, 'limit' => $limit, 'total' => $totalCount,
                'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($jobs) < $totalCount,
                'hasPreviousPage' => $offset > 0
            ]
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
    $limit = min(100, max(1, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset'])
        : (max(1, (int)($params['page'] ?? 1)) - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
    $search = trim($params['search'] ?? '');

    try {
        $where = '';
        $queryParams = [];

        $filters = [];
        if ($search !== '') {
            $filters[] = '(u."firstName" ILIKE ? OR u."lastName" ILIKE ? OR u.email ILIKE ? OR j.title ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $queryParams = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
        }
        if (isset($params['job_id']) && (string)$params['job_id'] !== '') {
            $filters[] = 'a.job_id::text = ?';
            $queryParams[] = (string)$params['job_id'];
        }
        if (isset($params['status']) && (string)$params['status'] !== '') {
            $filters[] = 'a.status = ?';
            $queryParams[] = (string)$params['status'];
        }
        $where = $filters ? 'WHERE ' . implode(' AND ', $filters) : '';

        $sql = "
            SELECT a.*, j.title as job_title, j.department as job_department,
                   j.location as job_location,
                   u."firstName" AS candidate_first_name, u."lastName" AS candidate_last_name,
                   u.email AS candidate_email,
                   (SELECT cp.phone FROM candidate_profiles cp
                     WHERE cp.user_id = a.candidate_id ORDER BY cp.updated_at DESC LIMIT 1) AS candidate_phone,
                   (SELECT COUNT(*) FROM candidate_documents cd WHERE cd.candidate_id = a.candidate_id AND (cd.status = 'pending' OR cd.status IS NULL)) as pending_documents_count
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN users u ON a.candidate_id = u.id
            {$where}
            ORDER BY a.applied_date DESC, a.id DESC
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

        $stats = $conn->query(
            "SELECT COUNT(*) AS total_applicants,
                    COUNT(*) FILTER (WHERE status LIKE '%Interview%') AS in_interview,
                    COUNT(*) FILTER (WHERE status IN ('Hired', 'Selected', 'Converted to Employee')) AS hired_count
             FROM applications"
        )->fetch(PDO::FETCH_ASSOC);
        $openPositions = (int)$conn->query(
            "SELECT COUNT(*) FROM jobs WHERE status = 'Published'"
        )->fetchColumn();

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
            unset($app['job_title'], $app['job_department'], $app['job_location']);
        }
        unset($app);

        $response->getBody()->write(json_encode([
            'applications' => $applications,
            'stats' => [
                'totalApplicants' => (int)($stats['total_applicants'] ?? 0),
                'inInterview' => (int)($stats['in_interview'] ?? 0),
                'hiredCount' => (int)($stats['hired_count'] ?? 0),
                'openPositions' => $openPositions
            ],
            'total' => $totalCount,
            'pagination' => [
                'page' => $page, 'limit' => $limit, 'total' => $totalCount,
                'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($applications) < $totalCount,
                'hasPreviousPage' => $offset > 0
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));

// Update application status. When the Admin has uploaded an offer PDF, bind
// the server-generated Storage path to the exact application, not a public URL.
$app->put('/api/admin/applications/{id}/status', function (Request $request, Response $response, $args) {
    $appId = (string) ($args['id'] ?? '');
    $data = $request->getParsedBody();
    if (!is_array($data)) $data = [];
    $status = $data['status'] ?? '';
    $notes = $data['notes'] ?? '';
    $hasOfferPath = array_key_exists('offerLetterPath', $data);
    $offerPath = $hasOfferPath ? $data['offerLetterPath'] : null;

    if (!is_string($status) || $status === '' || !is_string($notes)) {
        $response->getBody()->write(json_encode(['error' => 'Valid status and notes are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    // Must be a generated, immutable PDF inside this application's own
    // private Storage folder. No client-selected bucket, URL or traversal.
    if ($hasOfferPath && (
        $status !== 'Hired' || !is_string($offerPath)
        || !preg_match('~\\A[0-9a-f-]{36}/offer-[0-9a-f-]{36}-[0-9a-f]{32}\\.pdf\\z~D', $offerPath)
        || !str_starts_with($offerPath, $appId . '/')
    )) {
        $response->getBody()->write(json_encode(['error' => 'Invalid application-scoped offer letter']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    try {
        $conn->beginTransaction();
        if ($hasOfferPath) {
            // Storage API already saved the uploaded PDF; a database-backed
            // object existence check prevents publishing a fabricated link.
            $file = $conn->prepare('SELECT 1 FROM storage.objects WHERE bucket_id = ? AND name = ? LIMIT 1');
            $file->execute(['offer_letters', $offerPath]);
            if (!$file->fetchColumn()) {
                $conn->rollBack();
                $response->getBody()->write(json_encode(['error' => 'Offer letter upload was not found']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
            }
            $stmt = $conn->prepare(
                'UPDATE applications SET status = ?, offer_letter_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $stmt->execute([$status, $offerPath, $appId]);
        } else {
            $stmt = $conn->prepare(
                'UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            $stmt->execute([$status, $appId]);
        }
        if ($stmt->rowCount() !== 1) {
            $conn->rollBack();
            $response->getBody()->write(json_encode(['error' => 'Application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $stmtTimeline = $conn->prepare(
            'INSERT INTO application_timeline (application_id, status_change, notes) VALUES (?, ?, ?)'
        );
        $stmtTimeline->execute([$appId, $status, $notes]);
        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Application status updated']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Throwable $e) {
        if ($conn && $conn->inTransaction()) $conn->rollBack();
        error_log('Candidate offer letter status association failed');
        $response->getBody()->write(json_encode(['error' => 'Unable to update application status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
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
    $limit = min(100, max(1, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset'])
        : (max(1, (int)($params['page'] ?? 1)) - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
    
    try {
        $stmt = $conn->prepare('SELECT id, user_id, phone, address, current_title, experience, resume_url, avatar_url, created_at, updated_at FROM candidate_profiles ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?');
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->bindValue(2, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalCount = (int)$conn->query('SELECT COUNT(*) FROM candidate_profiles')->fetchColumn();

        $response->getBody()->write(json_encode([
            'profiles' => $profiles,
            'total' => $totalCount,
            'pagination' => [
                'page' => $page, 'limit' => $limit, 'total' => $totalCount,
                'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($profiles) < $totalCount,
                'hasPreviousPage' => $offset > 0
            ]
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
    $limit = min(100, max(1, (int)($params['limit'] ?? 50)));
    $offset = isset($params['offset']) ? max(0, (int)$params['offset'])
        : (max(1, (int)($params['page'] ?? 1)) - 1) * $limit;
    $page = intdiv($offset, $limit) + 1;
    $candidateId = $params['candidate_id'] ?? '';
    
    try {
        $where = '';
        $queryParams = [];
        if (!empty($candidateId)) {
            $where = 'WHERE candidate_id = ?';
            $queryParams[] = $candidateId;
        }

        $stmt = $conn->prepare("SELECT id, candidate_id, document_type, file_name, file_path, status, uploaded_at FROM candidate_documents {$where} ORDER BY uploaded_at DESC, id DESC LIMIT ? OFFSET ?");
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
            'total' => $totalCount,
            'pagination' => [
                'page' => $page, 'limit' => $limit, 'total' => $totalCount,
                'totalPages' => (int)ceil($totalCount / $limit),
                'hasNextPage' => $offset + count($documents) < $totalCount,
                'hasPreviousPage' => $offset > 0
            ]
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
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

