<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;

/**
 * Origination Activities Routes (Shared across Loans & Sales Origination)
 */
$app->group('/api/origination/activities', function (\Slim\Routing\RouteCollectorProxy $group) {

    // GET /api/origination/activities - Fetch all activities for the logged-in user
    $group->get('', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $stmt = $conn->prepare("
                SELECT 
                    id, 
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
                    created_at, 
                    updated_at
                FROM public.loan_activities
                WHERE created_by = :uid
                ORDER BY start_date ASC, start_time ASC
            ");
            $stmt->execute([':uid' => $user->id]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $activities = array_map(function ($row) {
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
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }, $rows ?: []);

            $response->getBody()->write(json_encode([
                'success' => true,
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

    // POST /api/origination/activities - Schedule new activity
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

        if (empty($title) || empty($startDate)) {
            $response->getBody()->write(json_encode(['error' => 'Title and Start Date are required']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            // Check for existing overlapping activities for this user
            $newStart = $startDate . ' ' . ($allDay ? '00:00:00' : ($startTime . ':00'));
            $newEnd = $endDate . ' ' . ($allDay ? '23:59:59' : ($endTime . ':00'));

            $conflictStmt = $conn->prepare("
                SELECT id, title, start_date, start_time, end_date, end_time, all_day
                FROM public.loan_activities
                WHERE created_by = :uid
                  AND :new_start < (end_date || ' ' || COALESCE(end_time, '23:59:59'))::timestamp
                  AND :new_end > (start_date || ' ' || COALESCE(start_time, '00:00:00'))::timestamp
                LIMIT 1
            ");

            $conflictStmt->execute([
                ':uid' => $user->id,
                ':new_start' => $newStart,
                ':new_end' => $newEnd
            ]);

            $conflict = $conflictStmt->fetch(PDO::FETCH_ASSOC);

            if ($conflict) {
                $conflictTime = ($conflict['all_day'] === true || $conflict['all_day'] === 't' || $conflict['all_day'] == 1)
                    ? 'All Day'
                    : ($conflict['start_time'] . ' – ' . $conflict['end_time']);

                $response->getBody()->write(json_encode([
                    'error' => 'Time Conflict: "' . $conflict['title'] . '" is already scheduled on ' . $conflict['start_date'] . ' (' . $conflictTime . '). Please select a different time or date.'
                ]));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(409);
            }

            $stmt = $conn->prepare('
                INSERT INTO public.loan_activities (
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
                    created_at, 
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                RETURNING id, title, priority, start_date, start_time, end_date, end_time, all_day, address, notes, status, created_by, created_at, updated_at
            ');

            $stmt->execute([
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
                $user->id
            ]);

            $created = $stmt->fetch(PDO::FETCH_ASSOC);

            $activity = [
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
                'createdAt' => $created['created_at'],
                'updatedAt' => $created['updated_at']
            ];

            $response->getBody()->write(json_encode([
                'success' => true,
                'message' => 'Activity scheduled successfully',
                'activity' => $activity
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

    // PATCH /api/origination/activities/{id}/toggle-status - Toggle status
    $group->patch('/{id}/toggle-status', function (Request $request, Response $response, $args) {
        $user = $request->getAttribute('user');
        $id = $args['id'];
        $data = $request->getParsedBody();
        $currentStatus = $data['currentStatus'] ?? 'Scheduled';
        $nextStatus = ($currentStatus === 'Completed') ? 'Scheduled' : 'Completed';

        try {
            $db = new Database();
            $conn = $db->getConnection();

            if (!$conn) {
                throw new Exception("Database connection failed");
            }

            $stmt = $conn->prepare('
                UPDATE public.loan_activities
                SET status = ?, updated_at = NOW()
                WHERE id = ? AND created_by = ?
                RETURNING id, title, priority, start_date, start_time, end_date, end_time, all_day, address, notes, status, created_by, created_at, updated_at
            ');

            $stmt->execute([$nextStatus, $id, $user->id]);
            $updated = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$updated) {
                $response->getBody()->write(json_encode(['error' => 'Activity not found']));
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
