<?php

if (!function_exists('getActiveHolidaysMap')) {
    function getActiveHolidaysMap($conn) {
        static $map = null;
        if ($map !== null) return $map;
        
        $stmt = $conn->query('SELECT "holidayDate" FROM company_holidays WHERE "isActive" = 1');
        $holidays = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $map = array_flip($holidays);
        return $map;
    }
}

if (!function_exists('getEmployeeWeekOffDays')) {
    function getEmployeeWeekOffDays($conn, $userId) {
        static $cache = [];
        if (isset($cache[$userId])) {
            return $cache[$userId];
        }
        $stmt = $conn->prepare('SELECT "weekOff" FROM employee WHERE "userId" = ?');
        $stmt->execute([$userId]);
        $weekOff = $stmt->fetchColumn() ?: 'sunday';
        $cache[$userId] = array_map('trim', explode(',', strtolower($weekOff)));
        return $cache[$userId];
    }
}
