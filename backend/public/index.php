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
$isDevelopment = (($_ENV['APP_ENV'] ?? getenv('APP_ENV') ?? 'production') === 'development');
$app->addErrorMiddleware($isDevelopment, true, true);

// Add custom audit middleware
$app->add(new AuditMiddleware());

// Add performance logging middleware
$app->add(new \App\Middleware\PerformanceLoggingMiddleware());

// Add GZIP compression middleware
$app->add(new \App\Middleware\GzipMiddleware());

// Security & CORS Middleware
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    
    // Ensure origin matches configured FRONTEND_URL or native mobile/local environments
    $configuredFrontend = rtrim($_ENV['FRONTEND_URL'] ?? '', '/');
    $origin = $request->getHeaderLine('Origin');
    
    $allowedOrigin = $configuredFrontend;
    if (!empty($origin)) {
        $allowedOrigins = [
            $configuredFrontend,
            'https://localhost',
            'http://localhost',
            'capacitor://localhost',
            'http://localhost:5173',
            'http://localhost:3000'
        ];
        
        if (
            in_array($origin, $allowedOrigins) || 
            str_starts_with($origin, 'capacitor://') || 
            str_starts_with($origin, 'http://localhost:') || 
            str_starts_with($origin, 'https://localhost:')
        ) {
            $allowedOrigin = $origin;
        } else {
            $allowedOrigin = 'null'; // Invalidate unknown origins
        }
    }
    
    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
        ->withHeader('Access-Control-Allow-Credentials', 'true')
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
        ->withHeader('X-Frame-Options', 'SAMEORIGIN')
        ->withHeader('X-XSS-Protection', '1; mode=block')
        ->withHeader('X-Content-Type-Options', 'nosniff')
        ->withHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
        ->withHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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

// App version check endpoint (supports CORS for all origins)
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
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
        SELECT u.id, u.email, u.password, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", u."themePreference", u.session_version
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
        
        $secret = trim($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '');
        if (empty($secret) || strlen($secret) < 32) {
            error_log('Login error: JWT_SECRET environment variable is missing, empty, or insecure (minimum 32 characters required).');
            $response->getBody()->write(json_encode(['error' => 'Authentication service configuration error. Please contact your administrator.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
        }
        
        $payload = [
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => time() + (($sessionTimeout === 'never') ? (60 * 60 * 12) : max(300, min(86400, ((int)$sessionTimeout) * 60))), // Dynamic expiration
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'sv' => (int)($user['session_version'] ?? 0)
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
    $otpHash = password_hash($otp, PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare('UPDATE users SET otp_code = NULL, otp_code_hash = ?, otp_expires_at = ? WHERE id = ?');
    $updateStmt->execute([$otpHash, $expiresAt, $user['id']]);

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
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", u."themePreference", u.otp_code, u.otp_code_hash, u.otp_expires_at, u.session_version
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

    $storedOtpHash = $user['otp_code_hash'] ?? null;
    $legacyOtp = $user['otp_code'] ?? null;
    if ((empty($storedOtpHash) && empty($legacyOtp)) || empty($user['otp_expires_at'])) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'No active verification code found. Please request a new code.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (strtotime($user['otp_expires_at']) < time()) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Verification code has expired. Please request a new one.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $otpMatches = $storedOtpHash ? password_verify($otp, $storedOtpHash) : (is_string($legacyOtp) && hash_equals($legacyOtp, $otp));
    if (!$otpMatches) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Invalid verification code. Please check your email.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    // OTP matched! Clear OTP immediately
    $clearStmt = $conn->prepare('UPDATE users SET otp_code = NULL, otp_code_hash = NULL, otp_expires_at = NULL WHERE id = ? AND (otp_code_hash = ? OR otp_code = ?) AND otp_expires_at > CURRENT_TIMESTAMP');
    $clearStmt->execute([$user['id'], $storedOtpHash ?? '', $legacyOtp ?? '']);
    if ($clearStmt->rowCount() !== 1) {
        $response->getBody()->write(json_encode(['error' => 'Verification code has already been used. Please request a new one.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    // Fetch session settings
    $settingsStmt = $conn->query('SELECT session_timeout FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $settingsStmt->fetch(PDO::FETCH_ASSOC);
    $sessionTimeout = $settings['session_timeout'] ?? '30';

    $secret = trim($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '');
    if (empty($secret) || strlen($secret) < 32) {
        error_log('OTP verification error: JWT_SECRET environment variable is missing, empty, or insecure (minimum 32 characters required).');
        $response->getBody()->write(json_encode(['error' => 'Authentication service configuration error. Please contact your administrator.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }

    $payload = [
        'iss' => 'acme_hrms',
        'iat' => time(),
        'exp' => time() + (($sessionTimeout === 'never') ? (60 * 60 * 12) : max(300, min(86400, ((int)$sessionTimeout) * 60))),
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'sv' => (int)($user['session_version'] ?? 0)
    ];

    $jwt = JWT::encode($payload, $secret, 'HS256');

    unset($user['otp_code'], $user['otp_code_hash'], $user['otp_expires_at']);

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
    $user = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();
    if (!$conn || !$user || empty($user->id)) {
        $response->getBody()->write(json_encode(['error' => 'Authentication service temporarily unavailable.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }
    $stmt = $conn->prepare('UPDATE users SET session_version = COALESCE(session_version, 0) + 1 WHERE id = :id');
    $stmt->execute(['id' => $user->id]);
    $response->getBody()->write(json_encode(['message' => 'Logged out']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware());

// Get global news headlines & maintenance status (Public)
$app->get('/api/news', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query('SELECT news_headlines, maintenance_mode, maintenance_message, tracking_interval_minutes FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $headlines = isset($settings['news_headlines']) ? json_decode($settings['news_headlines'], true) : [];
    $maintenanceMode = isset($settings['maintenance_mode']) && $settings['maintenance_mode'] ? true : false;
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
})->add(new AuthMiddleware());

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
})->add(new AuthMiddleware());

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
        $secret = trim($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '');
        if (strlen($secret) < 32) {
            error_log('Change-password error: JWT_SECRET is missing or too short.');
            $response->getBody()->write(json_encode(['error' => 'Authentication service configuration error.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $conn->prepare('UPDATE users SET password = ?, "forcePasswordChange" = false, session_version = COALESCE(session_version, 0) + 1 WHERE id = ? RETURNING session_version');
        $stmt->execute([$hashedPassword, $decodedToken->id]);
        $newSessionVersion = (int)$stmt->fetchColumn();

        $userStmt = $conn->prepare('SELECT email, role FROM users WHERE id = ?');
        $userStmt->execute([$decodedToken->id]);
        $user = $userStmt->fetch(PDO::FETCH_ASSOC);

        $newToken = JWT::encode([
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => min((int)$decodedToken->exp, time() + 86400),
            'id' => $decodedToken->id,
            'email' => $user['email'],
            'role' => $user['role'],
            'sv' => $newSessionVersion
        ], $secret, 'HS256');

        $response->getBody()->write(json_encode([
            'message' => 'Password updated successfully',
            'role' => $user['role'],
            'token' => $newToken
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Failed to update password']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware());

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
require __DIR__ . '/avatar_storage_routes.php';
require __DIR__ . '/origination_loans_dashboard_routes.php';
require __DIR__ . '/origination_loans_leads_routes.php';
require __DIR__ . '/origination_loans_member_routes.php';
require __DIR__ . '/origination_loans_application_routes.php';
require __DIR__ . '/origination_activities_routes.php';
require __DIR__ . '/origination_sales_dashboard_routes.php';
require __DIR__ . '/origination_sales_leads_routes.php';
require __DIR__ . '/branch_operations_dashboard_routes.php';
require __DIR__ . '/branch_operations_application_routes.php';

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
        $tokenHash = hash('sha256', $token);
        $updateStmt = $conn->prepare("UPDATE users SET reset_token = :token, reset_token_expires = :expires WHERE id = :id");
        $updateStmt->execute([
            'token' => $tokenHash,
            'expires' => $expires,
            'id' => $user['id']
        ]);

        // Build reset link from environment variable
        $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? '', '/');
        $resetLink = !empty($frontendUrl) ? ($frontendUrl . "/reset-password?token=" . $token) : ("/reset-password?token=" . $token);

        // Load and prepare email template
        $templatePath = __DIR__ . '/../src/Templates/reset_password.html';
        $emailContent = '';
        if (file_exists($templatePath)) {
            $emailContent = file_get_contents($templatePath);
            $emailContent = str_replace('{{resetLink}}', $resetLink, $emailContent);
            $emailContent = str_replace('{{currentYear}}', date('Y'), $emailContent);
        } else {
            $emailContent = "Please click this link to reset your password: " . $resetLink;
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
    $stmt = $conn->prepare("SELECT id, role FROM users WHERE (reset_token = :token OR reset_token = :legacy_token) AND reset_token_expires > CURRENT_TIMESTAMP");
    $stmt->execute(['token' => hash('sha256', $token), 'legacy_token' => $token]);
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
    $updateStmt = $conn->prepare("UPDATE users SET password = :hash, reset_token = NULL, reset_token_expires = NULL, \"forcePasswordChange\" = false, session_version = COALESCE(session_version, 0) + 1 WHERE id = :id AND (reset_token = :token OR reset_token = :legacy_token) AND reset_token_expires > CURRENT_TIMESTAMP");
    $updateStmt->execute([
        'hash' => $passwordHash,
        'id' => $user['id'],
        'token' => hash('sha256', $token),
        'legacy_token' => $token
    ]);
    if ($updateStmt->rowCount() !== 1) {
        $response->getBody()->write(json_encode(['error' => 'Password reset link has already been used or expired.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $response->getBody()->write(json_encode([
        'message' => 'Password has been successfully reset',
        'role' => $user['role']
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Resumes are served only through candidate/admin-authorized signed URL endpoints.

// Job Description proxy route for clean URLs
$app->get('/Job-Description/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/job_descriptions/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'attachment');
});

// Offer letters are served only through authenticated application-owner endpoints.

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
        ->withHeader('Cache-Control', 'private, no-store, max-age=0')
        ->withHeader('ETag', $etag);
}

// Avatar proxy route
$app->get('/Avatar/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/avatars/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Holiday proxy route
$app->get('/Holiday/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/holidays/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Attendance photos are served only by the authenticated route in employee_attendance_routes.php.

// Candidate documents are served only by authenticated candidate/admin API endpoints.

// Expense receipts are served only after employee ownership or admin permission checks.


// Loan documents and signatures are served through owner-checked authenticated APIs.

// Training Video proxy route (redirect to Supabase for native video caching and range requests)
$app->get('/Training-Video/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/training_videos/" . $encodedFilename;
    return $response->withHeader('Location', $supabaseUrl)->withStatus(302);
});


// Run app
$app->run();

