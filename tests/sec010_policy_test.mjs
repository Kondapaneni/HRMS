import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const middleware = readFileSync('backend/src/Middleware/AuthMiddleware.php', 'utf8');
const admin = readFileSync('backend/public/admin_feature_access_routes.php', 'utf8');
const mapBody = middleware.match(/private const FEATURE_COLUMNS = \[([\s\S]*?)\];/)?.[1];
assert(mapBody, 'AuthMiddleware has a static allowlist of feature-column names');
const map = Object.fromEntries(Array.from(
  mapBody.matchAll(/'([^']+)'\s*=>\s*'([^']+)'/g),
  (m) => [m[1], m[2]]
));
const features = [
  'Attendance', 'Leave', 'Payroll', 'Expenses', 'Employees', 'Recruitment',
  'Assets', 'LoanOrigination', 'SalesOrigination', 'BranchOperations',
  'AdminAssessments'
];
assert.equal(Object.keys(map).length, 22, '11 short names and 11 explicit column names');
for (const name of features) {
  const column = 'can' + name;
  const shortName = name[0].toLowerCase() + name.slice(1);
  assert.equal(map[shortName], column, 'short key for ' + column);
  assert.equal(map[column], column, 'explicit key for ' + column);
  assert(admin.includes("'" + column + "'"), 'column exists in admin-granted feature list: ' + column);
}
assert(!middleware.includes("str_starts_with($feature"), 'feature SQL names may not be dynamically derived');
assert(middleware.includes('private function resolveFeatureColumns(): ?array'),
  'unknown permission keys are rejected before SQL');
assert(middleware.includes('return $this->unavailableResponse();'),
  'database failure must return fail-closed response');
assert(middleware.includes('SELECT "isActive" FROM users'),
  'active user status is checked from database');
assert(!middleware.includes('if ($conn) {'),
  'a missing database connection must not permit passthrough');
assert(!readFileSync('backend/src/Config/Database.php', 'utf8')
  .includes('echo "Connection error:'),
  'database connection failure cannot echo SQL details to HTTP response');
console.log('SEC-010 schema-matched SQL column allowlist and fail-closed source policy PASSED');
