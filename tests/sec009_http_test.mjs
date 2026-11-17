import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Real Slim endpoints against a disposable GitHub Actions PostgreSQL database.
// These tokens are generated only for synthetic test users, never production.
const base='http://127.0.0.1:8770';
const secret=process.env.JWT_SECRET;
assert.equal(process.env.DB_DATABASE,'sec009_test');
assert(secret?.startsWith('SEC009_TEST_ONLY'));
function token(id,role){
  const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const payload={iss:'acme_hrms',iat:Math.floor(Date.now()/1000),
    exp:Math.floor(Date.now()/1000)+1800,id,email:id+'@example.invalid',role};
  const raw=enc({alg:'HS256',typ:'JWT'})+'.'+enc(payload);
  return raw+'.'+crypto.createHmac('sha256',secret).update(raw).digest('base64url');
}
async function request(endpoint,id,role,method='GET'){
  const r=await fetch(base+endpoint,{method,
    headers:{Authorization:'Bearer '+token(id,role),'Accept-Encoding':'identity',
      ...(method==='GET'?{}:{'Content-Type':'application/json'})},
    ...(method==='GET'?{}:{body:'{}'})});
  return r.status;
}
const candidateEndpoints=[
  '/api/admin/reports/employees','/api/admin/reports/attendance',
  '/api/admin/reports/payroll','/api/admin/performance',
  '/api/employee/assessments',
  '/api/leads/dashboard','/api/leads/list','/api/members',
  '/api/loans/applications',
  '/api/sales/dashboard','/api/sales/leads',
  '/api/origination/activities',
  '/api/branch-operations/dashboard','/api/branch-operations/leads',
  '/api/branch-operations/applications',
];
for(const route of candidateEndpoints){
  const status=await request(route,'sec009-candidate','candidate');
  assert.equal(status,403,'candidate must not read '+route);
  console.log('PASS: candidate forbidden '+route);
}
const staffEndpoints=[
  '/api/admin/reports/employees','/api/admin/reports/payroll',
  '/api/admin/performance','/api/leads/list','/api/members',
  '/api/loans/applications','/api/sales/leads/list',
  '/api/origination/activities','/api/branch-operations/applications'
];
for(const route of staffEndpoints){
  const status=await request(route,'sec009-employee','employee');
  assert.equal(status,403,'employee without feature must not read '+route);
  console.log('PASS: unprivileged employee forbidden '+route);
}
for(const [route,method] of [
  ['/api/loans/applications','POST'],
  ['/api/loans/applications/sec009-test','DELETE'],
  ['/api/branch-operations/applications/sec009-test','PUT'],
  ['/api/branch-operations/applications/sec009-test/seen','POST'],
  ['/api/origination/activities','POST'],
  ['/api/sales/leads','POST'],
]){
  const status=await request(route,'sec009-candidate','candidate',method);
  assert.equal(status,403,'candidate must not mutate '+route);
  console.log('PASS: candidate mutation forbidden '+method+' '+route);
}
console.log('SEC-009 actual protected HTTP route denials PASSED');
