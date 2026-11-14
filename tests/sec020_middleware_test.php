<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';

use App\Middleware\MaintenanceMiddleware;
use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Response as SlimResponse;

if (getenv('DB_DATABASE') !== 'sec020_test'
    || !str_starts_with((string)getenv('JWT_SECRET'), 'SEC020_TEST_ONLY_')) {
    fwrite(STDERR, "SEC-020 requires isolated test database and JWT key\n");
    exit(1);
}
foreach (['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET'] as $key) {
    $_ENV[$key] = (string)getenv($key);
}

function token020(string $id, string $role, ?string $type = null): string
{
    $payload = [
        'iss' => 'acme_hrms',
        'id' => $id, 'role' => $role, 'email' => 'test@example.invalid',
        'iat' => time(), 'exp' => time() + 360,
    ];
    if ($type !== null) $payload['type'] = $type;
    return JWT::encode($payload, $_ENV['JWT_SECRET'], 'HS256');
}

function request020(string $method, string $path, ?string $token = null): ResponseInterface
{
    $request = (new ServerRequestFactory())->createServerRequest($method, $path);
    if ($token !== null) {
        $request = $request->withHeader('Authorization', 'Bearer ' . $token);
    }
    $handler = new class implements RequestHandlerInterface {
        public function handle(ServerRequestInterface $request): ResponseInterface
        {
            return new SlimResponse(200);
        }
    };
    return (new MaintenanceMiddleware())->process($request, $handler);
}

function expect020(string $label, int $status, string $method, string $path, ?string $token = null): void
{
    $res = request020($method, $path, $token);
    if ($res->getStatusCode() !== $status) {
        fwrite(STDERR, "FAIL: {$label}, expected {$status}, got {$res->getStatusCode()}\n");
        exit(1);
    }
    if ($status === 503) {
        $error = json_decode((string)$res->getBody(), true);
        if ($error !== ['error' => 'Service temporarily unavailable during maintenance.']
            || $res->getHeaderLine('Cache-Control') !== 'no-store'
            || $res->getHeaderLine('Retry-After') !== '30') {
            fwrite(STDERR, "FAIL: {$label} leaked details or omitted 503 headers\n");
            exit(1);
        }
    }
    echo "PASS: {$label} ({$status})\n";
}

$pdo = new PDO(
    'pgsql:host=127.0.0.1;port=' . $_ENV['DB_PORT'] . ';dbname=sec020_test',
    $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
$admin = token020('sec020-admin', 'admin');
$typedAdmin = token020('sec020-admin', 'admin', 'session');
$employee = token020('sec020-employee', 'employee');
$demoted = token020('sec020-demoted', 'admin');
$disabled = token020('sec020-disabled', 'admin');
$pendingMfa = token020('sec020-admin', 'admin', 'mfa_pending');

// Disabled maintenance must NOT change existing route outcomes.
expect020('Normal mode allows a protected route through to its own auth', 200,
    'GET', '/api/employee/profile');
expect020('Normal mode does not block candidate application writes', 200,
    'POST', '/api/candidate/applications');
foreach ([false, 0, '0', 'f', 'false', null] as $falseFlag) {
    if (MaintenanceMiddleware::enabled($falseFlag)) {
        fwrite(STDERR, "FAIL: false maintenance flag treated as true\n");
        exit(1);
    }
}
foreach ([true, 1, '1', 't', 'true'] as $trueFlag) {
    if (!MaintenanceMiddleware::enabled($trueFlag)) {
        fwrite(STDERR, "FAIL: true maintenance flag treated as false\n");
        exit(1);
    }
}
echo "PASS: PostgreSQL/JSON maintenance flag interpretation\n";

// Enable maintenance live in the isolated database; the very next check
// must reject regular employees and candidates without client-side flags.
$pdo->exec('UPDATE public.global_settings SET maintenance_mode = TRUE');
expect020('Unauthenticated API denied during maintenance', 503, 'GET', '/api/me');
expect020('Employee API denied during maintenance', 503, 'GET', '/api/employee/profile', $employee);
expect020('Employee mutation denied during maintenance', 503,
    'POST', '/api/employee/attendance/punch', $employee);
expect020('Candidate API denied during maintenance', 503,
    'POST', '/api/candidate/applications', $employee);
expect020('Branch operations denied during maintenance', 503,
    'GET', '/api/branch-operations/applications', $employee);
expect020('Admin settings blocked for employee', 503, 'GET', '/api/admin/settings', $employee);
expect020('Admin settings blocked without token', 503, 'GET', '/api/admin/settings');
expect020('Admin password-only unfinished MFA token denied', 503,
    'GET', '/api/admin/settings', $pendingMfa);
expect020('Forged admin-claim token for demoted user denied', 503,
    'GET', '/api/admin/settings', $demoted);
expect020('Deactivated admin denied', 503, 'GET', '/api/admin/settings', $disabled);
expect020('Malformed JWT denied', 503, 'GET', '/api/admin/settings', 'invalid.token.data');
expect020('Active admin with existing no-type session allowed', 200,
    'GET', '/api/admin/settings', $admin);
expect020('Active admin with typed session allowed', 200,
    'POST', '/api/admin/settings', $typedAdmin);
expect020('Admin can inspect profile during maintenance', 200, 'GET', '/api/me', $admin);

// Essential login, MFA completion, recovery and news are deliberately exempt
// so a verified admin can sign in and turn maintenance OFF.
expect020('Public maintenance announcement still available', 200, 'GET', '/api/news');
expect020('Login recovery possible', 200, 'POST', '/api/login');
expect020('Email OTP login send possible', 200, 'POST', '/api/auth/otp/send');
expect020('Email OTP login verification possible', 200, 'POST', '/api/auth/otp/verify');
expect020('Admin MFA completion possible', 200, 'POST', '/api/auth/mfa/verify');
expect020('Forgot-password recovery possible', 200, 'POST', '/api/forgot-password');
expect020('Reset-password recovery possible', 200, 'POST', '/api/reset-password');
expect020('User logout possible', 200, 'POST', '/api/logout');
expect020('CORS preflight unaffected', 200, 'OPTIONS', '/api/employee/profile');
expect020('Version check unaffected', 200, 'GET', '/version.json');
expect020('Candidate registration not exempt', 503, 'POST', '/api/candidate/register');

// Verify maintenance switches off without a server restart or persisted
// browser bypass flag.
$pdo->exec('UPDATE public.global_settings SET maintenance_mode = FALSE');
expect020('Employees restored immediately after maintenance off', 200,
    'GET', '/api/employee/profile', $employee);

// Fail closed on settings schema failures, never allow an unknown status.
$pdo->exec('DROP TABLE public.global_settings');
expect020('Database/settings failure denies employee', 503,
    'GET', '/api/employee/profile', $employee);
expect020('Database/settings failure denies admin', 503,
    'GET', '/api/admin/settings', $admin);

echo "SEC-020 maintenance authorization synthetic PostgreSQL integration PASSED\n";
