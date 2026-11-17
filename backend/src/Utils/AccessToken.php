<?php
declare(strict_types=1);

namespace App\Utils;

use Firebase\JWT\JWT;

/**
 * SEC-012 stage 2. All ordinary sessions are short-lived access JWTs.
 * Refresh sessions, stored hashed in Postgres, are the only way to renew.
 */
final class AccessToken
{
    public const MAX_TTL = 8 * 60 * 60;
    public const DEFAULT_TTL = 60 * 60;

    public static function ttlSeconds($configured): int
    {
        if (!is_string($configured) && !is_int($configured)) {
            return self::DEFAULT_TTL;
        }
        $value = (string)$configured;
        if ($value === 'never' || !preg_match('/\A[0-9]{1,6}\z/', $value)) {
            return self::DEFAULT_TTL;
        }
        $minutes = (int)$value;
        if ($minutes < 15) $minutes = 15;
        return min(self::MAX_TTL, $minutes * 60);
    }

    public static function mint(array $user, string $secret, $configured): string
    {
        if ($secret === '') {
            throw new \RuntimeException('Session signing is unavailable');
        }
        $now = time();
        return JWT::encode([
            'iss' => 'acme_hrms',
            'iat' => $now,
            'exp' => $now + self::ttlSeconds($configured),
            'type' => 'session',
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'tv' => SessionVersion::fromRow($user),
        ], $secret, 'HS256');
    }

    public static function bounded(object $claims): bool
    {
        if (!isset($claims->iat, $claims->exp)
            || !is_int($claims->iat) || !is_int($claims->exp)) return false;
        $now = time();
        return $claims->iat <= $now + 60
            && $claims->exp > $claims->iat
            && ($claims->exp - $claims->iat) <= self::MAX_TTL;
    }
}
