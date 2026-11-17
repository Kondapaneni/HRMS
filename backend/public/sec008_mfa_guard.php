<?php

use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface;

/**
 * SEC-008: All HRMS primary login methods MUST use the same MFA requirement.
 * A user's MFA setup is enforced only when it is enabled AND confirmed,
 * matching existing enrollment behavior for not-yet-configured employees.
 */
function sec008MfaRequired(PDO $conn, array $user): bool
{
    $enabled = in_array($user['mfaEnabled'] ?? false, [true, 1, '1', 'true', 't'], true);
    if (!$enabled) {
        return false;
    }

    if (empty($user['id'])) {
        throw new LogicException('MFA user identifier missing');
    }

    $stmt = $conn->prepare('SELECT confirmed FROM mfa_secrets WHERE user_id = ? AND confirmed = true');
    $stmt->execute([$user['id']]);
    return (bool) $stmt->fetchColumn();
}

/**
 * A pending MFA token has NO authenticated role and is never a session token.
 * /api/auth/mfa/verify is the only endpoint that can exchange it for a session.
 */
function sec008MfaChallenge(ResponseInterface $response, array $user, string $secret): ResponseInterface
{
    if ($secret === '' || empty($user['id']) || empty($user['email'])) {
        throw new RuntimeException('MFA challenge could not be created');
    }

    $now = time();
    $mfaToken = JWT::encode([
        'iss' => 'acme_hrms',
        'iat' => $now,
        'exp' => $now + 300,
        'type' => 'mfa_pending',
        'id' => $user['id'],
        'email' => $user['email'],
    ], $secret, 'HS256');

    $response->getBody()->write(json_encode([
        'mfaRequired' => true,
        'mfaToken' => $mfaToken,
        'email' => $user['email'],
    ]));

    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
}
