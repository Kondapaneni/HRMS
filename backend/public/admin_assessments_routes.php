<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */

// GET /api/admin/assessments - List all assessments
$app->get('/api/admin/assessments', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = 'SELECT * FROM assessments ORDER BY created_at DESC';
        $stmt = $conn->query($sql);
        $assessments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response->getBody()->write(json_encode($assessments));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// GET /api/admin/assessments/{id} - Get single assessment details
$app->get('/api/admin/assessments/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('SELECT * FROM assessments WHERE id = ?');
        $stmt->execute([$id]);
        $assessment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$assessment) {
            $response->getBody()->write(json_encode(['error' => 'Assessment not found']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $response->getBody()->write(json_encode($assessment));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// POST /api/admin/assessments - Create new assessment
$app->post('/api/admin/assessments', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $data = json_decode($request->getBody()->getContents(), true);

    $title = trim($data['title'] ?? '');
    $duration = (int)($data['duration_minutes'] ?? 30);
    $passing = (int)($data['passing_percentage'] ?? 70);
    $maxAttempts = (int)($data['max_attempts'] ?? 1);
    $randomizeQ = !empty($data['randomize_questions']) ? 'true' : 'false';
    $randomizeO = !empty($data['randomize_options']) ? 'true' : 'false';
    $visibility = $data['result_visibility'] ?? 'immediate';

    if (empty($title)) {
        $response->getBody()->write(json_encode(['error' => 'Title is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('INSERT INTO assessments (title, duration_minutes, passing_percentage, max_attempts, randomize_questions, randomize_options, result_visibility, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
        $stmt->execute([$title, $duration, $passing, $maxAttempts, $randomizeQ, $randomizeO, $visibility, $user->id]);
        $assessmentId = $stmt->fetchColumn();

        $response->getBody()->write(json_encode(['message' => 'Assessment created successfully', 'id' => $assessmentId]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// PUT /api/admin/assessments/{id} - Update assessment
$app->put('/api/admin/assessments/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);

    $title = trim($data['title'] ?? '');
    $duration = (int)($data['duration_minutes'] ?? 30);
    $passing = (int)($data['passing_percentage'] ?? 70);
    $maxAttempts = (int)($data['max_attempts'] ?? 1);
    $randomizeQ = !empty($data['randomize_questions']) ? 'true' : 'false';
    $randomizeO = !empty($data['randomize_options']) ? 'true' : 'false';
    $visibility = $data['result_visibility'] ?? 'immediate';

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('UPDATE assessments SET title = ?, duration_minutes = ?, passing_percentage = ?, max_attempts = ?, randomize_questions = ?, randomize_options = ?, result_visibility = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$title, $duration, $passing, $maxAttempts, $randomizeQ, $randomizeO, $visibility, $id]);

        $response->getBody()->write(json_encode(['message' => 'Assessment updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// DELETE /api/admin/assessments/{id}
$app->delete('/api/admin/assessments/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('DELETE FROM assessments WHERE id = ?');
        $stmt->execute([$id]);

        $response->getBody()->write(json_encode(['message' => 'Assessment deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// ==========================================
// DEPARTMENT QUESTION BANK ROUTES (NO MARKS)
// ==========================================

// GET /api/admin/questions - List questions (optionally filter by department)
$app->get('/api/admin/questions', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $department = trim($queryParams['department'] ?? '');

    $db = new Database();
    $conn = $db->getConnection();

    try {
        if (!empty($department) && $department !== 'All') {
            $stmt = $conn->prepare('SELECT * FROM department_question_bank WHERE department = ? ORDER BY created_at DESC');
            $stmt->execute([$department]);
        } else {
            $stmt = $conn->query('SELECT * FROM department_question_bank ORDER BY created_at DESC');
        }
        $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Decode options and correct_options json
        foreach ($questions as &$q) {
            if (!empty($q['options']) && is_string($q['options'])) {
                $decoded = json_decode($q['options'], true);
                if (is_array($decoded)) {
                    $q['options'] = $decoded;
                }
            }
            if (!empty($q['correct_options']) && is_string($q['correct_options'])) {
                $decoded = json_decode($q['correct_options'], true);
                if (is_array($decoded)) {
                    $q['correct_options'] = $decoded;
                }
            }
            if (empty($q['correct_options']) || !is_array($q['correct_options'])) {
                $q['correct_options'] = [(int)($q['correct_option'] ?? 0)];
            }
            if (empty($q['question_type'])) {
                $q['question_type'] = 'mcq_single';
            }
        }

        $response->getBody()->write(json_encode($questions));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// POST /api/admin/questions - Create new question for a department (NO MARKS)
$app->post('/api/admin/questions', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $data = json_decode($request->getBody()->getContents(), true);

    $department = trim($data['department'] ?? '');
    $questionType = $data['question_type'] ?? 'mcq_single';
    $questionText = trim($data['question_text'] ?? '');
    $options = $data['options'] ?? [];
    
    $correctOptions = $data['correct_options'] ?? [];
    if (!is_array($correctOptions) || empty($correctOptions)) {
        $correctOptions = [ (int)($data['correct_option'] ?? 0) ];
    }
    $correctOptions = array_map('intval', array_values($correctOptions));
    $primaryCorrect = $correctOptions[0] ?? 0;

    if (empty($department) || empty($questionText) || empty($options) || !is_array($options)) {
        $response->getBody()->write(json_encode(['error' => 'Department, question text, and valid options are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $optionsJson = json_encode(array_values($options));
    $correctOptionsJson = json_encode($correctOptions);

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('INSERT INTO department_question_bank (department, question_type, question_text, options, correct_option, correct_options, created_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id');
        $stmt->execute([$department, $questionType, $questionText, $optionsJson, $primaryCorrect, $correctOptionsJson, $user->id]);
        $questionId = $stmt->fetchColumn();

        $response->getBody()->write(json_encode(['message' => 'Question created successfully', 'id' => $questionId]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// PUT /api/admin/questions/{id} - Update question (NO MARKS)
$app->put('/api/admin/questions/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);

    $department = trim($data['department'] ?? '');
    $questionType = $data['question_type'] ?? 'mcq_single';
    $questionText = trim($data['question_text'] ?? '');
    $options = $data['options'] ?? [];
    
    $correctOptions = $data['correct_options'] ?? [];
    if (!is_array($correctOptions) || empty($correctOptions)) {
        $correctOptions = [ (int)($data['correct_option'] ?? 0) ];
    }
    $correctOptions = array_map('intval', array_values($correctOptions));
    $primaryCorrect = $correctOptions[0] ?? 0;

    if (empty($department) || empty($questionText) || empty($options) || !is_array($options)) {
        $response->getBody()->write(json_encode(['error' => 'Department, question text, and valid options are required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $optionsJson = json_encode(array_values($options));
    $correctOptionsJson = json_encode($correctOptions);

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('UPDATE department_question_bank SET department = ?, question_type = ?, question_text = ?, options = ?, correct_option = ?, correct_options = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$department, $questionType, $questionText, $optionsJson, $primaryCorrect, $correctOptionsJson, $id]);

        $response->getBody()->write(json_encode(['message' => 'Question updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// DELETE /api/admin/questions/{id} - Delete question
$app->delete('/api/admin/questions/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('DELETE FROM department_question_bank WHERE id = ?');
        $stmt->execute([$id]);

        $response->getBody()->write(json_encode(['message' => 'Question deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

?>
