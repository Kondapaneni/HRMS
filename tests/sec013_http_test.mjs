import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// All writes are on an ephemeral, dedicated PostgreSQL CI database.
assert.equal(process.env.DB_DATABASE, 'sec013_test');
const secret = process.env.JWT_SECRET;
assert(secret?.startsWith('SEC013_TEST_ONLY'));
const origin = 'http://127.0.0.1:8774';

const ids = {
  alice: '00000000-0000-4000-8000-000000000011',
  bob: '00000000-0000-4000-8000-000000000012',
  asset: '00000000-0000-4000-8000-000000000013',
  roster: '00000000-0000-4000-8000-000000000014',
  payroll: '00000000-0000-4000-8000-000000000015',
  admin: '00000000-0000-4000-8000-000000000016',
};
const assessment = {
  active: '00000000-0000-4000-8000-0000000000b1',
  expired: '00000000-0000-4000-8000-0000000000b2',
  inactive: '00000000-0000-4000-8000-0000000000b3',
  expiredAttempt: '00000000-0000-4000-8000-0000000000c2',
  revokedAttempt: '00000000-0000-4000-8000-0000000000c3',
  revokedGraded: '00000000-0000-4000-8000-0000000000c4',
  question: '00000000-0000-4000-8000-0000000000a1',
};
const employee = '00000000-0000-4000-8000-000000000018';

function jwt(actor) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const role = actor === 'payroll' ? 'hr' : actor === 'admin' ? 'admin' : 'employee';
  const data = { iss: 'acme_hrms', iat: now, exp: now + 1200,
    id: ids[actor], role, email: actor + '@example.invalid' };
  const prefix = encode({ typ: 'JWT', alg: 'HS256' }) + '.' + encode(data);
  return prefix + '.' + crypto.createHmac('sha256', secret).update(prefix).digest('base64url');
}

async function call(actor, method, path, body) {
  const response = await fetch(origin + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + jwt(actor),
      'Accept-Encoding': 'identity',
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body ?? {}) }),
    redirect: 'manual',
  });
  const raw = await response.text();
  let json;
  try { json = JSON.parse(raw); } catch {}
  return { status: response.status, json, raw: raw.slice(0, 250) };
}
async function expectStatus(expected, actor, method, path, body) {
  const r = await call(actor, method, path, body);
  assert.equal(r.status, expected, `${actor} ${method} ${path} expected ${expected}, got ${r.status}: ${r.raw}`);
  console.log('PASS', actor, method, path, expected);
  return r.json;
}

// The assets-only delegate can read a staff directory but NEVER salaries.
const assetList = await expectStatus(200, 'asset', 'GET', '/api/admin/employees');
assert(assetList.employees.length === 1);
assert.equal(assetList.employees[0].salary, null);
const rosterList = await expectStatus(200, 'roster', 'GET', '/api/admin/employees');
assert.equal(rosterList.employees[0].salary, null);

// A genuine payroll feature grant or the global admin role retains access.
const payrollList = await expectStatus(200, 'payroll', 'GET', '/api/admin/employees');
assert.equal(Number(payrollList.employees[0].salary), 125000);
const adminList = await expectStatus(200, 'admin', 'GET', '/api/admin/employees');
assert.equal(Number(adminList.employees[0].salary), 125000);

// Detail must not leak recent payslip breakdown or salary history via timeline.
const detail = await expectStatus(200, 'roster', 'GET', '/api/admin/employees/' + employee);
assert.equal(detail.employee.salary, null);
assert.deepEqual(detail.recentPayslips, []);
const redactedTimeline = JSON.stringify(detail.employee.timeline);
assert(!redactedTimeline.includes('125000'), 'compensation amounts in timeline must be redacted');
assert(!redactedTimeline.includes('Salary Updated'), 'salary timeline milestone must be redacted');
assert(!redactedTimeline.includes('old_salary'), 'arbitrary historical salary fields must be redacted');
assert(redactedTimeline.includes('Joined Company'), 'nonpayroll timeline events retained');

const payrollDetail = await expectStatus(200, 'payroll', 'GET', '/api/admin/employees/' + employee);
assert.equal(Number(payrollDetail.employee.salary), 125000);
assert.equal(payrollDetail.recentPayslips.length, 1);
assert(JSON.stringify(payrollDetail.employee.timeline).includes('Salary Updated'));

// No compensation writes via employee-directory grant, promotion or conversion.
await expectStatus(403, 'roster', 'PUT', '/api/admin/employees/' + employee, { salary: 1 });
await expectStatus(403, 'roster', 'POST', '/api/admin/employees/' + employee + '/promote',
  { newPosition: 'Manager', newSalary: 1 });
await expectStatus(403, 'roster', 'POST', '/api/admin/employees/convert',
  { userId: ids.bob, employeeId: 'EMP-B', firstName: 'Bob', salary: 1 });
// A harmless non-salary edit still works.
await expectStatus(200, 'roster', 'PUT', '/api/admin/employees/' + employee, { department: 'Operations' });
const after = await expectStatus(200, 'payroll', 'GET', '/api/admin/employees/' + employee);
assert.equal(Number(after.employee.salary), 125000);

// An employee cannot discover details or start an unassigned assessment.
const aliceList = await expectStatus(200, 'alice', 'GET', '/api/employee/assessments');
assert(aliceList.some(x => x.id === assessment.active));
assert(!aliceList.some(x => x.id === assessment.inactive));
const bobList = await expectStatus(200, 'bob', 'GET', '/api/employee/assessments');
assert(!bobList.some(x => x.id === assessment.active));
await expectStatus(404, 'bob', 'GET', '/api/employee/assessments/' + assessment.active);
await expectStatus(403, 'bob', 'POST', '/api/employee/assessments/' + assessment.active + '/start');
await expectStatus(200, 'alice', 'GET', '/api/employee/assessments/' + assessment.active);

// Expired resumptions, saves and submissions fail even when the client lies.
await expectStatus(403, 'alice', 'POST', '/api/employee/assessments/' + assessment.expired + '/start');
await expectStatus(403, 'alice', 'PUT',
  '/api/employee/assessments/attempts/' + assessment.expiredAttempt + '/save',
  { answers: { [assessment.question]: [0] } });
await expectStatus(403, 'alice', 'POST',
  '/api/employee/assessments/attempts/' + assessment.expiredAttempt + '/submit',
  { answers: { [assessment.question]: [0] }, submit_reason: 'manual' });

// A previously created attempt becomes inaccessible after assignment revocation.
await expectStatus(403, 'bob', 'PUT',
  '/api/employee/assessments/attempts/' + assessment.revokedAttempt + '/save',
  { answers: { [assessment.question]: [0] } });
await expectStatus(403, 'bob', 'POST',
  '/api/employee/assessments/attempts/' + assessment.revokedAttempt + '/submit',
  { answers: { [assessment.question]: [0] } });
await expectStatus(404, 'bob', 'GET',
  '/api/employee/assessments/attempts/' + assessment.revokedGraded + '/result');

// Valid, fresh assigned attempts still save, grade and return own results.
const started = await expectStatus(200, 'alice', 'POST',
  '/api/employee/assessments/' + assessment.active + '/start');
assert(started.attempt_id);
assert(started.questions.length === 1);
const attemptPath = '/api/employee/assessments/attempts/' + started.attempt_id;
await expectStatus(403, 'bob', 'PUT', attemptPath + '/save',
  { answers: { [assessment.question]: [0] } });
await expectStatus(200, 'alice', 'PUT', attemptPath + '/save',
  { answers: { [assessment.question]: [0] } });
const submitted = await expectStatus(200, 'alice', 'POST', attemptPath + '/submit',
  { answers: { [assessment.question]: [0] }, submit_reason: 'manual' });
assert.equal(submitted.passed, true);
await expectStatus(404, 'bob', 'GET', attemptPath + '/result');
const ownResult = await expectStatus(200, 'alice', 'GET', attemptPath + '/result');
assert.equal(ownResult.passed, true);
await expectStatus(403, 'alice', 'PUT', attemptPath + '/save',
  { answers: { [assessment.question]: [0] } });
console.log('SEC-013 authenticated HTTP salary isolation and assessment authorization/deadlines PASSED');
