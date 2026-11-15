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
                $dsn = "pgsql:host={$host};port={$port};dbname={$db_name}";
                self::$conn = new LoggingPDO($dsn, $username, $password);
                self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                // SEC-018: Use native PostgreSQL prepares, never client-side substitution.
                self::$conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
                self::$conn->setAttribute(PDO::ATTR_STATEMENT_CLASS, [LoggingPDOStatement::class, []]);
            } catch (PDOException $exception) {
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
