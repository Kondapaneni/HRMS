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
                self::$conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
                self::$conn->setAttribute(PDO::ATTR_STATEMENT_CLASS, [LoggingPDOStatement::class, []]);
            } catch (PDOException $exception) {
                // In a production environment, log this instead of echoing it directly.
                echo "Connection error: " . $exception->getMessage();
                return null;
            }
        }

        return self::$conn;
    }
}
