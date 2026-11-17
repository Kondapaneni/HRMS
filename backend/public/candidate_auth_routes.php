<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Config\Database;
use App\Utils\RateLimiter;
use Firebase\JWT\JWT;
use App\Utils\SessionVersion;
use App\Utils\RefreshSessions;
use Dotenv\Dotenv;

/**
 * Shared activation template. The confirmation URL is only ever emailed to
 * the account's registered address; never return activation tokens via API.
 */
function candidateActivationEmailBody(string $firstName, string $activationLink): string
{
    $templatePath = __DIR__ . '/../src/Templates/candidate_activate_email.html';
    $html = file_get_contents($templatePath);
    if ($html === false) {
        return 'Open this link to activate your candidate account: ' . $activationLink;
    }
    return str_replace(
        ['{{firstName}}', '{{activationLink}}', '{{currentYear}}'],
        [
            htmlspecialchars($firstName, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            htmlspecialchars($activationLink, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            date('Y')
        ],
        $html
    );
}

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
    
    // Both registration and resend use the same activation CTA template.
    $emailBody = candidateActivationEmailBody($firstName, $activationLink);

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

// Candidates whose original email lacked an activation CTA can request a
// new email. No login is possible before activation, so use per-account and
// per-peer rate limits with an identical response for known/unknown accounts.
$app->post('/api/candidate/resend-activation', function (Request $request, Response $response) {
    $data = json_decode((string) $request->getBody(), true);
    $email = trim((string) ($data['email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response->getBody()->write(json_encode(['error' => 'Enter a valid email address.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $conn = (new Database())->getConnection();
    if (!$conn) {
        return sec001Reply($response, 503, ['error' => 'Activation email service unavailable.']);
    }

    $action = 'candidate_activation_resend';
    $remaining = RateLimiter::credentialLockout($conn, $email, $action, 3, 60);
    if ($remaining !== null) {
        $response->getBody()->write(json_encode([
            'error' => 'Too many activation email requests. Please try again later.',
            'secondsRemaining' => $remaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    try {
        $conn->beginTransaction();
        $stmt = $conn->prepare(
            'SELECT id, email, "firstName" FROM users WHERE LOWER(email) = LOWER(?) ' .
            'AND role = \'candidate\' AND "isActive" = false LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([$email]);
        $candidate = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($candidate) {
            $activationToken = bin2hex(random_bytes(32));
            $stmt = $conn->prepare(
                'UPDATE users SET reset_token = ? WHERE id = ? AND role = \'candidate\' AND "isActive" = false'
            );
            $stmt->execute([$activationToken, $candidate['id']]);

            $frontendUrl = rtrim((string) ($_ENV['FRONTEND_URL'] ?? ''), '/');
            $activationLink = ($frontendUrl !== '' ? $frontendUrl : '')
                . '/candidate/activate?token=' . $activationToken;
            $html = candidateActivationEmailBody((string) $candidate['firstName'], $activationLink);
            $queue = $conn->prepare(
                'INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)'
            );
            $queue->execute([
                $candidate['email'],
                'Activate your Acme HRMS Candidate Account',
                $html
            ]);
        }
        RateLimiter::recordCredentialAttempt($conn, $email, $action);
        $conn->commit();
    } catch (\Throwable $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        error_log('Candidate activation resend service failed');
        $response->getBody()->write(json_encode(['error' => 'Activation email service unavailable.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }

    $response->getBody()->write(json_encode([
        'message' => 'If this is an inactive candidate account, a new activation email has been queued.'
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
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
        [$response, $session] = RefreshSessions::newSession(
            $conn, $user, (string)$secret, '60', $request, $response
        );
        unset($user['password']);

        $response->getBody()->write(json_encode(array_merge($session, ['user' => $user])));
        
        RateLimiter::clearAttempts($conn, $ip, $action);
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    RateLimiter::recordAttempt($conn, $ip, $action);
    $response->getBody()->write(json_encode(['error' => 'Invalid email or password']));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
});

