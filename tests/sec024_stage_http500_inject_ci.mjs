// SEC-024 staging-only fault injection, never checked into the production entrypoint.
// Executed only in an ephemeral GitHub Actions checkout with loopback/synthetic DB.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const required = {
  GITHUB_ACTIONS: 'true',
  SEC024_STAGING_ISOLATED: 'true',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_DATABASE: 'sec024_stage_ci',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'SEC024_SYNTHETIC_PG_ONLY',
  SEC018_NATIVE_SESSION_ENABLED: 'false',
  SEC018_DB_USE_RESTRICTED: 'false',
  SEC018_AUDIT_CONTEXT_ENABLED: 'false',
};
for (const [key,value] of Object.entries(required)) {
  assert.equal(process.env[key],value, 'REFUSED staging fault injection: ' + key);
}
for (const key of ['DATABASE_URL','SUPABASE_URL','SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY','RENDER_SERVICE_ID','RENDER']) {
  assert(!process.env[key], 'REFUSED staging fault injection: external service environment '+key);
}

const path='backend/public/index.php';
let original=readFileSync(path,'utf8');
const middlewareMarker='// SEC-024: Register error handling LAST: Slim executes middleware in';
const routeMarker="// Run app\n$app->run();";
const boundary='$app->addErrorMiddleware(false, true, true);';
const assertOnce=(text,needle)=>assert.equal(text.split(needle).length-1,1,'SEC-024 injection marker must be unique: '+needle);
for(const marker of [middlewareMarker,routeMarker,boundary]) assertOnce(original,marker);
assert(original.indexOf(boundary)<original.indexOf(routeMarker));
assert(!original.includes('SEC024_PRIVATE_CANARY_'),'Canary must never exist in production source');

const stageMiddleware=`// SEC-024 CI-INJECTED ONLY: ephemeral middleware fault tests.
$app->add(function (Request $request, $handler) {
    $path = $request->getUri()->getPath();
    if ($path === '/api/__sec024_stage_outer_pre') {
        throw new \\RuntimeException('SEC024_PRIVATE_CANARY_OUTER_PRE_SQLSTATE_28P01');
    }
    $response = $handler->handle($request);
    if ($path === '/api/__sec024_stage_outer_post') {
        throw new \\RuntimeException('SEC024_PRIVATE_CANARY_OUTER_POST_SERVER_PATH');
    }
    return $response;
});

`;
const stageRoutes=`// SEC-024 CI-INJECTED ONLY: ephemeral route fault and healthy route tests.
$app->get('/api/__sec024_stage_route', function (Request $request, Response $response) {
    throw new \\RuntimeException('SEC024_PRIVATE_CANARY_ROUTE_STACK_TRACE');
});
$app->get('/api/__sec024_stage_outer_post', function (Request $request, Response $response) {
    $response->getBody()->write('should-never-reach-client');
    return $response->withStatus(200);
});
$app->get('/__sec024_stage_nonapi_route', function (Request $request, Response $response) {
    throw new \\RuntimeException('SEC024_PRIVATE_CANARY_NONAPI_FILE_PATH');
});

`;
let staged=original.replace(middlewareMarker,stageMiddleware+middlewareMarker)
  .replace(routeMarker,stageRoutes+routeMarker);
assert.equal(staged.split('SEC-024 CI-INJECTED ONLY').length-1,2);
assert(staged.indexOf('SEC-024 CI-INJECTED ONLY') < staged.indexOf(boundary),
  'Middleware canary must be inside outer error handler');
assert(staged.indexOf(boundary)<staged.lastIndexOf('SEC-024 CI-INJECTED ONLY'),
  'Route canary must be registered after safe error handler');
writeFileSync(path,staged);
console.log('PASS SEC-024: synthetic faults injected into ephemeral test checkout only');
