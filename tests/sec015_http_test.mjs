import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Never send test requests to a real Render service or connected HRMS database.
assert.equal(process.env.DB_DATABASE, 'sec015_test');
assert.match(process.env.JWT_SECRET || '', /^SEC015_TEST_ONLY_/);
const origin = 'http://127.0.0.1:8776';
const ids = {
  admin: '00000000-0000-4000-8000-00000000e501',
  candidate: '00000000-0000-4000-8000-00000000e502'
};
const apps = {
  shortlisted: '00000000-0000-4000-8000-00000000b501',
  rejected: '00000000-0000-4000-8000-00000000b502',
  verified: '00000000-0000-4000-8000-00000000b503',
  missingDocs: '00000000-0000-4000-8000-00000000b504'
};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(actor) {
  const now = Math.floor(Date.now()/1000);
  const payload={iss:'acme_hrms',iat:now,exp:now+1200,type:'session',tv:0,id:ids[actor],
    role:actor === 'admin' ? 'admin' : 'candidate',email:actor+'@example.invalid'};
  const head=encode({alg:'HS256',typ:'JWT'})+'.'+encode(payload);
  return head+'.'+crypto.createHmac('sha256',process.env.JWT_SECRET).update(head).digest('base64url');
}
async function request(method,path,body,actor=null) {
  const res=await fetch(origin+path,{method,headers:{
    'Accept-Encoding':'identity',
    ...(body===undefined?{}:{'Content-Type':'application/json'}),
    ...(actor?{Authorization:'Bearer '+jwt(actor)}:{})
  },...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'manual'});
  const raw=await res.text();
  let json;
  try {json=JSON.parse(raw)} catch {}
  return {status:res.status,json,raw:raw.slice(0,240)};
}
async function expect(code, method, path, body, actor) {
  const r=await request(method,path,body,actor);
  assert.equal(r.status,code,method+' '+path+' expected '+code+' got '+r.status+': '+r.raw);
  console.log('PASS',method,path,code);
  return r;
}
const send='/api/admin/send-email';
await expect(401,'POST',send,{applicationId:apps.shortlisted,type:'shortlisted'});
await expect(403,'POST',send,{applicationId:apps.shortlisted,type:'shortlisted'},'candidate');
await expect(400,'POST',send,{to:'external@example.invalid',subject:'Phishing',body:'<a href="https://evil.invalid">click</a>'},'admin');
await expect(400,'POST',send,{applicationId:apps.shortlisted,type:'shortlisted',to:'outsider@example.invalid'},'admin');
await expect(400,'POST',send,{applicationId:apps.shortlisted,type:'bogus'},'admin');
await expect(400,'POST',send,{applicationId:'invalid',type:'shortlisted'},'admin');
await expect(404,'POST',send,{applicationId:'00000000-0000-4000-8000-00000000b599',type:'shortlisted'},'admin');
await expect(409,'POST',send,{applicationId:apps.shortlisted,type:'offer'},'admin');
await expect(409,'POST',send,{applicationId:apps.missingDocs,type:'documents_verified'},'admin');

await expect(200,'POST',send,{applicationId:apps.shortlisted,type:'shortlisted'},'admin');
await expect(200,'POST',send,{applicationId:apps.rejected,type:'rejected'},'admin');
await expect(200,'POST',send,{applicationId:apps.verified,type:'offer'},'admin');
await expect(200,'POST',send,{applicationId:apps.verified,type:'documents_verified'},'admin');
await expect(200,'POST',send,{applicationId:apps.verified,type:'status'},'admin');

// Interview notes and data are DB-owned; dangerous markup is escaped.
await expect(200,'PUT','/api/admin/applications/'+apps.shortlisted+'/status',{
  status:'1st Round Interview',
  notes:'Date: 2026-11-16, Location: <img src=x onerror=alert(1)>'
},'admin');
await expect(200,'POST',send,{applicationId:apps.shortlisted,type:'interview'},'admin');
await expect(409,'POST',send,{applicationId:apps.shortlisted,type:'shortlisted'},'admin');

// Employee onboarding rejects passwords even when malicious clients supply them.
const employee = {
  firstName:'<img src=x onerror=alert(1)>',
  lastName:'Test',
  email:'sec015-new-employee@example.invalid',
  phone:'0000000000',
  department:'Engineering',position:'Analyst',
  branch_id:'00000000-0000-4000-8000-00000000d501',
  joinDate:'2026-11-15',salary:50000,status:'Active'
};
await expect(400,'POST','/api/employees',{...employee,password:'NeverEmailMySecret!1'},'admin');
await expect(400,'POST','/api/employees',{...employee,email:'invalid@@example.invalid'},'admin');
await expect(201,'POST','/api/employees',employee,'admin');

await expect(200,'POST','/api/admin/employees/00000000-0000-4000-8000-00000000c501/promote',{
  newPosition:'<img src=x onerror=alert(1)>',
  newSalary:17500,
  effectiveDate:'2026-11-16',
  notes:'<svg onload=alert(1)>',
  sendEmail:true
},'admin');

// Rate-limit is scoped to authenticated user, not arbitrary XFF/To headers.
for(let i=6;i<20;i++){
  await expect(200,'POST',send,{applicationId:apps.verified,type:'status'},'admin');
}
await expect(429,'POST',send,{applicationId:apps.verified,type:'status'},'admin');

console.log('PASS SEC-015 strict mail HTTP contracts; all emails remain isolated in disposable CI DB');
