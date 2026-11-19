<?php
declare(strict_types=1);

namespace App\Utils;

/**
 * Human-facing employee ID, never an authentication or authorization secret.
 * Internal user and employee UUIDs remain unchanged.
 */
final class EmployeeId
{
    public const MAX_ATTEMPTS = 12;

    public static function generate(): string
    {
        // The database stores EMP- plus exactly eight decimal digits, no leading zero.
        // random_int() draws securely from the operating system CSPRNG.
        return 'EMP-' . (string) random_int(10_000_000, 99_999_999);
    }

    /**
     * The caller's INSERT must use:
     *   ON CONFLICT ("employeeId") DO NOTHING RETURNING id
     *
     * A collision returns false without aborting the surrounding PostgreSQL
     * transaction; any other database constraint failure still propagates.
     *
     * @param callable(string): (string|false|null) $insert
     * @return array{0: string, 1: string} [EMP-prefixed eight-digit code, employee UUID]
     */
    public static function insertUnique(callable $insert): array
    {
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $code = self::generate();
            $employeeUuid = $insert($code);

            if ($employeeUuid !== false && $employeeUuid !== null && $employeeUuid !== '') {
                return [$code, (string) $employeeUuid];
            }
        }

        throw new \RuntimeException('Unable to allocate a unique employee ID');
    }
}
