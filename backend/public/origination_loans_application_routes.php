<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Security\OriginationAccess;

/**
 * Helper function to fetch all documents for a loan application from public.loan_documents table.
 */
function getLoanDocumentsFromTable($conn, $appId, $uuidId = null, $leadId = null) {
    if (empty($appId) && empty($uuidId) && empty($leadId)) return [];

    $stmt = $conn->prepare('
        SELECT slot_key, url
        FROM public.loan_documents
        WHERE application_id = ? OR application_id = ? OR application_id = ?
        ORDER BY created_at ASC
    ');
    $safeLeadId = OriginationAccess::uniqueLeadDocumentKey($conn, $leadId);
    $stmt->execute([(string)$appId, (string)$uuidId, (string)$safeLeadId]);
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

/**
 * OPTIMIZATION: batched version of getLoanDocumentsFromTable for listing endpoints.
 * The original list endpoint called getLoanDocumentsFromTable() once per row (N+1
 * queries). This fetches every matching document in a single query, then resolves
 * per-row maps in PHP — same OR-across-3-ids matching, same created_at ASC
 * overwrite-order behaviour, just one round trip for the whole list.
 */
function getLoanDocumentsBatch($conn, array $rows) {
    $allIds = [];
    $ambiguousLeadKeys = OriginationAccess::duplicateLeadDocumentKeys($conn, $rows);
    foreach ($rows as $r) {
        foreach ([$r['application_id'] ?? null, $r['id'] ?? null] as $v) {
            if (!empty($v)) $allIds[(string)$v] = true;
        }
        if (!empty($r['lead_id']) && !isset($ambiguousLeadKeys[(string)$r['lead_id']])) {
            $allIds[(string)$r['lead_id']] = true;
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

/**
 * Resolves the per-row documents map from the batch result, preserving the
 * original OR-across-3-ids matching + created_at ASC overwrite order.
 */
function resolveLoanDocumentsForRow(array $docsByAppId, $appId, $uuidId = null, $leadId = null) {
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

/**
 * Helper function to upsert documents into public.loan_documents table.
 */
function upsertLoanDocumentsToTable($conn, $appId, array $documents) {
    if (empty($documents) || empty($appId)) return;

    $upsertStmt = $conn->prepare('
        INSERT INTO public.loan_documents (application_id, slot_key, url, updated_at)
        VALUES (?, ?, ?, NOW())
        ON CONFLICT (application_id, slot_key) DO UPDATE SET
            url = EXCLUDED.url,
            updated_at = NOW()
    ');

    foreach ($documents as $slotKey => $doc) {
        $url = is_array($doc) ? ($doc['url'] ?? $doc['proxy_url'] ?? '') : (is_string($doc) ? $doc : '');
        if (empty($url)) continue;

        $upsertStmt->execute([
            (string)$appId,
            (string)$slotKey,
            (string)$url
        ]);
    }
}

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
    $status = trim($data['status'] ?? 'Created');
    // Loan originators can save a draft or submit it for processing, but may
    // not self-approve a financial application or invent a privileged status.
    if (!OriginationAccess::isAdmin($user) && !in_array($status, ['Draft', 'Created'], true)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid loan origination status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }
    $formData = $data['form_data'] ?? $data;
    $leadId = $data['lead_id'] ?? $formData['lead_id'] ?? null;
    $documents = $data['documents'] ?? $formData['documents'] ?? [];

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
            if ($k === 'documents') continue; // Stored in dedicated loan_documents table
            if ($v !== null && !(is_string($v) && trim($v) === '')) {
                $cleanedFormData[$k] = $v;
            }
        }

        // Origination staff cannot declare that their own draft has reached
        // Branch Operations. Stage history is advanced only through the
        // separately validated status-transfer endpoint.
        if (!OriginationAccess::isAdmin($user)) {
            unset($cleanedFormData['stage'], $cleanedFormData['current_stage'],
                  $cleanedFormData['timeline'], $cleanedFormData['created_by'],
                  $cleanedFormData['branch']);
        }

        $jsonPayload = json_encode($cleanedFormData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        // SEC-011: Never trust form_data.created_by or form_data.branch.
        $createdById = OriginationAccess::userId($user);
        $userBranch = $createdById ? OriginationAccess::branch($conn, $createdById) : null;
        if (!$createdById || (!OriginationAccess::isAdmin($user) && !$userBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // A lead may be linked only if it belongs to this creator/branch.
        if (!empty($leadId) && !OriginationAccess::isAdmin($user)) {
            $leadStmt = $conn->prepare('
                SELECT 1 FROM public.loan_leads
                WHERE id::text = ? AND created_by = ? AND branch = ? LIMIT 1
            ');
            $leadStmt->execute([(string)$leadId, $createdById, $userBranch]);
            if (!$leadStmt->fetchColumn()) {
                $response->getBody()->write(json_encode(['error' => 'Lead not found']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }
        }

        $existingDraft = null;
        $appId = $data['id'] ?? $data['application_id'] ?? $formData['id'] ?? $formData['application_id'] ?? null;
        if (!empty($appId)) {
            $existingDraft = OriginationAccess::findLoan($conn, (string)$appId, $user, $userBranch, true);
            if (!$existingDraft) {
                // If the caller supplied an existing application identifier
                // that isn't an editable own draft, refuse instead of silently
                // creating a fresh record linked to someone else's identity.
                $anyStmt = $conn->prepare('
                    SELECT 1 FROM public.loan_applications
                    WHERE id::text = ? OR application_id = ? LIMIT 1
                ');
                $anyStmt->execute([(string)$appId, (string)$appId]);
                if ($anyStmt->fetchColumn()) {
                    $response->getBody()->write(json_encode(['error' => 'Draft not found']));
                    return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
                }
            }
        }

        if (!$existingDraft && !empty($leadId)) {
            [$draftScope, $draftArgs] = OriginationAccess::loanScope($user, $userBranch);
            $checkStmt = $conn->prepare("
                SELECT id, application_id FROM public.loan_applications
                WHERE lead_id = ? AND loan_type = ? AND status = 'Draft'
                {$draftScope}
                ORDER BY created_at DESC LIMIT 1
            ");
            $checkStmt->execute(array_merge([$leadId, $loanType], $draftArgs));
            $existingDraft = $checkStmt->fetch(PDO::FETCH_ASSOC);
        }

        if ($existingDraft) {
            [$writeScope, $writeArgs] = OriginationAccess::loanScope($user, $userBranch);
            $stmt = $conn->prepare("
                UPDATE public.loan_applications
                SET status = ?, form_data = ?::jsonb, updated_at = NOW()
                WHERE id = ? {$writeScope}
                RETURNING id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
            ");
            $stmt->execute(array_merge([
                $status,
                $jsonPayload,
                $existingDraft['id']
            ], $writeArgs));
        } else {
            $applicationId = 'LA' . random_int(100000, 999999);
            $stmt = $conn->prepare('
                INSERT INTO public.loan_applications (application_id, lead_id, loan_type, status, form_data, branch, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?::jsonb, ?, ?, NOW(), NOW())
                RETURNING id, application_id, lead_id, loan_type, status, form_data, branch, signatures, created_at, updated_at
            ');

            $stmt->execute([
                $applicationId,
                $leadId,
                $loanType,
                $status,
                $jsonPayload,
                $userBranch,
                $createdById
            ]);
        }

        $application = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$application) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        if ($application) {
            if (isset($application['form_data']) && is_string($application['form_data'])) {
                $application['form_data'] = json_decode($application['form_data'], true);
            }
            if (isset($application['signatures']) && is_string($application['signatures'])) {
                $application['signatures'] = json_decode($application['signatures'], true);
            }

            $appId = $application['application_id'] ?: $application['id'];
            if (is_array($documents) && !empty($documents)) {
                upsertLoanDocumentsToTable($conn, $appId, $documents);
            }
            $application['documents'] = getLoanDocumentsFromTable($conn, $appId, $application['id'], $application['lead_id']);
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => $status === 'Draft' ? 'Loan application draft saved to database' : 'Loan application created successfully',
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
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Endpoint to list submitted & draft loan applications.
 */
$app->get('/api/loans/applications', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');

    try {
        $db = new Database();
        $conn = $db->getConnection();

        $userId = OriginationAccess::userId($user);
        $userBranch = $userId ? OriginationAccess::branch($conn, $userId) : null;
        if (!$userId || (!OriginationAccess::isAdmin($user) && !$userBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        [$readScope, $readArgs] = OriginationAccess::loanScope($user, $userBranch, 'la');

        $stmt = $conn->prepare('
            SELECT 
                la.id, 
                la.application_id, 
                la.lead_id, 
                la.loan_type, 
                la.status, 
                la.form_data, 
                la.branch, 
                b.name AS branch_name, 
                la.signatures, 
                la.created_at, 
                la.updated_at
            FROM public.loan_applications la
            LEFT JOIN public.branches b ON (
                la.branch = b.id::text OR 
                (la.branch ~ \'^[0-9a-fA-F-]{36}$\' AND la.branch::uuid = b.id)
            )
            WHERE TRUE
        ' . $readScope . '
            ORDER BY la.created_at DESC
        ');

        $stmt->execute($readArgs);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // OPTIMIZATION: fetch documents for every row in one query instead of
        // one query per row (was N+1 — a list of 50 applications meant 51 queries).
        $docsByAppId = getLoanDocumentsBatch($conn, $rows);

        $applicationIds = [];
        $rowIds = [];
        foreach ($rows as $row) {
            $applicationIds[(string)($row['application_id'] ?: $row['id'])] = true;
            $rowIds[(string)$row['id']] = true;
        }

        $auditLogsByKey = [];
        if ($applicationIds || $rowIds) {
            $applicationIds = array_keys($applicationIds);
            $rowIds = array_keys($rowIds);
            $auditConditions = [];
            $auditParams = [];

            if ($applicationIds) {
                $auditConditions[] = 'application_id IN (' . implode(',', array_fill(0, count($applicationIds), '?')) . ')';
                $auditParams = array_merge($auditParams, $applicationIds);
            }
            if ($rowIds) {
                $auditConditions[] = 'loan_application_id IN (' . implode(',', array_fill(0, count($rowIds), '?')) . ')';
                $auditParams = array_merge($auditParams, $rowIds);
            }

            $auditStmt = $conn->prepare('
                SELECT id, application_id, loan_application_id, editor_name, editor_user_id,
                       changes, changes_count, created_at
                FROM public.loan_application_audit_logs
                WHERE ' . implode(' OR ', $auditConditions) . '
                ORDER BY created_at ASC
            ');
            $auditStmt->execute($auditParams);

            foreach ($auditStmt->fetchAll(PDO::FETCH_ASSOC) as $auditLog) {
                if (!empty($auditLog['application_id'])) {
                    $auditLogsByKey['app:' . $auditLog['application_id']][] = $auditLog;
                }
                if (!empty($auditLog['loan_application_id'])) {
                    $auditLogsByKey['row:' . $auditLog['loan_application_id']][] = $auditLog;
                }
            }
        }

        foreach ($rows as &$row) {
            if (isset($row['form_data']) && is_string($row['form_data'])) {
                $row['form_data'] = json_decode($row['form_data'], true);
            }
            if (isset($row['signatures']) && is_string($row['signatures'])) {
                $row['signatures'] = json_decode($row['signatures'], true);
            }
            $row['documents'] = resolveLoanDocumentsForRow($docsByAppId, $row['application_id'], $row['id'], $row['lead_id']);

            $auditLogs = [];
            $seenAuditLogIds = [];
            $auditKeys = [
                'app:' . ($row['application_id'] ?: (string)$row['id']),
                'row:' . $row['id'],
            ];
            foreach ($auditKeys as $auditKey) {
                foreach ($auditLogsByKey[$auditKey] ?? [] as $auditLog) {
                    if (isset($seenAuditLogIds[$auditLog['id']])) continue;
                    $seenAuditLogIds[$auditLog['id']] = true;
                    if (is_string($auditLog['changes'])) {
                        $auditLog['changes'] = json_decode($auditLog['changes'], true) ?: [];
                    }
                    $auditLogs[] = $auditLog;
                }
            }
            usort($auditLogs, fn($a, $b) => strtotime($a['created_at']) <=> strtotime($b['created_at']));
            $row['audit_logs'] = $auditLogs;
        }
        unset($row);

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
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Endpoint to save or update documents for a loan application into dedicated public.loan_documents table.
 */
$app->post('/api/loans/applications/{id}/documents', function (Request $request, Response $response, $args) {
    $identifier = $args['id'];
    $data = $request->getParsedBody();

    if (!is_array($data)) {
        $raw = (string)$request->getBody();
        $data = json_decode($raw, true) ?: [];
    }

    $documents = $data['documents'] ?? [];

    try {
        $db = new Database();
        $conn = $db->getConnection();

        // Find application by UUID id or application_id or lead_id
        // SEC-011: Lookup by ID/application_id/lead_id must be creator and
        // current-branch scoped, except for an explicitly authenticated admin.
        $loanActor = $request->getAttribute('user');
        $loanUid = OriginationAccess::userId($loanActor);
        $loanBranch = $loanUid ? OriginationAccess::branch($conn, $loanUid) : null;
        if (!$loanUid || (!OriginationAccess::isAdmin($loanActor) && !$loanBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        $appRow = OriginationAccess::findLoan($conn, (string)$identifier, $loanActor, $loanBranch);


        if (!$appRow) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $appId = $appRow['application_id'] ?: $appRow['id'];

        // Save/Upsert documents directly into dedicated public.loan_documents table
        if (is_array($documents) && !empty($documents)) {
            upsertLoanDocumentsToTable($conn, $appId, $documents);
        }

        // Fetch all current documents from dedicated public.loan_documents table
        $allDocs = getLoanDocumentsFromTable($conn, $appId, $appRow['id'], $appRow['lead_id']);

        if (isset($appRow['form_data']) && is_string($appRow['form_data'])) {
            $appRow['form_data'] = json_decode($appRow['form_data'], true);
        }
        $appRow['documents'] = $allDocs;

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Documents saved successfully to loan_documents table',
            'application' => $appRow,
            'documents' => $allDocs
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error updating application documents: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Failed to save documents: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Endpoint to delete a specific document from a loan application in dedicated public.loan_documents table.
 */
$app->delete('/api/loans/applications/{id}/documents/{docKey}', function (Request $request, Response $response, $args) {
    $identifier = $args['id'];
    $docKey = $args['docKey'];

    try {
        $db = new Database();
        $conn = $db->getConnection();

        // SEC-011: Lookup by ID/application_id/lead_id must be creator and
        // current-branch scoped, except for an explicitly authenticated admin.
        $loanActor = $request->getAttribute('user');
        $loanUid = OriginationAccess::userId($loanActor);
        $loanBranch = $loanUid ? OriginationAccess::branch($conn, $loanUid) : null;
        if (!$loanUid || (!OriginationAccess::isAdmin($loanActor) && !$loanBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        $appRow = OriginationAccess::findLoan($conn, (string)$identifier, $loanActor, $loanBranch);


        if (!$appRow) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $appId = $appRow['application_id'] ?: $appRow['id'];

        // Delete row from dedicated public.loan_documents table
        $delStmt = $conn->prepare('
            DELETE FROM public.loan_documents
            WHERE (application_id = ? OR application_id = ? OR application_id = ?) AND slot_key = ?
        ');
        $safeLeadId = OriginationAccess::uniqueLeadDocumentKey($conn, $appRow['lead_id']);
        $delStmt->execute([$appId, (string)$appRow['id'], (string)$safeLeadId, $docKey]);

        // Fetch remaining documents from dedicated table
        $remainingDocs = getLoanDocumentsFromTable($conn, $appId, $appRow['id'], $appRow['lead_id']);

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Document removed successfully from loan_documents table',
            'documents' => $remainingDocs
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error deleting document: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Failed to delete document']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Endpoint to update loan application status and append to timeline
 */
$app->patch('/api/loans/applications/{id}/status', function (Request $request, Response $response, $args) {
    $identifier = $args['id'];
    $data = $request->getParsedBody();

    if (!is_array($data)) {
        $raw = (string)$request->getBody();
        $data = json_decode($raw, true) ?: [];
    }

    $status = trim($data['status'] ?? '');
    $timelineEvent = $data['timelineEvent'] ?? null;
    $signatureData = $data['signatureData'] ?? null;

    if (empty($status)) {
        $response->getBody()->write(json_encode(['error' => 'Status is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();

        // SEC-011: Lookup by ID/application_id/lead_id must be creator and
        // current-branch scoped, except for an explicitly authenticated admin.
        $loanActor = $request->getAttribute('user');
        $loanUid = OriginationAccess::userId($loanActor);
        $loanBranch = $loanUid ? OriginationAccess::branch($conn, $loanUid) : null;
        if (!$loanUid || (!OriginationAccess::isAdmin($loanActor) && !$loanBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        $appRow = OriginationAccess::findLoan($conn, (string)$identifier, $loanActor, $loanBranch);


        if (!$appRow) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        // Only the application creator may advance Created -> Under Review
        // for the transfer to Branch Operations. Approval/rejection requires
        // a separately authorized administrative workflow.
        if (!OriginationAccess::isAdmin($loanActor)) {
            $transferStage = is_array($timelineEvent) ? trim((string)($timelineEvent['stage'] ?? '')) : '';
            if ($status !== 'Under Review' || $appRow['status'] !== 'Created'
                || strcasecmp($transferStage, 'Branch Operations') !== 0) {
                $response->getBody()->write(json_encode(['error' => 'Loan status transition is not permitted']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
            }
        }

        $formData = is_string($appRow['form_data']) ? json_decode($appRow['form_data'], true) : ($appRow['form_data'] ?: []);

        if ($timelineEvent) {
            if (!isset($formData['timeline']) || !is_array($formData['timeline'])) {
                $formData['timeline'] = [];
            }
            $formData['timeline'][] = $timelineEvent;
        }

        $jsonPayload = json_encode($formData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $updateQuery = 'UPDATE public.loan_applications SET status = ?, form_data = ?::jsonb, updated_at = NOW()';
        $updateParams = [$status, $jsonPayload];

        if ($signatureData && is_array($signatureData)) {
            $signaturePayload = json_encode($signatureData);
            $updateQuery = 'UPDATE public.loan_applications SET status = ?, form_data = ?::jsonb, signatures = COALESCE(signatures, \'{}\'::jsonb) || ?::jsonb, updated_at = NOW()';
            $updateParams = [$status, $jsonPayload, $signaturePayload];
        }

        // Repeat ownership in UPDATE for race-safe authorization if a
        // record is reassigned or moved between lookup and write.
        [$writeScope, $writeArgs] = OriginationAccess::loanScope($loanActor, $loanBranch);
        $updateQuery .= ' WHERE id = ?' . $writeScope;
        $updateParams = array_merge($updateParams, [$appRow['id']], $writeArgs);

        $updateStmt = $conn->prepare($updateQuery);
        $updateStmt->execute($updateParams);
        if ($updateStmt->rowCount() === 0) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Status updated successfully'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        error_log("Error updating application status: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Failed to update application status']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));

/**
 * Endpoint to delete a loan application.
 */
$app->delete('/api/loans/applications/{id}', function (Request $request, Response $response, $args) {
    $identifier = $args['id'];

    try {
        $db = new Database();
        $conn = $db->getConnection();

        $loanActor = $request->getAttribute('user');
        $loanUid = OriginationAccess::userId($loanActor);
        $loanBranch = $loanUid ? OriginationAccess::branch($conn, $loanUid) : null;
        if (!$loanUid || (!OriginationAccess::isAdmin($loanActor) && !$loanBranch)) {
            $response->getBody()->write(json_encode(['error' => 'A valid employee branch assignment is required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        // Resolve one authorized row first. Deleting by a shared lead ID
        // must NEVER delete multiple applications or anyone else's record.
        $appRow = OriginationAccess::findLoan($conn, (string)$identifier, $loanActor, $loanBranch);
        if (!$appRow) {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }
        [$deleteScope, $deleteArgs] = OriginationAccess::loanScope($loanActor, $loanBranch);
        $stmt = $conn->prepare('
            DELETE FROM public.loan_applications
            WHERE id = ?' . $deleteScope
        );
        $stmt->execute(array_merge([$appRow['id']], $deleteArgs));

        if ($stmt->rowCount() > 0) {
            $response->getBody()->write(json_encode(['success' => true, 'message' => 'Loan application deleted successfully']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
        } else {
            $response->getBody()->write(json_encode(['error' => 'Loan application not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }
    } catch (\Exception $e) {
        error_log("Error deleting loan application: " . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Error deleting loan application']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new \App\Middleware\AuthMiddleware(['admin'], 'loanOrigination'));
