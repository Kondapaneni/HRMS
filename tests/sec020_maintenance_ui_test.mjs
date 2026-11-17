import assert from 'node:assert/strict';
import {
  isMaintenanceEnabled,
  isPublicMaintenanceRoute,
  shouldShowMaintenanceNotice,
} from '../frontend/src/components/maintenancePolicy.js';

// A mounted, authenticated employee must see the same maintenance UX in
// every workspace, including pages that do not share EmployeeLayout.
const restrictedPaths = [
  '/employee',
  '/employee/profile',
  '/employee/attendance',
  '/employee/loans/origination',
  '/employee/loans/origination/applications',
  '/employee/sales/origination',
  '/employee/sales/origination/activities',
  '/employee/branch-operations',
  '/employee/branch-operations/loans-applications',
  '/admin/attendance',
  '/admin/feature-access',
  '/employee/assessments/session',
  '/employee/attendance/map',
  '/candidate/dashboard',
  '/candidate/documents',
];
for (const pathname of restrictedPaths) {
  assert.equal(shouldShowMaintenanceNotice({
    maintenanceStatus: 'on', pathname, role: 'employee', hasToken: true,
  }), true, 'maintenance must cover ' + pathname);
  assert.equal(shouldShowMaintenanceNotice({
    maintenanceStatus: 'on', pathname, role: undefined, hasToken: true,
  }), true, 'maintenance must protect a refresh with /api/me 503 on ' + pathname);
  assert.equal(shouldShowMaintenanceNotice({
    maintenanceStatus: 'off', pathname, role: 'employee', hasToken: true,
  }), false, 'normal operation must resume when maintenance is OFF ' + pathname);
  assert.equal(shouldShowMaintenanceNotice({
    maintenanceStatus: 'on', pathname, role: 'admin', hasToken: true,
  }), false, 'verified Admin must still manage maintenance ' + pathname);
}
assert.equal(shouldShowMaintenanceNotice({
  maintenanceStatus: 'unavailable',
  pathname: '/employee/branch-operations',
  role: 'employee', hasToken: true,
}), true, 'unknown service status does not reveal protected employee workspace');
for (const pathname of ['/', '/login', '/candidate/login', '/candidate/activate',
  '/forgot-password', '/reset-password']) {
  assert(isPublicMaintenanceRoute(pathname), 'admin recovery/login route stays available');
  assert.equal(shouldShowMaintenanceNotice({
    maintenanceStatus: 'on', pathname, role: undefined, hasToken: true,
  }), false, 'maintenance cannot obstruct admin recovery login ' + pathname);
}
assert.equal(shouldShowMaintenanceNotice({
  maintenanceStatus: 'on', pathname: '/employee/loans/origination',
  role: undefined, hasToken: false,
}), false, 'anonymous visitors should reach normal sign-in, not an employee session');
for (const value of [true, 'true', 1, '1', 't']) assert(isMaintenanceEnabled(value));
for (const value of [false, 'false', 'f', 0, '0', null, undefined]) {
  assert(!isMaintenanceEnabled(value));
}
console.log('SEC-020 maintenance overlay coverage on all employee/business/role routes PASSED');
