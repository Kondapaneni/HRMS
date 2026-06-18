<?php

use Slim\Factory\AppFactory;
use App\Middleware\AuditMiddleware;
use App\Middleware\AuthMiddleware;
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

// CORS Middleware
$app->add(function (Request $request, $handler) {
    $response = $handler->handle($request);
    
    $allowedOrigin = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
    
    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowedOrigin)
        ->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
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

    $stmt = $conn->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
        if (!$isActive) {
            $response->getBody()->write(json_encode(['error' => 'Your account has been deactivated. Please contact your administrator.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        
        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
        $payload = [
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24), // 1 day expiration
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        $jwt = JWT::encode($payload, $secret, 'HS256');

        unset($user['password']); // Don't return password hash

        $response->getBody()->write(json_encode([
            'token' => $jwt,
            'user' => $user
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    $response->getBody()->write(json_encode(['error' => 'Invalid email or password']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
});

// Get current user profile endpoint (Protected)
$app->get('/api/me', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->prepare('
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", e.avatar, e."employeeId", e."geoFenceEnabled", e."webAttendanceEnabled"
        FROM users u 
        LEFT JOIN employee e ON u.id = e."userId" 
        WHERE u.id = ?
    ');
    $stmt->execute([$decodedToken->id]);
    $user = $stmt->fetch();

    if ($user) {
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

    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        
        $stmt = $conn->prepare('UPDATE users SET password = ?, "forcePasswordChange" = false WHERE id = ?');
        $stmt->execute([$hashedPassword, $decodedToken->id]);
        
        $response->getBody()->write(json_encode(['message' => 'Password updated successfully']));
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

require __DIR__ . '/admin_dashboard_routes.php';
require __DIR__ . '/admin_employees_routes.php';
require __DIR__ . '/admin_attendance_routes.php';
require __DIR__ . '/admin_holidays_routes.php';
require __DIR__ . '/admin_leave_routes.php';
require __DIR__ . '/admin_payroll_routes.php';
require __DIR__ . '/admin_assets_routes.php';
require __DIR__ . '/admin_audit_routes.php';
require __DIR__ . '/admin_feature_access_routes.php';
require __DIR__ . '/admin_performance_routes.php';
require __DIR__ . '/admin_settings_routes.php';

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
        $resetLink = "http://localhost:5173/reset-password?token=" . $token;

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
        $fullName = trim(($user['firstName'] ?? '') . ' ' . ($user['lastName'] ?? ''));
        $queueStmt = $conn->prepare("INSERT INTO email_queue (recipient_email, recipient_name, subject, body) VALUES (:email, :name, :subject, :body)");
        $queueStmt->execute([
            'email' => $email,
            'name' => $fullName,
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
    $stmt = $conn->prepare("SELECT id FROM users WHERE reset_token = :token AND reset_token_expires > CURRENT_TIMESTAMP");
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'Invalid or expired password reset token']));
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

    $response->getBody()->write(json_encode(['message' => 'Password has been successfully reset']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Run app
$app->run();
