<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?LoggingPDO $conn = null;

    public function getConnection(): ?LoggingPDO
    {
        if (self::$conn === null) {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $port = $_ENV['DB_PORT'] ?? '5432';
            $db_name = $_ENV['DB_DATABASE'] ?? 'postgres';
            $username = $_ENV['DB_USERNAME'] ?? 'postgres';
            $password = $_ENV['DB_PASSWORD'] ?? '';

            try {
                // SEC-018: A separately enabled limited database identity keeps
                // the current credentials intact for safe failback.
                $restrictedEnabled = (string) ($_ENV['SEC018_DB_USE_RESTRICTED']
                    ?? (getenv('SEC018_DB_USE_RESTRICTED') ?: '')) === 'true';
                if ($restrictedEnabled) {
                    $limitedUsername = (string) ($_ENV['SEC018_DB_USERNAME']
                        ?? (getenv('SEC018_DB_USERNAME') ?: ''));
                    $limitedPassword = (string) ($_ENV['SEC018_DB_PASSWORD']
                        ?? (getenv('SEC018_DB_PASSWORD') ?: ''));
                    if ($limitedUsername === '' || $limitedPassword === '') {
                        throw new \RuntimeException('SEC-018 restricted database credentials unavailable');
                    }
                    $username = $limitedUsername;
                    $password = $limitedPassword;
                }
                $dsn = "pgsql:host={$host};port={$port};dbname={$db_name}";
                self::$conn = new LoggingPDO($dsn, $username, $password);
                self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                // SEC-018: Supabase shared transaction pooler cannot keep named
                // server-side prepared statements across transactions (SQLSTATE 26000).
                // Preserve safe PDO binding in pooler mode; only opt in to native
                // prepares after moving to a verified direct/session connection.
                // No Render database setting or credential change is required here.
                $prepareMode = (string) ($_ENV['DB_PDO_PREPARE_MODE']
                    ?? (getenv('DB_PDO_PREPARE_MODE') ?: 'pooler'));
                if (!in_array($prepareMode, ['pooler', 'native'], true)) {
                    error_log('Invalid DB_PDO_PREPARE_MODE; using pooler-safe prepares');
                    $prepareMode = 'pooler';
                }
                // The Supabase shared transaction pooler on port 6543
                // cannot retain PostgreSQL native prepared statements.
                // Fail closed rather than silently falling back to emulation.
                // Direct and shared session-pooler connections on 5432 can be
                // rehearsed with native statements before the Render switch.
                if ($prepareMode === 'native' && (int) $port === 6543) {
                    throw new \RuntimeException(
                        'SEC-018 native prepares require a direct/session PostgreSQL connection'
                    );
                }
                self::$conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, $prepareMode !== 'native');
                if ($prepareMode === 'native'
                    && self::$conn->getAttribute(PDO::ATTR_EMULATE_PREPARES) !== false) {
                    throw new \RuntimeException('SEC-018 native PDO prepare mode unavailable');
                }
                // Statement objects retain their own connection (configured by LoggingPDO).
                // Refuse any wrong-identity connection when the restricted
                // switch is enabled; never silently use privileged fallback.
                $activeRole = (string) self::$conn->query('SELECT current_user')->fetchColumn();
                if (($restrictedEnabled && $activeRole !== 'hrms_runtime_restricted')
                    || ($activeRole === 'hrms_runtime_restricted'
                        && !\App\Utils\Sec018AuditContext::enabled())) {
                    self::$conn = null;
                    throw new \RuntimeException('Restricted runtime requires signed audit context');
                }
            } catch (\Throwable $exception) {
                self::$conn = null;
                // SEC-010: Callers must receive a clean error response, not
                // connection details printed into the HTTP response body.
                // AuthMiddleware treats a null connection as HTTP 503.
                error_log('Database connection failed: ' . $exception->getMessage());
                return null;
            }
        }

        return self::$conn;
    }
}
