import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const vars = {
  GITHUB_ACTIONS: 'true',
  DB_HOST: '127.0.0.1',
  DB_PORT: '6432',
  DB_DATABASE: 'perf008_capacity_ci',
  DB_USERNAME: 'perf008_ci',
  DB_PASSWORD: 'PERF008_SYNTHETIC_PG_ONLY',
  DB_PDO_PREPARE_MODE: 'pooler',
  SEC018_NATIVE_SESSION_ENABLED: 'false',
  SEC018_DB_USE_RESTRICTED: 'false',
  SEC018_AUDIT_CONTEXT_ENABLED: 'false',
};
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Only run in GitHub Actions');
for (const [k,v] of Object.entries(vars)) {
  assert.equal(process.env[k], v, 'Refuse unsafe or unexpected CI setting: ' + k);
}
for (const k of ['DATABASE_URL','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']) {
  assert(!process.env[k], 'Refuse external credential variable: ' + k);
}
function worker() {
  return new Promise((resolve,reject) => {
    const child=spawn('php',['tests/perf008_pooler_worker_ci.php'],{env:{...process.env,...vars},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';
    child.stdout.on('data', b => stdout += b.toString());
    child.stderr.on('data', b => stderr += b.toString());
    child.on('error',reject);
    child.on('close',code => {
      if (code !== 0) return reject(new Error('Synthetic pooler worker failed ('+code+'): '+stderr.slice(0,300)));
      try { resolve(JSON.parse(stdout)); } catch (e) { reject(new Error('Invalid synthetic output: '+e.message)); }
    });
  });
}

const count=24;
const started=performance.now();
const results=await Promise.all(Array.from({length:count},()=>worker()));
const elapsed=Math.round(performance.now()-started);
assert.equal(results.length,count);
const uniquePids=new Set(results.flatMap(x=>x.backend_pids));
assert(uniquePids.size>=1 && uniquePids.size<=2,
  'Transaction PgBouncer fixture must reuse at most two server connections across 24 clients');
const sorted=results.map(x=>x.elapsed_ms).sort((a,b)=>a-b);
const p50=sorted[Math.ceil(count*.50)-1], p95=sorted[Math.ceil(count*.95)-1];
assert(p95 < 12000, 'Bounded synthetic CI latency must stay below 12 seconds');
console.log(JSON.stringify({result:'PASS',scope:'isolated GitHub CI PostgreSQL / transaction PgBouncer only',
  clients:count,errors:0,server_connections:uniquePids.size,max_server_pool:2,
  end_to_end_worker_p50_ms:p50,end_to_end_worker_p95_ms:p95,wall_clock_ms:elapsed}));
