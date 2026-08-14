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
$app->addErrorMiddleware(true, true, true);

// Add custom audit middleware
$app->add(new AuditMiddleware());

// Add performance logging middleware
$app->add(new \App\Middleware\PerformanceLoggingMiddleware());

// Add GZIP compression middleware
$app->add(new \App\Middleware\GzipMiddleware());

// Security & CORS Middleware
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    
    // Ensure origin matches configured FRONTEND_URL strictly
    $allowedOrigin = rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173', '/');
    $origin = $request->getHeaderLine('Origin');
    
    if (!empty($origin) && $origin !== $allowedOrigin) {
        $allowedOrigin = 'null'; // Invalidate mismatching origins
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
        ->withHeader('Content-Security-Policy', "default-src 'self';")
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
        SELECT u.id, u.email, u.password, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange",
               CASE WHEN b.face_descriptor IS NOT NULL THEN true ELSE false END as "isFaceRegistered"
        FROM users u
        LEFT JOIN user_biometrics b ON u.id = b.user_id
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
        
        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
        $user['isFaceRegistered'] = ($user['isFaceRegistered'] === true || $user['isFaceRegistered'] === 'true' || $user['isFaceRegistered'] === 't' || $user['isFaceRegistered'] == 1);
        
        $payload = [
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => ($sessionTimeout === 'never') ? time() + (60 * 60 * 24 * 365 * 10) : time() + ((int)$sessionTimeout * 60), // Dynamic expiration
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'isFaceRegistered' => $user['isFaceRegistered']
        ];
        
        $jwt = JWT::encode($payload, $secret, 'HS256');

        unset($user['password']); // Don't return password hash

        $faStmt = $conn->prepare('SELECT "canAttendance", "canLeave", "canPayroll", "canEmployees", "canRecruitment", "canAssets", "canLoanOrigination", "canBranchOperations" FROM user_feature_access WHERE "userId" = ?');
        $faStmt->execute([$user['id']]);
        $fa = $faStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fa) {
            $user['featureAccess'] = [
                'canAttendance' => (bool)$fa['canAttendance'],
                'canLeave' => (bool)$fa['canLeave'],
                'canPayroll' => (bool)$fa['canPayroll'],
                'canEmployees' => (bool)$fa['canEmployees'],
                'canRecruitment' => (bool)$fa['canRecruitment'],
                'canAssets' => (bool)$fa['canAssets'],
                'canLoanOrigination' => (bool)$fa['canLoanOrigination'],
                'canBranchOperations' => (bool)($fa['canBranchOperations'] ?? false),
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

// Face Login endpoint
$app->post('/api/login/face', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $email = $data['email'] ?? '';
    $faceDescriptor = $data['faceDescriptor'] ?? ''; // "[1.2, 0.5, ...]"

    if (!$email || !$faceDescriptor) {
        $response->getBody()->write(json_encode(['error' => 'Email and face descriptor required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    $ip = RateLimiter::getClientIp();
    $action = 'login';
    
    // Check rate limit
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

    // Fetch user and biometric data
    $stmt = $conn->prepare('
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", b.face_descriptor
        FROM users u
        LEFT JOIN user_biometrics b ON u.id = b.user_id
        WHERE u.email = ?
    ');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Invalid email or face match failed.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    if (empty($user['face_descriptor'])) {
        $response->getBody()->write(json_encode(['error' => 'Face is not Registered']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    // Verify distance using pgvector. <= 0.5 is a strict threshold for Euclidean distance (face-api.js standard).
    $distStmt = $conn->prepare('SELECT (face_descriptor <-> ?::vector) as distance FROM user_biometrics WHERE user_id = ?');
    $distStmt->execute([$faceDescriptor, $user['id']]);
    $distRow = $distStmt->fetch(PDO::FETCH_ASSOC);

    if ($distRow && (float)$distRow['distance'] <= 0.5) {
        // Successful login
        $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
        if (!$isActive) {
            $response->getBody()->write(json_encode(['error' => 'Your account has been deactivated. Please contact your administrator.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
        $user['isFaceRegistered'] = true;
        
        $payload = [
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => ($sessionTimeout === 'never') ? time() + (60 * 60 * 24 * 365 * 10) : time() + ((int)$sessionTimeout * 60),
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'isFaceRegistered' => true
        ];
        
        $jwt = JWT::encode($payload, $secret, 'HS256');

        $faStmt = $conn->prepare('SELECT "canAttendance", "canLeave", "canPayroll", "canEmployees", "canRecruitment", "canAssets", "canLoanOrigination", "canBranchOperations", "canAdminAssessments" FROM user_feature_access WHERE "userId" = ?');
        $faStmt->execute([$user['id']]);
        $fa = $faStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fa) {
            $user['featureAccess'] = [
                'canAttendance' => (bool)$fa['canAttendance'],
                'canLeave' => (bool)$fa['canLeave'],
                'canPayroll' => (bool)$fa['canPayroll'],
                'canEmployees' => (bool)$fa['canEmployees'],
                'canRecruitment' => (bool)$fa['canRecruitment'],
                'canAssets' => (bool)$fa['canAssets'],
                'canLoanOrigination' => (bool)$fa['canLoanOrigination'],
                'canBranchOperations' => (bool)($fa['canBranchOperations'] ?? false),
                'canAdminAssessments' => (bool)($fa['canAdminAssessments'] ?? false),
            ];
        }

        unset($user['face_descriptor']); // don't return vector

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
    $response->getBody()->write(json_encode(['error' => 'Face match failed. Unrecognized face.']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
});

$app->post('/api/logout', function (Request $request, Response $response, $args) {
    $response->getBody()->write(json_encode(['message' => 'Logged out']));
    return $response
        ->withHeader('Content-Type', 'application/json')
        ->withStatus(200);
});

// Get global news headlines (Protected)
$app->get('/api/news', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query('SELECT news_headlines, maintenance_mode, maintenance_message FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    $headlines = isset($settings['news_headlines']) ? json_decode($settings['news_headlines'], true) : [];
    $maintenanceMode = isset($settings['maintenance_mode']) && $settings['maintenance_mode'] ? true : false;
    $maintenanceMessage = $settings['maintenance_message'] ?? '';
    
    $response->getBody()->write(json_encode([
        'news_headlines' => $headlines,
        'maintenance_mode' => $maintenanceMode,
        'maintenance_message' => $maintenanceMessage
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware());

// Get current user profile endpoint (Protected)
$app->get('/api/me', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", e.avatar, e."employeeId", e."geoFenceEnabled", e."webAttendanceEnabled",
               fa."canAttendance", fa."canLeave", fa."canPayroll", fa."canEmployees", fa."canRecruitment", fa."canAssets", fa."canLoanOrigination", fa."canBranchOperations", fa."canAdminAssessments",
               CASE WHEN b.face_descriptor IS NOT NULL THEN true ELSE false END as "isFaceRegistered"
        FROM users u 
        LEFT JOIN employee e ON u.id = e."userId" 
        LEFT JOIN user_feature_access fa ON u.id = fa."userId"
        LEFT JOIN user_biometrics b ON u.id = b.user_id
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
                'canEmployees' => (bool)$user['canEmployees'],
                'canRecruitment' => (bool)$user['canRecruitment'],
                'canAssets' => (bool)$user['canAssets'],
                'canLoanOrigination' => (bool)$user['canLoanOrigination'],
                'canBranchOperations' => (bool)($user['canBranchOperations'] ?? false),
                'canAdminAssessments' => (bool)($user['canAdminAssessments'] ?? false),
            ];
        }
        $user['isFaceRegistered'] = ($user['isFaceRegistered'] === true || $user['isFaceRegistered'] === 'true' || $user['isFaceRegistered'] === 't' || $user['isFaceRegistered'] == 1);
        unset($user['canAttendance'], $user['canLeave'], $user['canPayroll'], $user['canEmployees'], $user['canRecruitment'], $user['canAssets'], $user['canLoanOrigination'], $user['canBranchOperations'], $user['canAdminAssessments']);
        
        $response->getBody()->write(json_encode($user));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    $response->getBody()->write(json_encode(['error' => 'User not found']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
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
})->add(new AuthMiddleware());

require __DIR__ . '/employee_attendance_routes.php';
require __DIR__ . '/employee_leave_routes.php';
require __DIR__ . '/employee_payroll_routes.php';
require __DIR__ . '/employee_profile_routes.php';
require __DIR__ . '/employee_performance_routes.php';
require __DIR__ . '/employee_expenses_routes.php';
require __DIR__ . '/employee_assessments_routes.php';
require __DIR__ . '/employee_training_routes.php';

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
require __DIR__ . '/candidate_auth_routes.php';
require __DIR__ . '/candidate_recruitment_routes.php';
require __DIR__ . '/origination_dashboard_routes.php';
require __DIR__ . '/origination_leads_routes.php';
require __DIR__ . '/loan_applications_routes.php';
require __DIR__ . '/branch_operations_routes.php';

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

        // Build reset link
        // Hardcoded to frontend dev server for now
        $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173', '/');
        $resetLink = $frontendUrl . "/reset-password?token=" . $token;

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
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/resumes/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Job Description proxy route for clean URLs
$app->get('/Job-Description/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/job_descriptions/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'attachment');
});

// Offer Letter proxy route for clean URLs
$app->get('/Offer-Letter/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/offer_letters/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'attachment');
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

// Attendance proxy route
$app->get('/Attendance/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/attendance/" . rawurlencode($filename);
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Candidate Document proxy route
$app->get('/Candidate-Document/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/candidate_documents/" . $encodedFilename;
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Bills proxy route
$app->get('/Bills/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/expenses/" . $encodedFilename;
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});


// Loan Document proxy route
$app->get('/Loan-Document/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/loan_documents/" . $encodedFilename;
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Loan Signature proxy route
$app->get('/Loan-Signature/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/loan_signatures/" . $encodedFilename;
    return streamSupabaseFile($supabaseUrl, $response, $filename, 'inline');
});

// Training Video proxy route (redirect to Supabase for native video caching and range requests)
$app->get('/Training-Video/{filename:.+}', function (Request $request, Response $response, $args) {
    $filename = $args['filename'];
    $encodedFilename = implode('/', array_map('rawurlencode', explode('/', $filename)));
    $supabaseUrl = $_ENV['VITE_SUPABASE_URL'] . "/storage/v1/object/public/training_videos/" . $encodedFilename;
    return $response->withHeader('Location', $supabaseUrl)->withStatus(302);
});
// Run app
$app->run();
