<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/settings
/** @var \Slim\App $app */
$app->get('/api/admin/settings', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    require_once __DIR__ . '/../src/Utils/Cache.php';
    $cacheKey = 'global_settings';
    $settings = \App\Utils\Cache::get($cacheKey);
    
    if ($settings === false) {
        $stmt = $conn->query('SELECT id, session_timeout, login_rate_limit_attempts, login_rate_limit_window, forgot_password_rate_limit_attempts, forgot_password_rate_limit_window, maps_rate_limit_attempts, maps_rate_limit_window, updated_at FROM global_settings ORDER BY id ASC LIMIT 1');
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($settings) {
            \App\Utils\Cache::set($cacheKey, $settings, 300); // 5 mins cache
        }
    }

    if (!$settings) {
        // If no settings exist, initialize default settings
        $stmt = $conn->prepare('
            INSERT INTO global_settings (
                session_timeout, 
                login_rate_limit_attempts, login_rate_limit_window, 
                forgot_password_rate_limit_attempts, forgot_password_rate_limit_window,
                maps_rate_limit_attempts, maps_rate_limit_window
            ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
        ');
        $stmt->execute(['30', 5, 15, 3, 60, 5, 10]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    $response->getBody()->write(json_encode($settings));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware(['admin']));

// POST /api/admin/settings
$app->post('/api/admin/settings', function (Request $request, Response $response, $args) {
    $data = $request->getParsedBody();
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $conn->beginTransaction();

        $stmt = $conn->query('SELECT id FROM global_settings ORDER BY id ASC LIMIT 1');
        $settingId = $stmt->fetchColumn();

        if ($settingId) {
            $stmtUpdate = $conn->prepare('
                UPDATE global_settings SET 
                    session_timeout = ?,
                    login_rate_limit_attempts = ?,
                    login_rate_limit_window = ?,
                    forgot_password_rate_limit_attempts = ?,
                    forgot_password_rate_limit_window = ?,
                    maps_rate_limit_attempts = ?,
                    maps_rate_limit_window = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ');
            $stmtUpdate->execute([
                $data['session_timeout'] ?? '30',
                $data['login_rate_limit_attempts'] ?? 5,
                $data['login_rate_limit_window'] ?? 15,
                $data['forgot_password_rate_limit_attempts'] ?? 3,
                $data['forgot_password_rate_limit_window'] ?? 60,
                $data['maps_rate_limit_attempts'] ?? 5,
                $data['maps_rate_limit_window'] ?? 10,
                $settingId
            ]);
        } else {
            $stmtInsert = $conn->prepare('
                INSERT INTO global_settings (
                    session_timeout, 
                    login_rate_limit_attempts, login_rate_limit_window, 
                    forgot_password_rate_limit_attempts, forgot_password_rate_limit_window,
                    maps_rate_limit_attempts, maps_rate_limit_window
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            $stmtInsert->execute([
                $data['session_timeout'] ?? '30',
                $data['login_rate_limit_attempts'] ?? 5,
                $data['login_rate_limit_window'] ?? 15,
                $data['forgot_password_rate_limit_attempts'] ?? 3,
                $data['forgot_password_rate_limit_window'] ?? 60,
                $data['maps_rate_limit_attempts'] ?? 5,
                $data['maps_rate_limit_window'] ?? 10
            ]);
        }

        $conn->commit();
        require_once __DIR__ . '/../src/Utils/Cache.php';
        \App\Utils\Cache::delete('global_settings');
        
        $response->getBody()->write(json_encode(['message' => 'Settings updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['admin']));
