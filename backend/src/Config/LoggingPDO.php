<?php
namespace App\Config;

use PDO;
use PDOStatement;

class LoggingPDO extends PDO
{
    public static int $queryCount = 0;
    public static float $queryTimeMs = 0.0;

    public function exec(string $statement): int|false
    {
        self::$queryCount++;
        $start = microtime(true);
        $result = parent::exec($statement);
        self::$queryTimeMs += (microtime(true) - $start) * 1000;
        return $result;
    }

    public function query(string $query, ?int $fetchMode = null, mixed ...$fetchModeArgs): PDOStatement|false
    {
        self::$queryCount++;
        $start = microtime(true);
        if ($fetchMode !== null) {
            $result = parent::query($query, $fetchMode, ...$fetchModeArgs);
        } else {
            $result = parent::query($query);
        }
        self::$queryTimeMs += (microtime(true) - $start) * 1000;
        return $result;
    }
}

class LoggingPDOStatement extends PDOStatement
{
    // Important: we cannot override constructor of PDOStatement directly without a lot of care
    protected function __construct() {}

    public function execute(?array $params = null): bool
    {
        LoggingPDO::$queryCount++;
        $start = microtime(true);
        $result = parent::execute($params);
        LoggingPDO::$queryTimeMs += (microtime(true) - $start) * 1000;
        return $result;
    }
}
