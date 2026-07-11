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

        \App\Config\LoggingPDO::$queryCount = 0;
        \App\Config\LoggingPDO::$queryTimeMs = 0.0;

        // Pass control to the next middleware/route
        $response = $handler->handle($request);

        $endTime = microtime(true);
        $endMemory = memory_get_usage();

        $executionTimeMs = round(($endTime - $startTime) * 1000, 2);
        $memoryUsedKb = round(($endMemory - $startMemory) / 1024, 2);
        
        $method = $request->getMethod();
        $uri = (string) $request->getUri();
        
        $queryCount = \App\Config\LoggingPDO::$queryCount;
        $queryTimeMs = round(\App\Config\LoggingPDO::$queryTimeMs, 2);
        
        $logMessage = sprintf(
            "[%s] %s %s - Time: %sms | DB Queries: %s (%sms) | Memory: %sKB\n",
            date('Y-m-d H:i:s'),
            $method,
            $uri,
            $executionTimeMs,
            $queryCount,
            $queryTimeMs,
            $memoryUsedKb
        );

        $logFile = __DIR__ . '/../../logs/performance.log';
        if (!is_dir(dirname($logFile))) {
            mkdir(dirname($logFile), 0777, true);
        }
        
        file_put_contents($logFile, $logMessage, FILE_APPEND);

        return $response;
    }
}
