<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

/**
 * Origination Activities Routes (Shared across Loans, Sales & Branch Operations)
 */
$app->group('/api/origination/activities', function (\Slim\Routing\RouteCollectorProxy $group) {

    // GET /api/origination/activities - Fetch activities (personal or branch-wide)
    $group->get('', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $params = $request->getQueryParams();
        $scope = $params['scope'] ?? 'personal';

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            // Fetch user's assigned branch
            $empStmt = $conn->prepare('
                SELECT e.id, e."employeeId", e.branch, b.name as branch_name
                FROM employee e
                LEFT JOIN branches b ON e.branch::uuid = b.id
                WHERE e."userId" = ? LIMIT 1
            ');
            $empStmt->execute([$user->id]);
            $currentEmp = $empStmt->fetch(PDO::FETCH_ASSOC);
            $userBranch = $currentEmp['branch'] ?? null;
            $userBranchName = $currentEmp['branch_name'] ?? null;

            // Fetch list of assignable employees (branch colleagues if branch assigned, or all employees)
            if (!empty($userBranch)) {
                $assignableStmt = $conn->prepare('
                    SELECT 
                        e.id as employee_id,
                        e."userId" as user_id,
                        e."employeeId" as employee_code,
                        e."firstName" as first_name,
                        e."lastName" as last_name,
                        e.email,
                        e.department,
                        e.position,
                        e.branch,
                        b.name as branch_name
                    FROM employee e
                    LEFT JOIN branches b ON e.branch::uuid = b.id
                    WHERE e.branch = ? AND e."userId" IS NOT NULL
                    ORDER BY e."firstName" ASC, e."lastName" ASC
                ');
                $assignableStmt->execute([$userBranch]);

                $assignableEmployees = array_map(function ($emp) use ($user) {
                    $fullName = trim(($emp['first_name'] ?? '') . ' ' . ($emp['last_name'] ?? ''));
                    return [
                        'id' => $emp['user_id'],
                        'employeeId' => $emp['employee_id'],
                        'employeeCode' => $emp['employee_code'] ?? '',
                        'name' => !empty($fullName) ? $fullName : ($emp['email'] ?? 'Employee'),
                        'email' => $emp['email'] ?? '',
                        'department' => $emp['department'] ?? '',
                        'position' => $emp['position'] ?? '',
                        'branchName' => $emp['branch_name'] ?? '',
                        'isCurrentUser' => ($emp['user_id'] === $user->id)
                    ];
                }, $assignableStmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
            }

            if ($scope === 'branch' && !empty($userBranch)) {
                // Fetch activities for all employees within the same branch + own activities
                $stmt = $conn->prepare("
                    SELECT 
                        la.id, 
                        la.title, 
                        la.priority, 
                        la.start_date, 
                        la.start_time, 
                        la.end_date, 
                        la.end_time, 
                        la.all_day, 
                        la.address, 
                        la.notes, 
                        la.status, 
                        la.created_by,
                        COALESCE(la.assigned_to, la.created_by) as assigned_to,
                        la.created_at, 
                        la.updated_at,
                        u_creator.\"firstName\" as creator_first_name,
                        u_creator.\"lastName\" as creator_last_name,
                        u_creator.email as creator_email,
                        emp_creator.\"employeeId\" as creator_employee_id,
                        emp_creator.branch as creator_branch,
                        b_creator.name as creator_branch_name,
                        u_assignee.\"firstName\" as assignee_first_name,
                        u_assignee.\"lastName\" as assignee_last_name,
                        u_assignee.email as assignee_email,
                        emp_assignee.\"employeeId\" as assignee_employee_id,
                        emp_assignee.branch as assignee_branch,
                        b_assignee.name as assignee_branch_name
                    FROM public.origination_activities la
                    LEFT JOIN public.users u_creator ON la.created_by = u_creator.id
                    LEFT JOIN public.employee emp_creator ON emp_creator.\"userId\" = la.created_by
                    LEFT JOIN public.branches b_creator ON emp_creator.branch::uuid = b_creator.id
                    LEFT JOIN public.users u_assignee ON COALESCE(la.assigned_to, la.created_by) = u_assignee.id
                    LEFT JOIN public.employee emp_assignee ON emp_assignee.\"userId\" = COALESCE(la.assigned_to, la.created_by)
                    LEFT JOIN public.branches b_assignee ON emp_assignee.branch::uuid = b_assignee.id
                    WHERE (emp_assignee.branch = :branch_id OR emp_creator.branch = :branch_id OR la.created_by = :uid OR la.assigned_to = :uid)
                    ORDER BY la.start_date ASC, la.start_time ASC
                ");
                $stmt->execute([
                    ':branch_id' => $userBranch,
                    ':uid' => $user->id
                ]);
            } else {
                // Personal activities (strict individual user isolation: created by or assigned to user)
                $stmt = $conn->prepare("
                    SELECT 
                        la.id, 
                        la.title, 
                        la.priority, 
                        la.start_date, 
                        la.start_time, 
                        la.end_date, 
                        la.end_time, 
                        la.all_day, 
                        la.address, 
                        la.notes, 
                        la.status, 
                        la.created_by,
                        COALESCE(la.assigned_to, la.created_by) as assigned_to,
                        la.created_at, 
                        la.updated_at,
                        u_creator.\"firstName\" as creator_first_name,
                        u_creator.\"lastName\" as creator_last_name,
                        u_creator.email as creator_email,
                        emp_creator.\"employeeId\" as creator_employee_id,
                        emp_creator.branch as creator_branch,
                        b_creator.name as creator_branch_name,
                        u_assignee.\"firstName\" as assignee_first_name,
                        u_assignee.\"lastName\" as assignee_last_name,
                        u_assignee.email as assignee_email,
                        emp_assignee.\"employeeId\" as assignee_employee_id,
                        emp_assignee.branch as assignee_branch,
                        b_assignee.name as assignee_branch_name
                    FROM public.origination_activities la
                    LEFT JOIN public.users u_creator ON la.created_by = u_creator.id
                    LEFT JOIN public.employee emp_creator ON emp_creator.\"userId\" = la.created_by
                    LEFT JOIN public.branches b_creator ON emp_creator.branch::uuid = b_creator.id
                    LEFT JOIN public.users u_assignee ON COALESCE(la.assigned_to, la.created_by) = u_assignee.id
                    LEFT JOIN public.employee emp_assignee ON emp_assignee.\"userId\" = COALESCE(la.assigned_to, la.created_by)
                    LEFT JOIN public.branches b_assignee ON emp_assignee.branch::uuid = b_assignee.id
                    WHERE la.created_by = :uid OR la.assigned_to = :uid
                    ORDER BY la.start_date ASC, la.start_time ASC
                ");
                $stmt->execute([':uid' => $user->id]);
            }

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $activities = array_map(function ($row) use ($user) {
                $creatorFullName = trim(($row['creator_first_name'] ?? '') . ' ' . ($row['creator_last_name'] ?? ''));
                $assigneeFullName = trim(($row['assignee_first_name'] ?? '') . ' ' . ($row['assignee_last_name'] ?? ''));
                $effectiveAssigneeName = !empty($assigneeFullName) ? $assigneeFullName : (!empty($creatorFullName) ? $creatorFullName : 'Employee');

                return [
                    'id' => $row['id'],
                    'title' => $row['title'],
                    'priority' => $row['priority'] ?? 'Medium',
                    'startDate' => $row['start_date'],
                    'startTime' => $row['start_time'] ?? '10:00',
                    'endDate' => $row['end_date'] ?? $row['start_date'],
                    'endTime' => $row['end_time'] ?? '11:00',
                    'allDay' => ($row['all_day'] === true || $row['all_day'] === 't' || $row['all_day'] == 1),
                    'address' => $row['address'] ?? '',
                    'notes' => $row['notes'] ?? '',
                    'status' => $row['status'] ?? 'Scheduled',
                    'createdBy' => $row['created_by'],
                    'assignedTo' => $row['assigned_to'] ?? $row['created_by'],
                    'creatorName' => !empty($creatorFullName) ? $creatorFullName : 'Colleague',
                    'creatorEmployeeId' => $row['creator_employee_id'] ?? '',
                    'creatorBranchName' => $row['creator_branch_name'] ?? '',
                    'assigneeName' => $effectiveAssigneeName,
                    'assigneeEmployeeId' => $row['assignee_employee_id'] ?? $row['creator_employee_id'] ?? '',
                    'assigneeBranchName' => $row['assignee_branch_name'] ?? $row['creator_branch_name'] ?? '',
                    'isOwnActivity' => ($row['created_by'] === $user->id || $row['assigned_to'] === $user->id),
                    'isCreatedByMe' => ($row['created_by'] === $user->id),
                    'isAssignedToMe' => (($row['assigned_to'] ?? $row['created_by']) === $user->id),
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }, $rows ?: []);

            $response->getBody()->write(json_encode([
                'success' => true,
                'scope' => $scope,
                'branch' => [
                    'id' => $userBranch,
                    'name' => $userBranchName ?: 'Assigned Branch'
                ],
                'assignableEmployees' => $assignableEmployees,
                'activities' => $activities
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\PDOException $e) {
            error_log("Database error fetching activities: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while fetching activities']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error fetching activities: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while fetching activities']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // POST /api/origination/activities - Schedule new activity (supports multi-assign)
    $group->post('', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $data = $request->getParsedBody();

        $title = trim($data['title'] ?? '');
        $priority = trim($data['priority'] ?? 'Medium');
        $startDate = trim($data['startDate'] ?? '');
        $startTime = trim($data['startTime'] ?? '10:00');
        $endDate = !empty($data['endDate']) ? trim($data['endDate']) : $startDate;
        $endTime = trim($data['endTime'] ?? '11:00');
        $allDay = !empty($data['allDay']) ? 1 : 0;
        $address = trim($data['address'] ?? '');
        $notes = trim($data['notes'] ?? '');
        $status = trim($data['status'] ?? 'Scheduled');

        // Assignees handling: can be array or string
        $rawAssignees = $data['assignedTo'] ?? null;
        $assigneeList = [];
        if (is_array($rawAssignees)) {
            $assigneeList = array_values(array_filter($rawAssignees));
        } elseif (!empty($rawAssignees) && is_string($rawAssignees)) {
            $assigneeList = [$rawAssignees];
        }

        if (empty($assigneeList)) {
            $assigneeList = [$user->id];
        }

        if (empty($title) || empty($startDate)) {
            $response->getBody()->write(json_encode(['error' => 'Title and Start Date are required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $today = date('Y-m-d');
        if ($startDate < $today) {
            $response->getBody()->write(json_encode(['error' => 'Cannot schedule activities for past dates. Only present and future dates are allowed.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        if ($startDate === $today && !$allDay) {
            $currentTime = date('H:i');
            if ($startTime < $currentTime) {
                $response->getBody()->write(json_encode(['error' => 'Cannot schedule activities for past time today. Only present and future times are allowed.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
            }
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $newStart = $startDate . ' ' . ($allDay ? '00:00:00' : ($startTime . ':00'));
            $newEnd = $endDate . ' ' . ($allDay ? '23:59:59' : ($endTime . ':00'));

            // Check conflict for each assignee
            $conflictStmt = $conn->prepare("
                SELECT la.id, la.title, la.start_date, la.start_time, la.end_date, la.end_time, la.all_day,
                       COALESCE(u.\"firstName\" || ' ' || u.\"lastName\", 'Employee') as assignee_name
                FROM public.origination_activities la
                LEFT JOIN public.users u ON u.id = :uid
                WHERE (COALESCE(la.assigned_to, la.created_by) = :uid OR la.created_by = :uid)
                  AND :new_start < (la.end_date || ' ' || COALESCE(la.end_time, '23:59:59'))::timestamp
                  AND :new_end > (la.start_date || ' ' || COALESCE(la.start_time, '00:00:00'))::timestamp
                LIMIT 1
            ");

            foreach ($assigneeList as $targetUid) {
                $conflictStmt->execute([
                    ':uid' => $targetUid,
                    ':new_start' => $newStart,
                    ':new_end' => $newEnd
                ]);
                $conflict = $conflictStmt->fetch(PDO::FETCH_ASSOC);

                if ($conflict) {
                    $conflictTime = ($conflict['all_day'] === true || $conflict['all_day'] === 't' || $conflict['all_day'] == 1)
                        ? 'All Day'
                        : ($conflict['start_time'] . ' – ' . $conflict['end_time']);

                    $targetName = ($targetUid === $user->id) ? 'You' : ($conflict['assignee_name'] ?? 'Selected Employee');

                    $response->getBody()->write(json_encode([
                        'error' => 'Time Conflict: ' . $targetName . ' already has "' . $conflict['title'] . '" scheduled on ' . $conflict['start_date'] . ' (' . $conflictTime . '). Please select a different time or date.'
                    ]));
                    return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
                }
            }

            // Insert an activity record for each assignee
            $insertStmt = $conn->prepare('
                INSERT INTO public.origination_activities (
                    title, 
                    priority, 
                    start_date, 
                    start_time, 
                    end_date, 
                    end_time, 
                    all_day, 
                    address, 
                    notes, 
                    status, 
                    created_by,
                    assigned_to,
                    created_at, 
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                RETURNING id, title, priority, start_date, start_time, end_date, end_time, all_day, address, notes, status, created_by, assigned_to, created_at, updated_at
            ');

            $createdActivities = [];
            foreach ($assigneeList as $targetUid) {
                $insertStmt->execute([
                    $title,
                    $priority,
                    $startDate,
                    $allDay ? '00:00' : $startTime,
                    $endDate,
                    $allDay ? '23:59' : $endTime,
                    $allDay ? 't' : 'f',
                    $address ?: null,
                    $notes ?: null,
                    $status,
                    $user->id,
                    $targetUid
                ]);

                $created = $insertStmt->fetch(PDO::FETCH_ASSOC);
                $createdActivities[] = [
                    'id' => $created['id'],
                    'title' => $created['title'],
                    'priority' => $created['priority'] ?? 'Medium',
                    'startDate' => $created['start_date'],
                    'startTime' => $created['start_time'],
                    'endDate' => $created['end_date'],
                    'endTime' => $created['end_time'],
                    'allDay' => ($created['all_day'] === true || $created['all_day'] === 't' || $created['all_day'] == 1),
                    'address' => $created['address'] ?? '',
                    'notes' => $created['notes'] ?? '',
                    'status' => $created['status'] ?? 'Scheduled',
                    'createdBy' => $created['created_by'],
                    'assignedTo' => $created['assigned_to'],
                    'createdAt' => $created['created_at'],
                    'updatedAt' => $created['updated_at']
                ];
            }

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => count($createdActivities) > 1 
                    ? 'Activities scheduled and assigned to ' . count($createdActivities) . ' employees successfully'
                    : 'Activity scheduled successfully',
                'activity' => $createdActivities[0] ?? null,
                'activities' => $createdActivities
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(201);

        } catch (\PDOException $e) {
            error_log("Database error creating activity: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while scheduling activity']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error creating activity: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while scheduling activity']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // PATCH /api/origination/activities/{id}/reassign - Reassign activity to another employee
    $group->patch('/{id}/reassign', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $id = $args['id'];
        $data = $request->getParsedBody();
        $newAssigneeId = $data['assignedTo'] ?? null;

        if (empty($newAssigneeId)) {
            $response->getBody()->write(json_encode(['error' => 'Please select an employee to reassign to']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            // Fetch existing activity details
            $actStmt = $conn->prepare('
                SELECT id, title, start_date, start_time, end_date, end_time, all_day, created_by, assigned_to
                FROM public.origination_activities
                WHERE id = ?
                LIMIT 1
            ');
            $actStmt->execute([$id]);
            $act = $actStmt->fetch(PDO::FETCH_ASSOC);

            if (!$act) {
                $response->getBody()->write(json_encode(['error' => 'Activity not found']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }

            // Check if new assignee exists
            $userStmt = $conn->prepare('
                SELECT u.id, u."firstName", u."lastName", e."employeeId"
                FROM users u
                LEFT JOIN employee e ON e."userId" = u.id
                WHERE u.id = ?
                LIMIT 1
            ');
            $userStmt->execute([$newAssigneeId]);
            $targetUser = $userStmt->fetch(PDO::FETCH_ASSOC);

            if (!$targetUser) {
                $response->getBody()->write(json_encode(['error' => 'Selected employee was not found']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }

            $targetName = trim(($targetUser['firstName'] ?? '') . ' ' . ($targetUser['lastName'] ?? ''));

            // Check for time conflicts for the new assignee
            $newStart = $act['start_date'] . ' ' . (($act['all_day'] === true || $act['all_day'] === 't' || $act['all_day'] == 1) ? '00:00:00' : ($act['start_time'] . ':00'));
            $newEnd = ($act['end_date'] ?: $act['start_date']) . ' ' . (($act['all_day'] === true || $act['all_day'] === 't' || $act['all_day'] == 1) ? '23:59:59' : ($act['end_time'] . ':00'));

            $conflictStmt = $conn->prepare("
                SELECT id, title, start_date, start_time, end_date, end_time, all_day
                FROM public.origination_activities
                WHERE id != :act_id
                  AND (COALESCE(assigned_to, created_by) = :new_uid OR created_by = :new_uid)
                  AND :new_start < (end_date || ' ' || COALESCE(end_time, '23:59:59'))::timestamp
                  AND :new_end > (start_date || ' ' || COALESCE(start_time, '00:00:00'))::timestamp
                LIMIT 1
            ");

            $conflictStmt->execute([
                ':act_id' => $id,
                ':new_uid' => $newAssigneeId,
                ':new_start' => $newStart,
                ':new_end' => $newEnd
            ]);

            $conflict = $conflictStmt->fetch(PDO::FETCH_ASSOC);

            if ($conflict) {
                $conflictTime = ($conflict['all_day'] === true || $conflict['all_day'] === 't' || $conflict['all_day'] == 1)
                    ? 'All Day'
                    : ($conflict['start_time'] . ' – ' . $conflict['end_time']);

                $response->getBody()->write(json_encode([
                    'error' => 'Time Conflict: ' . $targetName . ' already has "' . $conflict['title'] . '" scheduled on ' . $conflict['start_date'] . ' (' . $conflictTime . ').'
                ]));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
            }

            // Update assigned_to
            $updateStmt = $conn->prepare('
                UPDATE public.origination_activities
                SET assigned_to = ?, updated_at = NOW()
                WHERE id = ?
                RETURNING id, title, priority, start_date, start_time, end_date, end_time, all_day, address, notes, status, created_by, assigned_to, created_at, updated_at
            ');
            $updateStmt->execute([$newAssigneeId, $id]);
            $updated = $updateStmt->fetch(PDO::FETCH_ASSOC);

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Activity reassigned to ' . $targetName . ' successfully',
                'activity' => $updated
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\PDOException $e) {
            error_log("Database error reassigning activity: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while reassigning activity']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error reassigning activity: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while reassigning activity']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

    // PATCH /api/origination/activities/{id}/toggle-status - Toggle status
    $group->patch('/{id}/toggle-status', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $id = $args['id'];
        $data = $request->getParsedBody();
        $currentStatus = $data['currentStatus'] ?? 'Scheduled';

        if ($currentStatus === 'Completed') {
            $response->getBody()->write(json_encode([
                'error' => 'Completed activities cannot be updated to pending again.'
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $nextStatus = 'Completed';

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            // Check if user has an assigned branch
            $empStmt = $conn->prepare('SELECT branch FROM employee WHERE "userId" = ? LIMIT 1');
            $empStmt->execute([$user->id]);
            $currentEmp = $empStmt->fetch(PDO::FETCH_ASSOC);
            $userBranch = $currentEmp['branch'] ?? null;

            if (!empty($userBranch)) {
                $stmt = $conn->prepare('
                    UPDATE public.origination_activities
                    SET status = ?, updated_at = NOW()
                    WHERE id = ? AND (
                        created_by = ? 
                        OR assigned_to = ?
                        OR created_by IN (SELECT "userId" FROM employee WHERE branch = ? AND "userId" IS NOT NULL)
                        OR assigned_to IN (SELECT "userId" FROM employee WHERE branch = ? AND "userId" IS NOT NULL)
                    )
                    RETURNING id, title, priority, start_date, start_time, end_date, end_time, all_day, address, notes, status, created_by, assigned_to, created_at, updated_at
                ');
                $stmt->execute([$nextStatus, $id, $user->id, $user->id, $userBranch, $userBranch]);
            } else {
                $stmt = $conn->prepare('
                    UPDATE public.origination_activities
                    SET status = ?, updated_at = NOW()
                    WHERE id = ? AND (created_by = ? OR assigned_to = ?)
                    RETURNING id, title, priority, start_date, start_time, end_date, end_time, all_day, address, notes, status, created_by, assigned_to, created_at, updated_at
                ');
                $stmt->execute([$nextStatus, $id, $user->id, $user->id]);
            }

            $updated = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$updated) {
                $response->getBody()->write(json_encode(['error' => 'Activity not found or unauthorized']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
            }

            $activity = [
                'id' => $updated['id'],
                'title' => $updated['title'],
                'priority' => $updated['priority'] ?? 'Medium',
                'startDate' => $updated['start_date'],
                'startTime' => $updated['start_time'],
                'endDate' => $updated['end_date'],
                'endTime' => $updated['end_time'],
                'allDay' => ($updated['all_day'] === true || $updated['all_day'] === 't' || $updated['all_day'] == 1),
                'address' => $updated['address'] ?? '',
                'notes' => $updated['notes'] ?? '',
                'status' => $updated['status'] ?? 'Scheduled',
                'createdBy' => $updated['created_by'],
                'assignedTo' => $updated['assigned_to'] ?? $updated['created_by'],
                'createdAt' => $updated['created_at'],
                'updatedAt' => $updated['updated_at']
            ];

            $response->getBody()->write(json_encode([
                'success' => true,
                'activity' => $activity
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\PDOException $e) {
            error_log("Database error updating activity status: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'Database error while updating status']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        } catch (\Exception $e) {
            error_log("Error updating activity status: " . $e->getMessage());
            $response->getBody()->write(json_encode(['error' => 'An error occurred while updating status']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
    });

})->add(new \App\Middleware\AuthMiddleware());
