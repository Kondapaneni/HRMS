<?php
namespace App\Config;

use PDO;
use PDOStatement;
use App\Utils\Sec018AuditContext;

/**
 * The original query counters remain unchanged.
 *
 * SEC-018 opt-in: audited statements execute with a signed, transaction-local
 * actor identity. Autocommit writes acquire a short transaction so the audit
 * trigger receives the context inside the SAME SQL transaction. Existing
 * explicit multi-statement transactions remain intact.
 */
class LoggingPDO extends PDO
{
    public static int $queryCount = 0;
    public static float $queryTimeMs = 0.0;


    /** @var array{uid:string,tv:int,ip:string,ua:string,sid:string}|null */
    private ?array $sec018Actor = null;
    private bool $sec018Binding = false;

    public function __construct(string $dsn, ?string $username = null, ?string $password = null, ?array $options = null)
    {
        parent::__construct($dsn, $username, $password, $options ?? []);
        $this->setAttribute(PDO::ATTR_STATEMENT_CLASS, [LoggingPDOStatement::class, [$this]]);
    }

    public static function activeConnection(): ?self
    {
        return self::$active;
    }

    /** @param array{uid:string,tv:int,ip:string,ua:string,sid:string} $identity */
    public function setSec018AuditIdentity(array $identity): void
    {
        Sec018AuditContext::assertConfigured();
        $this->sec018Actor = $identity;
    }

    public function clearSec018AuditIdentity(): void
    {
        $this->sec018Actor = null;
    }

    public function withSec018AuditContext(string $sql, callable $operation): mixed
    {
        if (!Sec018AuditContext::enabled() || $this->sec018Actor === null
            || $this->sec018Binding) {
            return $operation();
        }
        $ownsTransaction = !$this->inTransaction();
        if ($ownsTransaction) {
            parent::beginTransaction();
        }
        $this->sec018Binding = true;
        try {
            Sec018AuditContext::bind($this, $this->sec018Actor);
            $result = $operation();
            if ($ownsTransaction) {
                parent::commit();
            }
            return $result;
        } catch (\Throwable $e) {
            if ($ownsTransaction && $this->inTransaction()) {
                parent::rollBack();
            }
            throw $e;
        } finally {
            $this->sec018Binding = false;
        }
    }

    public function exec(string $statement): int|false
    {
        self::$queryCount++;
        $start = microtime(true);
        try {
            return $this->withSec018AuditContext($statement, fn () => parent::exec($statement));
        } finally {
            self::$queryTimeMs += (microtime(true) - $start) * 1000;
        }
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        self::$queryCount++;
        $start = microtime(true);
        try {
            return $this->withSec018AuditContext($query, function () use ($query,$fetchMode,$fetchModeArgs) {
                return $fetchMode !== null
                    ? parent::query($query, $fetchMode, ...$fetchModeArgs)
                    : parent::query($query);
            });
        } finally {
            self::$queryTimeMs += (microtime(true) - $start) * 1000;
        }
    }
}

class LoggingPDOStatement extends PDOStatement
{
    protected function __construct(private LoggingPDO $connection) {}

    public function execute(?array $params = null): bool
    {
        LoggingPDO::$queryCount++;
        $start = microtime(true);
        try {
            $conn = $this->connection;
            $run = fn () => parent::execute($params);
            return $conn->withSec018AuditContext($this->queryString, $run);
        } finally {
            LoggingPDO::$queryTimeMs += (microtime(true) - $start) * 1000;
        }
    }
}
