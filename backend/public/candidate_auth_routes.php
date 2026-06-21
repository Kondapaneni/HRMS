<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Utils\RateLimiter;
use Firebase\JWT\JWT;
use Dotenv\Dotenv;

// Registration Route
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
        $response->getBody()->write(json_encode(['error' => 'Too many registration attempts. Please try again later.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
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
    $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173', '/');
    $activationLink = $frontendUrl . "/candidate/activate?token=" . $activationToken;
    
    // Using simple HTML email
    $emailBody = "
    <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <h2>Welcome to Acme HRMS Careers!</h2>
        <p>Hi $firstName,</p>
        <p>Thank you for creating a candidate account. To activate your account and start exploring opportunities, please click the link below:</p>
        <p><a href='$activationLink' style='display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;'>Activate Account</a></p>
        <p>If you did not request this, you can safely ignore this email.</p>
    </div>
    ";

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
        $response->getBody()->write(json_encode(['error' => 'Too many login attempts. Please try again later.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    $stmt = $conn->prepare('SELECT * FROM users WHERE email = ? AND role = \'candidate\'');
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
            'role' => $user['role']
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

