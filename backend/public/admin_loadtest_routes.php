<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;

/** @var \Slim\App $app */
$app->post('/api/admin/loadtest', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $targetUrl = $data['url'] ?? '';
    $concurrentUsers = (int)($data['users'] ?? 10);

    if (empty($targetUrl) || filter_var($targetUrl, FILTER_VALIDATE_URL) === false) {
        $response->getBody()->write(json_encode(['error' => 'Valid absolute URL is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    // Safety cap
    if ($concurrentUsers > 200) {
        $concurrentUsers = 200;
    }
    if ($concurrentUsers < 1) {
        $concurrentUsers = 1;
    }

    // Extract authentication token cookie if present to forward it
    $cookies = $request->getCookieParams();
    $token = $cookies['token'] ?? '';
    $cookieHeader = '';
    if (!empty($token)) {
        $cookieHeader = 'token=' . $token;
    }

    // Initialize multi-cURL
    $multiHandle = curl_multi_init();
    $curlHandles = [];

    // Setup all requests
    for ($i = 0; $i < $concurrentUsers; $i++) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $targetUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30); // 30 sec timeout per request
        // Optional: Ignore SSL errors for local testing
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        
        // Add custom load test bypass header and cookie
        $headers = ['X-Load-Test: acme_loadtest_secret_2026'];
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        if (!empty($cookieHeader)) {
            curl_setopt($ch, CURLOPT_COOKIE, $cookieHeader);
        }

        curl_multi_add_handle($multiHandle, $ch);
        $curlHandles[] = $ch;
    }

    // Execute concurrent requests
    $active = null;
    do {
        $mrc = curl_multi_exec($multiHandle, $active);
    } while ($mrc == CURLM_CALL_MULTI_PERFORM);

    while ($active && $mrc == CURLM_OK) {
        if (curl_multi_select($multiHandle) != -1) {
            do {
                $mrc = curl_multi_exec($multiHandle, $active);
            } while ($mrc == CURLM_CALL_MULTI_PERFORM);
        }
    }

    // Process results
    $success = 0;
    $failed = 0;
    $times = [];
    
    foreach ($curlHandles as $ch) {
        $info = curl_getinfo($ch);
        $httpCode = $info['http_code'];
        $timeMs = round($info['total_time'] * 1000); // convert to milliseconds
        
        if ($httpCode >= 200 && $httpCode < 400) {
            $success++;
        } else {
            $failed++;
        }
        
        $times[] = $timeMs;
        
        curl_multi_remove_handle($multiHandle, $ch);
        curl_close($ch);
    }
    
    curl_multi_close($multiHandle);

    $avg = count($times) > 0 ? array_sum($times) / count($times) : 0;
    $min = count($times) > 0 ? min($times) : 0;
    $max = count($times) > 0 ? max($times) : 0;

    $report = [
        'total' => $concurrentUsers,
        'success' => $success,
        'failed' => $failed,
        'avg_ms' => round($avg),
        'min_ms' => $min,
        'max_ms' => $max,
        'url' => $targetUrl
    ];

    $response->getBody()->write(json_encode(['report' => $report]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware(['admin'], 'dashboard')); // Re-use dashboard permission or similar
