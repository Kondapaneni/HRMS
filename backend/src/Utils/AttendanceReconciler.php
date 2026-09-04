<?php

namespace App\Utils;

use PDO;

class AttendanceReconciler
{
    /**
     * Reconciles past attendance records that have checkIn but missing checkOut.
     * Calculates hours = max(0, shiftEndTime - checkInTime) and updates status to
     * 'present (checkout missing)' or 'present (late+checkout missing)'.
     *
     * @param PDO $conn
     * @return array Summary of reconciliation results
     */
    public static function reconcileMissingCheckouts(PDO $conn): array
    {
        // Find past attendance records where:
        // - checkIn is not null
        // - checkOut is null
        // - date < CURRENT_DATE (strictly past dates)
        // - hours is 0, null, OR status is not yet marked with 'checkout missing'
        $stmt = $conn->prepare('
            SELECT a.id, a."employeeId", a.date, a.status, a."checkIn", a."checkOut", a.hours,
                   e."shiftTime", s."startTime" as "shiftStartTime", s."endTime" as "shiftEndTime"
            FROM attendance a
            LEFT JOIN employee e ON a."employeeId" = e."userId"
            LEFT JOIN shift_times s ON e."shiftTime" = s."shiftLabel"
            WHERE a."checkIn" IS NOT NULL 
              AND a."checkOut" IS NULL 
              AND a.date < CURRENT_DATE
              AND (a.hours IS NULL OR a.hours = 0 OR a.status NOT ILIKE \'%checkout missing%\')
        ');
        $stmt->execute();
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $updatedCount = 0;
        $updatedDetails = [];

        if (empty($records)) {
            return [
                'success' => true,
                'updatedCount' => 0,
                'records' => []
            ];
        }

        $updateStmt = $conn->prepare('
            UPDATE attendance 
            SET status = :status, 
                hours = :hours, 
                "updatedAt" = CURRENT_TIMESTAMP 
            WHERE id = :id
        ');

        foreach ($records as $r) {
            // Default company shift if not set: 09:45:00 to 18:30:00
            $shiftStartTime = !empty($r['shiftStartTime']) ? $r['shiftStartTime'] : '09:45:00';
            $shiftEndTime = !empty($r['shiftEndTime']) ? $r['shiftEndTime'] : '18:30:00';

            $checkInTs = strtotime($r['checkIn']);
            $shiftEndTs = strtotime($r['date'] . ' ' . $shiftEndTime);

            // Handle overnight shifts where endTime < startTime (e.g. 21:00 to 05:00)
            if (strtotime($shiftEndTime) < strtotime($shiftStartTime)) {
                $shiftEndTs += 86400;
            }

            // Calculate hours between checkIn and shiftEndTime
            if ($checkInTs < $shiftEndTs) {
                $calculatedHours = round(($shiftEndTs - $checkInTs) / 3600, 2);
                $calculatedHours = max(0.00, $calculatedHours);
            } else {
                // Check-in was at or after shift end time
                $calculatedHours = 0.00;
            }

            // Map status
            $curStatus = strtolower($r['status'] ?? '');
            if (strpos($curStatus, 'late') !== false) {
                $newStatus = 'present (late+checkout missing)';
            } else {
                $newStatus = 'present (checkout missing)';
            }

            $updateStmt->execute([
                ':status' => $newStatus,
                ':hours' => $calculatedHours,
                ':id' => $r['id']
            ]);

            $updatedCount++;
            $updatedDetails[] = [
                'id' => $r['id'],
                'date' => $r['date'],
                'checkIn' => $r['checkIn'],
                'shiftEndTime' => $shiftEndTime,
                'status' => $newStatus,
                'hours' => $calculatedHours
            ];
        }

        return [
            'success' => true,
            'updatedCount' => $updatedCount,
            'records' => $updatedDetails
        ];
    }
}
