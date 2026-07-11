<?php
function getPeerEmployees($conn, $managerId, $department, $currentEmployeeId) {
    if (!$managerId) return [];
    
    $stmt = $conn->prepare('
        SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email,
               e.department, e.position, e.status, e.avatar, e."joinDate", e."managerId"
        FROM employee e
        WHERE e."managerId" = ? AND e.department = ? AND e.id != ? AND e.status = \'active\'
    ');
    $stmt->execute([$managerId, $department, $currentEmployeeId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getSubordinateTree($conn, $employeeId, array &$employeeMap = null) {
    if ($employeeMap === null) {
        $stmt = $conn->query('
            SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email,
                   e.department, e.position, e.status, e.avatar, e."joinDate", e."managerId"
            FROM employee e
            WHERE e.status = \'active\'
        ');
        $allEmployees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $employeeMap = [];
        foreach ($allEmployees as $emp) {
            $mgrId = $emp['managerId'];
            if ($mgrId) {
                $employeeMap[$mgrId][] = $emp;
            }
        }
    }
    
    $reports = $employeeMap[$employeeId] ?? [];
    
    foreach ($reports as &$report) {
        $report['reports'] = getSubordinateTree($conn, $report['id'], $employeeMap);
    }
    return $reports;
}

function flattenEmployeePerformanceTree(array $tree): array {
    $flat = [];
    foreach ($tree as $node) {
        $flat[] = $node;
        if (!empty($node['reports'])) {
            $flat = array_merge($flat, flattenEmployeePerformanceTree($node['reports']));
        }
    }
    return $flat;
}

function buildMonthIntervals(int $count, string $referenceDate): array {
    $intervals = [];
    $current = new DateTime($referenceDate);
    $current->modify('first day of this month');
    for ($i = $count - 1; $i >= 0; $i--) {
        $month = (clone $current)->modify("-{$i} months");
        $intervals[] = [
            'key' => $month->format('Y-m'),
            'label' => $month->format('M Y'),
            'start' => $month->format('Y-m-01'),
            'end' => $month->format('Y-m-t'),
        ];
    }
    return $intervals;
}

function normalizeStatus(string $status, ?string $checkIn): string {
    $status = strtolower(trim($status));

    if (in_array($status, [
        'present',
        'present (late)',
        'present (early)',
        'present (late+early)',
        'present-full-shift'
    ], true)) {
        return 'present';
    }

    if (in_array($status, [
        'paid leave',
        'unpaid leave',
        'sandwich leave',
        'missed'
    ], true)) {
        return 'leave';
    }

    return 'ignore';
}

function buildPerformanceIntervalSummary(array $employee, string $startDate, string $endDate, array $holidays, array $attendanceByEmployee): array {
    $joinDate = !empty($employee['joinDate']) ? substr($employee['joinDate'], 0, 10) : null;
    $intervalStart = substr($startDate, 0, 10);
    $intervalEnd = substr($endDate, 0, 10);
    
    $emptySummary = [
        'employee' => $employee, 'totalPresent' => 0, 'totalLeave' => 0,
        'totalWorkdays' => 0, 'attendancePct' => 0, 'leavePct' => 0,
    ];

    if ($joinDate !== null && $joinDate > $intervalEnd) return $emptySummary;
    if ($joinDate !== null && $joinDate > $intervalStart) $intervalStart = $joinDate;
    if ($intervalStart > $intervalEnd) return $emptySummary;

    $attendanceRecords = $attendanceByEmployee[$employee['userId'] ?? $employee['id']] ?? [];

    $present = 0; $leave = 0; $totalDays = 0;
    
    // Parse week off
    $weekOff = 'sunday'; // default
    if (isset($employee['weekOff'])) {
        $weekOff = $employee['weekOff'];
    }
    $weekOffDays = array_map('trim', explode(',', strtolower($weekOff)));

    $current = new DateTime($intervalStart);
    $limit = new DateTime($intervalEnd);
    while ($current <= $limit) {
        $date = $current->format('Y-m-d');
        $dayName = strtolower($current->format('l'));
        
        $isHoliday = isset($holidays[$date]);
        $isWeekOff = in_array($dayName, $weekOffDays);

        $record = $attendanceRecords[$date] ?? null;
        $status = $record !== null ? normalizeStatus($record['status'] ?? 'missed', $record['checkIn'] ?? null) : 'missed';

        if ($status === 'present') {
            $present++;
            $totalDays++;
        } elseif (!$isHoliday && !$isWeekOff) {
            $totalDays++;
            if ($status === 'leave') {
                $leave++;
            }
        }
        $current->modify('+1 day');
    }

    return [
        'employee' => $employee,
        'totalPresent' => $present,
        'totalLeave' => $leave,
        'totalWorkdays' => $totalDays,
        'attendancePct' => $totalDays > 0 ? round($present / $totalDays * 100, 1) : 0,
        'leavePct' => $totalDays > 0 ? round($leave / $totalDays * 100, 1) : 0,
    ];
}

function buildCurrentMonthSummary(array $employee, string $today, array $holidays, array $attendanceByEmployee): array {
    $monthStart = date('Y-m-01', strtotime($today));
    $dateEnd = substr($today, 0, 10);
    return buildPerformanceIntervalSummary($employee, $monthStart, $dateEnd, $holidays, $attendanceByEmployee);
}

function buildMetrics(array $employee, array $months, array $holidays, array $attendanceByEmployee, ?string $referenceDate = null): array {
    $monthly = [];
    $totalPresent = 0; $totalLeave = 0; $totalWorkdays = 0;
    $referenceDate = $referenceDate !== null ? substr($referenceDate, 0, 10) : null;
    $joinDate = !empty($employee['joinDate']) ? substr($employee['joinDate'], 0, 10) : null;

    foreach ($months as $month) {
        $monthEnd = $month['end'];
        if ($referenceDate !== null && $monthEnd > $referenceDate) $monthEnd = $referenceDate;
        if ($joinDate !== null && $joinDate > $monthEnd) continue;

        $summary = buildPerformanceIntervalSummary($employee, $month['start'], $monthEnd, $holidays, $attendanceByEmployee);
        
        $monthly[] = [
            'present' => $summary['totalPresent'],
            'leave' => $summary['totalLeave'],
            'workdays' => $summary['totalWorkdays'],
            'attendancePct' => $summary['attendancePct'],
            'leavePct' => $summary['leavePct'],
            'label' => $month['label'],
        ];

        $totalPresent += $summary['totalPresent'];
        $totalLeave += $summary['totalLeave'];
        $totalWorkdays += $summary['totalWorkdays'];
    }

    return [
        'employee' => $employee,
        'monthly' => $monthly,
        'totalPresent' => $totalPresent,
        'totalLeave' => $totalLeave,
        'totalWorkdays' => $totalWorkdays,
        'attendancePct' => $totalWorkdays > 0 ? round($totalPresent / $totalWorkdays * 100, 1) : 0,
        'leavePct' => $totalWorkdays > 0 ? round($totalLeave / $totalWorkdays * 100, 1) : 0,
    ];
}

function calculatePerformanceAverage(array $items, string $field): float {
    if (empty($items)) return 0;
    $sum = array_sum(array_column($items, $field));
    return round($sum / count($items), 1);
}
