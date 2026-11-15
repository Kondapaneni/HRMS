<?php

namespace App\Utils;

use PDO;

class HierarchyHelper
{
    /**
     * Determines whether the given user is exempt from reporting hierarchy restrictions.
     * True if role is admin or user belongs to the Human Resources department.
     *
     * @param PDO $conn
     * @param object $user Decoded JWT user object
     * @return bool
     */
    public static function isExempt(PDO $conn, $user): bool
    {
        if (isset($user->role) && $user->role === 'admin') {
            return true;
        }

        $userId = $user->id ?? '';
        if (empty($userId)) {
            return false;
        }

        $stmt = $conn->prepare('
            SELECT department FROM employee WHERE "userId" = :emp_user_id OR id = :emp_row_id
            UNION
            SELECT department FROM users WHERE id = :account_id
            LIMIT 1
        ');
        $stmt->execute([
            ':emp_user_id' => $userId,
            ':emp_row_id' => $userId,
            ':account_id' => $userId,
        ]);
        $department = $stmt->fetchColumn();

        if ($department) {
            $dept = trim((string)$department);
            if (strcasecmp($dept, 'Human Resources') === 0 || strcasecmp($dept, 'HR') === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the employee scope for Attendance Manager and Leave Manager features.
     *
     * @param PDO $conn
     * @param object $user Decoded JWT user object
     * @return array{
     *   isRestricted: bool,
     *   employeeUserIds: string[],
     *   employeeIds: string[],
     *   currentEmp: array|null
     * }
     */
    public static function getReportingScope(PDO $conn, $user): array
    {
        if (self::isExempt($conn, $user)) {
            return [
                'isRestricted' => false,
                'employeeUserIds' => [],
                'employeeIds' => [],
                'currentEmp' => null
            ];
        }

        $userId = $user->id ?? '';
        if (empty($userId)) {
            return [
                'isRestricted' => true,
                'employeeUserIds' => [],
                'employeeIds' => [],
                'currentEmp' => null
            ];
        }

        // Fetch the employee record corresponding to the logged in user
        $stmt = $conn->prepare('SELECT id, "userId", "employeeId", department FROM employee WHERE "userId" = ? OR id = ? LIMIT 1');
        $stmt->execute([$userId, $userId]);
        $currentEmp = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$currentEmp) {
            return [
                'isRestricted' => true,
                'employeeUserIds' => [],
                'employeeIds' => [],
                'currentEmp' => null
            ];
        }

        // Recursively find all downstream reporting employees (direct and indirect)
        $sqlHierarchy = '
            WITH RECURSIVE downstream_hierarchy AS (
                -- Anchor member: Direct reports of current manager
                SELECT id, "userId", "employeeId", 1 AS depth
                FROM employee
                WHERE "managerId"::text = :mgrId1 OR "managerId"::text = :mgrId2

                UNION ALL

                -- Recursive member: Subordinates of any employee in downstream_hierarchy
                SELECT e.id, e."userId", e."employeeId", dh.depth + 1
                FROM employee e
                INNER JOIN downstream_hierarchy dh 
                    ON (e."managerId"::text = dh.id::text OR e."managerId"::text = dh."userId"::text)
                WHERE dh.depth < 50
            )
            SELECT DISTINCT id, "userId", "employeeId"
            FROM downstream_hierarchy
        ';

        $stmtReports = $conn->prepare($sqlHierarchy);
        $stmtReports->execute([
            ':mgrId1' => (string)$currentEmp['id'],
            ':mgrId2' => (string)$currentEmp['userId']
        ]);
        $reports = $stmtReports->fetchAll(PDO::FETCH_ASSOC) ?: [];

        $employeeUserIds = [];
        $employeeIds = [];

        foreach ($reports as $rep) {
            if (!empty($rep['userId'])) {
                $employeeUserIds[] = (string)$rep['userId'];
            }
            if (!empty($rep['id'])) {
                $employeeIds[] = (string)$rep['id'];
            }
        }

        return [
            'isRestricted' => true,
            'employeeUserIds' => array_values(array_unique($employeeUserIds)),
            'employeeIds' => array_values(array_unique($employeeIds)),
            'currentEmp' => $currentEmp
        ];
    }

    /**
     * Checks if a target employee (identified by employee table id or userId) is allowed
     * for the given user's scope.
     *
     * @param array $scope Result of getReportingScope
     * @param string|null $targetEmployeeId
     * @return bool
     */
    public static function isEmployeeAllowed(array $scope, ?string $targetEmployeeId): bool
    {
        if (empty($scope['isRestricted'])) {
            return true;
        }

        if (empty($targetEmployeeId)) {
            return false;
        }

        $targetId = (string)$targetEmployeeId;

        return in_array($targetId, $scope['employeeUserIds'] ?? [], true) ||
               in_array($targetId, $scope['employeeIds'] ?? [], true);
    }
}
