<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

// Get Employee Payroll
/** @var \Slim\App $app */
$app->get('/api/employee/payroll', function (Request $request, Response $response, $args) {
    $decodedToken = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('SELECT id, "employeeId", year, month, "basicSalary", "netSalary", "totalEarnings", "totalDeductions", "detailsJson", "earningsJson", "deductionsJson", "createdAt" FROM payslips WHERE "employeeId" = ? ORDER BY year DESC, month DESC');
        $stmt->execute([$decodedToken->id]);
        $payslips = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode JSON fields for easier consumption by frontend
        foreach ($payslips as &$ps) {
            $ps['details'] = json_decode($ps['detailsJson'], true) ?: [];
            $ps['earnings'] = json_decode($ps['earningsJson'], true) ?: [];
            $ps['deductions'] = json_decode($ps['deductionsJson'], true) ?: [];
            unset($ps['detailsJson'], $ps['earningsJson'], $ps['deductionsJson']);
        }

        $response->getBody()->write(json_encode(['payslips' => $payslips]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }
})->add(new AuthMiddleware(['employee']));
