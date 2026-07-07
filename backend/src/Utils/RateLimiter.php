<?php

namespace App\Utils;

use PDO;

class RateLimiter
{
    /**
     * Checks if the rate limit has been exceeded.
     *
     * @param PDO $conn Database connection
     * @param string $ip The IP address
     * @param string $action The action identifier
     * @param int $maxAttempts The maximum number of allowed attempts
     * @param int $windowMinutes The time window in minutes
     * @return bool True if allowed, False if limit exceeded
     */
    public static function checkLimit(PDO $conn, string $ip, string $action, int $maxAttempts, int $windowMinutes): bool
    {
        $stmt = $conn->prepare("
            SELECT COUNT(*) 
            FROM rate_limits 
            WHERE ip_address = :ip 
              AND action = :action 
              AND created_at > CURRENT_TIMESTAMP - INTERVAL '$windowMinutes minutes'
        ");
        $stmt->execute([
            'ip' => $ip,
            'action' => $action
        ]);
        
        $attempts = (int)$stmt->fetchColumn();
        return $attempts < $maxAttempts;
    }

    /**
     * Gets the remaining time in seconds until the lockout expires.
     * Returns null if not locked out.
     */
    public static function getLockoutRemainingTime(PDO $conn, string $ip, string $action, int $maxAttempts, int $windowMinutes): ?int
    {
        $stmt = $conn->prepare("
            SELECT created_at 
            FROM rate_limits 
            WHERE ip_address = :ip 
              AND action = :action 
              AND created_at > CURRENT_TIMESTAMP - INTERVAL '$windowMinutes minutes'
            ORDER BY created_at ASC
        ");
        $stmt->execute([
            'ip' => $ip,
            'action' => $action
        ]);
        
        $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $count = count($attempts);
        
        if ($count < $maxAttempts) {
            return null;
        }

        // We need (count - maxAttempts + 1) attempts to expire to get below the limit.
        $targetIndex = $count - $maxAttempts;
        $targetAttemptTime = strtotime($attempts[$targetIndex]['created_at']);
        $unlockTime = $targetAttemptTime + ($windowMinutes * 60);
        $remaining = $unlockTime - time();

        return $remaining > 0 ? $remaining : null;
    }

    /**
     * Records an attempt.
     */
    public static function recordAttempt(PDO $conn, string $ip, string $action): void
    {
        $stmt = $conn->prepare("
            INSERT INTO rate_limits (ip_address, action) 
            VALUES (:ip, :action)
        ");
        $stmt->execute([
            'ip' => $ip,
            'action' => $action
        ]);
    }

    /**
     * Clears all recorded attempts for a specific action and IP.
     */
    public static function clearAttempts(PDO $conn, string $ip, string $action): void
    {
        $stmt = $conn->prepare("
            DELETE FROM rate_limits 
            WHERE ip_address = :ip 
              AND action = :action
        ");
        $stmt->execute([
            'ip' => $ip,
            'action' => $action
        ]);
    }

    /**
     * Helper to get client IP.
     */
    public static function getClientIp(): string
    {
        $keys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
        foreach ($keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    // just to be safe
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}
