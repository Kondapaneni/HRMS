<?php
declare(strict_types=1);

namespace App\Utils;

use PDO;
use RuntimeException;

/**
 * Optional SEC-018 database-audit signing. The setting is deliberately OFF
 * until the separately reviewed database verifier and key have been deployed.
 *
 * The context is transaction-local and is cryptographically tied to the
 * PostgreSQL XID. The backend role cannot substitute its own actor simply by
 * calling set_config(). Not a user/branch RLS authorizer.
 */
final class Sec018AuditContext
{
    public static function enabled(): bool
    {
        return (string) ($_ENV['SEC018_AUDIT_CONTEXT_ENABLED']
            ?? getenv('SEC018_AUDIT_CONTEXT_ENABLED') ?: '') === 'true';
    }

    public static function assertConfigured(): void
    {
        if (!self::enabled()) {
            return;
        }
        $key = self::key();
        if (!preg_match('/\A[a-f0-9]{64}\z/D', $key)) {
            throw new RuntimeException('SEC-018 audit signing key unavailable');
        }
    }

    private static function key(): string
    {
        return (string) ($_ENV['SEC018_AUDIT_HMAC_KEY']
            ?? getenv('SEC018_AUDIT_HMAC_KEY') ?: '');
    }

    /**
     * Run ONLY within a transaction after PHP verified the signed session,
     * live account status, role and session version.
     *
     * @param array{uid:string,tv:int,ip:string,ua:string,sid:string} $identity
     */
    public static function bind(PDO $conn, array $identity): void
    {
        self::assertConfigured();
        if (!$conn->inTransaction()) {
            throw new RuntimeException('SEC-018 audit binding requires a transaction');
        }
        $xid = (string) $conn->query('SELECT txid_current()')->fetchColumn();
        $payload = json_encode([
            'v' => 1,
            'uid' => $identity['uid'],
            'tv' => $identity['tv'],
            'txid' => $xid,
            'iat' => time(),
            'exp' => time() + 60,
            'sid' => $identity['sid'],
            'ip' => substr($identity['ip'], 0, 60),
            'ua' => substr($identity['ua'], 0, 250),
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
        $keyBytes = hex2bin(self::key());
        if ($keyBytes === false) {
            throw new RuntimeException('SEC-018 audit signing key invalid');
        }
        $mac = hash_hmac('sha256', $payload, $keyBytes);
        $stmt = $conn->prepare("SELECT set_config('sec018.audit_payload', ?, true), set_config('sec018.audit_mac', ?, true)");
        $stmt->execute([$payload, $mac]);
        // Exercise the installed verifier before any application statement,
        // including statements whose tables do not have audit triggers.
        // Both names are temporarily supported during the coordinated
        // security-schema rename. Check catalog presence first: attempting
        // a missing function would abort this active PostgreSQL transaction.
        $verifierSchema = $conn->query(<<<'SQL'
            SELECT CASE
              WHEN to_regprocedure('hrms_security.verified_audit_actor()') IS NOT NULL
                THEN 'hrms_security'
              WHEN to_regprocedure('sec018_internal.verified_audit_actor()') IS NOT NULL
                THEN 'sec018_internal'
              ELSE NULL
            END
            SQL)->fetchColumn();
        // The chosen schema comes only from our fixed SQL literal allowlist.
        if (!in_array($verifierSchema, ['hrms_security', 'sec018_internal'], true)) {
            throw new RuntimeException('SEC-018 audit verifier unavailable');
        }
        if (!$conn->query("SELECT {$verifierSchema}.verified_audit_actor() IS NOT NULL")->fetchColumn()) {
            throw new RuntimeException('SEC-018 audit verification failed');
        }
    }
}
