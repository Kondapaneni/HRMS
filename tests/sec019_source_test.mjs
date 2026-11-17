import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync('backend/public/admin_employees_routes.php', 'utf8');
const helper = readFileSync('backend/src/Utils/EmployeeId.php', 'utf8');

assert.equal(/uniqid\s*\(/.test(src), false, 'Never generate employee IDs from timestamps');
assert.equal(
  (src.match(/EmployeeId::insertUnique\(/g) || []).length, 2,
  'Both Admin onboarding and candidate conversion must use server-generated IDs and collision retries'
);
assert.equal(
  (src.match(/ON CONFLICT ON CONSTRAINT "employee_employeeId_key" DO NOTHING/g) || []).length,
  2,
  'Only a duplicate employee display ID can trigger safe retry'
);
assert.equal(
  (src.match(/RETURNING id/g) || []).length >= 2, true,
  'Both employee inserts must report whether a row was actually created'
);
assert.equal(/\$employeeId\s*=\s*\$data\['employeeId'\]/.test(src), false,
  'Never trust a caller-provided employee display ID');
assert.match(helper, /random_int\(10_000_000, 99_999_999\)/,
  'Eight-digit codes must use a cryptographically secure uniform RNG');
assert.match(helper, /MAX_ATTEMPTS/,
  'Bounded collision retry must prevent infinite loops');
assert.doesNotMatch(helper, /EMP-/, 'New employee codes cannot carry an EMP- prefix');
console.log('Eight-digit employee ID source checks PASS');
