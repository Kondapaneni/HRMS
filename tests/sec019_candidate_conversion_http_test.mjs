import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Test database and HTTP server are disposable SEC-015 fixtures only.
assert.equal(process.env.DB_DATABASE, 'sec015_test');
assert.equal(process.env.DB_HOST, '127.0.0.1');
assert.match(process.env.JWT_SECRET || '', /^SEC015_TEST_ONLY_/);
assert(!process.env.SUPABASE_SECRET_KEY);

const origin = 'http://127.0.0.1:8776';
const ids = {
  admin: '00000000-0000-4000-8000-00000000e501',
  candidate: '00000000-0000-4000-8000-00000000e502',
  hired: '00000000-0000-4000-8000-00000000e504',
  selected: '00000000-0000-4000-8000-00000000e505',
  hiredApp: '00000000-0000-4000-8000-00000000b503',
  otherApp: '00000000-0000-4000-8000-00000000b504',
  notHiredApp: '00000000-0000-4000-8000-00000000b501',
  branch: '00000000-0000-4000-8000-00000000d501',
};
function jwt(actor) {
  const now = Math.floor(Date.now() / 1000);
  const e = x => Buffer.from(JSON.stringify(x)).toString('base64url');
  const body = e({alg:'HS256',typ:'JWT'}) + '.' + e({
    iss:'acme_hrms',iat:now,exp:now+1200,type:'session',tv:0,
    id:ids[actor], role:actor, email:actor+'@example.invalid'
  });
  return body+'.'+crypto.createHmac('sha256',process.env.JWT_SECRET).update(body).digest('base64url');
}
function sql(q) {
  return execFileSync('psql', [
    '-h','127.0.0.1','-U','postgres','-d','sec015_test',
    '-At','-v','ON_ERROR_STOP=1','-c',q
  ], {encoding:'utf8',env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD}}).trim();
}
async function post(body,actor='admin') {
  const r=await fetch(origin+'/api/admin/employees/convert',{
    method:'POST',
    headers:{
      'Content-Type':'application/json','Accept-Encoding':'identity',
      ...(actor?{Authorization:'Bearer '+jwt(actor)}:{})
    },
    body:JSON.stringify(body)
  });
  const raw=await r.text();
  let json={};try{json=JSON.parse(raw)}catch{}
  return {status:r.status,json};
}
function payload(userId=ids.hired,applicationId=ids.hiredApp) {
  return {
    userId,applicationId,firstName:'New',lastName:'Employee',
    email:'forged-address@example.invalid',phone:'9990000000',
    department:'Operations',position:'Analyst',branch:ids.branch,
    joinDate:'2026-11-17',salary:1000,status:'Active',managerId:null
  };
}
function countUserEmployees(userId) {
  return Number(sql("SELECT count(*) FROM employee WHERE \"userId\" = '"+userId+"'"));
}
const valid=payload();
assert.equal((await post(valid,null)).status,401,'Anonymous conversion must be rejected');
assert.equal((await post(valid,'candidate')).status,403,'Candidate cannot convert self');
assert.equal((await post({...valid,applicationId:null})).status,400,'Application ID is mandatory');
assert.equal((await post({...valid,employeeId:'00112233',branch:'fake'})).status,400,
  'Unexpected branch must fail; caller ID cannot override server validation');
assert.equal((await post(payload(ids.candidate,ids.notHiredApp))).status,409,
  'Shortlisted application cannot be converted');
assert.equal((await post(payload(ids.selected,ids.hiredApp))).status,404,
  'Other candidate application cannot be used');
assert.equal((await post({...valid,branch:'00000000-0000-4000-8000-00000000d599'})).status,400,
  'Unknown branch cannot be used');
assert.equal(countUserEmployees(ids.hired),0,'Invalid requests must not create an employee');
assert.equal(
  sql("SELECT role FROM users WHERE id='"+ids.hired+"'"),'candidate',
  'Invalid requests must not change the candidate role'
);

const success=await post(valid);
assert.equal(success.status,201,JSON.stringify(success));
assert.match(success.json.employeeId,/^EMP-[1-9][0-9]{7}$/,'Employee code must be EMP- followed by exactly eight numeric digits');
assert.equal(success.json.userId,ids.hired);
assert.equal(countUserEmployees(ids.hired),1,'Conversion must create exactly one employee');
assert.equal(
  sql("SELECT \"employeeId\" FROM employee WHERE \"userId\"='"+ids.hired+"'"),
  success.json.employeeId
);
assert.equal(
  sql("SELECT email FROM employee WHERE \"userId\"='"+ids.hired+"'"),
  'candidate-c@example.invalid',
  'Converted employee email must be DB-owned, never a request-supplied address'
);
assert.equal(
  sql("SELECT branch FROM employee WHERE \"userId\"='"+ids.hired+"'"),
  ids.branch
);
assert.equal(
  sql("SELECT role || ':' || token_version FROM users WHERE id='"+ids.hired+"'"),
  'employee:1',
  'Role promotion must invalidate existing candidate tokens'
);
assert.equal(
  sql("SELECT status FROM applications WHERE id='"+ids.hiredApp+"'"),
  'Converted to Employee',
  'Application state must change inside the conversion transaction'
);
assert.equal(
  sql("SELECT count(*) FROM application_timeline WHERE application_id='"+ids.hiredApp+"' AND status_change='Converted to Employee'"),
  '1',
  'Successful conversion must append exactly one recruitment timeline entry'
);
assert.equal((await post(valid)).status,409,'Repeated conversion must be rejected');
assert.equal(countUserEmployees(ids.hired),1,'Repeated conversion must not create duplicates');
assert.equal(
  sql("SELECT count(*) FROM application_timeline WHERE application_id='"+ids.hiredApp+"' AND status_change='Converted to Employee'"),
  '1',
  'Repeated conversion must not create a duplicate timeline event'
);
console.log('PASS SEC-019 candidate conversion: auth, eligibility, UUID relation, eight-digit ID, rollback, atomic status, replay denial');
