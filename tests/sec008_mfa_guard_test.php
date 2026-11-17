<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';
require __DIR__ . '/../backend/public/sec008_mfa_guard.php';
require __DIR__ . '/../backend/public/sec003_file_access.php';

use App\Middleware\AuthMiddleware;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response;

function check008(bool $ok, string $name): void
{
    if (!$ok) {
        fwrite(STDERR, "SEC-008 FAILED: $name\n");
        exit(1);
    }
    echo "PASS: $name\n";
}

$db = new PDO('sqlite::memory:');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE mfa_secrets (user_id TEXT NOT NULL, confirmed INTEGER NOT NULL)');
$db->exec("INSERT INTO mfa_secrets (user_id, confirmed) VALUES ('admin1', 1), ('employee1', 0)");

check008(sec008MfaRequired($db, ['id' => 'admin1', 'mfaEnabled' => 't']), 'confirmed MFA required for admin');
check008(sec008MfaRequired($db, ['id' => 'admin1', 'mfaEnabled' => true]), 'confirmed MFA required with boolean flag');
check008(!sec008MfaRequired($db, ['id' => 'admin1', 'mfaEnabled' => 'f']), 'disabled MFA does not block login');
check008(!sec008MfaRequired($db, ['id' => 'employee1', 'mfaEnabled' => true]), 'unconfirmed MFA retains setup enrollment flow');
check008(!sec008MfaRequired($db, ['id' => 'employee2', 'mfaEnabled' => false]), 'non-MFA account login unchanged');

$secret = 'SEC008_TEST_SECRET_ONLY_DO_NOT_USE_IN_PRODUCTION';
$challenged = sec008MfaChallenge(new Response(), [
    'id' => '123e4567-e89b-42d3-a456-426614174000', 'email' => 'sec008-admin@example.invalid', 'role' => 'admin',
], $secret);
check008($challenged->getStatusCode() === 200, 'pending MFA challenge HTTP response');
$body = json_decode((string)$challenged->getBody(), true, 512, JSON_THROW_ON_ERROR);
check008(($body['mfaRequired'] ?? false) === true && !isset($body['token']) && !isset($body['user']),
    'pending challenge never returns a session or full user');
$claims = JWT::decode($body['mfaToken'], new Key($secret, 'HS256'));
check008(($claims->type ?? '') === 'mfa_pending' && !isset($claims->role),
    'pending JWT has explicit scope and no authenticated role');
check008(($claims->exp - $claims->iat) === 300, 'MFA pending JWT expires in five minutes');

$_ENV['JWT_SECRET'] = $secret;
$request = (new ServerRequestFactory())->createServerRequest('GET', '/api/me')
    ->withHeader('Authorization', 'Bearer ' . $body['mfaToken']);
$handler = new class implements RequestHandlerInterface {
    public function handle(ServerRequestInterface $request): ResponseInterface {
        return new Response(200);
    }
};
$result = (new AuthMiddleware())($request, $handler);
check008($result->getStatusCode() === 401, 'pending JWT rejected by unscoped protected route');

// SEC-003 document endpoints also decode JWTs directly; they must not treat
// a pending MFA token with an ID as an authenticated admin principal.
$fakeDatabase = new class {
    public function prepare(string $sql): object {
        return new class {
            public function execute(array $params): void {}
            public function fetch(int $mode): array {
                return ['role' => 'admin', 'isActive' => 't'];
            }
        };
    }
};
$principalPending = sec003Principal($request, $fakeDatabase);
check008($principalPending === null, 'pending MFA JWT cannot authorize private document access');

$sessionToken = JWT::encode([
    'iss' => 'acme_hrms',
    'iat' => time(),
    'exp' => time() + 1800,
    'id' => '123e4567-e89b-42d3-a456-426614174000',
    'email' => 'sec008-admin@example.invalid',
    'role' => 'admin'
], $secret, 'HS256');
$sessionRequest = (new ServerRequestFactory())->createServerRequest('GET', '/Bills/test.pdf')
    ->withHeader('Authorization', 'Bearer ' . $sessionToken);
$principalSession = sec003Principal($sessionRequest, $fakeDatabase);
check008(($principalSession['role'] ?? '') === 'admin',
    'completed session JWT still authorizes the protected-document principal');

echo "SEC-008 PHP security regressions passed\n";
