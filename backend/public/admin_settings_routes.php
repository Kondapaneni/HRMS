<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// GET /api/admin/settings
$app->get('/api/admin/settings', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    
    $stmt = $conn->query('SELECT * FROM global_settings ORDER BY id ASC LIMIT 1');
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$settings) {
        // If no settings exist, initialize default settings
        $stmt = $conn->prepare('
            INSERT INTO global_settings (
                company_name, company_email, company_phone, address, 
                email_notifications, slack_notifications, session_timeout
            ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *
        ');
        $stmt->execute([
            'Acme HRMS', 'contact@acme-hrms.com', '+1 (555) 123-4567', 
            '123 Business Avenue, Tech District, San Francisco, CA 94107',
            'true', 'false', '30'
        ]);
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
                    company_name = ?, company_email = ?, company_phone = ?, address = ?,
                    email_notifications = ?, slack_notifications = ?, session_timeout = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ');
            $stmtUpdate->execute([
                $data['company_name'] ?? '',
                $data['company_email'] ?? '',
                $data['company_phone'] ?? '',
                $data['address'] ?? '',
                ($data['email_notifications'] ?? false) ? 'true' : 'false',
                ($data['slack_notifications'] ?? false) ? 'true' : 'false',
                $data['session_timeout'] ?? '30',
                $settingId
            ]);
        } else {
            $stmtInsert = $conn->prepare('
                INSERT INTO global_settings (
                    company_name, company_email, company_phone, address, 
                    email_notifications, slack_notifications, session_timeout
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ');
            $stmtInsert->execute([
                $data['company_name'] ?? '',
                $data['company_email'] ?? '',
                $data['company_phone'] ?? '',
                $data['address'] ?? '',
                ($data['email_notifications'] ?? false) ? 'true' : 'false',
                ($data['slack_notifications'] ?? false) ? 'true' : 'false',
                $data['session_timeout'] ?? '30'
            ]);
        }

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Settings updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

    } catch (Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['admin']));
