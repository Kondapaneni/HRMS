<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';
use App\Middleware\AuthMiddleware;
use Firebase\JWT\JWT;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response as SlimResponse;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Server\RequestHandlerInterface as Handler;

if (getenv('DB_DATABASE') !== 'sec010_test'
    || !str_starts_with((string) getenv('JWT_SECRET'), 'SEC010_TEST_ONLY')) {
    fwrite(STDERR, "SEC-010 refused non-isolated test environment\n");
    exit(1);
}
foreach (['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET'] as $name) {
    $_ENV[$name] = (string)getenv($name);
}
// Simulate connectivity failure using local closed port, never remote production.
$_ENV['DB_HOST'] = '127.0.0.1';
$_ENV['DB_PORT'] = '1';

function noDb010(string $user, string $role, array $roles, $feature = null): Response {
    $jwt=JWT::encode([
        'iat'=>time(), 'exp'=>time()+600, 'id'=>$user,
        'email'=>'synthetic@example.invalid', 'role'=>$role
    ], $_ENV['JWT_SECRET'], 'HS256');
    $req=(new ServerRequestFactory())->createServerRequest('GET','/api/sec010-db-test')
        ->withHeader('Authorization','Bearer '.$jwt);
    $handler=new class implements Handler {
        public function handle(Request $request): Response { return new SlimResponse(200); }
    };
    return (new AuthMiddleware($roles,$feature))($req,$handler);
}

ob_start();
$admin=noDb010('sec010-admin','admin',['admin']);
$employee=noDb010('sec010-all','employee',['admin'],'loanOrigination');
$captured=(string)ob_get_clean();

foreach (['admin'=>$admin,'feature-granted employee'=>$employee] as $label=>$result) {
    if ($result->getStatusCode()!==503
        || json_decode((string)$result->getBody(),true)!==[
            'error'=>'Authorization service temporarily unavailable.'
        ]) {
        fwrite(STDERR,"FAIL: {$label} not denied cleanly during DB outage\n");
        exit(1);
    }
    echo "PASS: {$label} receives sanitized 503 during DB outage\n";
}
if ($captured!=='') {
    fwrite(STDERR,"FAIL: database connection details leaked into HTTP output\n");
    exit(1);
}
echo "SEC-010 disconnected database fail-closed and no-leak tests PASSED\n";
