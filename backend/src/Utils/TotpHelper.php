<?php

namespace App\Utils;

class TotpHelper
{
    private const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Generate a cryptographically secure random Base32 secret.
     * Default 20 bytes (160 bits) = 32 Base32 characters.
     */
    public static function generateSecret(int $byteLength = 20): string
    {
        $randomBytes = random_bytes($byteLength);
        return self::base32Encode($randomBytes);
    }

    /**
     * Encode binary data to Base32 string (RFC 4648 without padding).
     */
    public static function base32Encode(string $data): string
    {
        if (empty($data)) {
            return '';
        }

        $binaryString = '';
        $length = strlen($data);
        for ($i = 0; $i < $length; $i++) {
            $binaryString .= str_pad(decbin(ord($data[$i])), 8, '0', STR_PAD_LEFT);
        }

        $fiveBitChunks = str_split($binaryString, 5);
        $encoded = '';

        foreach ($fiveBitChunks as $chunk) {
            $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            $encoded .= self::BASE32_CHARS[bindec($chunk)];
        }

        return $encoded;
    }

    /**
     * Decode a Base32 string back to binary data.
     */
    public static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(trim($b32));
        $b32 = str_replace(['=', ' ', '-'], '', $b32);

        if (empty($b32)) {
            return '';
        }

        $binaryString = '';
        $length = strlen($b32);

        for ($i = 0; $i < $length; $i++) {
            $pos = strpos(self::BASE32_CHARS, $b32[$i]);
            if ($pos === false) {
                continue; // ignore non-base32 characters
            }
            $binaryString .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        $eightBitChunks = str_split($binaryString, 8);
        $decoded = '';

        foreach ($eightBitChunks as $chunk) {
            if (strlen($chunk) === 8) {
                $decoded .= chr(bindec($chunk));
            }
        }

        return $decoded;
    }

    /**
     * Calculate 6-digit TOTP code for a given secret and timestamp (RFC 6238).
     */
    public static function generateCode(string $secret, ?int $timestamp = null, int $digits = 6, int $period = 30): string
    {
        $timestamp = $timestamp ?? time();
        $counter = (int)floor($timestamp / $period);

        // Pack counter into 64-bit big-endian unsigned integer (8 bytes)
        // pack('J') is supported in PHP 5.6.3+ (unsigned 64-bit big-endian integer)
        $binaryCounter = pack('J', $counter);
        $binarySecret = self::base32Decode($secret);

        $hash = hash_hmac('sha1', $binaryCounter, $binarySecret, true);

        // Dynamic truncation offset
        $offset = ord($hash[19]) & 0x0f;

        // Unpack 4 bytes from offset & mask with 0x7fffffff to avoid signed 32-bit integer overflow
        $truncatedHash = unpack('N', substr($hash, $offset, 4))[1] & 0x7fffffff;

        $code = $truncatedHash % (10 ** $digits);
        return str_pad((string)$code, $digits, '0', STR_PAD_LEFT);
    }

    /**
     * Verify a 6-digit TOTP code against a secret within a drift window.
     * Default discrepancy of 1 checks -30s, 0s, and +30s.
     */
    public static function verifyCode(string $secret, string $code, int $discrepancy = 1, ?int $timestamp = null, int $digits = 6, int $period = 30): bool
    {
        $code = trim($code);
        if (strlen($code) !== $digits || !ctype_digit($code)) {
            return false;
        }

        $timestamp = $timestamp ?? time();

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $checkTime = $timestamp + ($i * $period);
            $expectedCode = self::generateCode($secret, $checkTime, $digits, $period);

            if (hash_equals($expectedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate standard otpauth:// URL for Authenticator apps.
     */
    public static function getOtpAuthUri(string $accountEmail, string $secret, string $issuer = 'Acme HRMS'): string
    {
        $cleanSecret = strtoupper(str_replace([' ', '-'], '', trim($secret)));
        $encodedIssuer = rawurlencode($issuer);
        $encodedAccount = rawurlencode($accountEmail);

        return "otpauth://totp/{$encodedIssuer}:{$encodedAccount}?secret={$cleanSecret}&issuer={$encodedIssuer}&algorithm=SHA1&digits=6&period=30";
    }

    /**
     * Generate single-use backup recovery codes.
     * Returns array of formatted strings, e.g. ["4B8A-9F2C", ...].
     */
    public static function generateBackupCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $part1 = strtoupper(bin2hex(random_bytes(2)));
            $part2 = strtoupper(bin2hex(random_bytes(2)));
            $codes[] = "{$part1}-{$part2}";
        }
        return $codes;
    }
}

