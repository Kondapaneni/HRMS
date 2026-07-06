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
    
    try {
        $stmt = $conn->query('SELECT id, "firstName", "lastName", email FROM users WHERE role IN (\'candidate\', \'employee\')');
        $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['candidates' => $candidates]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
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
    
    try {
        // We need to fetch jobs along with the count of applications
        $stmt = $conn->query('
            SELECT j.*, 
                   (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applications_count
            FROM jobs j
            ORDER BY j.created_at DESC
        ');
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format it similarly to Supabase `applications: [{ count }]` structure
        foreach ($jobs as &$job) {
            $job['applications'] = [['count' => (int)$job['applications_count']]];
            unset($job['applications_count']);
        }

        $response->getBody()->write(json_encode(['jobs' => $jobs]));
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
            INSERT INTO jobs (title, department, location, type, status, description, requirements, salary_range) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
        ');
        $stmtInsert->execute([
            $data['title'] ?? null,
            $data['department'] ?? null,
            $data['location'] ?? null,
            $data['type'] ?? null,
            $data['status'] ?? 'Draft',
            $data['description'] ?? null,
            $data['requirements'] ?? null,
            $data['salary_range'] ?? null
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
    
    try {
        $stmt = $conn->query('
            SELECT a.*, j.title as job_title, j.department as job_department 
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id 
            ORDER BY a.applied_date DESC
        ');
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($applications as &$app) {
            $stmtTimeline = $conn->prepare('SELECT * FROM application_timeline WHERE application_id = ? ORDER BY created_at DESC');
            $stmtTimeline->execute([$app['id']]);
            $app['application_timeline'] = $stmtTimeline->fetchAll(PDO::FETCH_ASSOC);
            
            // Format to match Supabase structure expectations
            $app['jobs'] = [
                'title' => $app['job_title'],
                'department' => $app['job_department']
            ];
            unset($app['job_title'], $app['job_department']);
        }

        $response->getBody()->write(json_encode(['applications' => $applications]));
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

// Fetch candidate profile for Admin
$app->get('/api/admin/candidate-profiles', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->query('SELECT * FROM candidate_profiles');
        $profiles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['profiles' => $profiles]));
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
    
    try {
        $stmt = $conn->query('SELECT * FROM candidate_documents');
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['documents' => $documents]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'recruitment'));
