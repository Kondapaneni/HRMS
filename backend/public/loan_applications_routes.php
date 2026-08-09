<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

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
    $status = trim($data['status'] ?? 'Submitted');
    $formData = $data['form_data'] ?? $data;
    $leadId = $data['lead_id'] ?? $formData['lead_id'] ?? null;

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

        $existingDraft = null;
        if (!empty($leadId)) {
            $checkStmt = $conn->prepare('
                SELECT id, application_id FROM public.loan_applications
                WHERE lead_id = ? AND loan_type = ? AND status = \'Draft\'
                ORDER BY created_at DESC
                LIMIT 1
            ');
            $checkStmt->execute([$leadId, $loanType]);
            $existingDraft = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($existingDraft) {
            $stmt = $conn->prepare('
                UPDATE public.loan_applications
                SET status = ?, form_data = ?::jsonb, updated_at = NOW()
                WHERE id = ?
                RETURNING id, application_id, lead_id, loan_type, status, form_data, created_at, updated_at
            ');
            $stmt->execute([
                $status,
                $jsonPayload,
                $existingDraft['id']
            ]);
        } else {
            $applicationId = 'LA' . random_int(100000, 999999);
            $stmt = $conn->prepare('
                INSERT INTO public.loan_applications (application_id, lead_id, loan_type, status, form_data, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?::jsonb, ?, NOW(), NOW())
                RETURNING id, application_id, lead_id, loan_type, status, form_data, created_at, updated_at
            ');
            
            $stmt->execute([
                $applicationId,
                $leadId,
                $loanType,
                $status,
                $jsonPayload,
                $createdById
            ]);
        }

        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($application && isset($application['form_data']) && is_string($application['form_data'])) {
            $application['form_data'] = json_decode($application['form_data'], true);
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => $status === 'Draft' ? 'Loan application draft saved to database' : 'Loan application submitted successfully',
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
})->add(new \App\Middleware\AuthMiddleware());

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
            SELECT id, application_id, lead_id, loan_type, status, form_data, created_at
            FROM public.loan_applications
            WHERE created_by = ? OR ? = \'admin\'
            ORDER BY created_at DESC
        ');
        
        $stmt->execute([$userId, $userRole]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            if (isset($row['form_data']) && is_string($row['form_data'])) {
                $row['form_data'] = json_decode($row['form_data'], true);
            }
        }

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
})->add(new \App\Middleware\AuthMiddleware());
