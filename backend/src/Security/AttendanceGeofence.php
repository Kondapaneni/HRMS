<?php
declare(strict_types=1);

namespace App\Security;

use InvalidArgumentException;
use PDO;

/**
 * SEC-014: Server-owned attendance geofence check.
 *
 * The existing application allows roaming interval ('punch') updates outside
 * geofences for the Android tracker, but enforces geofences on check-in/out.
 * Office locations currently come from the shared admin-managed geofences
 * table; there is no branch-to-geofence assignment field in this schema.
 * This validates claimed coordinates, NOT the authenticity of a GPS device.
 */
final class AttendanceGeofence
{
    /**
     * @return array{0:?float, 1:?float} Nullable only when both omitted.
     */
    public static function coordinates($latitude, $longitude): array
    {
        $missingLat = $latitude === null || $latitude === '';
        $missingLng = $longitude === null || $longitude === '';
        if ($missingLat && $missingLng) {
            return [null, null];
        }
        if ($missingLat || $missingLng
            || !is_scalar($latitude) || !is_scalar($longitude)
            || is_bool($latitude) || is_bool($longitude)
            || !is_numeric($latitude) || !is_numeric($longitude)
        ) {
            throw new InvalidArgumentException('A valid latitude and longitude pair is required.');
        }

        $lat = (float)$latitude;
        $lng = (float)$longitude;
        if (!is_finite($lat) || !is_finite($lng)
            || $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180
        ) {
            throw new InvalidArgumentException('Coordinates must be finite and within valid geographic bounds.');
        }
        return [$lat, $lng];
    }

    public static function permits(PDO $conn, string $userId, string $action, ?float $lat, ?float $lng): bool
    {
        if (!in_array($action, ['check-in', 'check-out', 'punch'], true)) {
            return false;
        }

        // Tracking updates after check-in intentionally follow existing
        // remote-punch policy. They cannot create or finish daily attendance.
        if ($action === 'punch') {
            return true;
        }

        $employee = $conn->prepare('SELECT "geoFenceEnabled" FROM employee WHERE "userId" = ?');
        $employee->execute([$userId]);
        $row = $employee->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            // Missing policy/employee must never silently allow check-in/out.
            return false;
        }

        $enabled = in_array($row['geoFenceEnabled'] ?? null, [true, 1, '1', 't', 'true'], true);
        if (!$enabled) {
            return true; // Explicitly remote-eligible employee.
        }
        if ($lat === null || $lng === null) {
            return false;
        }

        $fences = $conn->query('SELECT latitude, longitude, radius FROM geofences')->fetchAll(PDO::FETCH_ASSOC);
        // No configured valid office is NOT permission to check in from anywhere.
        foreach ($fences as $fence) {
            if (!is_numeric($fence['latitude'] ?? null)
                || !is_numeric($fence['longitude'] ?? null)
                || !is_numeric($fence['radius'] ?? null)) {
                continue;
            }
            $centerLat = (float)$fence['latitude'];
            $centerLng = (float)$fence['longitude'];
            $radius = (float)$fence['radius'];
            if (!is_finite($centerLat) || !is_finite($centerLng) || !is_finite($radius)
                || $centerLat < -90 || $centerLat > 90
                || $centerLng < -180 || $centerLng > 180
                || $radius <= 0) {
                continue;
            }
            if (self::distanceMeters($lat, $lng, $centerLat, $centerLng) <= $radius) {
                return true;
            }
        }
        return false;
    }

    public static function distanceMeters(float $lat, float $lng, float $centerLat, float $centerLng): float
    {
        $latDelta = deg2rad($centerLat - $lat);
        $lngDelta = deg2rad($centerLng - $lng);
        $a = sin($latDelta / 2) ** 2
            + cos(deg2rad($lat)) * cos(deg2rad($centerLat))
            * sin($lngDelta / 2) ** 2;
        $a = max(0.0, min(1.0, $a));
        return 6371000.0 * 2.0 * atan2(sqrt($a), sqrt(1.0 - $a));
    }
}
