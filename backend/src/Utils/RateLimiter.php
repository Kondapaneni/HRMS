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
     * SEC-014: The TCP peer is the only IP supplied by the web server, rather
     * than an attacker-controlled X-Forwarded-For / Client-IP HTTP header.
     * Reverse proxies need an explicit, separately verified trust policy
     * before any forwarded identity may be used.
     */
    public static function getClientIp(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? '';
        return is_string($remote) && filter_var($remote, FILTER_VALIDATE_IP)
            ? $remote
            : 'unknown-peer';
    }

    /**
     * Never persist a login email or user ID in rate_limits.ip_address.
     * Separate account and peer counters prevent XFF-rotation and cross-IP
     * credential guessing without locking out an entire office at 5 errors.
     */
    public static function accountKey(string $email): string
    {
        return 'acct:' . substr(hash('sha256', strtolower(trim($email))), 0, 40);
    }

    public static function userKey(string $userId): string
    {
        return 'user:' . substr(hash('sha256', trim($userId)), 0, 40);
    }

    public static function peerKey(): string
    {
        return 'peer:' . self::getClientIp();
    }

    /**
     * Account: original configured threshold; peer: larger spray threshold
     * to preserve multiple legitimate users behind corporate NAT.
     * Returns null when allowed or a positive lockout time when denied.
     */
    public static function credentialLockout(
        PDO $conn,
        string $email,
        string $action,
        int $maxAttempts,
        int $windowMinutes
    ): ?int {
        $account = self::accountKey($email);
        $peer = self::peerKey();
        $peerMax = max(30, $maxAttempts * 10);

        foreach ([[$account, $maxAttempts], [$peer, $peerMax]] as [$key, $max]) {
            if (!self::checkLimit($conn, $key, $action, $max, $windowMinutes)) {
                return max(1, self::getLockoutRemainingTime($conn, $key, $action, $max, $windowMinutes) ?? 1);
            }
        }
        return null;
    }

    public static function recordCredentialAttempt(PDO $conn, string $email, string $action): void
    {
        self::recordAttempt($conn, self::accountKey($email), $action);
        self::recordAttempt($conn, self::peerKey(), $action);
    }

    public static function clearCredentialAccountAttempts(PDO $conn, string $email, string $action): void
    {
        // Do not clear the shared peer counter on successful login: that
        // would permit one valid account to reset brute-force protection.
        self::clearAttempts($conn, self::accountKey($email), $action);
    }
}
