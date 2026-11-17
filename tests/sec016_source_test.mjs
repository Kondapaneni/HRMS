import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const employee = read('backend/public/employee_attendance_routes.php');
const admin = read('backend/public/admin_attendance_routes.php');
const backend = read('backend/public/index.php');
const mobile = read('frontend/src/pages/EmployeeMobileMap.jsx');
const location = read('frontend/src/pages/AdminAttendanceLocation.jsx');
const hook = read('frontend/src/hooks/useMapsBrowserKey.js');
const entrypoint = read('docker-entrypoint.sh');

const responsePart = employee.slice(employee.indexOf('// Get Geofences'), employee.indexOf('// Get Employee Holidays'));
const locationPart = admin.slice(admin.indexOf('// GET /api/admin/attendance/location/{id}'));
assert(!responsePart.includes('GOOGLE_GEOCODING_API_KEY') && !responsePart.includes('googleMapsApiKey'));
assert(!locationPart.includes('GOOGLE_MAPS_API_KEY') && !locationPart.includes('googleMapsApiKey'));
assert(backend.includes("'/api/maps/browser-config'"));
assert(backend.includes("new AuthMiddleware(['admin', 'employee', 'hr', 'manager'])"));
assert(hook.includes("api.get('/maps/browser-config')"));
assert(!mobile.includes('data.googleMapsApiKey') && !location.includes('data.googleMapsApiKey'));
assert(mobile.includes('browserKey') && location.includes('browserKey'));
assert(entrypoint.includes('GOOGLE_MAPS_BROWSER_API_KEY'));
console.log('PASS SEC-016 source: attendance payloads omit keys; separate browser config used by both maps');
