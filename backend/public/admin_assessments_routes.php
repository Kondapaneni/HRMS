<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\AssessmentConstants;

/** @var \Slim\App $app */

// GET /api/admin/assessments - List all assessments
$app->get('/api/admin/assessments', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = 'SELECT * FROM assessments ORDER BY created_at DESC';
        $stmt = $conn->query($sql);
        $assessments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($assessments as &$a) {
            $a['instructions'] = AssessmentConstants::DEFAULT_INSTRUCTIONS;
            if (!empty($a['selected_questions']) && is_string($a['selected_questions'])) {
                $decoded = json_decode($a['selected_questions'], true);
                if (is_array($decoded)) $a['selected_questions'] = $decoded;
            }
        }

        $response->getBody()->write(json_encode($assessments));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// GET /api/admin/assessments/attempts - List all employee assessment attempts
$app->get('/api/admin/assessments/attempts', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $assessmentId = $queryParams['assessment_id'] ?? null;
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = '
            SELECT att.*, 
                   att.score as total_score,
                   att.total_marks as max_score,
                   a.title as assessment_title, 
                   a.department as assessment_department,
                   a.passing_percentage,
                   COALESCE(e."firstName" || \' \' || e."lastName", u."firstName" || \' \' || u."lastName", \'Unknown Employee\') as employee_name,
                   COALESCE(e.email, u.email, \'\') as employee_email,
                   COALESCE(e.department, u.department, \'General\') as employee_department,
                   e."employeeId" as employee_code
            FROM assessment_attempts att
            JOIN assessments a ON att.assessment_id = a.id
            LEFT JOIN employee e ON att.employee_id = e."userId" OR att.employee_id = e.id
            LEFT JOIN users u ON att.employee_id = u.id
            WHERE att.status != \'in_progress\'
        ';
        $params = [];
        if ($assessmentId) {
            $sql .= ' AND att.assessment_id = ?';
            $params[] = $assessmentId;
        }
        $sql .= ' ORDER BY COALESCE(att.end_time, att.start_time) DESC';

        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($attempts as &$att) {
            $att['score'] = isset($att['score']) ? (float)$att['score'] : 0;
            $att['total_score'] = $att['score'];
            $att['total_marks'] = isset($att['total_marks']) ? (float)$att['total_marks'] : 0;
            $att['max_score'] = $att['total_marks'];
            $att['percentage'] = isset($att['percentage']) ? round((float)$att['percentage'], 1) : 0;
            $att['passed'] = $att['passed'] === true || $att['passed'] === 'true' || $att['passed'] == 1 || $att['passed'] === 't';
            $rawData = json_decode($att['answers_data'] ?? '{}', true) ?: [];
            $breakdownArr = [];
            if (is_array($rawData)) {
                foreach ($rawData as $key => $val) {
                    if (is_array($val)) {
                        $breakdownArr[] = [
                            'title' => $val['title'] ?? "Question #".(count($breakdownArr)+1),
                            'correct' => !empty($val['is_correct']) || !empty($val['correct']),
                            'marks_earned' => $val['marks_awarded'] ?? ($val['marks_earned'] ?? 0),
                            'marks_possible' => $val['max_marks'] ?? ($val['marks_possible'] ?? 1),
                            'selected_answer' => $val['answer'] ?? ($val['selected_answer'] ?? ($val['user_answer'] ?? null)),
                            'correct_answers' => $val['correct_answers'] ?? ($val['correct_answer'] ?? ($val['correct_option'] ?? null)),
                            'options' => $val['options'] ?? []
                        ];
                    }
                }
            }
            $att['breakdown'] = $breakdownArr;
        }

        $response->getBody()->write(json_encode($attempts));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// DELETE /api/admin/assessments/attempts/{attemptId} - Reset / Delete attempt
$app->delete('/api/admin/assessments/attempts/{attemptId}', function (Request $request, Response $response, $args) {
    $attemptId = $args['attemptId'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // 1. Fetch proctoring_video_url to clean up storage
        $stmtSel = $conn->prepare('SELECT proctoring_video_url FROM assessment_attempts WHERE id = ?');
        $stmtSel->execute([$attemptId]);
        $row = $stmtSel->fetch(\PDO::FETCH_ASSOC);

        if ($row && !empty($row['proctoring_video_url']) && $row['proctoring_video_url'] !== 'UPLOAD_FAILED') {
            $videoFile = $row['proctoring_video_url'];
            $supabaseUrl = isset($_ENV['VITE_SUPABASE_URL']) ? $_ENV['VITE_SUPABASE_URL'] : '';
            $anonKey = isset($_ENV['VITE_SUPABASE_ANON_KEY']) ? $_ENV['VITE_SUPABASE_ANON_KEY'] : '';

            if (!empty($supabaseUrl) && !empty($anonKey)) {
                $deleteEndpoint = rtrim($supabaseUrl, '/') . '/storage/v1/object/proctoring_videos/' . rawurlencode($videoFile);
                $ch = curl_init($deleteEndpoint);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "Authorization: Bearer " . $anonKey,
                    "apikey: " . $anonKey
                ]);
                curl_exec($ch);
                curl_close($ch);
            }
        }

        // 2. Delete database attempt record
        $stmt = $conn->prepare('DELETE FROM assessment_attempts WHERE id = ?');
        $stmt->execute([$attemptId]);

        $response->getBody()->write(json_encode(['message' => 'Attempt record and video deleted successfully']));
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

        if (!empty($assessment['selected_questions']) && is_string($assessment['selected_questions'])) {
            $decoded = json_decode($assessment['selected_questions'], true);
            if (is_array($decoded)) $assessment['selected_questions'] = $decoded;
        }
        $assessment['instructions'] = AssessmentConstants::DEFAULT_INSTRUCTIONS;

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
    $department = trim($data['department'] ?? 'General');
    $duration = (int)($data['duration_minutes'] ?? 30);
    $passing = (int)($data['passing_percentage'] ?? 70);
    $maxAttempts = (int)($data['max_attempts'] ?? 1);
    $marksPerQ = (int)($data['marks_per_question'] ?? 1);
    $randomizeQ = !empty($data['randomize_questions']) ? 'true' : 'false';
    $randomizeO = !empty($data['randomize_options']) ? 'true' : 'false';
    $visibility = $data['result_visibility'] ?? 'immediate';
    $assessmentDate = !empty($data['assessment_date']) ? trim($data['assessment_date']) : null;
    $selectedQs = json_encode($data['selected_questions'] ?? []);
    $status = trim($data['status'] ?? 'Active');
    $questionsCount = is_array($data['selected_questions'] ?? null) ? count($data['selected_questions']) : 0;

    if (empty($title)) {
        $response->getBody()->write(json_encode(['error' => 'Title is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = 'INSERT INTO assessments (title, department, duration_minutes, passing_percentage, max_attempts, marks_per_question, randomize_questions, randomize_options, result_visibility, assessment_date, selected_questions, status, questions_count, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        $stmt = $conn->prepare($sql);
        $stmt->execute([$title, $department, $duration, $passing, $maxAttempts, $marksPerQ, $randomizeQ, $randomizeO, $visibility, $assessmentDate, $selectedQs, $status, $questionsCount, $user->id]);
        $assessmentId = $stmt->fetchColumn();

        @unlink(sys_get_temp_dir() . '/assessments_meta_cache.json');

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
    $department = trim($data['department'] ?? 'General');
    $duration = (int)($data['duration_minutes'] ?? 30);
    $passing = (int)($data['passing_percentage'] ?? 70);
    $maxAttempts = (int)($data['max_attempts'] ?? 1);
    $marksPerQ = (int)($data['marks_per_question'] ?? 1);
    $randomizeQ = !empty($data['randomize_questions']) ? 'true' : 'false';
    $randomizeO = !empty($data['randomize_options']) ? 'true' : 'false';
    $visibility = $data['result_visibility'] ?? 'immediate';
    $assessmentDate = !empty($data['assessment_date']) ? trim($data['assessment_date']) : null;
    $selectedQs = json_encode($data['selected_questions'] ?? []);
    $status = trim($data['status'] ?? 'Active');
    $questionsCount = is_array($data['selected_questions'] ?? null) ? count($data['selected_questions']) : 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = 'UPDATE assessments SET title = ?, department = ?, duration_minutes = ?, passing_percentage = ?, max_attempts = ?, marks_per_question = ?, randomize_questions = ?, randomize_options = ?, result_visibility = ?, assessment_date = ?, selected_questions = ?, status = ?, questions_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        $stmt = $conn->prepare($sql);
        $stmt->execute([$title, $department, $duration, $passing, $maxAttempts, $marksPerQ, $randomizeQ, $randomizeO, $visibility, $assessmentDate, $selectedQs, $status, $questionsCount, $id]);

        @unlink(sys_get_temp_dir() . '/assessments_meta_cache.json');

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

        @unlink(sys_get_temp_dir() . '/assessments_meta_cache.json');

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
