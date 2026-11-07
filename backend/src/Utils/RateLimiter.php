<?php

namespace App\Utils;

use PDO;

class RateLimiter
{
    public static function checkLimit(PDO $conn, string $ip, string $action, int $maxAttempts, int $windowMinutes): bool
    {
        $windowMinutes = max(1, min(1440, $windowMinutes));
        $stmt = $conn->prepare("SELECT COUNT(*) FROM rate_limits WHERE ip_address = :ip AND action = :action AND created_at > CURRENT_TIMESTAMP - (:window_minutes * INTERVAL '1 minute')");
        $stmt->execute(['ip' => $ip, 'action' => $action, 'window_minutes' => $windowMinutes]);
        return (int)$stmt->fetchColumn() < max(1, $maxAttempts);
    }

    public static function getLockoutRemainingTime(PDO $conn, string $ip, string $action, int $maxAttempts, int $windowMinutes): ?int
    {
        $windowMinutes = max(1, min(1440, $windowMinutes));
        $stmt = $conn->prepare("SELECT created_at FROM rate_limits WHERE ip_address = :ip AND action = :action AND created_at > CURRENT_TIMESTAMP - (:window_minutes * INTERVAL '1 minute') ORDER BY created_at ASC");
        $stmt->execute(['ip' => $ip, 'action' => $action, 'window_minutes' => $windowMinutes]);
        $attempts = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $count = count($attempts);
        if ($count < max(1, $maxAttempts)) return null;
        $targetIndex = $count - max(1, $maxAttempts);
        $remaining = strtotime($attempts[$targetIndex]) + ($windowMinutes * 60) - time();
        return $remaining > 0 ? $remaining : null;
    }

    public static function recordAttempt(PDO $conn, string $ip, string $action): void
    {
        $stmt = $conn->prepare('INSERT INTO rate_limits (ip_address, action) VALUES (:ip, :action)');
        $stmt->execute(['ip' => $ip, 'action' => $action]);
    }

    public static function clearAttempts(PDO $conn, string $ip, string $action): void
    {
        $stmt = $conn->prepare('DELETE FROM rate_limits WHERE ip_address = :ip AND action = :action');
        $stmt->execute(['ip' => $ip, 'action' => $action]);
    }

    // Forwarded headers are trusted only when REMOTE_ADDR is an explicitly trusted proxy.
    // TRUSTED_PROXY_IPS must contain exact proxy IPs, comma-separated. Otherwise use REMOTE_ADDR.
    public static function getClientIp(): string
    {
        $remote = trim($_SERVER['REMOTE_ADDR'] ?? '');
        if (!filter_var($remote, FILTER_VALIDATE_IP)) return '127.0.0.1';

        // Render routes requests through Cloudflare; CF-Connecting-IP is the
        // single client-address header Cloudflare supplies to the origin.
        // True-Client-IP is also supported when explicitly enabled on Enterprise.
        // Do not trust X-Forwarded-For here because it may contain caller-supplied values.
        $trustedHeader = trim((string)($_ENV['TRUSTED_CLIENT_IP_HEADER'] ?? getenv('TRUSTED_CLIENT_IP_HEADER') ?: ''));
        $headerMap = [
            'True-Client-IP' => 'HTTP_TRUE_CLIENT_IP',
            'CF-Connecting-IP' => 'HTTP_CF_CONNECTING_IP',
        ];
        if (isset($headerMap[$trustedHeader])) {
            $clientIp = trim($_SERVER[$headerMap[$trustedHeader]] ?? '');
            return filter_var($clientIp, FILTER_VALIDATE_IP) ? $clientIp : $remote;
        }

        // For other deployments, trust forwarded chains only from explicitly
        // configured proxy IPs. Never trust X-Forwarded-For by default.
        $trustedProxyIps = (string)($_ENV['TRUSTED_PROXY_IPS'] ?? getenv('TRUSTED_PROXY_IPS') ?: '');
        $trusted = array_filter(array_map('trim', explode(',', $trustedProxyIps)));
        if (!in_array($remote, $trusted, true)) return $remote;

        $chain = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''));
        $chain[] = $remote;
        for ($i = count($chain) - 1; $i >= 0; $i--) {
            if (filter_var($chain[$i], FILTER_VALIDATE_IP) && !in_array($chain[$i], $trusted, true)) return $chain[$i];
        }
        return $remote;
    }
}
