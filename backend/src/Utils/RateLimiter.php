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
