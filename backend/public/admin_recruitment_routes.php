<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get all candidate users
/** @var \Slim\App $app */
$app->get('/api/admin/candidates', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
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

// Get all jobs
$app->get('/api/admin/jobs', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
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

        $response->getBody()->write(json_encode([
            'jobs' => $jobs,
            'total' => $totalCount
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
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;
    $search = trim($params['search'] ?? '');

    try {
        $where = '';
        $queryParams = [];

        if (!empty($search)) {
            $where = 'WHERE (u."firstName" ILIKE ? OR u."lastName" ILIKE ? OR u.email ILIKE ? OR j.title ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $queryParams = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
        }

        $sql = "
            SELECT a.*, j.title as job_title, j.department as job_department,
                   (SELECT COUNT(*) FROM candidate_documents cd WHERE cd.candidate_id = a.candidate_id AND (cd.status = 'pending' OR cd.status IS NULL)) as pending_documents_count
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id
            LEFT JOIN users u ON a.candidate_id = u.id
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
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
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
    $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
    $offset = isset($params['offset']) ? (int)$params['offset'] : (isset($params['page']) ? (max(1, (int)$params['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
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

