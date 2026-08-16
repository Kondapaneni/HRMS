<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/**
 * Helper function to fetch all documents for a loan application from public.loan_documents table.
 */
if (!function_exists('getBranchLoanDocumentsFromTable')) {
    function getBranchLoanDocumentsFromTable($conn, $appId, $uuidId = null, $leadId = null) {
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
        return $docsMap;
    }
}

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

        // Query all applications associated with this employee's branch
        $sql = '
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
                TRIM(CONCAT(e."firstName", \' \', e."lastName")) as creator_name
            FROM public.loan_applications a
            LEFT JOIN public.employee e ON a.created_by::uuid = e."userId"
            WHERE a.branch = :branch
            ORDER BY a.created_at DESC
        ';

        $stmt = $conn->prepare($sql);
        $stmt->execute([':branch' => $userBranch]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $applications = [];
        foreach ($rows as $row) {
            $formData = is_string($row['form_data']) ? json_decode($row['form_data'], true) : ($row['form_data'] ?: []);
            $signatures = is_string($row['signatures']) ? json_decode($row['signatures'], true) : ($row['signatures'] ?: []);
            
            $timeline = $formData['timeline'] ?? [];
            $currentStage = $formData['stage'] ?? '';
            
            // Check if the application has passed through Branch Operations stage in its stage history
            $hasReachedBranchOps = false;

            // 1. Current stage
            if (stripos($currentStage, 'Branch') !== false || stripos($currentStage, 'Operations') !== false) {
                $hasReachedBranchOps = true;
            }

            // 2. Timeline history
            if (is_array($timeline)) {
                foreach ($timeline as $event) {
                    $stageName = $event['stage'] ?? $event['title'] ?? '';
                    if (
                        stripos($stageName, 'Branch') !== false || 
                        stripos($stageName, 'Operations') !== false || 
                        in_array($stageName, ['Branch Operations', 'Credit', 'Operations Review', 'Sanctioned', 'Disbursed'])
                    ) {
                        $hasReachedBranchOps = true;
                        break;
                    }
                }
            }

            // 3. Signatures or status
            if (isset($signatures['Origination']) || isset($signatures['Branch Operations']) || isset($signatures['Credit'])) {
                $hasReachedBranchOps = true;
            }

            if (in_array($row['status'], ['Under Review', 'Approved', 'Rejected', 'Created'])) {
                $hasReachedBranchOps = true;
            }

            // If it hasn't reached Branch Operations stage yet (e.g. pure unsaved draft), skip
            if (!$hasReachedBranchOps) {
                continue;
            }

            // Fetch documents from public.loan_documents table
            $docs = getBranchLoanDocumentsFromTable($conn, $row['application_id'], $row['id'], $row['lead_id']);
            if (isset($formData['documents']) && is_array($formData['documents'])) {
                foreach ($formData['documents'] as $k => $v) {
                    if (!isset($docs[$k]) && !empty($v)) {
                        $docs[$k] = is_array($v) ? $v : ['url' => $v, 'slot_key' => $k];
                    }
                }
            }
            $formData['documents'] = $docs;

            $applicantName = $formData['applicant_name'] ?? $formData['name'] ?? 'N/A';
            $phoneNumber = $formData['phone_number'] ?? $formData['phone'] ?? 'N/A';

            // Fetch audit logs from dedicated public.loan_application_audit_logs table
            $auditLogs = [];
            try {
                $auditStmt = $conn->prepare('
                    SELECT id, application_id, loan_application_id, editor_name, editor_user_id, changes, changes_count, created_at
                    FROM public.loan_application_audit_logs
                    WHERE application_id = ? OR loan_application_id = ?
                    ORDER BY created_at ASC
                ');
                $auditStmt->execute([$row['application_id'] ?: (string)$row['id'], $row['id']]);
                $auditLogs = $auditStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($auditLogs as &$al) {
                    if (is_string($al['changes'])) {
                        $al['changes'] = json_decode($al['changes'], true) ?: [];
                    }
                }
            } catch (\Exception $e) {
                error_log("Error fetching loan audit logs: " . $e->getMessage());
            }

            // Strip any legacy edit_logs from form_data
            unset($formData['edit_logs']);

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
                'documents' => $docs,
                'stage_history' => $timeline,
                'audit_logs' => $auditLogs
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
        $response->getBody()->write(json_encode(['error' => 'Database error while fetching branch applications: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error fetching branch operations applications: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching branch applications: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

/**
 * Helper to map form keys to friendly labels for Audit Logs.
 */
if (!function_exists('getLoanFieldFriendlyLabel')) {
    function getLoanFieldFriendlyLabel($key) {
        $labels = [
            'applicant_name' => 'Applicant Name',
            'phone_number' => 'Phone Number',
            'age' => 'Age',
            'gender' => 'Gender',
            'marital_status' => 'Marital Status',
            'father_name' => 'Father Name',
            'mother_name' => 'Mother Name',
            'husband_name' => 'Husband Name',
            'aadhaar_number' => 'Aadhaar Number',
            'own_house' => 'Own House',
            'current_address' => 'Current Address',
            'current_street' => 'Current Street',
            'current_city' => 'Current City',
            'current_state' => 'Current State',
            'current_postal_code' => 'Current PIN Code',
            'permanent_address' => 'Permanent Address',
            'permanent_street' => 'Permanent Street',
            'permanent_city' => 'Permanent City',
            'permanent_state' => 'Permanent State',
            'permanent_postal_code' => 'Permanent PIN Code',
            'employment' => 'Employment Type',
            'job_name' => 'Company / Employer Name',
            'job_address' => 'Employer Address',
            'job_income_per_month' => 'Monthly Salary / Job Income',
            'business_name' => 'Business Name',
            'business_address' => 'Business Address',
            'business_income_per_month' => 'Monthly Business Income',
            'has_co_applicant' => 'Has Co-Applicant',
            'co_applicant_name' => 'Co-Applicant Name',
            'co_relation_with_applicant' => 'Co-Applicant Relation',
            'co_phone_number' => 'Co-Applicant Phone',
            'co_aadhaar_number' => 'Co-Applicant Aadhaar',
            'co_age' => 'Co-Applicant Age',
            'co_gender' => 'Co-Applicant Gender',
            'co_marital_status' => 'Co-Applicant Marital Status',
            'co_father_name' => 'Co-Applicant Father Name',
            'co_mother_name' => 'Co-Applicant Mother Name',
            'co_husband_name' => 'Co-Applicant Husband Name',
            'co_own_house' => 'Co-Applicant Own House',
            'co_current_address' => 'Co-Applicant Current Address',
            'co_current_street' => 'Co-Applicant Current Street',
            'co_current_city' => 'Co-Applicant Current City',
            'co_current_state' => 'Co-Applicant Current State',
            'co_current_postal_code' => 'Co-Applicant PIN Code',
            'co_permanent_address' => 'Co-Applicant Permanent Address',
            'co_permanent_street' => 'Co-Applicant Permanent Street',
            'co_permanent_city' => 'Co-Applicant Permanent City',
            'co_permanent_state' => 'Co-Applicant Permanent State',
            'co_permanent_postal_code' => 'Co-Applicant Permanent PIN Code',
            'co_employment' => 'Co-Applicant Employment',
            'co_job_name' => 'Co-Applicant Employer Name',
            'co_job_address' => 'Co-Applicant Employer Address',
            'co_job_income_per_month' => 'Co-Applicant Monthly Salary',
            'co_business_name' => 'Co-Applicant Business Name',
            'co_business_address' => 'Co-Applicant Business Address',
            'co_business_income_per_month' => 'Co-Applicant Monthly Business Income',
        ];

        foreach ([1, 2, 3] as $gIdx) {
            $pfx = "guarantor_{$gIdx}_";
            $labels[$pfx . 'name'] = "Guarantor {$gIdx} Name";
            $labels[$pfx . 'phone_number'] = "Guarantor {$gIdx} Phone";
            $labels[$pfx . 'aadhaar_number'] = "Guarantor {$gIdx} Aadhaar";
            $labels[$pfx . 'age'] = "Guarantor {$gIdx} Age";
            $labels[$pfx . 'gender'] = "Guarantor {$gIdx} Gender";
            $labels[$pfx . 'marital_status'] = "Guarantor {$gIdx} Marital Status";
            $labels[$pfx . 'father_name'] = "Guarantor {$gIdx} Father Name";
            $labels[$pfx . 'mother_name'] = "Guarantor {$gIdx} Mother Name";
            $labels[$pfx . 'husband_name'] = "Guarantor {$gIdx} Husband Name";
            $labels[$pfx . 'own_house'] = "Guarantor {$gIdx} Own House";
            $labels[$pfx . 'current_address'] = "Guarantor {$gIdx} Current Address";
            $labels[$pfx . 'current_street'] = "Guarantor {$gIdx} Current Street";
            $labels[$pfx . 'current_city'] = "Guarantor {$gIdx} Current City";
            $labels[$pfx . 'current_state'] = "Guarantor {$gIdx} Current State";
            $labels[$pfx . 'current_postal_code'] = "Guarantor {$gIdx} Current PIN Code";
            $labels[$pfx . 'permanent_address'] = "Guarantor {$gIdx} Permanent Address";
            $labels[$pfx . 'permanent_street'] = "Guarantor {$gIdx} Permanent Street";
            $labels[$pfx . 'permanent_city'] = "Guarantor {$gIdx} Permanent City";
            $labels[$pfx . 'permanent_state'] = "Guarantor {$gIdx} Permanent State";
            $labels[$pfx . 'permanent_postal_code'] = "Guarantor {$gIdx} Permanent PIN Code";
            $labels[$pfx . 'employment'] = "Guarantor {$gIdx} Employment";
            $labels[$pfx . 'job_name'] = "Guarantor {$gIdx} Employer Name";
            $labels[$pfx . 'job_address'] = "Guarantor {$gIdx} Employer Address";
            $labels[$pfx . 'job_income_per_month'] = "Guarantor {$gIdx} Monthly Salary";
            $labels[$pfx . 'business_name'] = "Guarantor {$gIdx} Business Name";
            $labels[$pfx . 'business_address'] = "Guarantor {$gIdx} Business Address";
            $labels[$pfx . 'business_income_per_month'] = "Guarantor {$gIdx} Monthly Business Income";
        }

        if (isset($labels[$key])) {
            return $labels[$key];
        }

        return ucwords(str_replace('_', ' ', $key));
    }
}

/**
 * PUT /api/branch-operations/applications/{id}
 * Update an existing application's details in Branch Operations and generate an Audit Log of changes.
 */
$app->put('/api/branch-operations/applications/{id}', function (Request $request, Response $response, $args) {
    $identifier = $args['id'];
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();

    if (!is_array($data)) {
        $raw = (string)$request->getBody();
        $data = json_decode($raw, true) ?: [];
    }

    $submittedFormData = $data['form_data'] ?? [];
    $loanType = $data['loan_type'] ?? null;

    if (empty($submittedFormData) || !is_array($submittedFormData)) {
        $response->getBody()->write(json_encode(['error' => 'Form data is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();

        $userId = is_object($decodedToken) 
            ? ($decodedToken->id ?? $decodedToken->user_id ?? null) 
            : ($decodedToken['id'] ?? $decodedToken['user_id'] ?? null);

        if (!$userId) {
            $response->getBody()->write(json_encode(['error' => 'Unauthorized user']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        // Fetch editor employee details for the audit log
        $empStmt = $conn->prepare('
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email, e.department, e.position,
                   b.name as branch_name 
            FROM employee e 
            LEFT JOIN branches b ON e.branch::uuid = b.id 
            WHERE e."userId" = ? LIMIT 1
        ');
        $empStmt->execute([$userId]);
        $editorEmp = $empStmt->fetch(PDO::FETCH_ASSOC);

        $editorName = 'Branch Officer';
        if ($editorEmp) {
            $editorName = trim(($editorEmp['firstName'] ?? '') . ' ' . ($editorEmp['lastName'] ?? ''));
            if (empty($editorName)) $editorName = $editorEmp['email'] ?? 'Branch Officer';
        }
        $editorRole = $editorEmp['position'] ?? 'Branch Operations';

        // Fetch existing application
        $findStmt = $conn->prepare('
            SELECT id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_by, created_at, updated_at
            FROM public.loan_applications
            WHERE id::text = ? OR application_id = ? OR lead_id = ?
            ORDER BY created_at DESC
            LIMIT 1
        ');
        $findStmt->execute([$identifier, $identifier, $identifier]);
        $existingApp = $findStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingApp) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $oldFormData = is_string($existingApp['form_data']) 
            ? json_decode($existingApp['form_data'], true) 
            : ($existingApp['form_data'] ?: []);

        // Compute field-by-field diff between old and new form data
        $changes = [];
        $ignoreKeys = [
            'timeline', 'documents', 'edit_logs', 'stage_history', 'signatures',
            'created_at', 'updated_at', 'id', 'application_id', 'lead_id',
            'loan_type', 'status', 'stage', 'branch', 'branch_name',
            'created_by', 'creator_name', 'from'
        ];
        $allKeys = array_unique(array_merge(array_keys($oldFormData), array_keys($submittedFormData)));

        foreach ($allKeys as $key) {
            if (in_array(strtolower($key), $ignoreKeys)) continue;
            
            $oldVal = isset($oldFormData[$key]) ? (string)$oldFormData[$key] : '';
            $newVal = isset($submittedFormData[$key]) ? (string)$submittedFormData[$key] : '';

            $oldTrim = trim($oldVal);
            $newTrim = trim($newVal);

            if ($oldTrim !== $newTrim) {
                $changes[] = [
                    'field' => $key,
                    'label' => getLoanFieldFriendlyLabel($key),
                    'old_value' => $oldTrim !== '' ? $oldTrim : '—',
                    'new_value' => $newTrim !== '' ? $newTrim : '—'
                ];
            }
        }

        // Clean new form data (removing nulls, empty strings, and audit logs)
        $cleanedFormData = [];
        $keysToStrip = ['documents', 'edit_logs'];
        foreach ($submittedFormData as $k => $v) {
            if (in_array($k, $keysToStrip)) continue;
            if ($v !== null && !(is_string($v) && trim($v) === '')) {
                $cleanedFormData[$k] = $v;
            }
        }

        // Preserve original stage timeline only (excluding any edit events)
        $existingTimeline = $oldFormData['timeline'] ?? [];
        if (!is_array($existingTimeline)) $existingTimeline = [];
        $cleanTimeline = [];
        foreach ($existingTimeline as $ev) {
            if (isset($ev['stage']) && $ev['stage'] === 'Application Updated') continue;
            if (isset($ev['action']) && stripos($ev['action'], 'Modified') !== false) continue;
            $cleanTimeline[] = $ev;
        }
        $cleanedFormData['timeline'] = $cleanTimeline;
        unset($cleanedFormData['edit_logs']);

        // If changes were detected, save ONLY to dedicated public.loan_application_audit_logs table
        if (!empty($changes)) {
            // Save to dedicated public.loan_application_audit_logs table
            try {
                $auditStmt = $conn->prepare('
                    INSERT INTO public.loan_application_audit_logs (
                        application_id, loan_application_id, editor_name, editor_user_id, changes, changes_count, created_at
                    ) VALUES (?, ?, ?, ?, ?::jsonb, ?, NOW())
                ');
                $auditStmt->execute([
                    $existingApp['application_id'] ?: (string)$existingApp['id'],
                    $existingApp['id'],
                    $editorName,
                    $userId ? (string)$userId : null,
                    json_encode($changes, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    count($changes)
                ]);
            } catch (\Exception $e) {
                error_log("Error saving loan application audit log to table: " . $e->getMessage());
            }
        }

        // Preserve application ID & loan type
        if (!empty($existingApp['application_id'])) {
            $cleanedFormData['application_id'] = $existingApp['application_id'];
        }
        if ($loanType) {
            $cleanedFormData['loan_type'] = $loanType;
        }

        $newApplicantName = $cleanedFormData['applicant_name'] ?? $oldFormData['applicant_name'] ?? $existingApp['applicant_name'] ?? '';
        $newPhone = $cleanedFormData['phone_number'] ?? $oldFormData['phone_number'] ?? $existingApp['phone_number'] ?? '';
        $newLoanType = $loanType ?: ($existingApp['loan_type'] ?: 'Personal Loan');

        $jsonPayload = json_encode($cleanedFormData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $updateStmt = $conn->prepare('
            UPDATE public.loan_applications
            SET form_data = ?::jsonb,
                loan_type = ?,
                updated_at = NOW()
            WHERE id = ?
            RETURNING id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
        ');
        $updateStmt->execute([
            $jsonPayload,
            $newLoanType,
            $existingApp['id']
        ]);
        $updatedRecord = $updateStmt->fetch(PDO::FETCH_ASSOC);

        if ($updatedRecord) {
            if (isset($updatedRecord['form_data']) && is_string($updatedRecord['form_data'])) {
                $updatedRecord['form_data'] = json_decode($updatedRecord['form_data'], true);
            }
            if (isset($updatedRecord['signatures']) && is_string($updatedRecord['signatures'])) {
                $updatedRecord['signatures'] = json_decode($updatedRecord['signatures'], true);
            }
            $updatedRecord['documents'] = getBranchLoanDocumentsFromTable($conn, $updatedRecord['application_id'], $updatedRecord['id'], $updatedRecord['lead_id']);

            // Fetch audit logs from dedicated table
            $auditLogs = [];
            try {
                $auditStmt = $conn->prepare('
                    SELECT id, application_id, loan_application_id, editor_name, editor_user_id, changes, changes_count, created_at
                    FROM public.loan_application_audit_logs
                    WHERE application_id = ? OR loan_application_id = ?
                    ORDER BY created_at ASC
                ');
                $auditStmt->execute([$existingApp['application_id'] ?: (string)$existingApp['id'], $existingApp['id']]);
                $auditLogs = $auditStmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($auditLogs as &$al) {
                    if (is_string($al['changes'])) {
                        $al['changes'] = json_decode($al['changes'], true) ?: [];
                    }
                }
            } catch (\Exception $e) {
                error_log("Error fetching loan audit logs: " . $e->getMessage());
            }
            $updatedRecord['audit_logs'] = $auditLogs;
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => !empty($changes) ? 'Application updated successfully with audit trail' : 'Application saved (no changes detected)',
            'application' => $updatedRecord,
            'changes_count' => count($changes),
            'changes' => $changes
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\PDOException $e) {
        error_log("Database error updating loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while updating application: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log("Error updating loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while updating application: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

