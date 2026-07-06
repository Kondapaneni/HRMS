<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/dashboard/stats
/** @var \Slim\App $app */
$app->get('/api/admin/dashboard/stats', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // 1. Total Employees (Active)
        $empStmt = $conn->query("SELECT COUNT(*) as count FROM employee WHERE status = 'active'");
        $totalEmployees = (int) $empStmt->fetchColumn();

        // 2. Present Today (Active employees only)
        $presentStmt = $conn->query("
            SELECT COUNT(DISTINCT a.id) 
            FROM attendance a
            JOIN employee e ON a.\"employeeId\"::varchar = e.\"userId\"::varchar
            WHERE a.date = CURRENT_DATE 
              AND LOWER(TRIM(a.status)) IN ('present', 'present (late)', 'present (early)', 'present (late+early)', 'present-full-shift')
              AND e.status = 'active'
        ");
        $presentToday = (int) $presentStmt->fetchColumn();

        // 3. On Leave Today (Active employees only)
        $leaveStmt = $conn->query("
            SELECT COUNT(DISTINCT a.id) 
            FROM attendance a
            JOIN employee e ON a.\"employeeId\"::varchar = e.\"userId\"::varchar
            WHERE a.date = CURRENT_DATE 
              AND LOWER(TRIM(a.status)) IN ('leave', 'paid leave', 'unpaid leave', 'sandwich leave')
              AND e.status = 'active'
        ");
        $onLeaveToday = (int) $leaveStmt->fetchColumn();

        // 4. Monthly Attendance Trend (Last 6 months)
        $trendStmt = $conn->query("
            SELECT 
                TO_CHAR(a.date, 'Mon') as month,
                EXTRACT(MONTH FROM a.date) as month_num,
                SUM(CASE WHEN LOWER(TRIM(a.status)) IN ('present', 'present (late)', 'present (early)', 'present (late+early)', 'present-full-shift') THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN LOWER(TRIM(a.status)) IN ('leave', 'paid leave', 'unpaid leave', 'sandwich leave') THEN 1 ELSE 0 END) as leave
            FROM attendance a
            JOIN employee e ON a.\"employeeId\"::varchar = e.\"userId\"::varchar
            WHERE a.date >= CURRENT_DATE - INTERVAL '6 months'
              AND e.status = 'active'
            GROUP BY TO_CHAR(a.date, 'Mon'), EXTRACT(MONTH FROM a.date)
            ORDER BY month_num ASC
        ");
        $attendanceData = $trendStmt->fetchAll(PDO::FETCH_ASSOC);

        // 5. Salary Distribution (Active employees only)
        $salaryStmt = $conn->query("
            SELECT 
                CASE 
                    WHEN salary < 50000 THEN '0-50k'
                    WHEN salary >= 50000 AND salary < 100000 THEN '50k-100k'
                    WHEN salary >= 100000 AND salary < 150000 THEN '100k-150k'
                    ELSE '150k+' 
                END as range,
                COUNT(*) as count
            FROM employee
            WHERE status = 'active'
            GROUP BY range
        ");
        $salaryData = $salaryStmt->fetchAll(PDO::FETCH_ASSOC);

        // 6. Recent Activities
        $activityStmt = $conn->query("
            SELECT timestamp, action_type, actor_name, entity_type, new_values, changed_fields
            FROM audit_logs 
            ORDER BY timestamp DESC 
            LIMIT 5
        ");
        $activities = $activityStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedActivities = [];
        foreach ($activities as $act) {
            $actor = $act['actor_name'] ?: 'System';
            $entity = ucfirst(strtolower(rtrim($act['entity_type'], 's'))); // e.g. "Asset"
            $action = strtolower($act['action_type']); // 'insert', 'update', 'delete'
            
            $actionText = "";
            if ($action === 'insert') {
                $actionText = "created a new {$entity}";
            } else if ($action === 'delete') {
                $actionText = "deleted an {$entity}";
            } else {
                $actionText = "updated an {$entity}";
                
                // Specific plain english mapping
                if ($act['entity_type'] === 'assets') {
                    $changedFields = json_decode($act['changed_fields'], true) ?: [];
                    if (in_array('assigned_to', $changedFields)) {
                        $newVals = json_decode($act['new_values'], true);
                        if (!empty($newVals['assigned_to'])) {
                            $actionText = "assigned an {$entity}";
                        } else {
                            $actionText = "unassigned an {$entity}";
                        }
                    } else if (in_array('status', $changedFields)) {
                        $newVals = json_decode($act['new_values'], true);
                        $actionText = "marked an {$entity} as " . strtolower($newVals['status'] ?? 'available');
                    }
                } else if ($act['entity_type'] === 'attendance') {
                    $changedFields = json_decode($act['changed_fields'], true) ?: [];
                    if (in_array('status', $changedFields)) {
                        $actionText = "regularized attendance";
                    }
                } else if ($act['entity_type'] === 'leaves') {
                    $changedFields = json_decode($act['changed_fields'], true) ?: [];
                    if (in_array('status', $changedFields)) {
                        $newVals = json_decode($act['new_values'], true);
                        $actionText = strtolower($newVals['status'] ?? 'updated') . " a leave request";
                    }
                }
            }

            $formattedActivities[] = [
                'user' => $actor,
                'action' => $actionText,
                'time' => $act['timestamp'] // Frontend will format using date-fns
            ];
        }

        $response->getBody()->write(json_encode([
            'totalEmployees' => $totalEmployees,
            'presentToday' => $presentToday,
            'onLeaveToday' => $onLeaveToday,
            'attendanceRate' => $totalEmployees > 0 ? round((($presentToday + $onLeaveToday) / $totalEmployees) * 100) . '%' : '0%',
            'attendanceData' => $attendanceData,
            'salaryData' => empty($salaryData) ? [['range' => 'No Data', 'count' => 1]] : $salaryData,
            'activities' => $formattedActivities
        ]));
        
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin']));
