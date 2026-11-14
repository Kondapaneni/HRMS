import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Real HTTP checks against the isolated synthetic PostgreSQL fixture only.
assert.equal(process.env.DB_DATABASE, 'sec011_test');
const secret=process.env.JWT_SECRET;
assert(secret?.startsWith('SEC011_TEST_ONLY'));
const origin='http://127.0.0.1:8771';
const users={
  alice:'00000000-0000-4000-8000-000000000001',
  bob:'00000000-0000-4000-8000-000000000002',
  carol:'00000000-0000-4000-8000-000000000003',
  branchA:'00000000-0000-4000-8000-000000000004',
  branchB:'00000000-0000-4000-8000-000000000005',
  admin:'00000000-0000-4000-8000-000000000006',
  greg:'00000000-0000-4000-8000-000000000007',
  noProfile:'00000000-0000-4000-8000-000000000008'
};
const loans={
  alice:'00000000-0000-4000-8000-00000000a001',
  bob:'00000000-0000-4000-8000-00000000a002',
  carol:'00000000-0000-4000-8000-00000000a003',
  transferred:'00000000-0000-4000-8000-00000000a004',
  shared:'00000000-0000-4000-8000-00000000a005',
  branch:'00000000-0000-4000-8000-00000000a006'
};
const acts={
  alice:'00000000-0000-4000-8000-00000000c001',
  bob:'00000000-0000-4000-8000-00000000c002',
  carol:'00000000-0000-4000-8000-00000000c003'
};
const leads={
  alice:'00000000-0000-4000-8000-00000000b001',
  bob:'00000000-0000-4000-8000-00000000b002',
  carol:'00000000-0000-4000-8000-00000000b003'
};

function session(id,role='employee'){
  const enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const payload={iss:'acme_hrms',iat:Math.floor(Date.now()/1000),
    exp:Math.floor(Date.now()/1000)+1200,id,email:id+'@example.invalid',role};
  const raw=enc({alg:'HS256',typ:'JWT'})+'.'+enc(payload);
  return raw+'.'+crypto.createHmac('sha256',secret).update(raw).digest('base64url');
}
async function call(identity,method,path,body,role='employee'){
  const id=users[identity];
  assert(id, 'synthetic identity ' + identity);
  const response=await fetch(origin+path,{
    method,
    headers:{Authorization:'Bearer '+session(id,role),'Accept-Encoding':'identity',
      ...(method==='GET'?{}:{'Content-Type':'application/json'})},
    ...(method==='GET'?{}:{body:JSON.stringify(body??{})}),
    redirect:'manual'
  });
  const text=await response.text();
  let json=null;
  try{json=JSON.parse(text);}catch{}
  return {status:response.status,json,plain:text.slice(0,180)};
}
async function verify(expected,actor,method,path,body,role='employee'){
  const r=await call(actor,method,path,body,role);
  assert.equal(r.status,expected,method+' '+path+' as '+actor
    +' expected '+expected+', got '+r.status+' '+r.plain);
  console.log('PASS:',actor,method,path,'=>',expected);
  return r.json;
}
const draft={loan_type:'Business Loan',applicant_name:'Synthetic Applicant',
  phone_number:'0000000000',status:'Draft',
  form_data:{applicant_name:'Synthetic Applicant',phone_number:'0000000000'}};

// Read isolation: ownership AND branch, not just the JWT's module grant.
const aliceList=await verify(200,'alice','GET','/api/loans/applications');
const aliceApps=aliceList.applications.map(a=>a.application_id);
assert(aliceApps.includes('LA-A1'),'owner can see own branch application');
assert(!aliceApps.includes('LA-B1'),'same-branch other creator excluded');
assert(!aliceApps.includes('LA-C1'),'crossbranch creator excluded');
assert(!aliceApps.includes('LA-TRANSFERRED'),'own record in another branch excluded');
const adminList=await verify(200,'admin','GET','/api/loans/applications',undefined,'admin');
assert(adminList.applications.length>=6,'admin retains explicit global visibility');

// Legacy lead document alias must not cross-join applications sharing a lead.
const own=aliceList.applications.find(x=>x.application_id==='LA-A1');
assert(own?.documents?.identity,'canonical own documents included');
assert(!own?.documents?.['shared-legacy'],'ambiguous legacy lead document hidden');

// Foreign draft ID and lead ID cannot overwrite or generate a rogue linked row.
await verify(404,'alice','POST','/api/loans/applications',
  {...draft,id:loans.bob,lead_id:leads.alice});
await verify(404,'alice','POST','/api/loans/applications',
  {...draft,id:loans.transferred,lead_id:leads.alice});
await verify(404,'alice','POST','/api/loans/applications',
  {...draft,lead_id:leads.bob});
await verify(201,'alice','POST','/api/loans/applications',
  {...draft,id:loans.alice,lead_id:leads.alice});
await verify(201,'alice','POST','/api/loans/applications',
  {...draft,lead_id:null});

// Document mutations: deny same-branch stranger, other branch, transferred owner.
for(const foreign of [loans.bob,loans.carol,loans.transferred]){
  await verify(404,'alice','POST','/api/loans/applications/'+foreign+'/documents',
    {documents:{identity:{url:'https://example.invalid/rogue'}}});
  await verify(404,'alice','DELETE','/api/loans/applications/'+foreign+'/documents/identity');
  await verify(404,'alice','PATCH','/api/loans/applications/'+foreign+'/status',
    {status:'Approved'});
  await verify(404,'alice','DELETE','/api/loans/applications/'+foreign);
}
await verify(200,'alice','POST','/api/loans/applications/'+loans.alice+'/documents',
  {documents:{test_document:{url:'https://example.invalid/synthetic'}}});
await verify(200,'alice','DELETE','/api/loans/applications/'+loans.alice+'/documents/test_document');
await verify(200,'alice','PATCH','/api/loans/applications/'+loans.alice+'/status',
  {status:'Under Review'});
await verify(200,'admin','PATCH','/api/loans/applications/'+loans.carol+'/status',
  {status:'Under Review'},'admin');

// Branch Operations must not mutate by knowing a foreign application ID.
const branchEdit={form_data:{
  applicant_name:'Synthetic Branch Edit',phone_number:'0000000000',stage:'Branch Operations'
},loan_type:'Business Loan'};
await verify(404,'branchA','PUT','/api/branch-operations/applications/'+loans.carol,branchEdit);
await verify(404,'branchA','PUT','/api/branch-operations/applications/LA-C1',branchEdit);
await verify(403,'noProfile','PUT','/api/branch-operations/applications/'+loans.branch,branchEdit);
await verify(403,'alice','PUT','/api/branch-operations/applications/'+loans.branch,branchEdit);
await verify(200,'branchA','PUT','/api/branch-operations/applications/'+loans.branch,branchEdit);
await verify(200,'branchB','PUT','/api/branch-operations/applications/'+loans.carol,branchEdit);

// Reassignment must have a real branch profile, module grant, authorized
// existing assignee's branch and same-branch *new* target.
await verify(403,'alice','PATCH','/api/origination/activities/'+acts.bob+'/reassign',
  {assignedTo:users.greg});
await verify(403,'noProfile','PATCH','/api/origination/activities/'+acts.bob+'/reassign',
  {assignedTo:users.greg});
await verify(404,'branchA','PATCH','/api/origination/activities/'+acts.carol+'/reassign',
  {assignedTo:users.greg});
await verify(403,'branchA','PATCH','/api/origination/activities/'+acts.bob+'/reassign',
  {assignedTo:users.carol});
await verify(200,'branchA','PATCH','/api/origination/activities/'+acts.bob+'/reassign',
  {assignedTo:users.greg});
await verify(200,'admin','PATCH','/api/origination/activities/'+acts.carol+'/reassign',
  {assignedTo:users.branchA},'admin');

// Creating activity for another employee is limited to valid same-branch staff.
const tomorrow=new Date(Date.now()+86400_000).toISOString().slice(0,10);
const schedule={title:'SEC-011 synthetic',startDate:tomorrow,endDate:tomorrow,
  startTime:'14:00',endTime:'15:00',priority:'Medium'};
await verify(403,'alice','POST','/api/origination/activities',
  {...schedule,assignedTo:users.bob});
await verify(403,'branchA','POST','/api/origination/activities',
  {...schedule,assignedTo:users.carol});
await verify(201,'branchA','POST','/api/origination/activities',
  {...schedule,assignedTo:users.greg});

// Prevent loan-only users from browsing/marking colleagues' branch activities.
await verify(403,'alice','GET','/api/origination/activities?scope=branch');
await verify(200,'branchA','GET','/api/origination/activities?scope=branch');
await verify(404,'alice','PATCH','/api/origination/activities/'+acts.bob+'/toggle-status',
  {currentStatus:'Scheduled'});
await verify(404,'branchB','PATCH','/api/origination/activities/'+acts.bob+'/toggle-status',
  {currentStatus:'Scheduled'});
await verify(200,'branchA','PATCH','/api/origination/activities/'+acts.bob+'/toggle-status',
  {currentStatus:'Scheduled'});

// Admin authorization and authentic owner's operation still work.
await verify(200,'alice','PATCH','/api/origination/activities/'+acts.alice+'/toggle-status',
  {currentStatus:'Scheduled'});
await verify(200,'admin','PATCH','/api/origination/activities/'+acts.carol+'/toggle-status',
  {currentStatus:'Scheduled'},'admin');
await verify(404,'alice','DELETE','/api/loans/applications/'+loans.branch);
await verify(200,'alice','DELETE','/api/loans/applications/'+loans.alice);
console.log('SEC-011 real authenticated route-level object ownership and branch isolation PASSED');
