<?php
declare(strict_types=1);

namespace App\Utils;

/**
 * SEC-012 (stage 1): Live, database-backed session version.
 *
 * public.users.token_version already exists in the HRMS database.
 * Each authenticated API call must compare its signed JWT with current DB
 * state; password reset/change and logout bump that counter atomically.
 *
 * A pre-deployment JWT without "tv" is accepted only at initial version 0,
 * allowing a staged upgrade. Revocation instantly invalidates those tokens,
 * too. Long-lived JWT issuance and refresh-token rotation are separate
 * mandatory SEC-012 work before full closure.
 */
final class SessionVersion
{
    public static function fromRow(array $user): int
    {
        if (!array_key_exists('token_version', $user)) {
            throw new \RuntimeException('Session version unavailable');
        }
        $raw = $user['token_version'];
        if (!is_int($raw) && !(is_string($raw) && preg_match('/\A[0-9]+\z/', $raw))) {
            throw new \RuntimeException('Invalid session version');
        }
        return (int)$raw;
    }

    public static function matches(object $claims, array $user): bool
    {
        $actual = self::fromRow($user);
        // Older signed tokens had no session version. They may be used only
        // until a credential change or logout increments the stored version.
        if (!property_exists($claims, 'tv')) {
            return $actual === 0;
        }
        return is_int($claims->tv) && $claims->tv >= 0
            && $claims->tv === $actual;
    }

    public static function revokeAll(\PDO $conn, string $userId): bool
    {
        $stmt = $conn->prepare('UPDATE public.users SET token_version = token_version + 1 WHERE id = ?');
        $stmt->execute([$userId]);
        return $stmt->rowCount() === 1;
    }
}
