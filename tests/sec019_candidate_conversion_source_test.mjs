import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ui = readFileSync('frontend/src/pages/AdminRecruitment.jsx', 'utf8');
const backend = readFileSync('backend/public/admin_employees_routes.php', 'utf8');
const block = ui.split('const convertEmployeeMutation = useRemoteTask({')[1]
  ?.split('const handleConvertToEmployee')[0];
assert(block, 'Candidate conversion workflow must exist');
assert.match(block, /api\.post\('\/admin\/employees\/convert'/,
  'UI must use the implemented authenticated conversion route');
assert.doesNotMatch(block, /admin\/convert-candidate/,
  'Legacy non-existent endpoint must never be called');
for (const prop of ['applicationId', 'userId', 'branch', 'joinDate', 'salary']) {
  assert.match(block, new RegExp('\\b'+prop+':'),
    'Required conversion field missing: '+prop);
}
assert.doesNotMatch(block, /updateStatusMutation\.mutate/,
  'Application state and timeline must be committed by the backend transaction');
assert.match(backend, /SELECT id, email, role, "isActive" FROM users WHERE id = \? FOR UPDATE/,
  'Must lock candidate role and check eligibility');
assert.match(backend, /SELECT status FROM applications WHERE id = \? AND candidate_id = \? FOR UPDATE/,
  'Must match application to candidate under lock');
assert.match(backend, /\['Selected', 'Hired'\]/,
  'Only eligible application statuses may convert');
assert.match(backend, /token_version = token_version \+ 1/,
  'Role promotion must revoke candidate access tokens');
assert.match(backend, /INSERT INTO application_timeline/,
  'Conversion must create a DB timeline event');
assert.match(backend, /EmployeeId::insertUnique/,
  'Conversion IDs must be server-generated and collision-safe');
console.log('PASS SEC-019 candidate conversion UI-to-API contract and backend guards');
