<?php

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use App\Middleware\AuthMiddleware;
use App\Utils\SessionVersion;
use App\Config\Database;
use App\Utils\RateLimiter;
use App\Utils\TotpHelper;
use Firebase\JWT\JWT;

/**
 * Public Endpoint: Complete MFA Challenge during Login
 */
$app->post('/api/auth/mfa/verify', function (Request $request, Response $response, $args) {
    $rawBody = (string)$request->getBody();
    $data = json_decode($rawBody, true) ?: $request->getParsedBody() ?: [];

    $mfaToken = trim($data['mfaToken'] ?? '');
    $code = trim($data['code'] ?? '');
    $isBackupCode = !empty($data['isBackupCode']);

    if (!$mfaToken || !$code) {
        $response->getBody()->write(json_encode(['error' => 'MFA token and verification code are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    if (!$conn) {
        $response->getBody()->write(json_encode(['error' => 'Database connection error']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }

    $ip = RateLimiter::getClientIp();
    $action = 'mfa_verify';

    // Rate limit: max 6 attempts per 10 minutes
    if (!RateLimiter::checkLimit($conn, $ip, $action, 6, 10)) {
        $secondsRemaining = RateLimiter::getLockoutRemainingTime($conn, $ip, $action, 6, 10);
        $response->getBody()->write(json_encode([
            'error' => "Too many invalid verification attempts. Please wait before trying again.",
            'secondsRemaining' => $secondsRemaining
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(429);
    }

    $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';

    try {
        $decoded = JWT::decode($mfaToken, new \Firebase\JWT\Key($secret, 'HS256'));
    } catch (\Exception $e) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'MFA verification session has expired. Please sign in again.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    if (($decoded->type ?? '') !== 'mfa_pending' || empty($decoded->id)) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Invalid MFA verification token.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }

    $userId = $decoded->id;

    // Fetch user details
    $stmt = $conn->prepare('
        SELECT u.id, u.email, u."firstName", u."lastName", u.role, u.department, u.position, u."isActive", u."forcePasswordChange", u."themePreference", u.token_version
        FROM users u WHERE u.id = ?
    ');
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        RateLimiter::recordAttempt($conn, $ip, $action);
        $response->getBody()->write(json_encode(['error' => 'Account not found.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $isActive = ($user['isActive'] === true || $user['isActive'] === 'true' || $user['isActive'] === 't' || $user['isActive'] == 1);
    if (!$isActive) {
        $response->getBody()->write(json_encode(['error' => 'Your account has been deactivated. Please contact your administrator.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $codeVerified = false;

    if ($isBackupCode) {
        // Normalize code input for comparison
        $cleanInput = strtoupper(str_replace([' ', '-'], '', $code));

        $stmtCodes = $conn->prepare('SELECT id, code_hash, used FROM mfa_backup_codes WHERE user_id = ? AND used = false');
        $stmtCodes->execute([$userId]);
        $backupRows = $stmtCodes->fetchAll(PDO::FETCH_ASSOC);

        foreach ($backupRows as $row) {
            if (password_verify($code, $row['code_hash']) || 
                password_verify(strtoupper(trim($code)), $row['code_hash']) ||
                password_verify($cleanInput, $row['code_hash'])) {
                
                // Mark this backup code as used
                $markStmt = $conn->prepare('UPDATE mfa_backup_codes SET used = true, used_at = CURRENT_TIMESTAMP WHERE id = ?');
                $markStmt->execute([$row['id']]);
                $codeVerified = true;
                break;
            }
        }

        if (!$codeVerified) {
            RateLimiter::recordAttempt($conn, $ip, $action);
            $response->getBody()->write(json_encode(['error' => 'Invalid or already used backup code.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }
    } else {
        // Verify 6-digit TOTP code
        $secretStmt = $conn->prepare('SELECT secret FROM mfa_secrets WHERE user_id = ? AND confirmed = true');
        $secretStmt->execute([$userId]);
        $totpSecret = $secretStmt->fetchColumn();

        if (!$totpSecret) {
            $response->getBody()->write(json_encode(['error' => 'Two-factor authentication is not configured for this account.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        if (!TotpHelper::verifyCode($totpSecret, $code)) {
            RateLimiter::recordAttempt($conn, $ip, $action);
            $response->getBody()->write(json_encode(['error' => 'Invalid 6-digit verification code. Please check your Authenticator app.']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }

        $codeVerified = true;
    }

    // Clear rate limits
    RateLimiter::clearAttempts($conn, $ip, $action);
    RateLimiter::clearAttempts($conn, $ip, 'login');

    // Fetch dynamic session timeout
    $stmtSettings = $conn->query('SELECT session_timeout FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmtSettings->fetch(PDO::FETCH_ASSOC);
    $sessionTimeout = $settings['session_timeout'] ?? '30';

    $payload = [
        'iss' => 'acme_hrms',
        'iat' => time(),
        'exp' => ($sessionTimeout === 'never') ? time() + (60 * 60 * 24 * 365 * 10) : time() + ((int)$sessionTimeout * 60),
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'tv' => SessionVersion::fromRow($user)
    ];

    $jwt = JWT::encode($payload, $secret, 'HS256');

    // Attach feature access
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
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
});

/**
 * Protected Endpoint: Get current MFA Status
 */
$app->get('/api/mfa/status', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $userId = $decodedToken->id;

    $db = new Database();
    $conn = $db->getConnection();

    $stmt = $conn->prepare('
        SELECT u."mfaEnabled", u.role, s.confirmed as mfa_configured, s.updated_at
        FROM users u
        LEFT JOIN mfa_secrets s ON u.id = s.user_id
        WHERE u.id = ?
    ');
    $stmt->execute([$userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $userRole = $row['role'] ?? $decodedToken->role ?? '';
    $mfaEnabled = ($row && ($row['mfaEnabled'] === true || $row['mfaEnabled'] === 'true' || $row['mfaEnabled'] === 't' || $row['mfaEnabled'] == 1));
    $configured = ($row && ($row['mfa_configured'] === true || $row['mfa_configured'] === 'true' || $row['mfa_configured'] === 't' || $row['mfa_configured'] == 1));

    // Admin is always authorized for their own account; employees require admin to have toggled mfaEnabled ON
    $isAuthorized = ($userRole === 'admin') || $mfaEnabled;

    // Get remaining unused backup codes count
    $stmtCount = $conn->prepare('SELECT COUNT(*) FROM mfa_backup_codes WHERE user_id = ? AND used = false');
    $stmtCount->execute([$userId]);
    $remainingCodes = (int)$stmtCount->fetchColumn();

    $response->getBody()->write(json_encode([
        'authorized' => $isAuthorized,
        'enabled' => $isAuthorized && $configured,
        'authorizedByAdmin' => $mfaEnabled,
        'configured' => $configured,
        'remainingBackupCodes' => $remainingCodes,
        'lastUpdated' => $row['updated_at'] ?? null
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

/**
 * Protected Endpoint: Begin MFA Setup
 * Generates Base32 secret and key URI
 */
$app->post('/api/mfa/setup', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $userId = $decodedToken->id;

    $db = new Database();
    $conn = $db->getConnection();

    $stmtUser = $conn->prepare('SELECT email, role, "mfaEnabled" FROM users WHERE id = ?');
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'User not found']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $mfaEnabled = ($user['mfaEnabled'] === true || $user['mfaEnabled'] === 'true' || $user['mfaEnabled'] === 't' || $user['mfaEnabled'] == 1);
    $isAuthorized = ($user['role'] === 'admin') || $mfaEnabled;

    if (!$isAuthorized) {
        $response->getBody()->write(json_encode(['error' => 'Multi-factor authentication is not authorized for your account. Please contact an administrator.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $secret = TotpHelper::generateSecret(20);
    $otpauthUri = TotpHelper::getOtpAuthUri($user['email'], $secret, 'Acme HRMS');

    // Save pending unconfirmed secret
    $upsertStmt = $conn->prepare('
        INSERT INTO mfa_secrets (user_id, secret, confirmed, updated_at)
        VALUES (?, ?, false, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET secret = EXCLUDED.secret, confirmed = false, updated_at = CURRENT_TIMESTAMP
    ');
    $upsertStmt->execute([$userId, $secret]);

    $response->getBody()->write(json_encode([
        'secret' => $secret,
        'otpauthUri' => $otpauthUri,
        'email' => $user['email'],
        'issuer' => 'Acme HRMS'
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

/**
 * Protected Endpoint: Confirm MFA Setup with Initial 6-digit Code
 */
$app->post('/api/mfa/confirm', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $userId = $decodedToken->id;

    $rawBody = (string)$request->getBody();
    $data = json_decode($rawBody, true) ?: $request->getParsedBody() ?: [];
    $code = trim($data['code'] ?? '');

    if (empty($code)) {
        $response->getBody()->write(json_encode(['error' => 'Verification code is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    $stmtUser = $conn->prepare('SELECT role, "mfaEnabled" FROM users WHERE id = ?');
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    $mfaEnabled = ($user && ($user['mfaEnabled'] === true || $user['mfaEnabled'] === 'true' || $user['mfaEnabled'] === 't' || $user['mfaEnabled'] == 1));
    $isAuthorized = ($user && $user['role'] === 'admin') || $mfaEnabled;

    if (!$isAuthorized) {
        $response->getBody()->write(json_encode(['error' => 'Multi-factor authentication is not authorized for your account by an administrator.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }
    $conn = $db->getConnection();

    $stmt = $conn->prepare('SELECT secret FROM mfa_secrets WHERE user_id = ?');
    $stmt->execute([$userId]);
    $secret = $stmt->fetchColumn();

    if (!$secret) {
        $response->getBody()->write(json_encode(['error' => 'No pending MFA setup found. Please start setup again.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (!TotpHelper::verifyCode($secret, $code)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid verification code. Please check your Authenticator app and try again.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $conn->beginTransaction();
    try {
        // 1. Mark secret as confirmed
        $updateSecretStmt = $conn->prepare('UPDATE mfa_secrets SET confirmed = true, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
        $updateSecretStmt->execute([$userId]);

        // 2. Enable MFA on users table
        $updateUserStmt = $conn->prepare('UPDATE users SET "mfaEnabled" = true WHERE id = ?');
        $updateUserStmt->execute([$userId]);

        // 3. Generate 8 emergency backup codes
        $backupCodes = TotpHelper::generateBackupCodes(8);

        // Delete any old codes
        $conn->prepare('DELETE FROM mfa_backup_codes WHERE user_id = ?')->execute([$userId]);

        // Store hashed backup codes
        $insertCodeStmt = $conn->prepare('INSERT INTO mfa_backup_codes (user_id, code_hash, used) VALUES (?, ?, false)');
        foreach ($backupCodes as $rawCode) {
            $cleanCode = strtoupper(str_replace([' ', '-'], '', $rawCode));
            // Hash the normalized code so input with or without hyphen matches
            $hash = password_hash($cleanCode, PASSWORD_DEFAULT);
            $insertCodeStmt->execute([$userId, $hash]);
        }

        $conn->commit();

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Two-factor authentication successfully enabled!',
            'backupCodes' => $backupCodes
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => 'Failed to enable MFA: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

/**
 * Protected Endpoint: Regenerate Backup Codes
 */
$app->post('/api/mfa/backup-codes/regenerate', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $userId = $decodedToken->id;

    $rawBody = (string)$request->getBody();
    $data = json_decode($rawBody, true) ?: $request->getParsedBody() ?: [];
    $code = trim($data['code'] ?? '');

    $db = new Database();
    $conn = $db->getConnection();

    // Verify user identity via current TOTP code or password
    $stmtSecret = $conn->prepare('SELECT secret, confirmed FROM mfa_secrets WHERE user_id = ? AND confirmed = true');
    $stmtSecret->execute([$userId]);
    $mfaSecret = $stmtSecret->fetch(PDO::FETCH_ASSOC);

    if (!$mfaSecret) {
        $response->getBody()->write(json_encode(['error' => 'Two-factor authentication is not active.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    if (!TotpHelper::verifyCode($mfaSecret['secret'], $code)) {
        $response->getBody()->write(json_encode(['error' => 'Invalid authenticator code. Cannot regenerate backup codes.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $conn->beginTransaction();
    try {
        $backupCodes = TotpHelper::generateBackupCodes(8);

        // Delete old backup codes
        $conn->prepare('DELETE FROM mfa_backup_codes WHERE user_id = ?')->execute([$userId]);

        // Insert new hashed backup codes
        $insertStmt = $conn->prepare('INSERT INTO mfa_backup_codes (user_id, code_hash, used) VALUES (?, ?, false)');
        foreach ($backupCodes as $rawCode) {
            $cleanCode = strtoupper(str_replace([' ', '-'], '', $rawCode));
            $hash = password_hash($cleanCode, PASSWORD_DEFAULT);
            $insertStmt->execute([$userId, $hash]);
        }

        $conn->commit();

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'New emergency backup codes generated.',
            'backupCodes' => $backupCodes
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => 'Failed to regenerate backup codes: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

/**
 * Protected Endpoint: Disable MFA (by User)
 */
$app->post('/api/mfa/disable', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $userId = $decodedToken->id;

    $rawBody = (string)$request->getBody();
    $data = json_decode($rawBody, true) ?: $request->getParsedBody() ?: [];
    $password = $data['password'] ?? '';
    $code = trim($data['code'] ?? '');

    $db = new Database();
    $conn = $db->getConnection();

    $stmtUser = $conn->prepare('SELECT password FROM users WHERE id = ?');
    $stmtUser->execute([$userId]);
    $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $response->getBody()->write(json_encode(['error' => 'User not found']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
    }

    $verified = false;

    // Verify using password if provided
    if (!empty($password) && password_verify($password, $user['password'])) {
        $verified = true;
    }

    // Or verify using TOTP code if provided
    if (!$verified && !empty($code)) {
        $stmtSecret = $conn->prepare('SELECT secret FROM mfa_secrets WHERE user_id = ? AND confirmed = true');
        $stmtSecret->execute([$userId]);
        $totpSecret = $stmtSecret->fetchColumn();
        if ($totpSecret && TotpHelper::verifyCode($totpSecret, $code)) {
            $verified = true;
        }
    }

    if (!$verified) {
        $response->getBody()->write(json_encode(['error' => 'Invalid password or verification code. Security check failed.']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $conn->beginTransaction();
    try {
        $conn->prepare('UPDATE users SET "mfaEnabled" = false WHERE id = ?')->execute([$userId]);
        $conn->prepare('DELETE FROM mfa_secrets WHERE user_id = ?')->execute([$userId]);
        $conn->prepare('DELETE FROM mfa_backup_codes WHERE user_id = ?')->execute([$userId]);
        $conn->commit();

        $response->getBody()->write(json_encode([
            'success' => true,
            'message' => 'Two-factor authentication has been disabled.'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => 'Failed to disable MFA: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin', 'employee', 'hr', 'manager']));

