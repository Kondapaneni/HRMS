<?php

namespace App\Middleware;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Psr\Http\Message\ResponseInterface as Response;
use Slim\Psr7\Response as SlimResponse;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Throwable;
use App\Config\Database;

class AuthMiddleware
{
    private array $requiredRoles;
    private $requiredFeature;

    public function __construct(array $requiredRoles = [], $requiredFeature = null)
    {
        $this->requiredRoles = $requiredRoles;
        $this->requiredFeature = $requiredFeature;
    }

    public function __invoke(Request $request, RequestHandler $handler): Response
    {
        $authorization = trim($request->getHeaderLine('Authorization'));
        if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches)) {
            return $this->jsonResponse('Missing or invalid Authorization token.', 401);
        }

        $secret = trim($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: '');
        if (strlen($secret) < 32) {
            error_log('AuthMiddleware: JWT_SECRET is missing or too short.');
            return $this->jsonResponse('Authentication service configuration error.', 503);
        }

        try {
            $decoded = JWT::decode($matches[1], new Key($secret, 'HS256'));
            if (empty($decoded->id)) {
                return $this->jsonResponse('Invalid or expired token.', 401);
            }
        } catch (Throwable $e) {
            error_log('AuthMiddleware: Token verification failed: ' . $e->getMessage());
            return $this->jsonResponse('Invalid or expired token.', 401);
        }

        try {
            $db = new Database();
            $conn = $db->getConnection();
            if (!$conn) {
                throw new \RuntimeException('Database connection unavailable.');
            }

            // Never trust the JWT's role or active flag as current authorization state.
            $stmt = $conn->prepare('SELECT id, email, role, "isActive" FROM users WHERE id = :uid LIMIT 1');
            $stmt->execute([':uid' => $decoded->id]);
            $account = $stmt->fetch(\PDO::FETCH_ASSOC);

            if (!$account) {
                return $this->jsonResponse('User account not found.', 401);
            }
            $active = in_array($account['isActive'], [true, 1, '1', 't', 'true'], true);
            if (!$active) {
                return $this->jsonResponse('Your account has been deactivated. Please contact your administrator.', 403);
            }

            $currentRole = (string)($account['role'] ?? '');
            $roleAllowed = empty($this->requiredRoles) || in_array($currentRole, $this->requiredRoles, true);

            if (!$roleAllowed && $this->requiredFeature && $currentRole === 'employee') {
                $featureMap = [
                    'attendance' => 'canAttendance', 'leave' => 'canLeave',
                    'payroll' => 'canPayroll', 'expenses' => 'canExpenses',
                    'employees' => 'canEmployees', 'recruitment' => 'canRecruitment',
                    'assets' => 'canAssets', 'loanOrigination' => 'canLoanOrigination',
                    'salesOrigination' => 'canSalesOrigination',
                    'branchOperations' => 'canBranchOperations',
                    'adminAssessments' => 'canAdminAssessments',
                ];
                $features = is_array($this->requiredFeature) ? $this->requiredFeature : [$this->requiredFeature];
                $columns = [];
                foreach ($features as $feature) {
                    $key = lcfirst(preg_replace('/^can/', '', (string)$feature));
                    if (isset($featureMap[$key])) $columns[] = $featureMap[$key];
                }
                if ($columns) {
                    $select = implode(', ', array_map(static fn($column) => '"' . $column . '"', array_unique($columns)));
                    $featureStmt = $conn->prepare("SELECT {$select} FROM user_feature_access WHERE \"userId\" = :uid LIMIT 1");
                    $featureStmt->execute([':uid' => $decoded->id]);
                    $access = $featureStmt->fetch(\PDO::FETCH_ASSOC) ?: [];
                    foreach ($columns as $column) {
                        if (in_array($access[$column] ?? false, [true, 1, '1', 't', 'true'], true)) {
                            $roleAllowed = true;
                            break;
                        }
                    }
                }
            }

            if (!$roleAllowed) {
                return $this->jsonResponse('Insufficient permissions.', 403);
            }

            // Audit context is best-effort only; authentication and permission checks above fail closed.
            try {
                $audit = $conn->prepare("
                    SELECT set_config('app.current_user_id', :uid, false),
                           set_config('app.current_user_email', :email, false),
                           set_config('app.current_user_role', :role, false),
                           set_config('app.ip_address', :ip, false),
                           set_config('app.user_agent', :ua, false),
                           set_config('app.session_id', :sid, false)
                ");
                $audit->execute([
                    ':uid' => (string)$account['id'],
                    ':email' => (string)$account['email'],
                    ':role' => $currentRole,
                    ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                    ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                    ':sid' => bin2hex(random_bytes(16)),
                ]);
            } catch (Throwable $e) {
                error_log('AuthMiddleware: Audit context unavailable: ' . $e->getMessage());
            }

            $decoded->role = $currentRole;
            $decoded->email = (string)$account['email'];
            $request = $request->withAttribute('user', $decoded);
        } catch (Throwable $e) {
            error_log('AuthMiddleware: Account verification failed; blocking request: ' . $e->getMessage());
            return $this->jsonResponse('Authentication service temporarily unavailable.', 503);
        }

        return $handler->handle($request);
    }

    private function jsonResponse(string $message, int $status): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode(['error' => $message]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
