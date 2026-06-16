<?php

namespace App\Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Http\Message\ResponseInterface as Response;

class AuditMiddleware
{
    /**
     * Audit middleware invokable class
     *
     * @param  Request  $request PSR-7 request
     * @param  RequestHandler $handler PSR-15 request handler
     *
     * @return Response
     */
    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        // Add before route action
        $before = microtime(true);
        $method = $request->getMethod();
        $path = $request->getUri()->getPath();

        // Process the request
        $response = $handler->handle($request);

        // Add after route action
        $after = microtime(true);
        $duration = $after - $before;

        // In a real application, you might want to log this to the database
        // using the App\Config\Database class.
        error_log(sprintf("AUDIT: [%s] %s took %f seconds", $method, $path, $duration));

        return $response;
    }
}
