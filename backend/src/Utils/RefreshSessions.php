<?php
declare(strict_types=1);

namespace App\Utils;

use PDO;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * SEC-012: Rotating single-use refresh credentials.
 *
 * The raw secret exists only in an HttpOnly web cookie or Android Keystore.
 * The database stores SHA-256 digests of 256-bit random refresh secrets,
 * and a stable random session identifier. A replay of a rotated token revokes
 * that individual refresh session (not the whole user's account).
 */
final class RefreshSessions
{
    public const TTL_SECONDS = 14 * 86400;
    private const COOKIE_NAME = 'hrms_refresh';

    public static function isAndroid(ServerRequestInterface $request): bool
    {
        return strtolower(trim($request->getHeaderLine('X-HRMS-Client'))) === 'android';
    }

    private static function newId(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        $h = bin2hex($b);
        return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' .
            substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20);
    }

    private static function newSecret(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function issue(PDO $conn, array $user, string $client): string
    {
        if (!in_array($client, ['web', 'android'], true)) {
            throw new \InvalidArgumentException('Unknown session client');
        }
        $id = self::newId();
        $secret = self::newSecret();
        $stmt = $conn->prepare(
            "INSERT INTO public.hrms_refresh_sessions
                (id, user_id, token_hash, session_version, client_type, expires_at)
             VALUES (?, ?, ?, ?, ?, NOW() + INTERVAL '14 days')"
        );
        $stmt->execute([
            $id, $user['id'], hash('sha256', $secret),
            SessionVersion::fromRow($user), $client,
        ]);
        return $id . '.' . $secret;
    }

    public static function rotate(PDO $conn, string $credential, string $client): ?array
    {
        if (!in_array($client, ['web', 'android'], true) ||
            !preg_match('/\A([0-9a-f-]{36})\.([0-9a-f]{64})\z/', $credential, $matches)) {
            return null;
        }
        $conn->beginTransaction();
        try {
            $stmt = $conn->prepare(
                'SELECT s.id, s.token_hash, s.session_version, s.client_type,
                        s.expires_at, s.revoked_at,
                        u.id AS user_id, u.email, u.role, u."isActive", u.token_version
                 FROM public.hrms_refresh_sessions s
                 JOIN public.users u ON u.id = s.user_id
                 WHERE s.id = ? FOR UPDATE OF s'
            );
            $stmt->execute([$matches[1]]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row || $row['client_type'] !== $client) {
                $conn->rollBack();
                return null;
            }

            $hash = hash('sha256', $matches[2]);
            if (!hash_equals((string)$row['token_hash'], $hash)) {
                // An old secret for a known session ID was replayed. Revoke
                // the whole refresh chain to prevent session theft.
                $conn->prepare('UPDATE public.hrms_refresh_sessions SET revoked_at = NOW() WHERE id = ?')
                    ->execute([$matches[1]]);
                $conn->commit();
                return null;
            }

            $active = in_array($row['isActive'] ?? null, [true, 1, '1', 't', 'true'], true);
            $version = SessionVersion::fromRow($row);
            if (!$active || $row['revoked_at'] !== null
                || strtotime((string)$row['expires_at']) <= time()
                || (int)$row['session_version'] !== $version) {
                $conn->prepare('UPDATE public.hrms_refresh_sessions SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = ?')
                    ->execute([$matches[1]]);
                $conn->commit();
                return null;
            }

            $newSecret = self::newSecret();
            $update = $conn->prepare(
                'UPDATE public.hrms_refresh_sessions SET token_hash = ?, last_used_at = NOW()
                 WHERE id = ?'
            );
            $update->execute([hash('sha256', $newSecret), $matches[1]]);
            $conn->commit();
            return [
                'user' => [
                    'id' => $row['user_id'],
                    'email' => $row['email'],
                    'role' => $row['role'],
                    'token_version' => $version,
                ],
                'refreshToken' => $matches[1] . '.' . $newSecret,
                'expiresAt' => $row['expires_at'],
            ];
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) $conn->rollBack();
            throw $e;
        }
    }

    public static function cookie(string $value, int $maxAge = self::TTL_SECONDS): string
    {
        // This cookie is intentionally NOT visible to JS or ordinary /api/* routes.
        return self::COOKIE_NAME . '=' . $value
            . '; Path=/api/auth/refresh; Max-Age=' . max(0, $maxAge)
            . '; Secure; HttpOnly; SameSite=Strict';
    }

    public static function clearCookie(): string
    {
        return self::cookie('', 0);
    }

    public static function newSession(
        PDO $conn,
        array $user,
        string $secret,
        $sessionTimeout,
        ServerRequestInterface $request,
        ResponseInterface $response
    ): array {
        $client = self::isAndroid($request) ? 'android' : 'web';
        $access = AccessToken::mint($user, $secret, $sessionTimeout);
        $refresh = self::issue($conn, $user, $client);
        if ($client === 'web') {
            $response = $response->withAddedHeader('Set-Cookie', self::cookie($refresh));
            return [$response, ['token' => $access]];
        }
        // Native app immediately transfers the refresh credential to
        // AndroidKeystore-backed storage; web localStorage must never receive it.
        return [$response, ['token' => $access, 'refreshToken' => $refresh]];
    }
}
