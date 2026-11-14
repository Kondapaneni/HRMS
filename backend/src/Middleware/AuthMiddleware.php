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
use App\Utils\SessionVersion;
use App\Utils\AccessToken;

class AuthMiddleware
{
    private $requiredRoles;
    private $requiredFeature;

    // SEC-010: Only these existing user_feature_access columns are legitimate
    // delegated permissions. Accept both the established short route key and
    // the explicit can* key; never derive SQL identifiers from arbitrary input.
    private const FEATURE_COLUMNS = [
        'attendance' => 'canAttendance',
        'canAttendance' => 'canAttendance',
        'leave' => 'canLeave',
        'canLeave' => 'canLeave',
        'payroll' => 'canPayroll',
        'canPayroll' => 'canPayroll',
        'expenses' => 'canExpenses',
        'canExpenses' => 'canExpenses',
        'employees' => 'canEmployees',
        'canEmployees' => 'canEmployees',
        'recruitment' => 'canRecruitment',
        'canRecruitment' => 'canRecruitment',
        'assets' => 'canAssets',
        'canAssets' => 'canAssets',
        'loanOrigination' => 'canLoanOrigination',
        'canLoanOrigination' => 'canLoanOrigination',
        'salesOrigination' => 'canSalesOrigination',
        'canSalesOrigination' => 'canSalesOrigination',
        'branchOperations' => 'canBranchOperations',
        'canBranchOperations' => 'canBranchOperations',
        'adminAssessments' => 'canAdminAssessments',
        'canAdminAssessments' => 'canAdminAssessments',
    ];

    /**
     * @param array $requiredRoles
     * @param string|array|null $requiredFeature
     */
    public function __construct(array $requiredRoles = [], $requiredFeature = null)
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
            return $this->unauthorizedResponse('Invalid or expired session token.');
        }

        // SEC-008: A first-factor MFA challenge JWT must NEVER authorize
        // protected routes, including routes whose role policies were hardened in SEC-009.
        // Legacy session tokens have no type; new scoped tokens have one.
        if (
            (isset($decoded->type) && $decoded->type !== 'session') ||
            empty($decoded->id) ||
            empty($decoded->role)
            || !AccessToken::bounded($decoded)
        ) {
            return $this->unauthorizedResponse('A completed sign-in session is required.');
        }

        // SEC-009: No route can be protected by an unspecified role policy.
        if (empty($this->requiredRoles)) {
            return $this->forbiddenResponse('No access policy configured for this route.');
        }

        // SEC-010: Validate all feature keys BEFORE considering even an admin
        // role. An unknown feature name is a policy configuration error, not an
        // invitation to generate a SQL identifier or silently allow the route.
        $featureColumns = $this->resolveFeatureColumns();
        if ($featureColumns === null) {
            return $this->forbiddenResponse('Invalid feature permission policy.');
        }

        $roleAllowed = in_array($decoded->role, $this->requiredRoles, true);
        $mayUseFeatureGrant = !$roleAllowed
            && !empty($featureColumns)
            && in_array($decoded->role, ['employee', 'hr', 'manager'], true);

        if (!$roleAllowed && !$mayUseFeatureGrant) {
            return $this->forbiddenResponse('Insufficient permissions.');
        }

        // Both feature grants AND account activation depend on live DB state.
        // Never let a null connection, failed query or missing user through.
        // Audit-context failures below are not authorization failures; they
        // are intentionally handled separately AFTER these checks succeed.
        try {
            $db = new Database();
            $conn = $db->getConnection();
            if (!$conn) {
                return $this->unavailableResponse();
            }

            if ($mayUseFeatureGrant) {
                // Only column identifiers resolved via FEATURE_COLUMNS may
                // enter SQL. User ID stays a bound parameter.
                foreach ($featureColumns as $featureCol) {
                    $stmt = $conn->prepare(
                        "SELECT \"{$featureCol}\" FROM user_feature_access WHERE \"userId\" = :uid"
                    );
                    $stmt->execute([':uid' => $decoded->id]);
                    $grants = $stmt->fetch();
                    if ($grants && $this->isTrueFlag($grants[$featureCol] ?? null)) {
                        $roleAllowed = true;
                        break;
                    }
                }
                if (!$roleAllowed) {
                    return $this->forbiddenResponse('Insufficient feature permissions.');
                }
            }

            $stmtCheck = $conn->prepare('SELECT role, "isActive", token_version FROM users WHERE id = :uid');
            $stmtCheck->execute([':uid' => $decoded->id]);
            $userRow = $stmtCheck->fetch();

            if ($userRow === false) {
                return $this->unauthorizedResponse('User account not found.');
            }
            if (!$this->isTrueFlag($userRow['isActive'] ?? null)) {
                return $this->forbiddenResponse('Your account has been deactivated. Please contact your administrator.');
            }
            // SEC-012: Revoked sessions, prior-password tokens, and stale role
            // claims never authorize the API, even when JWT exp is in the future.
            if (($userRow['role'] ?? '') !== $decoded->role
                || !SessionVersion::matches($decoded, $userRow)) {
                return $this->unauthorizedResponse('Session revoked. Please sign in again.');
            }
        } catch (\Throwable $e) {
            error_log('AuthMiddleware: Authorization database check failed: ' . $e->getMessage());
            return $this->unavailableResponse();
        }

        $request = $request->withAttribute('user', $decoded);

        // Record audit context on a best-effort basis only AFTER access is
        // granted and the account is confirmed active. An audit logging fault
        // cannot be mistaken for a successful feature/identity lookup.
        try {
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
                ':uid' => $decoded->id,
                ':email' => $decoded->email ?? '',
                ':role' => $decoded->role,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '',
                ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
                ':sid' => bin2hex(random_bytes(16))
            ]);
        } catch (\Throwable $e) {
            error_log('AuthMiddleware: Failed to set audit context: ' . $e->getMessage());
        }

        return $handler->handle($request);
    }

    /**
     * @return list<string>|null Whitelisted DB columns; null means invalid policy.
     */
    private function resolveFeatureColumns(): ?array
    {
        if ($this->requiredFeature === null) {
            return [];
        }

        $requested = is_array($this->requiredFeature)
            ? $this->requiredFeature
            : [$this->requiredFeature];

        if (!$requested) {
            return null;
        }

        $resolved = [];
        foreach ($requested as $feature) {
            if (!is_string($feature) || !array_key_exists($feature, self::FEATURE_COLUMNS)) {
                return null;
            }
            $resolved[] = self::FEATURE_COLUMNS[$feature];
        }
        return array_values(array_unique($resolved));
    }

    private function isTrueFlag($value): bool
    {
        // PostgreSQL PDO can return native bools or 't'/'f' strings.
        // Do not treat the non-empty string 'f' as granted.
        return in_array($value, [true, 1, '1', 't', 'true'], true);
    }

    private function unavailableResponse(): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'error' => 'Authorization service temporarily unavailable.'
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
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
