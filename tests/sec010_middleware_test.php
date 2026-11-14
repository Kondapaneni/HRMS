<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';

use App\Middleware\AuthMiddleware;
use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as Handler;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response as SlimResponse;

foreach (['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET'] as $key) {
    $_ENV[$key] = (string) getenv($key);
}
if ($_ENV['DB_DATABASE'] !== 'sec010_test'
    || !str_starts_with($_ENV['JWT_SECRET'], 'SEC010_TEST_ONLY')) {
    fwrite(STDERR, "SEC-010 test environment restriction failed\n");
    exit(1);
}

function check010(bool $condition, string $description): void {
    if (!$condition) {
        fwrite(STDERR, "FAIL: {$description}\n");
        exit(1);
    }
    echo "PASS: {$description}\n";
}

function authResult010(string $id, string $role, array $roles, $feature = null): Response {
    $jwt = JWT::encode([
        'iat' => time(), 'exp' => time() + 600, 'id' => $id,
        'email' => $id . '@example.invalid', 'role' => $role
    ], $_ENV['JWT_SECRET'], 'HS256');
    $request = (new ServerRequestFactory())
        ->createServerRequest('GET', '/api/sec010-test')
        ->withHeader('Authorization', 'Bearer ' . $jwt);
    $handler = new class implements Handler {
        public function handle(Request $request): Response {
            return new SlimResponse(200);
        }
    };
    return (new AuthMiddleware($roles, $feature))($request, $handler);
}

function expect010(int $status, string $id, string $role, array $roles, $feature, string $label): void {
    $result = authResult010($id, $role, $roles, $feature);
    check010($result->getStatusCode() === $status, $label . " (expected {$status}, got {$result->getStatusCode()})");
    if ($status === 503) {
        $json = json_decode((string)$result->getBody(), true);
        check010($json === ['error' => 'Authorization service temporarily unavailable.'],
            $label . ': sanitized 503 JSON response');
    }
}

$features = [
    'attendance' => 'canAttendance', 'leave' => 'canLeave',
    'payroll' => 'canPayroll', 'expenses' => 'canExpenses',
    'employees' => 'canEmployees', 'recruitment' => 'canRecruitment',
    'assets' => 'canAssets', 'loanOrigination' => 'canLoanOrigination',
    'salesOrigination' => 'canSalesOrigination',
    'branchOperations' => 'canBranchOperations',
    'adminAssessments' => 'canAdminAssessments'
];

foreach ($features as $short => $explicit) {
    expect010(200, 'sec010-all', 'employee', ['admin'], $short,
        "whitelisted short feature {$short} is granted");
    expect010(200, 'sec010-all', 'employee', ['admin'], $explicit,
        "whitelisted direct feature {$explicit} is granted");
    expect010(403, 'sec010-none', 'employee', ['admin'], $short,
        "ungranted feature {$short} is denied");
}

expect010(200, 'sec010-admin', 'admin', ['admin'], null, 'admin role with no feature requirement');
expect010(200, 'sec010-admin', 'admin', ['admin'], 'loanOrigination', 'admin retains explicit role access');
expect010(403, 'sec010-candidate', 'candidate', ['admin'], 'loanOrigination',
    'candidate with a true DB feature flag never qualifies for staff fallback');
expect010(200, 'sec010-hr', 'hr', ['admin'], 'attendance', 'HR can use assigned feature');
expect010(200, 'sec010-manager', 'manager', ['admin'], 'branchOperations',
    'manager can use assigned feature');
expect010(200, 'sec010-loans', 'employee', ['admin'], ['loanOrigination', 'salesOrigination'],
    'one whitelisted grant among shared-module choices is sufficient');
expect010(403, 'sec010-none', 'employee', ['admin'], ['loanOrigination', 'salesOrigination'],
    'multiple ungranted features never allow access');
expect010(403, 'sec010-no-row', 'employee', ['admin'], 'loanOrigination',
    'missing feature access record fails closed');
expect010(403, 'sec010-disabled', 'employee', ['admin'], 'loanOrigination',
    'inactive employee with valid feature permission is blocked');
expect010(401, 'sec010-nonexistent', 'admin', ['admin'], null,
    'stale JWT without corresponding user record is blocked');

foreach ([
    'reports', 'canReports', 'loanOriginations', 'CANATTENDANCE',
    'loanOrigination" FROM users WHERE "isActive" = true --',
    '', 7, false, [], ['loanOrigination', 'invalidFeature'],
    [['loanOrigination']]
] as $unknown) {
    expect010(403, 'sec010-admin', 'admin', ['admin'], $unknown,
        'invalid feature policy denied even for admin: ' . json_encode($unknown));
    expect010(403, 'sec010-all', 'employee', ['admin'], $unknown,
        'invalid feature policy denied for employee: ' . json_encode($unknown));
}

$middleware = new AuthMiddleware(['admin'], 'loanOrigination');
$truth = new ReflectionMethod(AuthMiddleware::class, 'isTrueFlag');
foreach ([true, 1, '1', 't', 'true'] as $value) {
    check010($truth->invoke($middleware, $value) === true,
        'true-flag decoding accepts ' . var_export($value, true));
}
foreach ([false, 0, '0', 'f', 'false', '', null] as $value) {
    check010($truth->invoke($middleware, $value) === false,
        'false-flag decoding rejects ' . var_export($value, true));
}

// Force a real SQL authorization failure. No handler may run on query errors.
$pdo = new PDO('pgsql:host=127.0.0.1;port=' . $_ENV['DB_PORT'] . ';dbname=sec010_test',
    $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('ALTER TABLE user_feature_access DROP COLUMN "canSalesOrigination"');
expect010(503, 'sec010-all', 'employee', ['admin'], 'salesOrigination',
    'missing granted feature SQL column causes fail-closed 503');

$pdo->exec('DROP TABLE users');
expect010(503, 'sec010-admin', 'admin', ['admin'], null,
    'active user verification failure blocks admin role');
expect010(503, 'sec010-loans', 'employee', ['admin'], 'loanOrigination',
    'active user verification failure blocks previously granted employee');

echo "SEC-010 real PostgreSQL authorization and fail-closed regression PASSED\n";
