<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $conn = null;

    public function getConnection(): ?PDO
    {
        if (self::$conn === null) {
            $host = $_ENV['DB_HOST'] ?? 'localhost';
            $port = $_ENV['DB_PORT'] ?? '5432';
            $db_name = $_ENV['DB_DATABASE'] ?? 'postgres';
            $username = $_ENV['DB_USERNAME'] ?? 'postgres';
            $password = $_ENV['DB_PASSWORD'] ?? '';

            try {
                $dsn = "pgsql:host={$host};port={$port};dbname={$db_name}";
                self::$conn = new PDO($dsn, $username, $password);
                self::$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                self::$conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
            } catch (PDOException $exception) {
                // In a production environment, log this instead of echoing it directly.
                echo "Connection error: " . $exception->getMessage();
                return null;
            }
        }

        return self::$conn;
    }
}
