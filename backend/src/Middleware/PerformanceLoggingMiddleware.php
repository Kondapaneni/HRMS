<?php
namespace App\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;

class PerformanceLoggingMiddleware
{
    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $isDevelopment = ($_ENV['APP_ENV'] ?? 'production') === 'development';
        
        if (!$isDevelopment) {
            return $handler->handle($request);
        }

        $startTime = microtime(true);
        $startMemory = memory_get_usage();

        // Pass control to the next middleware/route
        $response = $handler->handle($request);

        $endTime = microtime(true);
        $endMemory = memory_get_usage();

        $executionTimeMs = round(($endTime - $startTime) * 1000, 2);
        $memoryUsedKb = round(($endMemory - $startMemory) / 1024, 2);
        
        $method = $request->getMethod();
        $uri = (string) $request->getUri();
        
        // Very basic query count estimation if we can't easily hook into PDO
        // This is a placeholder since PDO doesn't natively track query count without a wrapper.
        $queryCount = 'N/A (Requires PDO wrapper)';
        
        $logMessage = sprintf(
            "[%s] %s %s - Time: %sms | Memory: %sKB | Queries: %s\n",
            date('Y-m-d H:i:s'),
            $method,
            $uri,
            $executionTimeMs,
            $memoryUsedKb,
            $queryCount
        );

        $logFile = __DIR__ . '/../../logs/performance.log';
        if (!is_dir(dirname($logFile))) {
            mkdir(dirname($logFile), 0777, true);
        }
        
        file_put_contents($logFile, $logMessage, FILE_APPEND);

        return $response;
    }
}
