<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\AssessmentConstants;

/** @var \Slim\App $app */

// GET /api/admin/assessments - List all assessments (with department and search filters)
$app->get('/api/admin/assessments', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $department = trim($queryParams['department'] ?? '');
    $search = trim($queryParams['search'] ?? '');
    $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 50;
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $where = [];
        $params = [];

        if (!empty($department) && $department !== 'All') {
            $where[] = 'department = ?';
            $params[] = $department;
        }

        if (!empty($search)) {
            $where[] = '(title ILIKE ? OR department ILIKE ? OR description ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT id, title, department, duration_minutes, passing_percentage, max_attempts, marks_per_question, randomize_questions, randomize_options, result_visibility, status, assessment_date, questions_count, selected_questions, assigned_employee_ids, created_by, created_at, updated_at FROM assessments {$whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($params as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $assessments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = "SELECT COUNT(*) FROM assessments {$whereClause}";
        $stmtCount = $conn->prepare($countSql);
        $paramIndex = 1;
        foreach ($params as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

        foreach ($assessments as &$a) {
            $a['instructions'] = AssessmentConstants::DEFAULT_INSTRUCTIONS;
            if (!empty($a['selected_questions']) && is_string($a['selected_questions'])) {
                $decoded = json_decode($a['selected_questions'], true);
                if (is_array($decoded)) $a['selected_questions'] = $decoded;
            }
        }
        unset($a);

        $response->getBody()->write(json_encode([
            'data' => $assessments,
            'assessments' => $assessments,
            'total' => $totalCount
        ]));
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
    $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 50;
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $whereSql = "WHERE att.status != 'in_progress'";
        $params = [];
        if ($assessmentId) {
            $whereSql .= ' AND att.assessment_id = ?';
            $params[] = $assessmentId;
        }

        $sql = "
            SELECT att.*, 
                   att.score as total_score,
                   att.total_marks as max_score,
                   a.title as assessment_title, 
                   a.department as assessment_department,
                   a.passing_percentage,
                   COALESCE(e.\"firstName\" || ' ' || e.\"lastName\", u.\"firstName\" || ' ' || u.\"lastName\", 'Unknown Employee') as employee_name,
                   COALESCE(e.email, u.email, '') as employee_email,
                   COALESCE(e.department, u.department, 'General') as employee_department,
                   e.\"employeeId\" as employee_code
            FROM assessment_attempts att
            JOIN assessments a ON att.assessment_id = a.id
            LEFT JOIN employee e ON att.employee_id = e.\"userId\" OR att.employee_id = e.id
            LEFT JOIN users u ON att.employee_id = u.id
            {$whereSql}
            ORDER BY COALESCE(att.end_time, att.start_time) DESC
            LIMIT ? OFFSET ?
        ";

        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($params as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $attempts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = "SELECT COUNT(*) FROM assessment_attempts att {$whereSql}";
        $stmtCount = $conn->prepare($countSql);
        $paramIndex = 1;
        foreach ($params as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

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
        unset($att);

        $response->getBody()->write(json_encode([
            'data' => $attempts,
            'attempts' => $attempts,
            'total' => $totalCount
        ]));
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
        // 1. Storage cleanup is no longer needed since proctoring_video_url is removed

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
        $stmt = $conn->prepare('SELECT id, title, department, duration_minutes, passing_percentage, max_attempts, marks_per_question, randomize_questions, randomize_options, result_visibility, status, assessment_date, questions_count, selected_questions, assigned_employee_ids, created_by, created_at, updated_at FROM assessments WHERE id = ?');
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

        if (!empty($assessment['assigned_employee_ids']) && is_string($assessment['assigned_employee_ids'])) {
            $decoded = json_decode($assessment['assigned_employee_ids'], true);
            if (is_array($decoded)) $assessment['assigned_employee_ids'] = $decoded;
        }
        $assessment['instructions'] = AssessmentConstants::DEFAULT_INSTRUCTIONS;

        $response->getBody()->write(json_encode($assessment));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

function queueAssessmentAssignedEmail($conn, $assessmentId, $employeeIds) {
    if (empty($employeeIds) || !is_array($employeeIds)) {
        return;
    }

    try {
        $stmtA = $conn->prepare('SELECT title, duration_minutes, passing_percentage, questions_count, max_attempts FROM assessments WHERE id = ?');
        $stmtA->execute([$assessmentId]);
        $assessment = $stmtA->fetch(PDO::FETCH_ASSOC);
        if (!$assessment) {
            return;
        }

        $templatePath = __DIR__ . '/../src/Templates/assessment_assigned_email.html';
        if (!file_exists($templatePath)) {
            return;
        }
        $rawTemplate = file_get_contents($templatePath);

        $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:5173', '/');
        $assessmentLink = $frontendUrl . '/employee/assessments';

        $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
        $stmtUsers = $conn->prepare("SELECT id, \"firstName\", \"lastName\", email FROM users WHERE id IN ($placeholders) AND email IS NOT NULL AND email != ''");
        $stmtUsers->execute(array_values($employeeIds));
        $users = $stmtUsers->fetchAll(PDO::FETCH_ASSOC);

        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');

        foreach ($users as $u) {
            $employeeName = trim(($u['firstName'] ?? '') . ' ' . ($u['lastName'] ?? ''));
            if (empty($employeeName)) $employeeName = 'Employee';

            $body = $rawTemplate;
            $body = str_replace('{{employeeName}}', htmlspecialchars($employeeName), $body);
            $body = str_replace('{{assessmentTitle}}', htmlspecialchars($assessment['title'] ?? 'Assessment'), $body);
            $body = str_replace('{{durationMinutes}}', htmlspecialchars((string)($assessment['duration_minutes'] ?? 30)), $body);
            $body = str_replace('{{passingScore}}', htmlspecialchars((string)($assessment['passing_percentage'] ?? 70)), $body);
            $body = str_replace('{{totalQuestions}}', htmlspecialchars((string)($assessment['questions_count'] ?? 0)), $body);
            $body = str_replace('{{maxAttempts}}', htmlspecialchars((string)($assessment['max_attempts'] ?? 1)), $body);
            $body = str_replace('{{assessmentLink}}', htmlspecialchars($assessmentLink), $body);
            $body = str_replace('{{currentYear}}', date('Y'), $body);

            $subject = "New Assessment Assigned: " . ($assessment['title'] ?? 'Assessment');
            $stmtQueue->execute([$u['email'], $subject, $body]);
        }
    } catch (\Exception $e) {
        error_log('Failed to queue assessment assigned email: ' . $e->getMessage());
    }
}

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
    $assignedEmployeeIds = isset($data['assigned_employee_ids']) ? json_encode($data['assigned_employee_ids']) : null;
    $status = trim($data['status'] ?? 'Active');
    $questionsCount = is_array($data['selected_questions'] ?? null) ? count($data['selected_questions']) : 0;

    if (empty($title)) {
        $response->getBody()->write(json_encode(['error' => 'Title is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = 'INSERT INTO assessments (title, department, duration_minutes, passing_percentage, max_attempts, marks_per_question, randomize_questions, randomize_options, result_visibility, assessment_date, selected_questions, assigned_employee_ids, status, questions_count, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id';
        $stmt = $conn->prepare($sql);
        $stmt->execute([$title, $department, $duration, $passing, $maxAttempts, $marksPerQ, $randomizeQ, $randomizeO, $visibility, $assessmentDate, $selectedQs, $assignedEmployeeIds, $status, $questionsCount, $user->id]);
        $assessmentId = $stmt->fetchColumn();

        @unlink(sys_get_temp_dir() . '/assessments_meta_cache.json');

        if ($assessmentId && !empty($data['assigned_employee_ids']) && $status === 'Active') {
            queueAssessmentAssignedEmail($conn, $assessmentId, $data['assigned_employee_ids']);
        }

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
    $assignedEmployeeIds = isset($data['assigned_employee_ids']) ? json_encode($data['assigned_employee_ids']) : null;
    $status = trim($data['status'] ?? 'Active');
    $questionsCount = is_array($data['selected_questions'] ?? null) ? count($data['selected_questions']) : 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $prevAssignedStmt = $conn->prepare('SELECT assigned_employee_ids, status FROM assessments WHERE id = ?');
        $prevAssignedStmt->execute([$id]);
        $prevData = $prevAssignedStmt->fetch(PDO::FETCH_ASSOC);
        $prevAssigned = [];
        if ($prevData && !empty($prevData['assigned_employee_ids'])) {
            $dec = json_decode($prevData['assigned_employee_ids'], true);
            if (is_array($dec)) $prevAssigned = $dec;
        }

        $sql = 'UPDATE assessments SET title = ?, department = ?, duration_minutes = ?, passing_percentage = ?, max_attempts = ?, marks_per_question = ?, randomize_questions = ?, randomize_options = ?, result_visibility = ?, assessment_date = ?, selected_questions = ?, assigned_employee_ids = ?, status = ?, questions_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        $stmt = $conn->prepare($sql);
        $stmt->execute([$title, $department, $duration, $passing, $maxAttempts, $marksPerQ, $randomizeQ, $randomizeO, $visibility, $assessmentDate, $selectedQs, $assignedEmployeeIds, $status, $questionsCount, $id]);

        @unlink(sys_get_temp_dir() . '/assessments_meta_cache.json');

        $newAssigned = is_array($data['assigned_employee_ids'] ?? null) ? $data['assigned_employee_ids'] : [];
        $newlyAdded = array_diff($newAssigned, $prevAssigned);

        if (!empty($newlyAdded) && $status === 'Active') {
            queueAssessmentAssignedEmail($conn, $id, array_values($newlyAdded));
        }

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

// GET /api/admin/questions - List questions (optionally filter by department and search)
$app->get('/api/admin/questions', function (Request $request, Response $response, $args) {
    $queryParams = $request->getQueryParams();
    $department = trim($queryParams['department'] ?? '');
    $search = trim($queryParams['search'] ?? '');
    $limit = isset($queryParams['limit']) ? (int)$queryParams['limit'] : 50;
    $offset = isset($queryParams['offset']) ? (int)$queryParams['offset'] : (isset($queryParams['page']) ? (max(1, (int)$queryParams['page']) - 1) * $limit : 0);
    if ($limit <= 0) $limit = 50;
    if ($offset < 0) $offset = 0;

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $where = [];
        $params = [];

        if (!empty($department) && $department !== 'All') {
            $where[] = 'department = ?';
            $params[] = $department;
        }

        if (!empty($search)) {
            $where[] = '(question_text ILIKE ? OR department ILIKE ? OR options::text ILIKE ?)';
            $searchTerm = '%' . $search . '%';
            $params[] = $searchTerm;
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT id, department, question_type, question_text, options, correct_option, correct_options, created_by, created_at, updated_at FROM department_question_bank {$whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($sql);
        $paramIndex = 1;
        foreach ($params as $p) {
            $stmt->bindValue($paramIndex++, $p);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $countSql = "SELECT COUNT(*) FROM department_question_bank {$whereClause}";
        $stmtCount = $conn->prepare($countSql);
        $paramIndex = 1;
        foreach ($params as $p) {
            $stmtCount->bindValue($paramIndex++, $p);
        }
        $stmtCount->execute();
        $totalCount = (int)$stmtCount->fetchColumn();

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
        unset($q);

        $response->getBody()->write(json_encode([
            'data' => $questions,
            'questions' => $questions,
            'total' => $totalCount
        ]));
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
