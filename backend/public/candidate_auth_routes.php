<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Utils\RateLimiter;
use Firebase\JWT\JWT;
use App\Utils\SessionVersion;
use Dotenv\Dotenv;

// Registration Route
/** @var \Slim\App $app */
$app->post('/api/candidate/register', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$firstName || !$lastName || !$email || !$password) {
        $response->getBody()->write(json_encode(['error' => 'All fields are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (strlen($password) < 8) {
        $response->getBody()->write(json_encode(['error' => 'Password must be at least 8 characters']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    
    $ip = RateLimiter::getClientIp();
    $action = 'candidate_register';
    
    // Check rate limit (e.g. max 3 registrations per hour from same IP)
    if (!RateLimiter::checkLimit($conn, $ip, $action, 3, 60)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, 3, 60);
        $response->getBody()->write(json_encode([
            'error' => 'Too Many Registration Attempts. Please Try Again Later.',
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    if (!\App\Utils\PasswordValidator::validate($password)) {
        $response->getBody()->write(json_encode(['error' => \App\Utils\PasswordValidator::getPolicyMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Check if email already exists
    $stmt = $conn->prepare('SELECT id FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Email is already registered']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Insert new candidate user
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $activationToken = bin2hex(random_bytes(32));
    
    $stmt = $conn->prepare('
        INSERT INTO users ("firstName", "lastName", email, password, role, "isActive", reset_token) 
        VALUES (:first, :last, :email, :pass, :role, :active, :token)
        RETURNING id
    ');
    
    $stmt->execute([
        'first' => $firstName,
        'last' => $lastName,
        'email' => $email,
        'pass' => $passwordHash,
        'role' => 'candidate',
        'active' => 'false', // Requires email confirmation
        'token' => $activationToken // Repurposing reset_token for activation to avoid schema changes
    ]);

    $userId = $stmt->fetchColumn();

    // Queue confirmation email
    $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? '', '/');
    $activationLink = !empty($frontendUrl) ? ($frontendUrl . "/candidate/activate?token=" . $activationToken) : ("/candidate/activate?token=" . $activationToken);
    
    // Load and parse HTML template
    $templatePath = __DIR__ . '/../src/Templates/candidate_activate_email.html';
    $emailBody = file_get_contents($templatePath);
    if ($emailBody !== false) {
        $emailBody = str_replace('{{firstName}}', htmlspecialchars($firstName), $emailBody);
        $emailBody = str_replace('{{activationLink}}', htmlspecialchars($activationLink), $emailBody);
        $emailBody = str_replace('{{currentYear}}', date('Y'), $emailBody);
    } else {
        // Fallback simple email
        $emailBody = "Click to activate: $activationLink";
    }

    $queueStmt = $conn->prepare("INSERT INTO email_queue (to_email, subject, body) VALUES (:email, :subject, :body)");
    $queueStmt->execute([
        'email' => $email,
        'subject' => 'Activate your Acme HRMS Candidate Account',
        'body' => $emailBody
    ]);

    RateLimiter::recordAttempt($conn, $ip, $action);

    $response->getBody()->write(json_encode(['message' => 'Registration successful! Please check your email to activate your account.']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
});

// Activation Route
$app->post('/api/candidate/activate', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $token = $data['token'] ?? '';

    if (!$token) {
        $response->getBody()->write(json_encode(['error' => 'Activation token is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    $stmt = $conn->prepare("SELECT id FROM users WHERE reset_token = :token AND role = 'candidate'");
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'Invalid or expired activation token']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $updateStmt = $conn->prepare("UPDATE users SET \"isActive\" = 'true', reset_token = NULL WHERE id = :id");
    $updateStmt->execute(['id' => $user['id']]);

    $response->getBody()->write(json_encode(['message' => 'Account activated successfully! You can now sign in.']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

// Candidate Login
$app->post('/api/candidate/login', function (Request $request, Response $response) {
    $data = json_decode($request->getBody()->getContents(), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $db = new Database();
    $conn = $db->getConnection();

    $ip = RateLimiter::getClientIp();
    $action = 'candidate_login';
    
    // Rate limits
    if (!RateLimiter::checkLimit($conn, $ip, $action, 5, 15)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, 5, 15);
        $response->getBody()->write(json_encode([
            'error' => 'Too Many Login Attempts. Please Try Again Later.',
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    $stmt = $conn->prepare('SELECT id, email, password, "firstName", "lastName", role, department, position, "isActive", "forcePasswordChange", token_version FROM users WHERE email = ? AND role = \'candidate\'');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
        if (!$isActive) {
            RateLimiter::recordAttempt($conn, $ip, $action);
            $response->getBody()->write(json_encode(['error' => 'Please activate your account by clicking the link sent to your email.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }
        
        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';
        $payload = [
            'iss' => 'acme_hrms',
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24), // 24 hours for candidate
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'tv' => SessionVersion::fromRow($user)
        ];
        
        $jwt = JWT::encode($payload, $secret, 'HS256');
        unset($user['password']);

        $response->getBody()->write(json_encode([
            'token' => $jwt,
            'user' => $user
        ]));
        
        RateLimiter::clearAttempts($conn, $ip, $action);
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    RateLimiter::recordAttempt($conn, $ip, $action);
    $response->getBody()->write(json_encode(['error' => 'Invalid email or password']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
});

