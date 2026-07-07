<?php
namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Stream;

class GzipMiddleware
{
    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $response = $handler->handle($request);

        // Check if client accepts gzip or deflate
        $acceptEncoding = $request->getHeaderLine('Accept-Encoding');
        if (strpos($acceptEncoding, 'gzip') !== false) {
            $encoding = 'gzip';
        } elseif (strpos($acceptEncoding, 'deflate') !== false) {
            $encoding = 'deflate';
        } else {
            return $response; // No compression supported by client
        }

        // Only compress text-based or json responses
        $contentType = $response->getHeaderLine('Content-Type');
        if (empty($contentType) || (
            strpos($contentType, 'application/json') === false &&
            strpos($contentType, 'text/html') === false &&
            strpos($contentType, 'text/plain') === false
        )) {
            return $response;
        }

        $body = (string)$response->getBody();
        if (empty($body)) {
            return $response;
        }

        // Compress the body
        $compressed = $encoding === 'gzip' ? gzencode($body, 9) : gzdeflate($body, 9);
        
        // Create a new stream for the compressed body
        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $compressed);
        rewind($stream);

        // Return new response with compressed body and headers
        return $response
            ->withBody(new Stream($stream))
            ->withHeader('Content-Encoding', $encoding)
            ->withHeader('Content-Length', (string)strlen($compressed))
            ->withoutHeader('Transfer-Encoding'); // Important for GZIP
    }
}
