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

    public function __construct(array $requiredRoles = [])
    {
        $this->requiredRoles = $requiredRoles;
    }

    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $authHeader = $request->getHeader('Authorization');
        
        if (empty($authHeader)) {
            return $this->unauthorizedResponse("Missing Authorization Header");
        }

        $token = str_replace('Bearer ', '', $authHeader[0]);
        $secret = $_ENV['JWT_SECRET'] ?? '';

        try {
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            
            // Check roles if specified
            if (!empty($this->requiredRoles) && !in_array($decoded->role, $this->requiredRoles)) {
                return $this->forbiddenResponse("Insufficient permissions. Required roles: " . implode(', ', $this->requiredRoles));
            }

            // Append decoded token to request attributes
            $request = $request->withAttribute('user', $decoded);

            // Set Postgres session variables for audit triggers
            $db = new Database();
            $conn = $db->getConnection();
            if ($conn) {
                // We use set_config to set custom settings, 'true' means local to transaction.
                // Wait, PDO by default operates outside a transaction unless beginTransaction is called.
                // Actually, if it's outside a transaction, 'true' might not persist across queries. 
                // We should use 'false' to make it persist for the connection session, 
                // since the connection is created per HTTP request lifecycle.
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
                    ':sid' => bin2hex(random_bytes(16)) // Unique ID for this request
                ]);
            }

            return $handler->handle($request);

        } catch (Exception $e) {
            return $this->unauthorizedResponse("Invalid or expired token: " . $e->getMessage() . " (Secret empty? " . (empty($secret) ? 'yes' : 'no') . ")");
        }
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
