<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/**
 * Branch Operations Loan Applications Routes
 * Scoped strictly to the logged-in employee's branch.
 * Displays applications that have reached the Branch Operations stage at any point in their stage transition history.
 */
$app->get('/api/branch-operations/applications', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        if (!$conn) {
            throw new Exception("Database connection failed");
        }

        $userId = is_object($decodedToken) 
            ? ($decodedToken->id ?? $decodedToken->user_id ?? null) 
            : ($decodedToken['id'] ?? $decodedToken['user_id'] ?? null);

        if (!$userId) {
            $response->getBody()->write(json_encode(['error' => 'Unauthorized user']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        // Fetch user's assigned branch matching employee_profile_routes.php
        $empStmt = $conn->prepare('
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email, e.department, e.position, e.branch,
                   b.name as branch_name 
            FROM employee e 
            LEFT JOIN branches b ON e.branch::uuid = b.id 
            WHERE e."userId" = ? LIMIT 1
        ');
        $empStmt->execute([$userId]);
        $emp = $empStmt->fetch(PDO::FETCH_ASSOC);

        if (!$emp) {
            $response->getBody()->write(json_encode(['error' => 'Employee profile not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $userBranch = $emp['branch'] ?? null;
        $userBranchName = $emp['branch_name'] ?? 'Assigned Branch';

        if (empty($userBranch)) {
            $response->getBody()->write(json_encode([
                'success' => true,
                'branch' => ['id' => null, 'name' => 'No Branch Assigned'],
                'applications' => [],
                'count' => 0
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        }

        // Query applications for this branch that have reached Branch Operations stage in their history
        $sql = "
            SELECT 
                a.id,
                a.application_id,
                a.lead_id,
                a.loan_type,
                a.status,
                a.form_data,
                a.branch,
                a.signatures,
                a.created_by,
                a.created_at,
                a.updated_at,
                TRIM(CONCAT(e.\"firstName\", ' ', e.\"lastName\")) as creator_name
            FROM public.loan_applications a
            LEFT JOIN public.employee e ON a.created_by::uuid = e.\"userId\"
            WHERE a.branch = :branch
              AND (
                -- 1. Check if timeline has an event for Branch Operations
                EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(COALESCE(a.form_data->'timeline', '[]'::jsonb)) AS elem
                    WHERE elem->>'stage' ILIKE '%Branch Operations%' OR elem->>'stage' ILIKE '%branch%'
                )
                -- 2. Or form_data stage is Branch Operations
                OR a.form_data->>'stage' ILIKE '%Branch Operations%'
                -- 3. Or status is Under Review (transferred to branch operations)
                OR a.status = 'Under Review'
                -- 4. Or signatures indicate transfer from Origination
                OR COALESCE(a.signatures ? 'Origination', false) = true
                -- 5. Or stage history includes subsequent stages (Credit, Operations Review, Sanctioned, Disbursed)
                OR EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(COALESCE(a.form_data->'timeline', '[]'::jsonb)) AS elem
                    WHERE elem->>'stage' IN ('Branch Operations', 'Credit', 'Operations Review', 'Sanctioned', 'Disbursed')
                )
                -- 6. Or non-draft applications in this branch
                OR (a.branch IS NOT NULL AND a.status IN ('Created', 'Under Review', 'Approved', 'Rejected'))
              )
            ORDER BY a.created_at DESC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute([':branch' => $userBranch]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $applications = [];
        foreach ($rows as $row) {
            $formData = is_string($row['form_data']) ? json_decode($row['form_data'], true) : ($row['form_data'] ?: []);
            $signatures = is_string($row['signatures']) ? json_decode($row['signatures'], true) : ($row['signatures'] ?: []);
            
            $applicantName = $formData['applicant_name'] ?? $formData['name'] ?? 'N/A';
            $phoneNumber = $formData['phone_number'] ?? $formData['phone'] ?? 'N/A';
            $timeline = $formData['timeline'] ?? [];

            $applications[] = [
                'id' => $row['id'],
                'application_id' => $row['application_id'] ?: 'LA-PENDING',
                'lead_id' => $row['lead_id'],
                'applicant_name' => $applicantName,
                'phone_number' => $phoneNumber,
                'loan_type' => $row['loan_type'] ?: ($formData['loan_type'] ?? 'Personal Loan'),
                'status' => $row['status'] ?: 'Under Review',
                'branch' => $row['branch'],
                'created_by' => $row['created_by'],
                'creator_name' => !empty($row['creator_name']) ? $row['creator_name'] : 'Branch Officer',
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
                'form_data' => $formData,
                'signatures' => $signatures,
                'stage_history' => $timeline
            ];
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'branch' => [
                'id' => $userBranch,
                'name' => $userBranchName
            ],
            'applications' => $applications,
            'count' => count($applications)
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\PDOException $e) {
        error_log("Database error fetching branch operations applications: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while fetching branch applications']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error fetching branch operations applications: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching branch applications']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());
