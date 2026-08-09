<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

/**
 * Endpoint to submit or save draft for a loan application.
 * Stores complete form submission/draft as JSON in public.loan_applications table.
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

    // Fallback extracts if not provided at top-level
    if (empty($applicantName) && !empty($formData['applicant_name'])) {
        $applicantName = trim($formData['applicant_name']);
    }
    if (empty($phoneNumber) && !empty($formData['phone_number'])) {
        $phoneNumber = trim($formData['phone_number']);
    }

    // For drafts, allow default placeholder if applicant name / phone not provided yet
    if ($status === 'Draft') {
        if (empty($applicantName)) $applicantName = 'Draft Applicant';
        if (empty($phoneNumber)) $phoneNumber = '0000000000';
    }

    if (empty($applicantName) || empty($phoneNumber)) {
        $response->getBody()->write(json_encode([
            'error' => 'Applicant Name and Phone Number are required.'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $jsonPayload = json_encode($formData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $createdById = $user ? ($user->id ?? null) : null;

        $stmt = $conn->prepare('
            INSERT INTO public.loan_applications (loan_type, applicant_name, phone_number, status, form_data, created_by, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?::jsonb, ?, NOW(), NOW())
            RETURNING id, loan_type, applicant_name, phone_number, status, form_data, created_at
        ');
        
        $stmt->execute([
            $loanType,
            $applicantName,
            $phoneNumber,
            $status,
            $jsonPayload,
            $createdById
        ]);

        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($application && isset($application['form_data']) && is_string($application['form_data'])) {
            $application['form_data'] = json_decode($application['form_data'], true);
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => $status === 'Draft' ? 'Loan application draft saved successfully' : 'Loan application submitted successfully',
            'application' => $application
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
        
    } catch (\PDOException $e) {
        error_log("Database error submitting loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while saving loan application: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error submitting loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while saving the loan application']));
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

        $stmt = $conn->prepare('
            SELECT id, loan_type, applicant_name, phone_number, status, form_data, created_at
            FROM public.loan_applications
            WHERE created_by = ? OR ? = \'admin\'
            ORDER BY created_at DESC
        ');
        
        $stmt->execute([$user->id, $user->role ?? 'employee']);
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
