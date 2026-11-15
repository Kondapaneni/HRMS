<?php
declare(strict_types=1);

// SEC-016 static guard: no live credentials, accounts or database access.
$root = dirname(__DIR__);
function requireSec016(bool $condition, string $message): void {
    if (!$condition) {
        throw new RuntimeException('SEC-016: ' . $message);
    }
}
function readSec016(string $path): string {
    $data = file_get_contents(dirname(__DIR__) . '/' . $path);
    if ($data === false) {
        throw new RuntimeException('Cannot read ' . $path);
    }
    return $data;
}
$employee = readSec016('backend/public/employee_attendance_routes.php');
$admin = readSec016('backend/public/admin_attendance_routes.php');
$employeeUi = readSec016('frontend/src/pages/EmployeeMobileMap.jsx');
$adminUi = readSec016('frontend/src/pages/AdminAttendanceLocation.jsx');
$entrypoint = readSec016('docker-entrypoint.sh');
$render = readSec016('render.yaml');

$start = strpos($employee, "// Get Geofences\n");
$end = strpos($employee, "// Get Employee Holidays\n", $start === false ? 0 : $start);
requireSec016($start !== false && $end !== false, 'Employee geofences route must exist');
$route = substr($employee, $start, $end - $start);
requireSec016(str_contains($employee, "\$_ENV['GOOGLE_GEOCODING_API_KEY']"), 'Server-side geocoding must remain on backend');
requireSec016(!str_contains($route, 'GOOGLE_GEOCODING_API_KEY'), 'Geofences must not read or expose server geocoding secret');
requireSec016(!str_contains($route, 'GOOGLE_MAPS_API_KEY'), 'Geofences must not read old server Maps key');
requireSec016(!str_contains($route, "'googleMapsApiKey'"), 'Legacy key JSON name must be absent');
requireSec016(str_contains($route, "'googleMapsBrowserKey' => \$browserMapsKey"), 'Employee JSON must use browser-only key');
requireSec016(str_contains($route, "\$_ENV['GOOGLE_MAPS_JS_BROWSER_KEY']"), 'Employee must use explicit public browser key');

$start = strpos($admin, "// GET /api/admin/attendance/location/{id}");
requireSec016($start !== false, 'Admin location API must exist');
$adminRoute = substr($admin, $start);
requireSec016(!str_contains($adminRoute, 'GOOGLE_MAPS_API_KEY'), 'Admin must not return former server key');
requireSec016(!str_contains($adminRoute, "'googleMapsApiKey'"), 'Admin legacy key name must be removed');
requireSec016(str_contains($adminRoute, "'googleMapsBrowserKey' => \$_ENV['GOOGLE_MAPS_JS_BROWSER_KEY']"), 'Admin must use browser-only key');
foreach ([$employeeUi, $adminUi] as $ui) {
    requireSec016(!str_contains($ui, 'googleMapsApiKey'), 'UI must not depend on old key response field');
    requireSec016(str_contains($ui, 'googleMapsBrowserKey'), 'UI must use dedicated browser key');
}
requireSec016(str_contains($entrypoint, 'GOOGLE_MAPS_JS_BROWSER_KEY'), 'Render entrypoint must forward browser key');
requireSec016(!str_contains($entrypoint, 'JWT_SECRET GOOGLE_MAPS_API_KEY '), 'Deprecated server Maps key must not be forwarded');
requireSec016(str_contains($render, 'key: GOOGLE_MAPS_JS_BROWSER_KEY'), 'Render manifest must list browser key');
requireSec016(!str_contains($render, 'key: GOOGLE_MAPS_API_KEY'), 'Deprecated Maps key must not appear in manifest');
echo "PASS SEC-016 static source secret-boundary and client-field checks\n";
