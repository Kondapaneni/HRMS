<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Security\OriginationAccess;

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
 * OPTIMIZATION: batched version of getBranchLoanDocumentsFromTable for listing
 * endpoints. The branch applications list previously called
 * getBranchLoanDocumentsFromTable() once per row — for a branch with 50
 * applications that's 50 extra queries. This fetches every matching document
 * for the whole result set in one query; resolveBranchLoanDocumentsForRow()
 * then reproduces the exact same OR-across-3-ids + created_at ASC overwrite
 * behaviour per row from the batch result.
 */
if (!function_exists('getBranchLoanDocumentsBatch')) {
    function getBranchLoanDocumentsBatch($conn, array $rows) {
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
}

if (!function_exists('resolveBranchLoanDocumentsForRow')) {
    function resolveBranchLoanDocumentsForRow(array $docsByAppId, $appId, $uuidId = null, $leadId = null) {
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
        return $docsMap;
    }
}

/**
 * OPTIMIZATION: batched audit-log fetch. The branch applications list
 * previously ran one SELECT against loan_application_audit_logs per row
 * inside a try/catch. Batched into a single query matching on either
 * application_id or loan_application_id across the whole result set, then
 * resolved per row (same ORDER BY created_at ASC as before).
 */
if (!function_exists('getBranchLoanAuditLogsBatch')) {
    function getBranchLoanAuditLogsBatch($conn, array $rows) {
        $appIds = [];
        $rowIds = [];
        foreach ($rows as $r) {
            $appIds[(string)($r['application_id'] ?: $r['id'])] = true;
            $rowIds[(string)$r['id']] = true;
        }
        $appIds = array_keys($appIds);
        $rowIds = array_keys($rowIds);
        if (empty($appIds) && empty($rowIds)) return [];

        $conds = [];
        $params = [];
        if (!empty($appIds)) {
            $conds[] = 'application_id IN (' . implode(',', array_fill(0, count($appIds), '?')) . ')';
            $params = array_merge($params, $appIds);
        }
        if (!empty($rowIds)) {
            $conds[] = 'loan_application_id IN (' . implode(',', array_fill(0, count($rowIds), '?')) . ')';
            $params = array_merge($params, $rowIds);
        }

        $stmt = $conn->prepare('
            SELECT id, application_id, loan_application_id, editor_name, editor_user_id, changes, changes_count, created_at
            FROM public.loan_application_audit_logs
            WHERE ' . implode(' OR ', $conds) . '
            ORDER BY created_at ASC
        ');
        $stmt->execute($params);
        $allLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $logsByKey = [];
        foreach ($allLogs as $log) {
            if (!empty($log['application_id'])) $logsByKey['app:' . $log['application_id']][] = $log;
            if (!empty($log['loan_application_id'])) $logsByKey['row:' . $log['loan_application_id']][] = $log;
        }
        return $logsByKey;
    }
}

if (!function_exists('resolveBranchLoanAuditLogsForRow')) {
    function resolveBranchLoanAuditLogsForRow(array $logsByKey, $appId, $rowId) {
        $matchKey1 = 'app:' . ($appId ?: (string)$rowId);
        $matchKey2 = 'row:' . $rowId;

        $seen = [];
        $logs = [];
        foreach (array_merge($logsByKey[$matchKey1] ?? [], $logsByKey[$matchKey2] ?? []) as $log) {
            if (isset($seen[$log['id']])) continue;
            $seen[$log['id']] = true;
            $logs[] = $log;
        }
        usort($logs, fn($a, $b) => strtotime($a['created_at']) <=> strtotime($b['created_at']));

        foreach ($logs as &$al) {
            if (is_string($al['changes'])) {
                $al['changes'] = json_decode($al['changes'], true) ?: [];
            }
        }
        unset($al);

        return $logs;
    }
}

if (!function_exists('getBranchOperationsTransferTimestamp')) {
    function getBranchOperationsTransferTimestamp($timeline) {
        if (!is_array($timeline)) return null;

        $latestTransfer = null;
        foreach ($timeline as $event) {
            $stage = trim((string)($event['stage'] ?? ($event['title'] ?? '')));
            if (stripos($stage, 'branch operations') !== false) {
                $latestTransfer = $event;
            }
        }

        $timestamp = $latestTransfer['timestamp'] ?? ($latestTransfer['created_at'] ?? null);
        if (!is_string($timestamp) || trim($timestamp) === '') return null;

        try {
            return (new DateTimeImmutable($timestamp))->format('Y-m-d H:i:s.uP');
        } catch (\Exception $e) {
            return null;
        }
    }
}

if (!function_exists('getBranchOperationsTimestampKey')) {
    function getBranchOperationsTimestampKey($timestamp) {
        if (!is_string($timestamp) || trim($timestamp) === '') return null;

        try {
            return (new DateTimeImmutable($timestamp))->format('U.u');
        } catch (\Exception $e) {
            return null;
        }
    }
}

if (!function_exists('isBranchOperationsTransferUnseen')) {
    function isBranchOperationsTransferUnseen($receivedAt, $lastSeenAt) {
        if (getBranchOperationsTimestampKey($receivedAt) === null) return false;
        if (getBranchOperationsTimestampKey($lastSeenAt) === null) return true;

        try {
            return new DateTimeImmutable($lastSeenAt) < new DateTimeImmutable($receivedAt);
        } catch (\Exception $e) {
            return true;
        }
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

        $applicationIds = array_values(array_filter(array_column($rows, 'id')));
        $seenTransferByApplication = [];
        if (!empty($applicationIds)) {
            $placeholders = implode(',', array_fill(0, count($applicationIds), '?'));
            $readStmt = $conn->prepare("
                SELECT item_id, last_seen_at
                FROM public.portal_item_reads
                WHERE user_id = ? AND portal_key = 'branch_operations'
                  AND item_type = 'loan_application'
                  AND item_id IN ($placeholders)
            ");
            $readStmt->execute(array_merge([$userId], $applicationIds));
            foreach ($readStmt->fetchAll(PDO::FETCH_ASSOC) as $readState) {
                $seenTransferByApplication[(string)$readState['item_id']] =
                    $readState['last_seen_at'];
            }
        }

        // OPTIMIZATION: batch-fetch documents and audit logs for every row in
        // this branch's result set up front (2 queries total) instead of doing
        // it inside the per-row loop below (was up to 2 queries per row).
        $docsByAppId = getBranchLoanDocumentsBatch($conn, $rows);
        $auditLogsByKey = getBranchLoanAuditLogsBatch($conn, $rows);

        $applications = [];
        foreach ($rows as $row) {
            $formData = is_string($row['form_data']) ? json_decode($row['form_data'], true) : ($row['form_data'] ?: []);
            $signatures = is_string($row['signatures']) ? json_decode($row['signatures'], true) : ($row['signatures'] ?: []);

            $timeline = $formData['timeline'] ?? [];
            $currentStage = trim($formData['stage'] ?? ($formData['current_stage'] ?? ''));

            // Check if the application has reached Branch Operations stage
            $hasReachedBranchOps = false;

            // 1. Current stage
            if (
                strcasecmp($currentStage, 'Branch Operations') === 0 ||
                stripos($currentStage, 'Branch Operations') !== false
            ) {
                $hasReachedBranchOps = true;
            }

            // 2. Timeline history
            if (!$hasReachedBranchOps && is_array($timeline)) {
                foreach ($timeline as $event) {
                    $stageName = trim($event['stage'] ?? ($event['title'] ?? ''));
                    if (
                        strcasecmp($stageName, 'Branch Operations') === 0 ||
                        stripos($stageName, 'Branch Operations') !== false
                    ) {
                        $hasReachedBranchOps = true;
                        break;
                    }
                }
            }

            // If it hasn't reached Branch Operations stage yet, skip
            if (!$hasReachedBranchOps) {
                continue;
            }

            $receivedAt = getBranchOperationsTransferTimestamp($timeline);
            $lastSeenTransferKey = $seenTransferByApplication[(string)$row['id']] ?? null;
            $isNew = isBranchOperationsTransferUnseen($receivedAt, $lastSeenTransferKey);

            // Resolve documents from the batch fetched above
            $docs = resolveBranchLoanDocumentsForRow($docsByAppId, $row['application_id'], $row['id'], $row['lead_id']);
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

            // Resolve audit logs from the batch fetched above
            $auditLogs = resolveBranchLoanAuditLogsForRow($auditLogsByKey, $row['application_id'], $row['id']);

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
                'is_new' => $isNew,
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
})->add(new AuthMiddleware(['admin'], 'branchOperations'));

$app->post('/api/branch-operations/applications/{id}/seen', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $userId = is_object($decodedToken)
        ? ($decodedToken->id ?? $decodedToken->user_id ?? null)
        : ($decodedToken['id'] ?? $decodedToken['user_id'] ?? null);

    if (!$userId) {
        $response->getBody()->write(json_encode(['error' => 'Unauthorized user']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $applicationId = (string)($args['id'] ?? '');
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $applicationId)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid application ID']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();
        if (!$conn) {
            throw new Exception('Database connection failed');
        }

        $employeeStmt = $conn->prepare('
            SELECT branch
            FROM public.employee
            WHERE "userId" = ?
            LIMIT 1
        ');
        $employeeStmt->execute([$userId]);
        $userBranch = $employeeStmt->fetchColumn();

        if (!$userBranch) {
            $response->getBody()->write(json_encode(['error' => 'No branch assigned to this user']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $applicationStmt = $conn->prepare('
            SELECT id, form_data
            FROM public.loan_applications
            WHERE id = ? AND branch = ?
            LIMIT 1
        ');
        $applicationStmt->execute([$applicationId, $userBranch]);
        $application = $applicationStmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            $response->getBody()->write(json_encode(['error' => 'Application not found in your branch']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $formData = is_string($application['form_data'])
            ? json_decode($application['form_data'], true)
            : ($application['form_data'] ?: []);
        if (!is_array($formData)) $formData = [];
        $latestTransferAt = getBranchOperationsTransferTimestamp($formData['timeline'] ?? []);
        $latestTransferKey = getBranchOperationsTimestampKey($latestTransferAt);
        $body = $request->getParsedBody();
        $requestedTransferKey = getBranchOperationsTimestampKey(
            is_array($body) ? ($body['received_at'] ?? null) : null
        );

        if ($latestTransferKey === null || $requestedTransferKey === null) {
            $response->getBody()->write(json_encode(['error' => 'A valid Branch Operations transfer timestamp is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        if ($requestedTransferKey !== $latestTransferKey) {
            $response->getBody()->write(json_encode(['error' => 'The application transfer has changed. Refresh the application list.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
        }

        $readStmt = $conn->prepare('
            INSERT INTO public.portal_item_reads AS current_read
                (user_id, portal_key, item_type, item_id, last_seen_at, seen_at)
            VALUES (?, ?, ?, ?, ?::timestamptz, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, portal_key, item_type, item_id)
            DO UPDATE SET
                last_seen_at = GREATEST(
                    current_read.last_seen_at,
                    EXCLUDED.last_seen_at
                ),
                seen_at = CURRENT_TIMESTAMP
        ');
        $readStmt->execute([
            $userId,
            'branch_operations',
            'loan_application',
            $applicationId,
            $latestTransferAt
        ]);

        $response->getBody()->write(json_encode(['success' => true]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\PDOException $e) {
        error_log('Database error saving Branch Operations application read state: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Database error while saving application read state']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    } catch (\Exception $e) {
        error_log('Error saving Branch Operations application read state: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'An error occurred while saving application read state']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'branchOperations'));

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

if (!function_exists('getLoanFieldPerson')) {
    function getLoanFieldPerson($key) {
        if (preg_match('/^guarantor_(\d+)_/', $key, $matches)) {
            return "Guarantor {$matches[1]}";
        }

        if (strpos($key, 'co_') === 0) {
            return 'Co-Applicant';
        }

        $applicantFields = [
            'applicant_name', 'phone_number', 'age', 'gender', 'marital_status',
            'father_name', 'mother_name', 'husband_name', 'aadhaar_number',
            'own_house', 'current_address', 'current_street', 'current_city',
            'current_state', 'current_postal_code', 'permanent_address',
            'permanent_street', 'permanent_city', 'permanent_state',
            'permanent_postal_code', 'employment', 'job_name', 'job_address',
            'job_income_per_month', 'business_name', 'business_address',
            'business_income_per_month'
        ];

        return in_array($key, $applicantFields, true) ? 'Applicant' : 'Application';
    }
}

/**
 * PUT /api/branch-operations/applications/{id}
 * Update an existing application's details in Branch Operations and generate an Audit Log of changes.
 *
 * (Unchanged — this endpoint touches exactly one application, so there is no
 * N+1 pattern here to optimize.)
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

        $userId = OriginationAccess::userId($decodedToken);
        $isAdmin = OriginationAccess::isAdmin($decodedToken);

        if (!$userId) {
            $response->getBody()->write(json_encode(['error' => 'Unauthorized user']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        // Fetch editor employee details for the audit log
        $empStmt = $conn->prepare('
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email, e.department, e.position,
                   e.branch, b.name as branch_name
            FROM employee e
            LEFT JOIN branches b ON e.branch = b.id::text
            WHERE e."userId" = ? LIMIT 1
        ');
        $empStmt->execute([$userId]);
        $editorEmp = $empStmt->fetch(PDO::FETCH_ASSOC);

        // SEC-011: No synthetic 'Branch Officer' identity when the caller
        // lacks a real employee profile or branch. Administrators are the only
        // explicit cross-branch exception.
        $actorBranch = $editorEmp['branch'] ?? null;
        if (!$isAdmin && (!$editorEmp || !$actorBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid branch employee profile is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        if (!$editorEmp && $isAdmin) {
            $adminStmt = $conn->prepare('SELECT "firstName", "lastName", email FROM public.users WHERE id = ? LIMIT 1');
            $adminStmt->execute([$userId]);
            $editorEmp = $adminStmt->fetch(PDO::FETCH_ASSOC);
        }
        $editorName = trim(($editorEmp['firstName'] ?? '') . ' ' . ($editorEmp['lastName'] ?? ''));
        if ($editorName === '') $editorName = $editorEmp['email'] ?? 'Administrator';
        $editorRole = $isAdmin ? 'Administrator' : ($editorEmp['position'] ?? 'Branch Operations');

        // Lookup must match the actor's current branch before returning any
        // customer data. A known foreign ID is indistinguishable from missing.
        [$branchWhere, $branchParams] = OriginationAccess::branchScope($decodedToken, $actorBranch);
        $findStmt = $conn->prepare('
            SELECT id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_by, created_at, updated_at
            FROM public.loan_applications
            WHERE (id::text = ? OR application_id = ? OR lead_id = ?)' . $branchWhere . '
            ORDER BY created_at DESC LIMIT 1
        ');
        $findStmt->execute(array_merge([$identifier, $identifier, $identifier], $branchParams));
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
                    'person' => getLoanFieldPerson($key),
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
            WHERE id = ?' . $branchWhere . '
            RETURNING id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
        ');
        $updateStmt->execute(array_merge([
            $jsonPayload,
            $newLoanType,
            $existingApp['id']
        ], $branchParams));
        $updatedRecord = $updateStmt->fetch(PDO::FETCH_ASSOC);

        if (!$updatedRecord) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

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
})->add(new AuthMiddleware(['admin'], 'branchOperations'));
