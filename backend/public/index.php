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
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", e.avatar, e."employeeId", e."geoFenceEnabled", e."webAttendanceEnabled"
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

// Run app
$app->run();
