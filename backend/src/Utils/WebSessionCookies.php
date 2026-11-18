<?php
declare(strict_types=1);

namespace App\Utils;

use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * SEC-021: Browser access JWTs stay in Secure/HttpOnly cookies, never JSON or
 * browser storage. Native Android continues using its Keystore-backed bearer
 * credentials. The readable CSRF cookie is random and carries NO identity.
 */
final class WebSessionCookies
{
    public const ACCESS = '__Secure-hrms_access';
    public const CSRF = '__Host-hrms_csrf';
    private const CSRF_TTL = 14 * 86400;

    public static function csrfCookie(string $value, int $maxAge = self::CSRF_TTL): string
    {
        return self::CSRF . '=' . $value
            . '; Path=/; Max-Age=' . max(0, $maxAge) . '; Secure; SameSite=Strict';
    }

    public static function accessCookie(string $jwt, int $maxAge): string
    {
        return self::ACCESS . '=' . $jwt
            . '; Path=/api; Max-Age=' . max(0, $maxAge)
            . '; Secure; HttpOnly; SameSite=Strict';
    }

    public static function fileCookie(string $jwt, int $maxAge): string
    {
        return 'hrms_file_auth=' . $jwt
            . '; Path=/; Max-Age=' . max(0, $maxAge)
            . '; Secure; HttpOnly; SameSite=Strict';
    }

    public static function issue(ResponseInterface $response, string $access, ?string $existingCsrf = null): ResponseInterface
    {
        // JWT minted by our own AccessToken helper. Cookie lifetime cannot
        // exceed the bounded JWT expiry; refresh must rotate access later.
        $parts = explode('.', $access);
        $claims = isset($parts[1]) ? json_decode((string) base64_decode(strtr($parts[1], '-_', '+/')), true) : null;
        $maxAge = max(0, min(8 * 3600, (int) ($claims['exp'] ?? 0) - time()));
        $csrf = is_string($existingCsrf) && preg_match('/\A[0-9a-f]{64}\z/', $existingCsrf)
            ? $existingCsrf : bin2hex(random_bytes(32));
        return $response
            ->withAddedHeader('Set-Cookie', self::accessCookie($access, $maxAge))
            ->withAddedHeader('Set-Cookie', self::csrfCookie($csrf))
            ->withAddedHeader('Set-Cookie', self::fileCookie($access, min($maxAge, 1800)))
            ->withHeader('Cache-Control', 'no-store');
    }

    public static function clear(ResponseInterface $response): ResponseInterface
    {
        return $response
            ->withAddedHeader('Set-Cookie', self::accessCookie('', 0))
            ->withAddedHeader('Set-Cookie', self::csrfCookie('', 0))
            ->withAddedHeader('Set-Cookie', self::fileCookie('', 0));
    }

    public static function validCsrf(ServerRequestInterface $request): bool
    {
        $header = $request->getHeaderLine('X-HRMS-CSRF');
        $cookie = $request->getCookieParams()[self::CSRF] ?? null;
        if (!is_string($cookie) || !preg_match('/\A[0-9a-f]{64}\z/', $cookie)
            || !preg_match('/\A[0-9a-f]{64}\z/', $header)
            || !hash_equals($cookie, $header)) {
            return false;
        }
        // Origin is an additional guard, not a substitute for the CSRF header.
        // The reverse proxy may terminate HTTPS, so compare the public host
        // rather than the PHP-internal URL scheme.
        $origin = $request->getHeaderLine('Origin');
        if ($origin === '') return true;
        $host = parse_url($origin, PHP_URL_HOST);
        return is_string($host)
            && strcasecmp($host, $request->getUri()->getHost()) === 0
            && parse_url($origin, PHP_URL_SCHEME) === 'https';
    }
}
