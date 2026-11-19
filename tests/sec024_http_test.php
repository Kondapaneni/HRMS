<?php
declare(strict_types=1);

// SEC-024: isolated, no-credentials error rendering and invalid-JWT regression.
// No database, Supabase project, Render service, or real account is contacted.
require __DIR__ . '/../backend/vendor/autoload.php';

use App\Middleware\AuthMiddleware;
use Slim\Factory\AppFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

function sec024Check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$factory = new ServerRequestFactory();
$privateMarker = 'SEC024_SYNTHETIC_INTERNAL_DETAILS_NOT_FOR_HTTP';

foreach (['route', 'middleware'] as $failureSource) {
    $app = AppFactory::create();
    $app->get('/test-error', function ($request, $response) use ($failureSource, $privateMarker) {
        if ($failureSource === 'route') {
            throw new RuntimeException($privateMarker . '_route');
        }
        $response->getBody()->write('ok');
        return $response;
    });
    if ($failureSource === 'middleware') {
        $app->add(function ($request, $handler) use ($privateMarker) {
            throw new RuntimeException($privateMarker . '_middleware');
        });
    }

    // The matching production registration must be after ALL middleware.
    $app->addErrorMiddleware(false, true, true);
    $response = $app->handle($factory->createServerRequest('GET', '/test-error'));
    $body = (string) $response->getBody();

    sec024Check($response->getStatusCode() === 500,
        'Unhandled ' . $failureSource . ' errors must return HTTP 500');
    sec024Check(!str_contains($body, $privateMarker)
        && !str_contains($body, 'Stack trace')
        && !str_contains($body, 'RuntimeException'),
        'Unhandled ' . $failureSource . ' errors must not reveal details');
}

$_ENV['JWT_SECRET'] = 'SEC024_SYNTHETIC_JWT_KEY_NEVER_DEPLOY';
putenv('JWT_SECRET=SEC024_SYNTHETIC_JWT_KEY_NEVER_DEPLOY');
$app = AppFactory::create();
$app->get('/secure', function ($request, $response) {
    $response->getBody()->write('private');
    return $response;
})->add(new AuthMiddleware(['employee']));
$app->addErrorMiddleware(false, true, true);

$invalidRequest = $factory->createServerRequest('GET', '/secure')
    ->withHeader('Authorization', 'Bearer bad.token');
$invalidResponse = $app->handle($invalidRequest);
$invalidBody = (string) $invalidResponse->getBody();

sec024Check($invalidResponse->getStatusCode() === 401,
    'Invalid bearer JWT must return HTTP 401');
sec024Check(str_contains($invalidBody, 'Invalid or expired session token.'),
    'Invalid JWT must return generic session message');
sec024Check(!str_contains($invalidBody, 'Secret empty?')
    && !str_contains($invalidBody, 'JWT_SECRET')
    && !str_contains($invalidBody, 'bad.token')
    && !str_contains($invalidBody, 'Firebase'),
    'Invalid JWT responses must not disclose token, key or verifier details');

echo "PASS SEC-024 isolated HTTP: route and middleware 500 sanitized; invalid JWT 401 redacted\n";
