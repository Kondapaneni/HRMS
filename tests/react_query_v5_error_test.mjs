import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const hook = read('frontend/src/hooks/useQueryErrorToast.js');
assert.match(hook, /useEffect\(\(\) => \{/);
assert.match(hook, /if \(error\)/, 'Only a genuine query error may trigger a load-failure toast');
assert.match(hook, /toast\.error\(message, \{ id: toastId \}\)/,
  'A stable toast ID avoids duplicate error notifications after React StrictMode replays');

for (const [file, id] of [
  ['EmployeeExpenses.jsx', 'employee-expenses-load'],
  ['EmployeeLeaves.jsx', 'employee-leaves-load'],
  ['EmployeeProfile.jsx', 'employee-profile-load'],
  ['EmployeePayroll.jsx', 'employee-payroll-load'],
  ['EmployeeHolidays.jsx', 'employee-holidays-load'],
]) {
  const page = read('frontend/src/pages/' + file);
  assert.match(page, /error: loadError \} = useQuery\(\{/,
    file + ': the query must expose its real error state');
  assert.match(page, /useQueryErrorToast\(loadError, '[^']+', '[^']+'\)/,
    file + ': error notifications must use React Query v5-compatible hook');
  assert(page.includes("'" + id + "'"), file + ': stable toast ID must match the resource');
  const start = page.indexOf('error: loadError } = useQuery({');
  const end = page.indexOf('\n  });', start);
  assert(start !== -1 && end !== -1, file + ': query block must be present');
  assert.doesNotMatch(page.slice(start, end), /\bonError\s*:/,
    file + ': useQuery must not include removed v5 onError callback');
}
for (const [file, ids] of [
  ['AdminAttendance.jsx', ['admin-attendance-load']],
  ['AdminHolidays.jsx', ['admin-holidays-load']],
  ['AdminRecruitment.jsx', ['admin-jobs-load', 'admin-applications-load']],
  ['AdminAuditLogs.jsx', ['admin-audit-logs-load']],
]) {
  const src = read('frontend/src/pages/' + file);
  for (const id of ids) {
    assert(src.includes("'" + id + "'"), file + ' must use a stable v5-compatible error toast ID');
  }
  assert.match(src, /useQueryErrorToast\(/, file + ' must read query error state after useQuery');
  assert.doesNotMatch(src, /onError: \(\) => toast\.error\('Failed to load/,
    file + ' must not rely on v5-removed useQuery onError');
}
assert.doesNotMatch(read('frontend/src/pages/AdminAttendanceRegularize.jsx'),
  /onError: \(\) => console\.error\('Failed to fetch attendance'\)/,
  'Attendance regularization should not register an ignored useQuery callback');
console.log('React Query v5 query error notification regression PASS');
