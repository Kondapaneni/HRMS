<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get Candidate Profile
$app->get('/api/candidate/profile', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->prepare('SELECT * FROM candidate_profiles WHERE user_id = ?');
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
                SET phone = ?, address = ?, current_title = ?, experience = ?, bio = ?, resume_url = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ');
            $stmtUpdate->execute([
                $data['phone'] ?? null,
                $data['address'] ?? null,
                $data['currentTitle'] ?? null,
                $data['experience'] ?? null,
                $data['bio'] ?? null,
                isset($data['resumes']) ? json_encode($data['resumes']) : null,
                $data['avatar'] ?? null,
                $decodedToken->id
            ]);
        } else {
            $stmtInsert = $conn->prepare('
                INSERT INTO candidate_profiles (user_id, phone, address, current_title, experience, bio, resume_url, avatar_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ');
            $stmtInsert->execute([
                $decodedToken->id,
                $data['phone'] ?? null,
                $data['address'] ?? null,
                $data['currentTitle'] ?? null,
                $data['experience'] ?? null,
                $data['bio'] ?? null,
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
        $stmt = $conn->prepare('SELECT * FROM candidate_documents WHERE candidate_id = ? ORDER BY uploaded_at DESC');
        $stmt->execute([$decodedToken->id]);
        $documents = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['documents' => $documents]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
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
        $stmtGet = $conn->prepare('SELECT * FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
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
        $stmtDelete = $conn->prepare('DELETE FROM candidate_documents WHERE candidate_id = ? AND document_type = ?');
        $stmtDelete->execute([$decodedToken->id, $docTypeId]);

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
    
    try {
        $stmt = $conn->query('SELECT * FROM jobs WHERE status = \'Published\' ORDER BY created_at DESC');
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode(['jobs' => $jobs]));
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
    
    try {
        // Fetch applications with job details and timeline
        $stmt = $conn->prepare('
            SELECT a.*, j.title as job_title, j.department as job_department 
            FROM applications a 
            JOIN jobs j ON a.job_id = j.id 
            WHERE a.candidate_id = ? 
            ORDER BY a.applied_date DESC
        ');
        $stmt->execute([$decodedToken->id]);
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
})->add(new AuthMiddleware(['candidate', 'employee']));

// Apply for a Job
$app->post('/api/candidate/applications', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    
    $jobId = $data['job_id'] ?? null;
    $resumeUrl = $data['resume_url'] ?? null;
    
    if (!$jobId) {
        $response->getBody()->write(json_encode(['error' => 'Job ID is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
    
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $conn->beginTransaction();

        $stmtInsertApp = $conn->prepare('
            INSERT INTO applications (job_id, candidate_id, resume_url, status) 
            VALUES (?, ?, ?, \'Applied\') RETURNING id
        ');
        $stmtInsertApp->execute([$jobId, $decodedToken->id, $resumeUrl]);
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
            $frontendUrl = $_ENV['FRONTEND_URL'] ?? 'https://hrms-qwv3.onrender.com';
            $dashboardLink = rtrim($frontendUrl, '/') . '/candidate/applications';
            
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
        $stmtGet = $conn->prepare('SELECT * FROM applications WHERE id = ?');
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
