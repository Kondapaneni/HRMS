<?php

namespace App\Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Http\Message\ResponseInterface as Response;
use Slim\Psr7\Response as SlimResponse;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;
use App\Config\Database;

class AuthMiddleware
{
    private $requiredRoles;
    private $requiredFeature;

    public function __construct(array $requiredRoles = [], ?string $requiredFeature = null)
    {
        $this->requiredRoles = $requiredRoles;
        $this->requiredFeature = $requiredFeature;
    }

    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $authHeader = $request->getHeader('Authorization');
        $token = null;
        if (!empty($authHeader)) {
            $token = str_replace('Bearer ', '', $authHeader[0]);
        }

        if (empty($token)) {
            return $this->unauthorizedResponse("Missing Authorization Token");
        }

        $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? '';

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (Exception $e) {
            return $this->unauthorizedResponse("Invalid or expired token: " . $e->getMessage() . " (Secret empty? " . (empty($secret) ? 'yes' : 'no') . ")");
        }

        // Check roles if specified
        $roleAllowed = false;
        if (empty($this->requiredRoles) || in_array($decoded->role, $this->requiredRoles)) {
            $roleAllowed = true;
        }

        if (!$roleAllowed && $this->requiredFeature && $decoded->role === 'employee') {
            try {
                $db = new Database();
                $conn = $db->getConnection();
                if ($conn) {
                    $featureCol = 'can' . ucfirst($this->requiredFeature);
                    // Check if column exists to prevent SQL errors, but we know the schema.
                    $stmtCheck = $conn->prepare("SELECT \"$featureCol\" FROM user_feature_access WHERE \"userId\" = :uid");
                    $stmtCheck->execute([':uid' => $decoded->id]);
                    $fa = $stmtCheck->fetch();
                    if ($fa && $fa[$featureCol]) {
                        $roleAllowed = true;
                    }
                }
            } catch (Exception $e) {
                error_log("AuthMiddleware: Failed to check feature access: " . $e->getMessage());
            }
        }

        if (!$roleAllowed) {
            return $this->forbiddenResponse("Insufficient permissions. Required roles: " . implode(', ', $this->requiredRoles) . ($this->requiredFeature ? " or feature access: {$this->requiredFeature}" : ""));
        }

        // Append decoded token to request attributes
        $request = $request->withAttribute('user', $decoded);

        // Set Postgres session variables for audit triggers
        try {
            $db = new Database();
            $conn = $db->getConnection();
            if ($conn) {
                // Check if user is active
                $stmtCheck = $conn->prepare('SELECT "isActive" FROM users WHERE id = :uid');
                $stmtCheck->execute([':uid' => $decoded->id ?? '']);
                $userRow = $stmtCheck->fetch();
                
                if ($userRow !== false) {
                    $userActiveStatus = $userRow['isActive'];
                    $isActive = ($userActiveStatus === true || $userActiveStatus === 'true' || $userActiveStatus === 't' || $userActiveStatus == 1);
                    if (!$isActive) {
                        return $this->forbiddenResponse("Your account has been deactivated. Please contact your administrator.");
                    }
                } else {
                    return $this->unauthorizedResponse("User account not found.");
                }

                $stmt = $conn->prepare("
                    SELECT 
                        set_config('app.current_user_id', :uid, false),
                        set_config('app.current_user_email', :email, false),
                        set_config('app.current_user_role', :role, false),
                        set_config('app.ip_address', :ip, false),
                        set_config('app.user_agent', :ua, false),
                        set_config('app.session_id', :sid, false)
                ");
                $stmt->execute([
                    ':uid' => $decoded->id ?? '',
                    ':email' => $decoded->email ?? '',
                    ':role' => $decoded->role ?? '',
                    ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                    ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                    ':sid' => bin2hex(random_bytes(16))
                ]);
            }
        } catch (Exception $e) {
            // Log but don't block the request — audit is non-critical
            error_log("AuthMiddleware: Failed to set audit context: " . $e->getMessage());
        }

        return $handler->handle($request);
    }

    private function unauthorizedResponse(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }

    private function forbiddenResponse(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(403);
    }
}
