<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?LoggingPDO $conn = null;

    /**
     * Optional, request-local PERF-008 diagnostics. Null disables all phase
     * clocks. Timings are returned to the caller; Database never logs secrets.
     * Existing callers need no changes, and SEC-018 checks remain mandatory.
     * @param array<string, float>|null $perf008DbStages
     */
    public function getConnection(?array &$perf008DbStages = null): ?LoggingPDO
    {
        if ($perf008DbStages !== null) {
            $perf008DbStages = [];
        }
        if (self::$conn === null) {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $port = $_ENV['DB_PORT'] ?? '5432';
            $db_name = $_ENV['DB_DATABASE'] ?? 'postgres';
            $username = $_ENV['DB_USERNAME'] ?? 'postgres';
            $password = $_ENV['DB_PASSWORD'] ?? '';

            try {
                // SEC-018 final opt-in: switch both port and prepare mode as ONE
                // reversible unit, leaving DB_PORT, DB_PDO_PREPARE_MODE, DB_HOST
                // and all credential variables unchanged for immediate rollback.
                // Supabase's shared session pooler uses the same hostname as
                // the transaction pooler, but listens on 5432 rather than 6543.
                $nativeSessionOptIn = (string) ($_ENV['SEC018_NATIVE_SESSION_ENABLED']
                    ?? (getenv('SEC018_NATIVE_SESSION_ENABLED') ?: 'false')) === 'true';
                if ($nativeSessionOptIn) {
                    $port = '5432';
                }
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
                // Includes the physical connection, TLS/pooler authentication and
                // PDO constructor overhead; it is NOT merely network RTT.
                $perf008PdoStartNs = $perf008DbStages !== null ? hrtime(true) : null;
                self::$conn = new LoggingPDO($dsn, $username, $password);
                if ($perf008DbStages !== null) {
                    $perf008DbStages['pdo_connect_ms'] = (hrtime(true) - $perf008PdoStartNs) / 1e6;
                }
                self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                // SEC-018: Supabase shared transaction pooler cannot keep named
                // server-side prepared statements across transactions (SQLSTATE 26000).
                // Preserve safe PDO binding in pooler mode; only opt in to native
                // prepares after moving to a verified direct/session connection.
                // No Render database setting or credential change is required here.
                $prepareMode = $nativeSessionOptIn ? 'native' : (string) ($_ENV['DB_PDO_PREPARE_MODE']
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
                // Keep the mandatory identity query intact. Measure its
                // round trip and fetch, never the role value or SQL contents.
                $perf008IdentityStartNs = $perf008DbStages !== null ? hrtime(true) : null;
                $activeRole = (string) self::$conn->query('SELECT current_user')->fetchColumn();
                if ($perf008DbStages !== null) {
                    $perf008DbStages['identity_check_ms'] = (hrtime(true) - $perf008IdentityStartNs) / 1e6;
                }
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
