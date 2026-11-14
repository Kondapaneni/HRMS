<?php
declare(strict_types=1);

namespace App\Utils;

/**
 * SEC-012: Email OTP verifier values must not be recoverable from users.otp_code.
 * HMAC with server-only JWT_SECRET prevents offline enumeration of the
 * six-digit keyspace if a database snapshot leaks.
 *
 * Pre-deploy plaintext OTPs remain verifiable until their existing 10-minute
 * expiration window, but NEW writes always store keyed digests.
 */
final class OtpCode
{
    private const PREFIX = 'hmac-sha256:';

    public static function digest(string $otp, string $secret): string
    {
        if ($secret === '' || !preg_match('/\A[0-9]{6}\z/', $otp)) {
            throw new \InvalidArgumentException('Cannot hash email verification code');
        }
        return self::PREFIX . hash_hmac('sha256', $otp, $secret);
    }

    public static function matches(string $stored, string $otp, string $secret): bool
    {
        if (!preg_match('/\A[0-9]{6}\z/', $otp) || $secret === '') return false;
        if (str_starts_with($stored, self::PREFIX)) {
            return hash_equals($stored, self::digest($otp, $secret));
        }
        // Legacy 10-minute OTPs created immediately before deployment.
        return preg_match('/\A[0-9]{6}\z/', $stored) === 1
            && hash_equals($stored, $otp);
    }
}
