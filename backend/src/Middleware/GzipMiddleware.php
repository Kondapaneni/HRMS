<?php

namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Stream;

class GzipMiddleware
{
    private const MINIMUM_SIZE = 1024;

    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $response = $handler->handle($request)->withAddedHeader('Vary', 'Accept-Encoding');
        $accept = strtolower($request->getHeaderLine('Accept-Encoding'));
        $quality = 0.0;
        foreach (explode(',', $accept) as $item) {
            $parts = array_map('trim', explode(';', $item));
            if (($parts[0] ?? '') === 'gzip') {
                $quality = 1.0;
                foreach (array_slice($parts, 1) as $param) {
                    if (preg_match('/^q=([0-9.]+)$/', $param, $m)) $quality = max(0.0, min(1.0, (float)$m[1]));
                }
            }
        }
        if ($quality <= 0 || strtoupper($request->getMethod()) === 'HEAD' ||
            $response->hasHeader('Content-Encoding') || in_array($response->getStatusCode(), [204, 304], true)) return $response;

        $type = strtolower($response->getHeaderLine('Content-Type'));
        if (!preg_match('~(application/json|text/|javascript|application/xml)~', $type)) return $response;
        $body = (string)$response->getBody();
        if (strlen($body) < self::MINIMUM_SIZE || !function_exists('gzencode')) return $response;

        $compressed = gzencode($body, 4);
        if ($compressed === false || strlen($compressed) >= strlen($body)) return $response;
        $resource = fopen('php://memory', 'r+');
        fwrite($resource, $compressed);
        rewind($resource);
        return $response->withBody(new Stream($resource))
            ->withHeader('Content-Encoding', 'gzip')
            ->withHeader('Content-Length', (string)strlen($compressed))
            ->withoutHeader('Transfer-Encoding');
    }
}
