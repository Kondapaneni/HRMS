<?php

use Slim\Factory\AppFactory;
use App\Middleware\AuditMiddleware;
use App\Middleware\AuthMiddleware;
use App\Middleware\PerformanceLoggingMiddleware;
use App\Middleware\GzipMiddleware;
use App\Config\Database;
use Dotenv\Dotenv;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Firebase\JWT\JWT;

require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/sec007_cors.php';
require_once __DIR__ . '/sec008_mfa_guard.php';

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

// Set default timezone to IST to match database
date_default_timezone_set('Asia/Kolkata');

// Instantiate App
$app = AppFactory::create();

// Add Body Parsing Middleware for JSON POST requests
$app->addBodyParsingMiddleware();

// Add error middleware
$app->addErrorMiddleware(true, true, true);

// Add custom audit middleware
$app->add(new AuditMiddleware());

// Add performance logging middleware
$app->add(new \App\Middleware\PerformanceLoggingMiddleware());

// Add GZIP compression middleware
$app->add(new \App\Middleware\GzipMiddleware());

// SEC-020: Every protected API request must observe live maintenance mode.
// Registered before the CORS wrapper so even 503 responses retain CORS policy.
$app->add(new \App\Middleware\MaintenanceMiddleware());

// SEC-007: Only explicitly configured trusted origins can read cross-origin
// API responses. The same-origin SPA/native WebView needs no CORS permission.
// Apache applies browser security headers to ALL static and PHP responses.
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    $origin = $request->getHeaderLine('Origin');

    // Strip any wildcard headers set by individual routes. Never emit
    // Access-Control-Allow-Credentials when the origin is not allowlisted.
    $response = $response
        ->withoutHeader('Access-Control-Allow-Origin')
        ->withoutHeader('Access-Control-Allow-Credentials')
        ->withoutHeader('Access-Control-Allow-Headers')
        ->withoutHeader('Access-Control-Allow-Methods')
        ->withAddedHeader('Vary', 'Origin');

    $configuredFrontend = (string) ($_ENV['FRONTEND_URL'] ?? getenv('FRONTEND_URL') ?: '');
    $extraAllowed = (string) ($_ENV['CORS_ALLOWED_ORIGINS'] ?? getenv('CORS_ALLOWED_ORIGINS') ?: '');
    $allowedOrigin = sec007AllowedCorsOrigin($origin, $configuredFrontend, $extraAllowed);
    if ($allowedOrigin === null) {
        return $response;
    }

    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// SEC-003: browser <img>, <a>, and <video> cannot attach Bearer headers.
// After a valid JWT-authenticated API request, mint an HttpOnly, HTTPS-only
// 30-minute file-view cookie. File routes still re-verify JWT + DB ownership.
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    $path = $request->getUri()->getPath();
    $cookieAttributes = 'Path=/; Secure; HttpOnly; SameSite=Lax';
    if ($path === '/api/logout') {
        return $response->withAddedHeader('Set-Cookie',
            'hrms_file_auth=; Max-Age=0; ' . $cookieAttributes);
    }
    if (!str_starts_with($path, '/api/') || $response->getStatusCode() >= 400) return $response;
    $auth = trim($request->getHeaderLine('Authorization'));
    if (!preg_match('/\ABearer\s+([A-Za-z0-9._-]+)\z/i', $auth, $matches)) return $response;
    $secret = (string) ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '');
    if ($secret === '') return $response;
    try {
        $claims = JWT::decode($matches[1], new \Firebase\JWT\Key($secret, 'HS256'));
        if (empty($claims->id) || empty($claims->role)) return $response;
    } catch (Throwable $e) {
        return $response;
    }
    return $response->withAddedHeader('Set-Cookie',
        'hrms_file_auth=' . $matches[1] . '; Max-Age=1800; ' . $cookieAttributes);
});

// Handle preflight OPTIONS requests for CORS
$app->options('/{routes:.+}', function ($request, $response, $args) {
    return $response;
});

// Routes
$app->get('/', function ($request, $response, $args) {
    $response->getBody()->write(json_encode(['status' => 'API is running']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// App version check endpoint (uses the centralized SEC-007 CORS allowlist)
$app->get('/version.json', function (Request $request, Response $response, $args) {
    $versionFile = __DIR__ . '/version.json';
    if (file_exists($versionFile)) {
        $content = file_get_contents($versionFile);
        $response->getBody()->write($content);
    } else {
        $response->getBody()->write(json_encode([
            'version' => time() * 1000,
            'semver' => 'v1.0.0',
            'commit' => 'live'
        ]));
    }
    return $response->withHeader('Content-Type', 'application/json');
});

use App\Utils\RateLimiter;

// Login endpoint
$app->post('/api/login', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $db = new Database();
    $conn = $db->getConnection();

    if (!$conn) {
        $response->getBody()->write(json_encode(['error' => 'Database connection error']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }

    $ip = RateLimiter::getClientIp();
    $action = 'login';
    
    // Fetch dynamic settings from global_settings
    $stmt = $conn->query('SELECT login_rate_limit_attempts, login_rate_limit_window, session_timeout FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $maxAttempts = $settings['login_rate_limit_attempts'] ?? 5;
    $windowMinutes = $settings['login_rate_limit_window'] ?? 15;
    $sessionTimeout = $settings['session_timeout'] ?? '30';

    if (!RateLimiter::checkLimit($conn, $ip, $action, $maxAttempts, $windowMinutes)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, $maxAttempts, $windowMinutes);
        $response->getBody()->write(json_encode([
            'error' => "Too Many Login Attempts. Please Try Again Later.",
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    $stmt = $conn->prepare('
        SELECT u.id, u.email, u.password, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", u."themePreference", u."mfaEnabled"
        FROM users u
        WHERE u.email = ?
    ');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {
        $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
        if (!$isActive) {
            $response->getBody()->write(json_encode(['error' => 'Your account has been deactivated. Please contact your administrator.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // SEC-008: Password and email-OTP login use one confirmed-MFA policy.
        if (sec008MfaRequired($conn, $user)) {
            $secret = (string) ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '');
            return sec008MfaChallenge($response, $user, $secret);
        }

        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
        
        $payload = [
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => ($sessionTimeout === 'never') ? time() + (60 * 60 * 24 * 365 * 10) : time() + ((int)$sessionTimeout * 60), // Dynamic expiration
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        $jwt = JWT::encode($payload, $secret, 'HS256');

        unset($user['password']); // Don't return password hash

        $faStmt = $conn->prepare('SELECT "canAttendance", "canLeave", "canPayroll", "canExpenses", "canEmployees", "canRecruitment", "canAssets", "canLoanOrigination", "canSalesOrigination", "canBranchOperations", "canAdminAssessments" FROM user_feature_access WHERE "userId" = ?');
        $faStmt->execute([$user['id']]);
        $fa = $faStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fa) {
            $user['featureAccess'] = [
                'canAttendance' => (bool)$fa['canAttendance'],
                'canLeave' => (bool)$fa['canLeave'],
                'canPayroll' => (bool)$fa['canPayroll'],
                'canExpenses' => (bool)($fa['canExpenses'] ?? false),
                'canEmployees' => (bool)$fa['canEmployees'],
                'canRecruitment' => (bool)$fa['canRecruitment'],
                'canAssets' => (bool)$fa['canAssets'],
                'canLoanOrigination' => (bool)$fa['canLoanOrigination'],
                'canSalesOrigination' => (bool)($fa['canSalesOrigination'] ?? false),
                'canBranchOperations' => (bool)($fa['canBranchOperations'] ?? false),
                'canAdminAssessments' => (bool)($fa['canAdminAssessments'] ?? false),
            ];
        }

        $response->getBody()->write(json_encode([
            'token' => $jwt,
            'user' => $user
        ]));
        
        RateLimiter::clearAttempts($conn, $ip, $action);
        
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(200);
    }

    RateLimiter::recordAttempt($conn, $ip, $action);

    $response->getBody()->write(json_encode(['error' => 'Invalid email or password']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
});

// Send Email OTP for Login
$app->post('/api/auth/otp/send', function (Request $request, Response $response, $args) {
    $rawBody = (string)$request->getBody();
    $data = json_decode($rawBody, true) ?: $request->getParsedBody() ?: [];
    $email = trim($data['email'] ?? '');

    if (!$email) {
        $response->getBody()->write(json_encode(['error' => 'Email address is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    $ip = RateLimiter::getClientIp();
    $action = 'otp_send';

    // Rate limit check: max 5 OTP requests per 10 minutes
    if (!RateLimiter::checkLimit($conn, $ip, $action, 5, 10)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, 5, 10);
        $response->getBody()->write(json_encode([
            'error' => "Too many verification attempts. Please wait before requesting another code.",
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    RateLimiter::recordAttempt($conn, $ip, $action);

    // Verify user exists and is active
    $stmt = $conn->prepare('SELECT id, email, "firstName", "lastName", "isActive" FROM users WHERE LOWER(email) = LOWER(?)');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'No employee account found with that email address']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
    if (!$isActive) {
        $response->getBody()->write(json_encode(['error' => 'Your account has been deactivated. Please contact your administrator.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    // Generate 6-digit cryptographically secure OTP
    $otp = strval(random_int(100000, 999999));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

    // Save OTP to user record
    $updateStmt = $conn->prepare('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE id = ?');
    $updateStmt->execute([$otp, $expiresAt, $user['id']]);

    // Load and render OTP email template
    $templatePath = __DIR__ . '/../src/Templates/otp_login_email.html';
    $emailBody = '';
    if (file_exists($templatePath)) {
        $emailBody = file_get_contents($templatePath);
        $emailBody = str_replace('{{firstName}}', htmlspecialchars($user['firstName'] ?? 'Employee'), $emailBody);
        $emailBody = str_replace('{{otpCode}}', $otp, $emailBody);
        $emailBody = str_replace('{{currentYear}}', date('Y'), $emailBody);
    } else {
        $emailBody = "Your Acme HRMS verification code is: {$otp}. It expires in 10 minutes.";
    }

    // Insert into email_queue
    $queueStmt = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
    $queueStmt->execute([
        $user['email'],
        "{$otp} is your Acme HRMS verification code",
        $emailBody
    ]);

    $response->getBody()->write(json_encode([
        'status' => 'success',
        'message' => 'Verification code sent to your email'
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Verify Email OTP and Sign In
$app->post('/api/auth/otp/verify', function (Request $request, Response $response, $args) {
    $rawBody = (string)$request->getBody();
    $data = json_decode($rawBody, true) ?: $request->getParsedBody() ?: [];
    $email = trim($data['email'] ?? '');
    $otp = trim($data['otp'] ?? '');

    if (!$email || !$otp) {
        $response->getBody()->write(json_encode(['error' => 'Email and verification code are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    $ip = RateLimiter::getClientIp();
    $action = 'otp_verify';

    // Rate limit check
    if (!RateLimiter::checkLimit($conn, $ip, $action, 6, 15)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, 6, 15);
        $response->getBody()->write(json_encode([
            'error' => "Too Many Login Attempts. Please Try Again Later.",
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    $stmt = $conn->prepare('
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", u."themePreference", u."mfaEnabled", u.otp_code, u.otp_expires_at
        FROM users u
        WHERE LOWER(u.email) = LOWER(?)
    ');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Invalid email or verification code']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
    if (!$isActive) {
        $response->getBody()->write(json_encode(['error' => 'Your account has been deactivated. Please contact your administrator.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    if (empty($user['otp_code']) || empty($user['otp_expires_at'])) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'No active verification code found. Please request a new code.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (strtotime($user['otp_expires_at']) < time()) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Verification code has expired. Please request a new one.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if ($user['otp_code'] !== $otp) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Invalid verification code. Please check your email.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    // OTP matched! Clear OTP immediately
    $clearStmt = $conn->prepare('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = ?');
    $clearStmt->execute([$user['id']]);

    // SEC-008: A valid email OTP proves only the first factor.
    // Do not return a privileged session when confirmed authenticator MFA is active.
    if (sec008MfaRequired($conn, $user)) {
        RateLimiter::clearAttempts($conn, $ip, $action);
        $secret = (string) ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '');
        return sec008MfaChallenge($response, $user, $secret);
    }

    // Fetch session settings
    $settingsStmt = $conn->query('SELECT session_timeout FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);
    $sessionTimeout = $settings['session_timeout'] ?? '30';

    $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';

    $payload = [
        'iss' => 'acme_hrms',
        'iat' => time(),
        'exp' => ($sessionTimeout === 'never') ? time() + (60 * 60 * 24 * 365 * 10) : time() + ((int)$sessionTimeout * 60),
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ];

    $jwt = JWT::encode($payload, $secret, 'HS256');

    unset($user['otp_code'], $user['otp_expires_at']);

    // Fetch feature access
    $faStmt = $conn->prepare('SELECT "canAttendance", "canLeave", "canPayroll", "canExpenses", "canEmployees", "canRecruitment", "canAssets", "canLoanOrigination", "canSalesOrigination", "canBranchOperations", "canAdminAssessments" FROM user_feature_access WHERE "userId" = ?');
    $faStmt->execute([$user['id']]);
    $fa = $faStmt->fetch(PDO::FETCH_ASSOC);

    if ($fa) {
        $user['featureAccess'] = [
            'canAttendance' => (bool)$fa['canAttendance'],
            'canLeave' => (bool)$fa['canLeave'],
            'canPayroll' => (bool)$fa['canPayroll'],
            'canExpenses' => (bool)($fa['canExpenses'] ?? false),
            'canEmployees' => (bool)$fa['canEmployees'],
            'canRecruitment' => (bool)$fa['canRecruitment'],
            'canAssets' => (bool)$fa['canAssets'],
            'canLoanOrigination' => (bool)$fa['canLoanOrigination'],
            'canSalesOrigination' => (bool)($fa['canSalesOrigination'] ?? false),
            'canBranchOperations' => (bool)($fa['canBranchOperations'] ?? false),
            'canAdminAssessments' => (bool)($fa['canAdminAssessments'] ?? false),
        ];
    }

    RateLimiter::clearAttempts($conn, $ip, $action);

    $response->getBody()->write(json_encode([
        'token' => $jwt,
        'user' => $user
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

$app->post('/api/logout', function (Request $request, Response $response, $args) {
    $response->getBody()->write(json_encode(['message' => 'Logged out']));
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(200);
});

// Get global news headlines & maintenance status (Public)
$app->get('/api/news', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query('SELECT news_headlines, maintenance_mode, maintenance_message, tracking_interval_minutes FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $headlines = isset($settings['news_headlines']) ? json_decode($settings['news_headlines'], true) : [];
    $maintenanceMode = \App\Middleware\MaintenanceMiddleware::enabled($settings['maintenance_mode'] ?? null);
    $maintenanceMessage = $settings['maintenance_message'] ?? '';
    $trackingIntervalMinutes = isset($settings['tracking_interval_minutes']) ? (int)$settings['tracking_interval_minutes'] : 15;
    
    $response->getBody()->write(json_encode([
        'news_headlines' => $headlines,
        'maintenance_mode' => $maintenanceMode,
        'maintenance_message' => $maintenanceMessage,
        'tracking_interval_minutes' => $trackingIntervalMinutes
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Get current user profile endpoint (Protected)
$app->get('/api/me', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", u."themePreference", e.avatar, e."employeeId", e."geoFenceEnabled", e."webAttendanceEnabled",
               fa."canAttendance", fa."canLeave", fa."canPayroll", fa."canExpenses", fa."canEmployees", fa."canRecruitment", fa."canAssets", fa."canLoanOrigination", fa."canSalesOrigination", fa."canBranchOperations", fa."canAdminAssessments"
        FROM users u 
        LEFT JOIN employee e ON u.id = e."userId" 
        LEFT JOIN user_feature_access fa ON u.id = fa."userId"
        WHERE u.id = ?
    ');
    $stmt->execute([$decodedToken->id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        $stmtSettings = $conn->query('SELECT admin_avatar, news_headlines FROM global_settings ORDER BY id ASC LIMIT 1');
        $settings = $stmtSettings->fetch(PDO::FETCH_ASSOC);
        
        if ($user['role'] === 'admin' && !empty($settings['admin_avatar'])) {
            $user['avatar'] = $settings['admin_avatar'];
        }
        
        $user['news_headlines'] = isset($settings['news_headlines']) ? json_decode($settings['news_headlines'], true) : [];

        if (isset($user['canAttendance'])) {
            $user['featureAccess'] = [
                'canAttendance' => (bool)$user['canAttendance'],
                'canLeave' => (bool)$user['canLeave'],
                'canPayroll' => (bool)$user['canPayroll'],
                'canExpenses' => (bool)($user['canExpenses'] ?? false),
                'canEmployees' => (bool)$user['canEmployees'],
                'canRecruitment' => (bool)$user['canRecruitment'],
                'canAssets' => (bool)$user['canAssets'],
                'canLoanOrigination' => (bool)$user['canLoanOrigination'],
                'canSalesOrigination' => (bool)($user['canSalesOrigination'] ?? false),
                'canBranchOperations' => (bool)($user['canBranchOperations'] ?? false),
                'canAdminAssessments' => (bool)($user['canAdminAssessments'] ?? false),
            ];
        }
        unset($user['canAttendance'], $user['canLeave'], $user['canPayroll'], $user['canExpenses'], $user['canEmployees'], $user['canRecruitment'], $user['canAssets'], $user['canLoanOrigination'], $user['canSalesOrigination'], $user['canBranchOperations'], $user['canAdminAssessments']);
        
        $response->getBody()->write(json_encode($user));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    $response->getBody()->write(json_encode(['error' => 'User not found']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager', 'candidate']));

// Update Theme Preference (Protected - any authenticated user)
$app->put('/api/user/theme', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $body = $request->getParsedBody();
    $theme = strtolower(trim($body['theme'] ?? $body['themePreference'] ?? 'system'));

    if (!in_array($theme, ['light', 'dark', 'system'])) {
        $response->getBody()->write(json_encode(['error' => 'Invalid theme preference. Allowed values: light, dark, system']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmtUser = $conn->prepare('UPDATE users SET "themePreference" = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmtUser->execute([$theme, $decodedToken->id]);

        $stmtEmp = $conn->prepare('UPDATE employee SET "themePreference" = ?, updated_at = CURRENT_TIMESTAMP WHERE "userId" = ?');
        $stmtEmp->execute([$theme, $decodedToken->id]);

        $response->getBody()->write(json_encode([
            'success' => true,
            'themePreference' => $theme,
            'message' => 'Theme preference saved successfully'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager', 'candidate']));

// Change password endpoint (Protected)
$app->put('/api/change-password', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $data = $request->getParsedBody();
    $newPassword = $data['newPassword'] ?? '';

    if (empty($newPassword)) {
        $response->getBody()->write(json_encode(['error' => 'New password is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (!\App\Utils\PasswordValidator::validate($newPassword)) {
        $response->getBody()->write(json_encode(['error' => \App\Utils\PasswordValidator::getPolicyMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare('UPDATE users SET password = ?, "forcePasswordChange" = false WHERE id = ?');
        $stmt->execute([$hashedPassword, $decodedToken->id]);
        
        $userStmt = $conn->prepare('SELECT role FROM users WHERE id = ?');
        $userStmt->execute([$decodedToken->id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);
        
        $response->getBody()->write(json_encode([
            'message' => 'Password updated successfully',
            'role' => $user['role']
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Failed to update password']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager', 'candidate']));

require __DIR__ . '/employee_attendance_routes.php';
require __DIR__ . '/employee_leave_routes.php';
require __DIR__ . '/employee_payroll_routes.php';
require __DIR__ . '/employee_profile_routes.php';
require __DIR__ . '/employee_performance_routes.php';
require __DIR__ . '/employee_expenses_routes.php';
require __DIR__ . '/employee_assessments_routes.php';
require __DIR__ . '/employee_training_routes.php';
require __DIR__ . '/employee_chatbot_routes.php';
require __DIR__ . '/admin_chatbot_routes.php';
require __DIR__ . '/mfa_routes.php';

require __DIR__ . '/admin_dashboard_routes.php';
require __DIR__ . '/admin_employees_routes.php';
require __DIR__ . '/admin_expenses_routes.php';
require __DIR__ . '/admin_attendance_routes.php';
require __DIR__ . '/admin_holidays_routes.php';
require __DIR__ . '/admin_leave_routes.php';
require __DIR__ . '/admin_payroll_routes.php';
require __DIR__ . '/admin_assets_routes.php';
require __DIR__ . '/admin_audit_routes.php';
require __DIR__ . '/admin_feature_access_routes.php';
require __DIR__ . '/admin_performance_routes.php';
require __DIR__ . '/admin_settings_routes.php';
require __DIR__ . '/admin_recruitment_routes.php';
require __DIR__ . '/admin_assessments_routes.php';
require __DIR__ . '/admin_training_routes.php';
require __DIR__ . '/admin_reports_routes.php';
require __DIR__ . '/candidate_auth_routes.php';
require __DIR__ . '/candidate_recruitment_routes.php';
require __DIR__ . '/origination_loans_dashboard_routes.php';
require __DIR__ . '/origination_loans_leads_routes.php';
require __DIR__ . '/origination_loans_member_routes.php';
require __DIR__ . '/origination_loans_application_routes.php';
require __DIR__ . '/origination_activities_routes.php';
require __DIR__ . '/origination_sales_dashboard_routes.php';
require __DIR__ . '/origination_sales_leads_routes.php';
require __DIR__ . '/branch_operations_dashboard_routes.php';
require __DIR__ . '/branch_operations_application_routes.php';
require __DIR__ . '/storage_routes.php';
require __DIR__ . '/sec003_file_access.php';

// Request Password Reset
$app->post('/api/forgot-password', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $email = $data['email'] ?? '';

    if (!$email) {
        $response->getBody()->write(json_encode(['error' => 'Email is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    $ip = RateLimiter::getClientIp();
    $action = 'forgot_password';

    // Fetch dynamic rate limits from global_settings
    $stmt = $conn->query('SELECT forgot_password_rate_limit_attempts, forgot_password_rate_limit_window FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $maxAttempts = $settings['forgot_password_rate_limit_attempts'] ?? 3;
    $windowMinutes = $settings['forgot_password_rate_limit_window'] ?? 60;

    if (!RateLimiter::checkLimit($conn, $ip, $action, $maxAttempts, $windowMinutes)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, $maxAttempts, $windowMinutes);
        $response->getBody()->write(json_encode([
            'error' => "Too Many Reset Attempts. Please Try Again Later.",
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }
    
    RateLimiter::recordAttempt($conn, $ip, $action);

    // Check if user exists
    $stmt = $conn->prepare('SELECT id, "firstName", "lastName" FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if ($user) {
        // Generate secure token
        $token = bin2hex(random_bytes(32)); // 64 chars
        $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

        // Save token to DB
        $updateStmt = $conn->prepare("UPDATE users SET reset_token = :token, reset_token_expires = :expires WHERE id = :id");
        $updateStmt->execute([
            'token' => $token,
            'expires' => $expires,
            'id' => $user['id']
        ]);

        // Email clients need an absolute reset URL, even if FRONTEND_URL isn't set.
        // Never derive this origin from user-controlled Host / X-Forwarded-Host headers.
        $frontendUrl = rtrim(trim($_ENV['FRONTEND_URL'] ?? ''), '/');
        if ($frontendUrl === '') {
            $frontendUrl = 'https://hrms-qwv3.onrender.com';
        }
        $resetLink = $frontendUrl . "/reset-password?token=" . rawurlencode($token);

        // Escape the URL before inserting it into HTML attributes and visible text.
        $safeResetLink = htmlspecialchars($resetLink, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $templatePath = __DIR__ . '/../src/Templates/reset_password.html';
        $emailContent = '';
        if (file_exists($templatePath)) {
            $emailContent = file_get_contents($templatePath);
            $emailContent = str_replace('{{resetLink}}', $safeResetLink, $emailContent);
            $emailContent = str_replace('{{currentYear}}', date('Y'), $emailContent);
        } else {
            $emailContent = '<p>Reset your password using this link:</p><p><a href="' . $safeResetLink . '">Reset your password</a></p>';
        }

        // Queue email
        $queueStmt = $conn->prepare("INSERT INTO email_queue (to_email, subject, body) VALUES (:email, :subject, :body)");
        $queueStmt->execute([
            'email' => $email,
            'subject' => 'Password Reset - Acme HRMS',
            'body' => $emailContent
        ]);
    }

    // Always return success even if email not found (security best practice)
    $response->getBody()->write(json_encode(['message' => 'If an account with that email exists, a password reset link has been sent.']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Execute Password Reset
$app->post('/api/reset-password', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $token = $data['token'] ?? '';
    $newPassword = $data['newPassword'] ?? '';

    if (!$token || !$newPassword || strlen($newPassword) < 8) {
        $response->getBody()->write(json_encode(['error' => 'Valid token and a password of at least 8 characters are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    // Find valid token
    $stmt = $conn->prepare("SELECT id, role FROM users WHERE reset_token = :token AND reset_token_expires > CURRENT_TIMESTAMP");
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'Invalid or expired password reset token']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (!\App\Utils\PasswordValidator::validate($newPassword)) {
        $response->getBody()->write(json_encode(['error' => \App\Utils\PasswordValidator::getPolicyMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Hash new password
    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    // Update password and clear token
    $updateStmt = $conn->prepare("UPDATE users SET password = :hash, reset_token = NULL, reset_token_expires = NULL, \"forcePasswordChange\" = false WHERE id = :id");
    $updateStmt->execute([
        'hash' => $passwordHash,
        'id' => $user['id']
    ]);

    $response->getBody()->write(json_encode([
        'message' => 'Password has been successfully reset',
        'role' => $user['role']
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Resume proxy route for clean URLs
$app->get('/Resume/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'resumes', 'inline');
});

// Job Description proxy route for clean URLs
$app->get('/Job-Description/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/job_descriptions/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'attachment');
});

// Offer Letter proxy route for clean URLs
$app->get('/Offer-Letter/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'offer_letters', 'attachment');
});

function getMimeType($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    switch ($ext) {
        case 'pdf': return 'application/pdf';
        case 'png': return 'image/png';
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'webm': return 'video/webm';
        case 'mp4': return 'video/mp4';
        default: return 'application/octet-stream';
    }
}

function streamSupabaseFile($supabaseUrl, Response $response, $filename, $disposition = 'inline') {
    $etag = '"' . md5($filename) . '"';
    
    $clientEtag = isset($_SERVER['HTTP_IF_NONE_MATCH']) ? trim($_SERVER['HTTP_IF_NONE_MATCH']) : '';
    if ($clientEtag === $etag) {
        return $response->withStatus(304);
    }
    
    if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE'])) {
        return $response->withStatus(304);
    }

    $context = stream_context_create(["http" => ["method" => "GET", "header" => "User-Agent: PHP\r\n"]]);
    $stream = @fopen($supabaseUrl, 'rb', false, $context);
    
    if (!$stream) {
        $response->getBody()->write("File not found.");
        return $response->withStatus(404);
    }
    
    $slimStream = new \Slim\Psr7\Stream($stream);
    
    return $response
        ->withBody($slimStream)
        ->withHeader('Content-Type', getMimeType($filename))
        ->withHeader('Content-Disposition', $disposition . '; filename="' . basename($filename) . '"')
        ->withHeader('Cache-Control', 'public, max-age=31536000, immutable')
        ->withHeader('ETag', $etag);
}

// Avatar proxy route
$app->get('/Avatar/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'avatars', 'inline');
});

// Holiday proxy route
$app->get('/Holiday/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/holidays/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Attendance proxy route
$app->get('/Attendance/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'attendance', 'inline');
});

// Candidate Document proxy route
$app->get('/Candidate-Document/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'candidate_documents', 'inline');
});

// Bills proxy route
$app->get('/Bills/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'expenses', 'inline');
});


// Loan Document proxy route
$app->get('/Loan-Document/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'loan_documents', 'inline');
});

// Loan Signature proxy route
$app->get('/Loan-Signature/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'loan_signatures', 'inline');
});

// Training Video proxy route (redirect to Supabase for native video caching and range requests)
$app->get('/Training-Video/{filename:.+}', function (Request $request, Response $response, $args) {
    return sec003Serve($request, $response, $args, 'training_videos', 'inline');
});


// Run app
$app->run();

