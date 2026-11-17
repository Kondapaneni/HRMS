import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync('backend/public/admin_employees_routes.php', 'utf8');
const helper = readFileSync('backend/src/Utils/EmployeeId.php', 'utf8');
assert.equal(/uniqid\s*\(/.test(src), false, 'Never use time-based employee IDs');
assert.equal((src.match(/EmployeeId::generate\(\)/g) || []).length, 2,
 'Both fresh employee creation and candidate conversion must generate IDs server-side');
assert.equal(/\$employeeId\s*=\s*\$data\['employeeId'\]/.test(src), false,
 'Candidate conversion must never accept a caller-selected employee code');
assert.match(helper, /random_bytes\(16\)/);
assert.match(helper, /EMP-/);
console.log('SEC-019 source checks PASS');
