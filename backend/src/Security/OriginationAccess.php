<?php

namespace App\Security;

use PDO;

/**
 * SEC-011: Server-derived identities and row-level ownership / branch scopes.
 *
 * Route-level AuthMiddleware checks module access. These predicates additionally
 * constrain the particular database record; caller-supplied owner/branch fields
 * must never be used as authorization evidence.
 */
final class OriginationAccess
{
    public static function userId($identity): ?string
    {
        $id = is_object($identity)
            ? ($identity->id ?? null)
            : (is_array($identity) ? ($identity['id'] ?? null) : null);
        return is_scalar($id) && trim((string)$id) !== '' ? (string)$id : null;
    }

    public static function isAdmin($identity): bool
    {
        $role = is_object($identity)
            ? ($identity->role ?? null)
            : (is_array($identity) ? ($identity['role'] ?? null) : null);
        return $role === 'admin';
    }

    public static function branch(PDO $conn, string $userId): ?string
    {
        $stmt = $conn->prepare('SELECT branch FROM public.employee WHERE "userId" = ? LIMIT 1');
        $stmt->execute([$userId]);
        $branch = $stmt->fetchColumn();
        return is_string($branch) && trim($branch) !== '' ? $branch : null;
    }

    /**
     * An admin can manage all loan rows; a delegated loan employee must be BOTH
     * the creator and a member of the row's recorded branch.
     *
     * @return array{0:string,1:list<string>}
     */
    public static function loanScope($identity, ?string $branch, string $alias = ''): array
    {
        if (self::isAdmin($identity)) {
            return ['', []];
        }
        $id = self::userId($identity);
        if (!$id || !$branch) {
            return [' AND FALSE', []];
        }
        // Table aliases come only from our own route code, never user input.
        if (!in_array($alias, ['', 'la', 'a'], true)) {
            throw new \LogicException('Invalid loan scope alias');
        }
        $prefix = $alias === '' ? '' : $alias . '.';
        return [" AND {$prefix}created_by = ? AND {$prefix}branch = ?", [$id, $branch]];
    }

    /**
     * Lookup never exposes another staff member's or another branch's row.
     * id/application_id/lead_id aliases remain supported for existing clients.
     */
    public static function findLoan(PDO $conn, string $identifier, $identity, ?string $branch, bool $draftOnly = false): ?array
    {
        if ($identifier === '') {
            return null;
        }
        [$scopeSql, $scopeArgs] = self::loanScope($identity, $branch);
        $sql = '
            SELECT id, application_id, lead_id, loan_type, status, form_data,
                   branch, signatures, created_by, created_at, updated_at
            FROM public.loan_applications
            WHERE (id::text = ? OR application_id = ? OR lead_id = ?)'
            . ($draftOnly ? " AND status = 'Draft'" : '')
            . $scopeSql
            . ' ORDER BY created_at DESC LIMIT 1';
        $stmt = $conn->prepare($sql);
        $stmt->execute(array_merge([$identifier, $identifier, $identifier], $scopeArgs));
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Branch Operations can edit only applications physically recorded in the
     * staff member's current branch. Admin explicitly bypasses branch scope.
     *
     * @return array{0:string,1:list<string>}
     */
    public static function branchScope($identity, ?string $branch): array
    {
        if (self::isAdmin($identity)) {
            return ['', []];
        }
        return $branch
            ? [' AND branch = ?', [$branch]]
            : [' AND FALSE', []];
    }

    public static function hasBranchGrant(PDO $conn, $identity): bool
    {
        if (self::isAdmin($identity)) {
            return true;
        }
        $id = self::userId($identity);
        if (!$id) {
            return false;
        }
        $stmt = $conn->prepare('SELECT "canBranchOperations" FROM user_feature_access WHERE "userId" = ?');
        $stmt->execute([$id]);
        $flag = $stmt->fetchColumn();
        return in_array($flag, [true, 1, '1', 't', 'true'], true);
    }

    public static function targetEmployeeInBranch(PDO $conn, string $targetId, ?string $branch, bool $admin): bool
    {
        if (!$admin && !$branch) {
            return false;
        }
        $sql = '
            SELECT 1 FROM public.employee e
            JOIN public.users u ON u.id = e."userId"
            WHERE e."userId" = ? AND u."isActive" = TRUE';
        $args = [$targetId];
        if (!$admin) {
            $sql .= ' AND e.branch = ?';
            $args[] = $branch;
        }
        $stmt = $conn->prepare($sql . ' LIMIT 1');
        $stmt->execute($args);
        return (bool)$stmt->fetchColumn();
    }

    public static function activityAssignedInBranch(PDO $conn, array $activity, ?string $branch): bool
    {
        if (!$branch) {
            return false;
        }
        $assignee = $activity['assigned_to'] ?: $activity['created_by'];
        $stmt = $conn->prepare('SELECT 1 FROM public.employee WHERE "userId" = ? AND branch = ? LIMIT 1');
        $stmt->execute([$assignee, $branch]);
        return (bool)$stmt->fetchColumn();
    }

    public static function activityBranchPredicate(string $alias = ''): string
    {
        if (!in_array($alias, ['', 'oa'], true)) {
            throw new \LogicException('Invalid activity scope alias');
        }
        $p = $alias ? $alias . '.' : '';
        return " AND EXISTS (
            SELECT 1 FROM public.employee scope_emp
            WHERE scope_emp.\"userId\" = COALESCE({$p}assigned_to, {$p}created_by)
              AND scope_emp.branch = ?
        )";
    }
}
