import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const route = read('backend/public/employee_performance_routes.php');
const helpers = read('backend/public/performance_helpers.php');
const dashboard = read('frontend/src/pages/EmployeeDashboard.jsx');
const boot = read('frontend/src/performance/dashboardBoot.js');

assert.match(route, /e\."shiftTime", s\."startTime" AS "shiftStartTime"/,
  'Employee performance must load the configured shift start');
assert.match(route, /LEFT JOIN shift_times s ON e\."shiftTime" = s\."shiftLabel"/,
  'Configured shift must use existing shift_times mapping');
assert.match(route, /WHERE e\."userId" = \?/,
  'Performance remains scoped to the authenticated employee');
assert.match(route, /buildCurrentMonthOnTimeSummary\(\$employee, \$today, \$attendanceByEmployee\)/,
  'The employee summary must include the punctuality calculation');
assert.match(route, /array_merge\(/,
  'Existing monthly attendance and leave metrics must be retained');
assert.match(helpers, /function buildCurrentMonthOnTimeSummary\(/);
assert.match(helpers, /onTimePct/);
assert.match(helpers, /onTimeEligibleDays/);
assert.match(helpers, /onTimeStatus/);
assert.match(helpers, /date\('H:i:s', \$timestamp\) <= \$shiftStart/,
  'Punctuality compares actual check-in time to scheduled shift');
assert.doesNotMatch(helpers.slice(helpers.indexOf('function buildCurrentMonthOnTimeSummary'),helpers.indexOf('function buildCurrentMonthSummary')), /attendancePct/,
  'Punctuality must not be an attendance-rate alias');
assert.match(dashboard, /Number\.isFinite\(performance\?\.onTimePct\)/,
  'Dashboard must show only numeric authorized punctuality');
assert.match(dashboard, /No recorded check-ins this month/);
assert.match(dashboard, /Shift start not configured/);
assert.match(boot, /performance: perfRes\.data\?\.currentMonthSummary \|\| null/,
  'No extra personally identifiable attendance query or browser storage');
console.log('On-time API/frontend contract PASS');
