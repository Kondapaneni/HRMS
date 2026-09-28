<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */
$app->post('/api/admin/chatbot/query', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $userId = $user->id;

    if ($user->role !== 'admin') {
        $response->getBody()->write(json_encode(['error' => 'Unauthorized access']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
    }

    $body = (array)$request->getParsedBody();
    $message = trim($body['message'] ?? '');
    $history = is_array($body['history'] ?? null) ? $body['history'] : [];

    if (empty($message)) {
        $response->getBody()->write(json_encode(['error' => 'Message is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    if (!$conn) {
        $response->getBody()->write(json_encode(['error' => 'Database connection unavailable']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(503);
    }

    // Fetch all active employees basic data
    $empStmt = $conn->query('
        SELECT e."employeeId", e."firstName", e."lastName", e.email, e.phone, e.department, e.position, e.status, e.branch, e.salary,
               m."firstName" as "managerFirstName", m."lastName" as "managerLastName"
        FROM employee e
        LEFT JOIN employee m ON e."managerId" = m.id::text
        ORDER BY e."firstName", e."lastName"
    ');
    $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);

    $contextText = "ALL EMPLOYEES DATA IN THE SYSTEM:\n";
    foreach ($employees as $emp) {
        $fullName = trim(($emp['firstName'] ?? '') . ' ' . ($emp['lastName'] ?? ''));
        $managerName = trim(($emp['managerFirstName'] ?? '') . ' ' . ($emp['managerLastName'] ?? ''));
        if (empty($managerName)) $managerName = 'None';
        
        $contextText .= "- Name: {$fullName}, EmpID: {$emp['employeeId']}, Email: {$emp['email']}, Phone: {$emp['phone']}, Dept: {$emp['department']}, Role: {$emp['position']}, Status: {$emp['status']}, Branch: {$emp['branch']}, Manager: {$managerName}, Salary: {$emp['salary']}\n";
    }

    $contextText .= "\nINSTRUCTIONS FOR ADMIN AI ASSISTANT:
- You are answering the Admin of the HRMS.
- You have full access to all employees' data provided above.
- When the Admin asks about an employee, answer comprehensively using the data above.
- You can count employees, list employees by department, branch, role, etc.
- Always use professional and clean text formatting.";

    $geminiApiKey = $_ENV['GEMINI_API_KEY'] ?? $_SERVER['GEMINI_API_KEY'] ?? getenv('GEMINI_API_KEY') ?? '';
    $aiResponseText = null;

    if (!empty($geminiApiKey)) {
        $aiResponseText = callGeminiAdminAssistant($geminiApiKey, $contextText, $message, $history);
    }

    if (empty($aiResponseText)) {
        $aiResponseText = "I am currently unable to process your request as the AI service is not properly configured.";
    }

    $suggestedActions = [
        "List all active employees",
        "How many employees are in the IT department?",
        "Show me all employees in the Corporate branch",
        "Who reports to the manager?"
    ];

    $response->getBody()->write(json_encode([
        'response' => $aiResponseText,
        'suggested_actions' => $suggestedActions
    ]));
    return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
})->add(new AuthMiddleware());

function callGeminiAdminAssistant($apiKey, $contextText, $userMessage, array $history = []) {
    $models = [
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash'
    ];

    $systemInstruction = "You are the Acme HRMS Admin AI Assistant. You are currently chatting with the Administrator inside their corporate portal.

CORE SCOPE & SELF DATA INSTRUCTION:
- You answer all questions regarding the organization and ALL employees' data.
- When they ask about employees, answer directly and accurately using the data provided below.
- You can summarize data, count employees, or list employees by specific criteria if asked.
- CRITICAL FORMATTING RULE: Do NOT include any emojis, emoticons, or symbol icons in your responses. Keep headers, lists, and status indicators purely textual, professional, and clean.
- Be concise, professional, friendly, and structured. Use markdown formatting (bold text, bullet points, numbers) for readability.

" . $contextText;

    $payload = [
        "system_instruction" => [
            "parts" => [["text" => $systemInstruction]]
        ],
        "contents" => []
    ];

    $slicedHistory = array_slice($history, -6);
    foreach ($slicedHistory as $h) {
        $role = ($h['role'] ?? '') === 'user' ? 'user' : 'model';
        $text = trim($h['content'] ?? '');
        if (!empty($text)) {
            $payload['contents'][] = [
                "role" => $role,
                "parts" => [["text" => $text]]
            ];
        }
    }

    $payload['contents'][] = [
        "role" => "user",
        "parts" => [["text" => $userMessage]]
    ];

    $jsonPayload = json_encode($payload);

    foreach ($models as $modelName) {
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$modelName}:generateContent?key=" . $apiKey;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonPayload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Content-Type: application/json",
            "x-goog-api-key: " . $apiKey
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_TIMEOUT, 12);

        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200 && !empty($raw)) {
            $res = json_decode($raw, true);
            $parts = $res['candidates'][0]['content']['parts'] ?? [];
            $textParts = [];
            foreach ($parts as $p) {
                if (!empty($p['text']) && empty($p['thought'])) {
                    $textParts[] = $p['text'];
                }
            }
            if (!empty($textParts)) {
                return trim(implode("\n", $textParts));
            }
        }
    }

    return null;
}
