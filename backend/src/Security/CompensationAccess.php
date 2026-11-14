<?php
declare(strict_types=1);

namespace App\Security;

use PDO;

/**
 * SEC-013: A delegated employee-directory/asset grant does not confer payroll
 * visibility or the right to set somebody else's compensation.
 *
 * AuthMiddleware already verifies the actor's signed, active identity and
 * route feature grants. We make an additional live *payroll* grant check for
 * each compensation-sensitive response/mutation. Never trust JWT feature
 * claims or a caller-supplied permission flag.
 */
final class CompensationAccess
{
    public static function allowed(PDO $conn, object $actor): bool
    {
        if (($actor->role ?? null) === 'admin') {
            return true;
        }
        if (empty($actor->id)) {
            return false;
        }
        $stmt = $conn->prepare('SELECT "canPayroll" FROM public.user_feature_access WHERE "userId" = ? LIMIT 1');
        $stmt->execute([(string)$actor->id]);
        $flag = $stmt->fetchColumn();
        return in_array($flag, [true, 1, '1', 't', 'true'], true);
    }

    public static function redactEmployee(array &$employee): void
    {
        // Preserve the established API response shape: NULL is explicitly
        // restricted, not a fabricated zero salary.
        $employee['salary'] = null;

        // Employee profile timelines include old/new salary amounts; hiding
        // salary alone would not prevent a delegated staff member reading them.
        if (!empty($employee['timeline'])) {
            $timeline = is_array($employee['timeline'])
                ? $employee['timeline']
                : json_decode((string)$employee['timeline'], true);
            if (is_array($timeline)) {
                $timeline = array_values(array_filter($timeline, static function ($item): bool {
                    if (!is_array($item)) return false;
                    $details = (string)($item['title'] ?? '') . ' ' . (string)($item['description'] ?? '');
                    // Some historical promotion events show only a rupee
                    // amount or hike percentage rather than the word salary.
                    // Unknown or undecodable events are not safe to expose.
                    $safe = preg_match('/(?:salary|compensation|payroll|remuneration|ctc|\\bpay\\b|\\bhike\\b|₹)/iu', $details);
                    return $safe === 0;
                }));
                // Never forward arbitrary historical event keys such as
                // old_salary, new_salary or raise_amount through a safe title.
                $timeline = array_map(static function (array $event): array {
                    return array_intersect_key($event, array_flip(['date', 'title', 'description']));
                }, $timeline);
                $employee['timeline'] = json_encode($timeline);
            } else {
                // Unknown timeline formats cannot be safely redacted.
                $employee['timeline'] = null;
            }
        }
    }
}
