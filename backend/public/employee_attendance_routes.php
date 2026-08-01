<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\RateLimiter;

// Get Employee Attendance History
/** @var \Slim\App $app */
$app->get('/api/employee/attendance', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('SELECT a.*, e."shiftTime" FROM attendance a JOIN employee e ON a."employeeId" = e."userId" WHERE a."employeeId" = ? ORDER BY date DESC LIMIT 30');
    $stmt->execute([$decodedToken->id]);
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($history as &$record) {
        unset($record['shiftTime']);
    }

    $response->getBody()->write(json_encode($history));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware(['employee']));

// Employee Attendance Punch (Check In / Check Out / Punch)
$app->post('/api/employee/attendance/punch', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    $action = $data['action'] ?? ''; // 'check-in', 'check-out', 'punch'
    $lat = $data['latitude'] ?? null;
    $lng = $data['longitude'] ?? null;
    $address = $data['address'] ?? null;
    $photoUrl = $data['photo'] ?? null;
    
    // Override address with Google Geocoding API if key is present
    if ($lat && $lng) {
        $apiKey = $_ENV['GOOGLE_GEOCODING_API_KEY'] ?? '';
        if ($apiKey) {
            $url = "https://maps.googleapis.com/maps/api/geocode/json?latlng={$lat},{$lng}&key={$apiKey}";
            $geocodeResponse = @file_get_contents($url);
            if ($geocodeResponse) {
                $geocodeData = json_decode($geocodeResponse, true);
                if (!empty($geocodeData['results'][0]['formatted_address'])) {
                    $address = $geocodeData['results'][0]['formatted_address'];
                }
            }
        }
    }
    
    $today = date('Y-m-d');
    $now = date('Y-m-d H:i:s');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    // Face verification removed for attendance punch

    try {
        $conn->beginTransaction();

        // Fetch employee's shift details
        $stmtEmp = $conn->prepare('SELECT e."shiftTime", s."startTime", s."endTime" FROM employee e LEFT JOIN shift_times s ON e."shiftTime" = s."shiftLabel" WHERE e."userId" = ?');
        $stmtEmp->execute([$decodedToken->id]);
        $empShift = $stmtEmp->fetch(PDO::FETCH_ASSOC);

        $shiftStartTime = $empShift && !empty($empShift['startTime']) ? $empShift['startTime'] : null;
        $shiftEndTime = $empShift && !empty($empShift['endTime']) ? $empShift['endTime'] : null;

        $stmt = $conn->prepare('SELECT id, "employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized", "checkInPhoto", "checkOutPhoto", "checkInLat", "checkInLng", "checkInAddress", "checkOutLat", "checkOutLng", "checkOutAddress" FROM attendance WHERE "employeeId" = ? AND date = ? LIMIT 1');
        $stmt->execute([$decodedToken->id, $today]);
        $record = $stmt->fetch();

        if ($action === 'check-in') {
            // Check if employee is on an approved leave today
            $stmtLeave = $conn->prepare('SELECT id FROM leaves WHERE "employeeId" = ? AND status = \'approved\' AND "startDate" <= ? AND "endDate" >= ? LIMIT 1');
            $stmtLeave->execute([$decodedToken->id, $today, $today]);
            if ($stmtLeave->fetch()) {
                throw new Exception('You are on an approved leave today. Cannot check in.');
            }

            $status = 'present';
            if ($shiftStartTime) {
                $checkInTimeStr = date('H:i:s', strtotime($now));
                if ($checkInTimeStr > $shiftStartTime) {
                    $status = 'present (late)';
                }
            }

            if ($record) {
                if (in_array(strtolower($record['status']), ['weekend', 'holiday'])) {
                    $stmtUpdate = $conn->prepare('
                        UPDATE attendance SET "checkIn" = ?, status = ?, "checkInLat" = ?, "checkInLng" = ?, "checkInAddress" = ?, "checkInPhoto" = ?, "updatedAt" = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ');
                    $stmtUpdate->execute([$now, $status, $lat, $lng, $address, $photoUrl, $record['id']]);
                } else {
                    throw new Exception('Already checked in for today.');
                }
            } else {
                $stmtInsert = $conn->prepare('
                    INSERT INTO attendance ("employeeId", date, "checkIn", status, "checkInLat", "checkInLng", "checkInAddress", "checkInPhoto")
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ');
                $stmtInsert->execute([$decodedToken->id, $today, $now, $status, $lat, $lng, $address, $photoUrl]);
            }

        } else if ($action === 'check-out') {
            if (!$record || !$record['checkIn']) {
                throw new Exception('Cannot check out without checking in first.');
            }
            if ($record['checkOut']) {
                throw new Exception('Already checked out for today.');
            }

            $currentStatus = strtolower($record['status']);
            $newStatus = $currentStatus;
            
            if ($shiftEndTime && strpos($currentStatus, 'present') !== false) {
                $checkOutTimeStr = date('H:i:s', strtotime($now));
                $isEarly = ($checkOutTimeStr < $shiftEndTime);
                
                if ($isEarly) {
                    if (strpos($currentStatus, '(late)') !== false) {
                        $newStatus = 'present (early+late)';
                    } else if ($currentStatus === 'present') {
                        $newStatus = 'present (early)';
                    }
                }
            }

            // Calculate hours
            $checkInTime = strtotime($record['checkIn']);
            $checkOutTime = strtotime($now);
            $hours = round(($checkOutTime - $checkInTime) / 3600, 2);

            $stmtUpdate = $conn->prepare('
                UPDATE attendance SET "checkOut" = ?, status = ?, hours = ?, "checkOutLat" = ?, "checkOutLng" = ?, "checkOutAddress" = ?, "checkOutPhoto" = ?, "updatedAt" = CURRENT_TIMESTAMP
                WHERE id = ?
            ');
            $stmtUpdate->execute([$now, $newStatus, $hours, $lat, $lng, $address, $photoUrl, $record['id']]);
            
        } else if ($action === 'punch') {
            if (!$record || !$record['checkIn']) {
                throw new Exception('Cannot punch without checking in first.');
            }
            if ($record['checkOut']) {
                throw new Exception('Cannot punch after checking out.');
            }

            // Record intermediate punch
            $stmtPunch = $conn->prepare('INSERT INTO attendance_punches ("attendanceId", "employeeId", "punchTime", latitude, longitude, address, photo) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmtPunch->execute([$record['id'], $decodedToken->id, $now, $lat, $lng, $address, $photoUrl]);
            
        } else {
            throw new Exception('Invalid action.');
        }

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Punch successful', 'time' => $now]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));

// Get Maps Rate Limit Status
$app->get('/api/employee/maps-rate-limit-status', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $ip = RateLimiter::getClientIp();
    $action = 'load_map';

    try {
        $stmtLimit = $conn->query('SELECT maps_rate_limit_attempts, maps_rate_limit_window FROM global_settings ORDER BY id ASC LIMIT 1');
        $settings = $stmtLimit->fetch(PDO::FETCH_ASSOC);
        $maxAttempts = $settings['maps_rate_limit_attempts'] ?? 5;
        $windowMinutes = $settings['maps_rate_limit_window'] ?? 10;

        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, $maxAttempts, $windowMinutes);

        $response->getBody()->write(json_encode([
            'locked' => $secondsRemaining !== null,
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
});

// Get Geofences
$app->get('/api/employee/geofences', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();
    
    $ip = RateLimiter::getClientIp();
    $action = 'load_map';

    try {
        // Fetch dynamic rate limits
        $stmtLimit = $conn->query('SELECT maps_rate_limit_attempts, maps_rate_limit_window FROM global_settings ORDER BY id ASC LIMIT 1');
        $settings = $stmtLimit->fetch(PDO::FETCH_ASSOC);
        $maxAttempts = $settings['maps_rate_limit_attempts'] ?? 5;
        $windowMinutes = $settings['maps_rate_limit_window'] ?? 10;

        if (!RateLimiter::checkLimit($conn, $ip, $action, $maxAttempts, $windowMinutes)) {
            $response->getBody()->write(json_encode(['error' => "Too many map loads. Please try again in {$windowMinutes} minutes."]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
        }
        
        RateLimiter::recordAttempt($conn, $ip, $action);

        $stmt = $conn->query('SELECT id, name, latitude, longitude, radius FROM geofences ORDER BY id ASC');
        $geofences = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $apiKey = $_ENV['GOOGLE_GEOCODING_API_KEY'] ?? '';
        
        $stmtEmp = $conn->prepare('SELECT "geoFenceEnabled" FROM employee WHERE "userId" = ?');
        $stmtEmp->execute([$decodedToken->id]);
        $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        
        $response->getBody()->write(json_encode([
            'geofences' => $geofences,
            'googleMapsApiKey' => $apiKey,
            'geoFenceEnabled' => $emp ? $emp['geoFenceEnabled'] : false
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['employee']));

// Get Employee Holidays
$app->get('/api/employee/holidays', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $month = $params['month'] ?? ''; // e.g. '2026-05'

    try {
        $sql = 'SELECT "id", "holidayDate", "holidayName", "holidayImage", "isActive" FROM company_holidays WHERE "isActive" = 1';
        $bindings = [];

        if ($month) {
            $startDate = $month . '-01';
            $endDate = date('Y-m-d', strtotime($startDate . ' +1 month'));
            $sql .= ' AND "holidayDate" >= ? AND "holidayDate" < ?';
            $bindings[] = $startDate;
            $bindings[] = $endDate;
        }

        $sql .= ' ORDER BY "holidayDate" ASC';

        $stmt = $conn->prepare($sql);
        $stmt->execute($bindings);
        $holidays = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode($holidays));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['employee']));
