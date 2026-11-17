import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

assert.equal(process.env.DB_DATABASE,'sec015_test','Never run against a live database');
assert.equal(process.env.DB_HOST,'127.0.0.1','Only synthetic local PostgreSQL allowed');
assert.match(process.env.JWT_SECRET||'',/^SEC015_TEST_ONLY_/);
assert(!process.env.SUPABASE_SECRET_KEY);

const appId='00000000-0000-4000-8000-00000000b503';
const wrongApp='00000000-0000-4000-8000-00000000b504';
const path=appId+'/offer-12345678-1234-4123-8123-123456789abc-'+ 'a'.repeat(32)+'.pdf';
const URL='http://127.0.0.1:8776';

function sql(command) {
  return execFileSync('psql',['-h','127.0.0.1','-U','postgres','-d','sec015_test',
    '-At','-v','ON_ERROR_STOP=1','-c',command],{
      encoding:'utf8',env:{...process.env,PGPASSWORD:process.env.DB_PASSWORD}
    }).trim();
}
function jwt(role) {
  const ids={
    admin:'00000000-0000-4000-8000-00000000e501',
    candidate:'00000000-0000-4000-8000-00000000e504'
  };
  const now=Math.floor(Date.now()/1000);
  const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
  const body=enc({alg:'HS256',typ:'JWT'})+'.'+enc({
    iss:'acme_hrms',iat:now,exp:now+900,type:'session',tv:0,
    id:ids[role],role,email:role+'@example.invalid'
  });
  return body+'.'+crypto.createHmac('sha256',process.env.JWT_SECRET).update(body).digest('base64url');
}
async function call(method,endpoint,payload,role) {
  const res=await fetch(URL+endpoint,{
    method,headers:{
      'Accept-Encoding':'identity',
      ...(payload===undefined?{}:{'Content-Type':'application/json'}),
      ...(role?{'Authorization':'Bearer '+jwt(role)}:{})
    },
    ...(payload===undefined?{}:{body:JSON.stringify(payload)}),
    redirect:'manual'
  });
  const raw=await res.text();let body;
  try{body=JSON.parse(raw);}catch{body={};}
  return {status:res.status,body,raw:raw.slice(0,200)};
}
async function expected(code,method,endpoint,payload,role){
  const r=await call(method,endpoint,payload,role);
  assert.equal(r.status,code,method+' '+endpoint+' '+JSON.stringify(r));
  return r;
}
const endpoint='/api/admin/applications/'+appId+'/status';
const body={status:'Hired',notes:'Synthetic offer letter issued',offerLetterPath:path};
await expected(401,'PUT',endpoint,body);
await expected(403,'PUT',endpoint,body,'candidate');
await expected(400,'PUT',endpoint,{...body,offerLetterPath:'https://attacker.invalid/offer.pdf'},'admin');
await expected(400,'PUT',endpoint,{...body,offerLetterPath:wrongApp+'/offer-12345678-1234-4123-8123-123456789abc-'+ 'a'.repeat(32)+'.pdf'},'admin');
await expected(400,'PUT',endpoint,{...body,status:'Shortlisted'},'admin');
await expected(409,'PUT',endpoint,body,'admin'); // Object is not in Storage metadata
assert.equal(sql("SELECT count(*) FROM application_timeline WHERE application_id='"+appId+"' AND notes='Synthetic offer letter issued'"),'0',
  'Failed offer association must not create a timeline event');
sql("INSERT INTO storage.objects(bucket_id,name) VALUES ('offer_letters','"+path+"')");
await expected(200,'PUT',endpoint,body,'admin');
assert.equal(sql("SELECT offer_letter_path FROM applications WHERE id='"+appId+"'"),path);
assert.equal(sql("SELECT count(*) FROM application_timeline WHERE application_id='"+appId+"' AND notes='Synthetic offer letter issued'"),'1');

const mine=await expected(200,'GET','/api/candidate/applications',undefined,'candidate');
assert(mine.body.applications?.some(a=>a.id===appId && a.offer_letter_path===path),
 'Candidate must receive only its own stored offer path');
const wrong=await expected(401,'GET','/api/candidate/applications');
assert(!JSON.stringify(wrong.body).includes(path),'Anonymous request must not leak offer path');

console.log('PASS Candidate offer linkage: owner-scoped PDF path, reject fabricated uploads, 401/403, preserve timeline, candidate read');
