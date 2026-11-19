// Real loopback HTTP assertions against an ephemeral full HRMS front-controller.
// No network requests outside 127.0.0.1 and no real credentials or database.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const expected = {
  GITHUB_ACTIONS: 'true',
  SEC024_STAGING_ISOLATED: 'true',
  DB_HOST: '127.0.0.1',
  DB_DATABASE: 'sec024_stage_ci',
};
for (const [key,value] of Object.entries(expected)) {
  assert.equal(process.env[key],value,'REFUSED staging HTTP test: '+key);
}
for (const k of ['DATABASE_URL','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','RENDER_SERVICE_ID']) {
  assert(!process.env[k],'REFUSED external service access: '+k);
}
const root='http://127.0.0.1:8789';
const faults=[
  {name:'real-route-error',path:'/api/__sec024_stage_route',
    canary:'SEC024_PRIVATE_CANARY_ROUTE_STACK_TRACE'},
  {name:'outer-middleware-before',path:'/api/__sec024_stage_outer_pre',
    canary:'SEC024_PRIVATE_CANARY_OUTER_PRE_SQLSTATE_28P01'},
  {name:'outer-middleware-after',path:'/api/__sec024_stage_outer_post',
    canary:'SEC024_PRIVATE_CANARY_OUTER_POST_SERVER_PATH'},
  {name:'non-api-route-error',path:'/__sec024_stage_nonapi_route',
    canary:'SEC024_PRIVATE_CANARY_NONAPI_FILE_PATH'},
];
const rows=[];
const forbidden=/SEC024_PRIVATE_CANARY|SQLSTATE|stack[ -]?trace|RuntimeException|PDOException|\/home\/runner\/|\/var\/www\/|JWT_SECRET|Secret empty\?|should-never-reach-client|bad\.token/i;
for (const test of faults) {
  const res=await fetch(root+test.path,{
    headers:{'Accept':'application/json','Accept-Encoding':'identity','Origin':'https://malicious.invalid'},
    redirect:'manual',signal:AbortSignal.timeout(15000)
  });
  const body=await res.text();
  assert.equal(res.status,500,test.name+': expected HTTP 500');
  assert(body.length>0 && body.length<8192,test.name+': should be a small generic error');
  assert(!forbidden.test(body),test.name+': HTTP body leaked an internal detail');
  assert(!res.headers.get('access-control-allow-origin'),test.name+': untrusted CORS origin reflected');
  rows.push({probe:test.name,http:res.status,bytes:body.length,
    cacheNoStore:/no-store/i.test(res.headers.get('cache-control')||''),
    errorContentType:res.headers.get('content-type')||'unset'});
}
const auth=await fetch(root+'/api/me',{
  headers:{'Authorization':'Bearer bad.token','Accept':'application/json','Accept-Encoding':'identity'},
  redirect:'manual',signal:AbortSignal.timeout(15000)
});
const authBody=await auth.text();
assert.equal(auth.status,401,'Invalid synthetic JWT should return 401');
assert.deepEqual(JSON.parse(authBody),{error:'Invalid or expired session token.'});
assert(!forbidden.test(authBody),'Invalid JWT response leaked details');
assert.match(auth.headers.get('cache-control')||'',/no-store/,'JWT 401 must not be cacheable');
rows.push({probe:'invalid-synthetic-JWT',http:auth.status,
  cacheNoStore:true,errorContentType:auth.headers.get('content-type')||'unset'});

const healthy=await fetch(root+'/',{signal:AbortSignal.timeout(15000)});
assert.equal(healthy.status,200,'Non-fault path must remain healthy');
assert.equal((await healthy.json()).status,'API is running');
rows.push({probe:'healthy-front-controller',http:200});

const logs=readFileSync(process.env.SEC024_STAGING_SERVER_LOG,'utf8');
for(const f of faults)assert(logs.includes(f.canary),
  f.name+': synthetic exception must appear in private server log, not response');
console.log(JSON.stringify({result:'PASS',environment:'isolated staging HTTP (PHP front-controller; loopback only)',
  realSupabaseAccess:false,liveRenderAccess:false,dataMutations:false,
  faultCount:faults.length,syntheticPrivateExceptionsLogOnly:true,
  tests:rows},null,2));
