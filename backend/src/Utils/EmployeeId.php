<?php
declare(strict_types=1);

namespace App\Utils;

/**
 * SEC-019: public-facing employee codes are opaque display identifiers,
 * not authorization credentials. Authorization still uses authenticated IDs
 * and server-side permission checks.
 */
final class EmployeeId
{
    public static function generate(): string
    {
        // 128 random bits; 36 characters including the established EMP- prefix.
        // Compatible with employee."employeeId" varchar(50) UNIQUE NOT NULL.
        return 'EMP-' . strtoupper(bin2hex(random_bytes(16)));
    }
}
