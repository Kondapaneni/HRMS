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
    if (!$employeeId) return [];

    if ($employeeMap === null) {
        $stmt = $conn->prepare('
            WITH RECURSIVE subordinates AS (
                SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email,
                       e.department, e.position, e.status, e.avatar, e."joinDate", e."managerId"
                FROM employee e
                WHERE e."managerId" = ? AND e.status = \'active\'
                UNION ALL
                SELECT e.id, e."employeeId", e."userId", e."firstName", e."lastName", e.email,
                       e.department, e.position, e.status, e.avatar, e."joinDate", e."managerId"
                FROM employee e
                JOIN subordinates s ON e."managerId" = s.id::text
                WHERE e.status = \'active\'
            )
            SELECT * FROM subordinates
        ');
        $stmt->execute([(string)$employeeId]);
        $subordinates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $employeeMap = [];
        foreach ($subordinates as $emp) {
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
        'present (early+late)',
        'present (checkout missing)',
        'present (late+checkout missing)'
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
        'totalWorkdays' => 0, 'totalHours' => 0, 'attendancePct' => 0, 'leavePct' => 0,
    ];

    if ($joinDate !== null && $joinDate > $intervalEnd) return $emptySummary;
    if ($joinDate !== null && $joinDate > $intervalStart) $intervalStart = $joinDate;
    if ($intervalStart > $intervalEnd) return $emptySummary;

    $attendanceRecords = $attendanceByEmployee[$employee['userId'] ?? $employee['id']] ?? [];

    $present = 0; $leave = 0; $totalDays = 0; $totalHours = 0.0;
    
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
            $totalHours += (float)($record['hours'] ?? 0);
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
        'totalHours' => round($totalHours, 1),
        'attendancePct' => $totalDays > 0 ? round($present / $totalDays * 100, 1) : 0,
        'leavePct' => $totalDays > 0 ? round($leave / $totalDays * 100, 1) : 0,
    ];
}

function buildWeeklyMetrics(array $employee, array $attendanceByEmployee, string $today): array {
    $attendanceRecords = $attendanceByEmployee[$employee['userId'] ?? $employee['id']] ?? [];
    
    $currentDate = new DateTime($today);
    $dayOfWeek = (int)$currentDate->format('N'); // 1 (Mon) to 7 (Sun)
    $monday = (clone $currentDate)->modify('-' . ($dayOfWeek - 1) . ' days');
    
    $weeks = [];
    for ($i = 5; $i >= 0; $i--) {
        $wStart = (clone $monday)->modify("-{$i} weeks");
        $wEnd = (clone $wStart)->modify('+6 days');
        
        $startStr = $wStart->format('Y-m-d');
        $endStr = $wEnd->format('Y-m-d');
        $capEndStr = ($endStr > $today) ? $today : $endStr;
        
        $totalHours = 0.0;
        $presentDays = 0;
        
        $iter = clone $wStart;
        $limit = new DateTime($capEndStr);
        while ($iter <= $limit) {
            $d = $iter->format('Y-m-d');
            if (isset($attendanceRecords[$d])) {
                $rec = $attendanceRecords[$d];
                $st = normalizeStatus($rec['status'] ?? '', $rec['checkIn'] ?? null);
                if ($st === 'present') {
                    $presentDays++;
                    $totalHours += (float)($rec['hours'] ?? 0);
                }
            }
            $iter->modify('+1 day');
        }
        
        $isCurrentWeek = ($i === 0);
        $label = $wStart->format('M d') . ' - ' . $wEnd->format('M d');
        if ($isCurrentWeek) {
            $label .= ' (This Week)';
        }
        
        $weeks[] = [
            'startDate' => $startStr,
            'endDate' => $endStr,
            'label' => $label,
            'shortLabel' => $wStart->format('d M'),
            'totalHours' => round($totalHours, 1),
            'presentDays' => $presentDays,
            'avgHoursPerDay' => $presentDays > 0 ? round($totalHours / $presentDays, 1) : 0,
            'isCurrentWeek' => $isCurrentWeek
        ];
    }
    return $weeks;
}

/**
 * Current-month punctuality for verified employees with a configured shift.
 *
 * Only real, present check-ins are eligible. Missed days, approved leave,
 * non-working days without check-ins, and rows lacking a usable check-in do not
 * turn into fictional 'late' punches. Compare in the same server clock used by
 * the attendance punch/status writer; do not substitute attendancePct.
 */
function buildCurrentMonthOnTimeSummary(array $employee, string $today, array $attendanceByEmployee): array {
    $shiftStart = trim((string)($employee['shiftStartTime'] ?? ''));
    $empty = ['onTimePct' => null, 'onTimeDays' => 0, 'onTimeEligibleDays' => 0,
              'onTimeStatus' => 'shift_not_configured'];
    if (!preg_match('/^([01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?$/D', $shiftStart)) {
        return $empty;
    }
    if (strlen($shiftStart) === 5) $shiftStart .= ':00';

    $first = date('Y-m-01', strtotime($today));
    $last = substr($today, 0, 10);
    $joinDate = !empty($employee['joinDate']) ? substr($employee['joinDate'], 0, 10) : null;
    if ($joinDate !== null && $joinDate > $first) $first = $joinDate;

    $rows = $attendanceByEmployee[$employee['userId'] ?? $employee['id']] ?? [];
    $eligible = 0;
    $onTime = 0;
    foreach ($rows as $date => $record) {
        if ($date < $first || $date > $last) continue;
        $checkIn = $record['checkIn'] ?? null;
        if (!is_string($checkIn) || trim($checkIn) === '' ||
            normalizeStatus((string)($record['status'] ?? ''), $checkIn) !== 'present') {
            continue;
        }
        $timestamp = strtotime($checkIn);
        if ($timestamp === false) continue;
        ++$eligible;
        if (date('H:i:s', $timestamp) <= $shiftStart) ++$onTime;
    }
    return [
        'onTimePct' => $eligible > 0 ? round($onTime * 100 / $eligible, 1) : null,
        'onTimeDays' => $onTime,
        'onTimeEligibleDays' => $eligible,
        'onTimeStatus' => $eligible > 0 ? 'ready' : 'no_check_ins',
    ];
}

function buildCurrentMonthSummary(array $employee, string $today, array $holidays, array $attendanceByEmployee): array {
    $monthStart = date('Y-m-01', strtotime($today));
    $dateEnd = substr($today, 0, 10);
    return buildPerformanceIntervalSummary($employee, $monthStart, $dateEnd, $holidays, $attendanceByEmployee);
}

function buildMetrics(array $employee, array $months, array $holidays, array $attendanceByEmployee, ?string $referenceDate = null): array {
    $monthly = [];
    $totalPresent = 0; $totalLeave = 0; $totalWorkdays = 0; $totalHours = 0.0;
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
            'hours' => $summary['totalHours'],
            'attendancePct' => $summary['attendancePct'],
            'leavePct' => $summary['leavePct'],
            'label' => $month['label'],
        ];

        $totalPresent += $summary['totalPresent'];
        $totalLeave += $summary['totalLeave'];
        $totalWorkdays += $summary['totalWorkdays'];
        $totalHours += $summary['totalHours'];
    }

    $todayStr = $referenceDate ?? date('Y-m-d');
    $weekly = buildWeeklyMetrics($employee, $attendanceByEmployee, $todayStr);

    return [
        'employee' => $employee,
        'monthly' => $monthly,
        'weekly' => $weekly,
        'totalPresent' => $totalPresent,
        'totalLeave' => $totalLeave,
        'totalWorkdays' => $totalWorkdays,
        'totalHours' => round($totalHours, 1),
        'attendancePct' => $totalWorkdays > 0 ? round($totalPresent / $totalWorkdays * 100, 1) : 0,
        'leavePct' => $totalWorkdays > 0 ? round($totalLeave / $totalWorkdays * 100, 1) : 0,
    ];
}

function calculatePerformanceAverage(array $items, string $field): float {
    if (empty($items)) return 0;
    $sum = array_sum(array_column($items, $field));
    return round($sum / count($items), 1);
}
