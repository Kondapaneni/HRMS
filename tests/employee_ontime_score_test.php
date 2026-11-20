<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/public/performance_helpers.php';

function checkScore(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException($label);
}

$employee = [
    'id' => 'employee-db-id',
    'userId' => 'employee-session-id',
    'joinDate' => '2026-10-01',
    'shiftStartTime' => '09:00:00',
];
$records = [
    'employee-session-id' => [
        '2026-11-02' => ['status' => 'present', 'checkIn' => '2026-11-02 08:59:59'],
        '2026-11-03' => ['status' => 'present (late)', 'checkIn' => '2026-11-03 09:00:01'],
        '2026-11-04' => ['status' => 'present (checkout missing)', 'checkIn' => '2026-11-04 09:00:00'],
        '2026-11-05' => ['status' => 'paid leave', 'checkIn' => null],
        '2026-11-06' => ['status' => 'present', 'checkIn' => null],
        '2026-10-31' => ['status' => 'present', 'checkIn' => '2026-10-31 09:44:00'],
        '2026-11-29' => ['status' => 'present', 'checkIn' => '2026-11-29 09:45:00'],
    ],
];
$score = buildCurrentMonthOnTimeSummary($employee, '2026-11-20', $records);
checkScore($score['onTimePct'] === 66.7, 'Expected 2 of 3 eligible check-ins on time');
checkScore($score['onTimeDays'] === 2, 'Expected 2 on-time check-ins');
checkScore($score['onTimeEligibleDays'] === 3, 'Leave, missing check-in and out-of-month dates excluded');
checkScore($score['onTimeStatus'] === 'ready', 'Ready state for a scored month');

$late = buildCurrentMonthOnTimeSummary($employee, '2026-11-20', [
    'employee-session-id' => [
        '2026-11-11' => ['status' => 'present (late+checkout missing)', 'checkIn' => '2026-11-11 09:12:00'],
    ],
]);
checkScore($late['onTimePct'] === 0.0, 'Real late check-in must score 0%, not unavailable');

$noShift = buildCurrentMonthOnTimeSummary(
    ['userId' => 'employee-session-id', 'shiftStartTime' => null],
    '2026-11-20',
    $records
);
checkScore($noShift['onTimePct'] === null && $noShift['onTimeStatus'] === 'shift_not_configured',
    'Unknown shift must never report fictional 0% or 100%');

$noPunch = buildCurrentMonthOnTimeSummary($employee, '2026-11-20', []);
checkScore($noPunch['onTimePct'] === null && $noPunch['onTimeStatus'] === 'no_check_ins',
    'No eligible punch is not an attendance or punctuality percentage');

$joinedLate = buildCurrentMonthOnTimeSummary(
    array_merge($employee, ['joinDate' => '2026-11-04']),
    '2026-11-20',
    $records
);
checkScore($joinedLate['onTimePct'] === 100.0 && $joinedLate['onTimeEligibleDays'] === 1,
    'Exclude attendance before employee joined');

echo "PASS employee on-time score: shift, exact boundary, late, no shift, no check-ins, join date\n";
