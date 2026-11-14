<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';
use App\Middleware\AuthMiddleware;
use Firebase\JWT\JWT;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Psr\Http\Message\ResponseInterface as Response;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response as SlimResponse;

foreach (['DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD','JWT_SECRET'] as $env) {
  $_ENV[$env] = (string) getenv($env);
}
if ($_ENV['DB_DATABASE'] !== 'sec009_test' || $_ENV['JWT_SECRET'] === '') {
  fwrite(STDERR, "SEC-009 must run only in synthetic CI database\n");
  exit(1);
}
function check009($condition, string $test): void {
  if (!$condition) { fwrite(STDERR, "FAIL: $test\n"); exit(1); }
  echo "PASS: $test\n";
}
function session009(string $id,string $role): string {
  return JWT::encode([
    'iss'=>'acme_hrms', 'iat'=>time(), 'exp'=>time()+1200,
    'id'=>$id,'email'=>$id.'@example.invalid','role'=>$role
  ], $_ENV['JWT_SECRET'], 'HS256');
}
function invoke009(string $id,string $role,array $allowedRoles=[], $feature=null): int {
  $t=session009($id,$role);
  $req=(new ServerRequestFactory())->createServerRequest('GET','/api/route')
    ->withHeader('Authorization','Bearer '.$t);
  $handler=new class implements Handler {
    public function handle(Request $req): Response { return new SlimResponse(200); }
  };
  $response=(new AuthMiddleware($allowedRoles,$feature))($req,$handler);
  return $response->getStatusCode();
}
check009(invoke009('sec009-candidate','candidate') === 403,
  'no declared roles is fail-closed for a candidate');
check009(invoke009('sec009-admin','admin') === 403,
  'no declared roles is fail-closed even for admin');
check009(invoke009('sec009-candidate','candidate',['admin']) === 403,
  'candidate denied admin-only API');
check009(invoke009('sec009-employee','employee',['admin']) === 403,
  'unprivileged employee denied admin-only API');
check009(invoke009('sec009-admin','admin',['admin']) === 200,
  'admin role accesses admin-only API');
check009(invoke009('sec009-candidate','candidate',['admin'],'loanOrigination') === 403,
  'candidate with all database feature flags cannot bypass role gate');
check009(invoke009('sec009-employee','employee',['admin'],'loanOrigination') === 403,
  'employee without loan feature denied');
check009(invoke009('sec009-employee','employee',['admin'],['loanOrigination','salesOrigination']) === 403,
  'employee without any shared-module feature denied');
check009(invoke009('sec009-loans','employee',['admin'],'loanOrigination') === 200,
  'employee with loan grant allowed');
check009(invoke009('sec009-loans','employee',['admin'],'salesOrigination') === 403,
  'loan grant does not authorize sales');
check009(invoke009('sec009-sales','employee',['admin'],'salesOrigination') === 200,
  'employee with sales grant allowed');
check009(invoke009('sec009-branch','employee',['admin'],'branchOperations') === 200,
  'employee with branch operations grant allowed');
check009(invoke009('sec009-hr','hr',['admin'],'loanOrigination') === 200,
  'HR employee with loan grant allowed consistent with frontend');
check009(invoke009('sec009-manager','manager',['admin'],'branchOperations') === 200,
  'manager with branch grant allowed consistent with frontend');
check009(invoke009('sec009-branch','employee',['admin'],['loanOrigination','salesOrigination','branchOperations']) === 200,
  'shared activities may be accessed via appropriate branch grant');
check009(invoke009('sec009-disabled','employee',['admin'],'loanOrigination') === 403,
  'inactive employee never accesses protected routes');
check009(invoke009('sec009-candidate','candidate',['candidate','employee']) === 200,
  'explicit candidate-portal authorization still works');
check009(invoke009('sec009-candidate','candidate',['employee','hr','manager']) === 403,
  'candidate cannot access employee assessment endpoints');
check009(invoke009('sec009-employee','employee',['employee','hr','manager']) === 200,
  'employee assessment access remains available for staff');
echo "SEC-009 real AuthMiddleware role and feature security tests PASSED\n";
