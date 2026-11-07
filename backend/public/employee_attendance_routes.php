<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\RateLimiter;

// Private attendance photo upload/download. The service-role key stays server-side only.
function attendanceStorageConfig(): array
{
    $baseUrl = rtrim((string)($_ENV['SUPABASE_URL'] ?? $_ENV['VITE_SUPABASE_URL'] ?? getenv('SUPABASE_URL') ?: ''), '/');
    $serviceKey = (string)($_ENV['SUPABASE_SERVICE_ROLE_KEY'] ?? getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '');
    if (!$baseUrl || !$serviceKey) {
        throw new RuntimeException('Secure file storage is not configured.');
    }
    return [$baseUrl, $serviceKey];
}

function attendanceStorageRequest(string $method, string $objectPath, string $serviceKey, string $baseUrl, ?string $body = null, string $contentType = 'application/octet-stream')
{
    $url = $baseUrl . '/storage/v1/object/attendance/' . rawurlencode($objectPath);
    $headers = [
        'Authorization: Bearer ' . $serviceKey,
        'apikey: ' . $serviceKey,
        'Content-Type: ' . $contentType,
        'Cache-Control: no-store'
    ];
    $context = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $body ?? '',
        'timeout' => 20,
        'ignore_errors' => true
    ]]);
    $result = @file_get_contents($url, false, $context);
    $statusLine = $http_response_header[0] ?? '';
    preg_match('/\\s(\\d{3})\\s/', $statusLine, $matches);
    return ['status' => (int)($matches[1] ?? 0), 'body' => $result === false ? '' : $result];
}

$app->post('/api/employee/attendance/photo', function (Request $request, Response $response) {
    $files = $request->getUploadedFiles();
    $file = $files['photo'] ?? null;
    if (!$file || $file->getError() !== UPLOAD_ERR_OK || !$file->getSize() || $file->getSize() > 5 * 1024 * 1024) {
        $response->getBody()->write(json_encode(['error' => 'Please upload an attendance photo smaller than 5 MB.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $stream = $file->getStream();
    $contents = $stream->getContents();
    $finfo = new \finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->buffer($contents);
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) {
        $response->getBody()->write(json_encode(['error' => 'Only JPEG, PNG, or WEBP attendance photos are allowed.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(415);
    }

    try {
        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $fileName = bin2hex(random_bytes(20)) . '.' . $allowed[$mime];
        $upload = attendanceStorageRequest('POST', $fileName, $serviceKey, $baseUrl, $contents, $mime);
        if ($upload['status'] < 200 || $upload['status'] >= 300) {
            error_log('Attendance storage upload failed with status ' . $upload['status']);
            throw new RuntimeException('Unable to securely upload attendance photo.');
        }
        $response->getBody()->write(json_encode(['photo' => '/Attendance/' . $fileName]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (Throwable $e) {
        error_log('Attendance photo upload failed: ' . $e->getMessage());
        $response->getBody()->write(json_encode(['error' => 'Unable to upload attendance photo right now.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
})->add(new AuthMiddleware(['employee']));

$app->get('/api/storage/attendance/{filename:[A-Za-z0-9._-]+}', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $filename = $args['filename'];
    if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/', $filename)) {
        return $response->withStatus(404);
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();
        if (!$conn) throw new RuntimeException('Database unavailable.');
        $canViewAllAttendance = (($user->role ?? '') === 'admin');
        if (!$canViewAllAttendance) {
            $featureStmt = $conn->prepare('SELECT "canAttendance" FROM user_feature_access WHERE "userId" = :uid LIMIT 1');
            $featureStmt->execute([':uid' => $user->id]);
            $canViewAllAttendance = in_array($featureStmt->fetchColumn(), [true, 1, '1', 't', 'true'], true);
        }
        $pathPattern = '%/Attendance/' . $filename;
        $ownerCondition = $canViewAllAttendance ? 'TRUE' : '"employeeId" = :uid';
        $attendanceParams = [
            ':checkin_path' => $pathPattern,
            ':checkout_path' => $pathPattern
        ];
        if (!$canViewAllAttendance) $attendanceParams[':uid'] = $user->id;
        $stmt = $conn->prepare("
            SELECT 1 FROM attendance
            WHERE {$ownerCondition}
              AND (\"checkInPhoto\" LIKE :checkin_path OR \"checkOutPhoto\" LIKE :checkout_path)
            LIMIT 1
        ");
        $stmt->execute($attendanceParams);
        $authorized = (bool)$stmt->fetchColumn();

        if (!$authorized) {
            $punchOwnerCondition = $canViewAllAttendance ? 'TRUE' : '"employeeId" = :uid';
            $punchParams = [':photo_path' => $pathPattern];
            if (!$canViewAllAttendance) $punchParams[':uid'] = $user->id;
            $punchStmt = $conn->prepare("
                SELECT 1 FROM attendance_punches
                WHERE {$punchOwnerCondition} AND photo LIKE :photo_path
                LIMIT 1
            ");
            $punchStmt->execute($punchParams);
            $authorized = (bool)$punchStmt->fetchColumn();
        }

        if (!$authorized) return $response->withStatus(404);

        [$baseUrl, $serviceKey] = attendanceStorageConfig();
        $download = attendanceStorageRequest('GET', $filename, $serviceKey, $baseUrl);
        if ($download['status'] !== 200) return $response->withStatus(404);

        $response->getBody()->write($download['body']);
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'application/octet-stream';
        return $response->withHeader('Content-Type', $mime)
            ->withHeader('Content-Disposition', 'inline; filename="' . $filename . '"')
            ->withHeader('Cache-Control', 'private, no-store, max-age=0')
            ->withHeader('X-Content-Type-Options', 'nosniff');
    } catch (Throwable $e) {
        error_log('Attendance photo download failed: ' . $e->getMessage());
        return $response->withStatus(503);
    }
})->add(new AuthMiddleware(['admin'], 'attendance'));

// Get Employee Attendance History
/** @var \Slim\App $app */
$app->get('/api/employee/attendance', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $params = $request->getQueryParams();
    $month = $params['month'] ?? date('Y-m'); // Default to current month if not provided
    
    $db = new Database();
    $conn = $db->getConnection();
    
    if ($month) {
        $startDate = $month . '-01';
        $endDate = date('Y-m-t', strtotime($startDate));
        
        $stmt = $conn->prepare('
            SELECT a.*, e."shiftTime", s."startTime" as "shiftStartTime", s."endTime" as "shiftEndTime" 
            FROM attendance a 
            JOIN employee e ON a."employeeId" = e."userId" 
            LEFT JOIN shift_times s ON e."shiftTime" = s."shiftLabel"
            WHERE a."employeeId" = ? AND a.date >= ? AND a.date <= ? 
            ORDER BY a.date DESC
        ');
        $stmt->execute([$decodedToken->id, $startDate, $endDate]);
    } else {
        $stmt = $conn->prepare('
            SELECT a.*, e."shiftTime", s."startTime" as "shiftStartTime", s."endTime" as "shiftEndTime" 
            FROM attendance a 
            JOIN employee e ON a."employeeId" = e."userId" 
            LEFT JOIN shift_times s ON e."shiftTime" = s."shiftLabel"
            WHERE a."employeeId" = ? 
            ORDER BY a.date DESC 
            LIMIT 30
        ');
        $stmt->execute([$decodedToken->id]);
    }
    
    $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

    // If no photo provided (web attendance), store descriptive text label
    if (empty($photoUrl)) {
        if ($action === 'check-in') {
            $photoUrl = 'Web Checkin';
        } else if ($action === 'check-out') {
            $photoUrl = 'Web Checkout';
        } else if ($action === 'punch') {
            $photoUrl = 'Web Punch';
        }
    }
    
    // Only fetch Google Geocoding API if address is empty and API key is present
    if ($lat && $lng && empty($address)) {
        $apiKey = $_ENV['GOOGLE_GEOCODING_API_KEY'] ?? '';
        if ($apiKey) {
            $ctx = stream_context_create(['http' => ['timeout' => 1.5]]);
            $url = "https://maps.googleapis.com/maps/api/geocode/json?latlng={$lat},{$lng}&key={$apiKey}";
            $geocodeResponse = @file_get_contents($url, false, $ctx);
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
                throw new Exception('You Are On An Approved Leave Today. Cannot Check In.');
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

            // Automatic Day-End validation for background tracker
            // Tracks from check-in to check-out. If no checkout, stops at midnight IST.
            if ($photoUrl === 'Tracker') {
                // Stop if the attendance date is not today (past midnight Kolkata time)
                if ($record['date'] !== $today) {
                    throw new Exception('Day has ended. Automatic tracking stopped.');
                }
            }

            // Record intermediate punch
            $stmtPunch = $conn->prepare('INSERT INTO attendance_punches ("attendanceId", "employeeId", "punchTime", latitude, longitude, address, photo) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmtPunch->execute([$record['id'], $decodedToken->id, $now, $lat, $lng, $address, $photoUrl]);
            
        } else {
            throw new Exception('Invalid action.');
        }

        // Fetch the fresh updated record for immediate UI sync
        $stmtUpdated = $conn->prepare('SELECT id, "employeeId", date, status, "checkIn", "checkOut", hours, "isRegularized", "checkInPhoto", "checkOutPhoto", "checkInLat", "checkInLng", "checkInAddress", "checkOutLat", "checkOutLng", "checkOutAddress" FROM attendance WHERE "employeeId" = ? AND date = ? LIMIT 1');
        $stmtUpdated->execute([$decodedToken->id, $today]);
        $updatedRecord = $stmtUpdated->fetch(PDO::FETCH_ASSOC);

        $conn->commit();
        $response->getBody()->write(json_encode([
            'message' => 'Punch successful',
            'time' => $now,
            'attendance' => $updatedRecord
        ]));
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
