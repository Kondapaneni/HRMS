<?php

if (!function_exists('getActiveHolidaysMap')) {
    function getActiveHolidaysMap($conn) {
        $stmt = $conn->query('SELECT "holidayDate" FROM company_holidays WHERE "isActive" = 1');
        $holidays = $stmt->fetchAll(PDO::FETCH_COLUMN);
        return array_flip($holidays);
    }
}

if (!function_exists('getEmployeeWeekOffDays')) {
    function getEmployeeWeekOffDays($conn, $userId) {
        $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
        $stmt->execute([$userId]);
        $weekOff = $stmt->fetchColumn() ?: 'sunday';
        return array_map('trim', explode(',', strtolower($weekOff)));
    }
}
