<?php
declare(strict_types=1);

namespace App\Middleware;

use App\Config\Database;
use App\Utils\SessionVersion;
use App\Utils\AccessToken;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use PDO;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

/**
 * SEC-020: Enforce a maintenance window on the server, not in browser state.
 *
 * Only an active, database-verified administrator with a completed signed
 * session may use protected API routes during maintenance. Explicitly
 * exempt essential authentication/recovery endpoints so an administrator can
 * sign in, complete MFA and disable maintenance without a backdoor.
 */
final class MaintenanceMiddleware implements MiddlewareInterface
{
    private const AUTH_RECOVERY_ROUTES = [
        'POST /api/login' => true,
        'POST /api/auth/otp/send' => true,
        'POST /api/auth/otp/verify' => true,
        'POST /api/auth/refresh' => true,
        'POST /api/auth/refresh/restore' => true,
        'POST /api/auth/mfa/verify' => true,
        'POST /api/forgot-password' => true,
        'POST /api/reset-password' => true,
        'POST /api/logout' => true,
    ];

    public function process(
        ServerRequestInterface $request,
        RequestHandlerInterface $handler
    ): ResponseInterface {
        $path = $request->getUri()->getPath();
        $method = strtoupper($request->getMethod());

        // Public announcement and preflight remain available; no implicit
        // exemption for arbitrary authentication or candidate API endpoints.
        if (
            $method === 'OPTIONS'
            || !str_starts_with($path, '/api/')
            || ($method === 'GET' && $path === '/api/news')
            || isset(self::AUTH_RECOVERY_ROUTES[$method . ' ' . $path])
        ) {
            return $handler->handle($request);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();
            if (!$conn) {
                return $this->serviceUnavailable();
            }

            // Do not rely on a client flag or a stale 5-minute settings cache:
            // Admin toggles take effect on the very next protected API call.
            $stmt = $conn->query(
                'SELECT maintenance_mode FROM public.global_settings ORDER BY id ASC LIMIT 1'
            );
            $settings = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$settings || !self::enabled($settings['maintenance_mode'] ?? null)) {
                return $handler->handle($request);
            }

            if ($this->isVerifiedAdmin($request, $conn)) {
                return $handler->handle($request);
            }
            return $this->serviceUnavailable();
        } catch (\Throwable $e) {
            error_log('SEC-020: Maintenance authorization check unavailable: ' . $e->getMessage());
            return $this->serviceUnavailable();
        }
    }

    public static function enabled($value): bool
    {
        // pdo_pgsql may return native bools or PostgreSQL text booleans.
        // In PHP, (bool)'f' is TRUE; never use that as a maintenance flag.
        return in_array($value, [true, 1, '1', 't', 'true'], true);
    }

    private function isVerifiedAdmin(ServerRequestInterface $request, PDO $conn): bool
    {
        $auth = trim($request->getHeaderLine('Authorization'));
        if (!preg_match('/\ABearer\s+([A-Za-z0-9._-]+)\z/i', $auth, $match)) {
            return false;
        }

        $secret = (string) ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: '');
        if ($secret === '') {
            return false;
        }

        try {
            $claims = JWT::decode($match[1], new Key($secret, 'HS256'));
            // SEC-008: First-factor MFA challenge is NOT an admin session.
            // Current completed sessions have no type claim; newer sessions
            // may explicitly use type=session. Both are valid for the admin.
            if (
                empty($claims->id)
                || ($claims->role ?? null) !== 'admin'
                || (isset($claims->type) && $claims->type !== 'session')
                || !AccessToken::bounded($claims)
            ) {
                return false;
            }

            // Verify against LIVE database state; JWT role by itself may be
            // stale if the user was demoted or deactivated.
            $stmt = $conn->prepare(
                'SELECT role, "isActive", token_version FROM public.users WHERE id = ? LIMIT 1'
            );
            $stmt->execute([$claims->id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            return $row
                && ($row['role'] ?? null) === 'admin'
                && self::enabled($row['isActive'] ?? null)
                && SessionVersion::matches($claims, $row);
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function serviceUnavailable(): ResponseInterface
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'error' => 'Service temporarily unavailable during maintenance.'
        ]));
        return $response
            ->withStatus(503)
            ->withHeader('Content-Type', 'application/json')
            ->withHeader('Cache-Control', 'no-store')
            ->withHeader('Retry-After', '30');
    }
}
