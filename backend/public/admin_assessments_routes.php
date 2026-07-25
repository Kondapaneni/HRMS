<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;

/** @var \Slim\App $app */

// GET /api/admin/assessments/questions - List question bank
$app->get('/api/admin/assessments/questions', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();
    $params = $request->getQueryParams();
    $difficulty = $params['difficulty'] ?? '';

    try {
        $sql = 'SELECT id, title, question_type, difficulty, options, correct_answers, marks, created_at FROM assessment_question_bank WHERE 1=1';
        $bindings = [];

        if ($difficulty && $difficulty !== 'All') {
            $sql .= ' AND difficulty = ?';
            $bindings[] = $difficulty;
        }
        $sql .= ' ORDER BY created_at DESC';

        $stmt = $conn->prepare($sql);
        $stmt->execute($bindings);
        $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($questions as &$q) {
            $q['options'] = json_decode($q['options'], true) ?: [];
            $q['correct_answers'] = json_decode($q['correct_answers'], true) ?: [];
        }

        $response->getBody()->write(json_encode($questions));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// POST /api/admin/assessments/questions - Create a question
$app->post('/api/admin/assessments/questions', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $data = json_decode($request->getBody()->getContents(), true);

    $title = trim($data['title'] ?? '');
    $type = $data['question_type'] ?? 'mcq_single';
    $difficulty = $data['difficulty'] ?? 'Medium';
    $options = json_encode($data['options'] ?? []);
    $correctAnswers = json_encode($data['correct_answers'] ?? []);
    $marks = (int)($data['marks'] ?? 5);

    if (empty($title)) {
        $response->getBody()->write(json_encode(['error' => 'Question title is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('INSERT INTO assessment_question_bank (title, question_type, difficulty, options, correct_answers, marks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id');
        $stmt->execute([$title, $type, $difficulty, $options, $correctAnswers, $marks, $user->id]);
        $id = $stmt->fetchColumn();

        $response->getBody()->write(json_encode(['message' => 'Question created successfully', 'id' => $id]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// PUT /api/admin/assessments/questions/{id} - Update question
$app->put('/api/admin/assessments/questions/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);

    $title = trim($data['title'] ?? '');
    $type = $data['question_type'] ?? 'mcq_single';
    $difficulty = $data['difficulty'] ?? 'Medium';
    $options = json_encode($data['options'] ?? []);
    $correctAnswers = json_encode($data['correct_answers'] ?? []);
    $marks = (int)($data['marks'] ?? 5);

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('UPDATE assessment_question_bank SET title = ?, question_type = ?, difficulty = ?, options = ?, correct_answers = ?, marks = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$title, $type, $difficulty, $options, $correctAnswers, $marks, $id]);

        $response->getBody()->write(json_encode(['message' => 'Question updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// DELETE /api/admin/assessments/questions/{id}
$app->delete('/api/admin/assessments/questions/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('DELETE FROM assessment_question_bank WHERE id = ?');
        $stmt->execute([$id]);

        $response->getBody()->write(json_encode(['message' => 'Question deleted successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// GET /api/admin/assessments - List all assessments with summary stats
$app->get('/api/admin/assessments', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = '
            SELECT 
                a.*,
                (SELECT COUNT(*) FROM assessment_questions aq WHERE aq.assessment_id = a.id) as questions_count,
                (SELECT COUNT(*) FROM assessment_assignments aa WHERE aa.assessment_id = a.id) as assigned_count,
                (SELECT COUNT(*) FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.status != \'in_progress\') as attempts_count,
                (SELECT COALESCE(AVG(att.percentage), 0) FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.status != \'in_progress\') as avg_score,
                (SELECT COUNT(*) FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.passed = true) as passed_count
            FROM assessments a
            ORDER BY a.created_at DESC
        ';
        $stmt = $conn->query($sql);
        $assessments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($assessments as &$a) {
            $a['questions_count'] = (int)$a['questions_count'];
            $a['assigned_count'] = (int)$a['assigned_count'];
            $a['attempts_count'] = (int)$a['attempts_count'];
            $a['avg_score'] = round((float)$a['avg_score'], 1);
            $a['pass_rate'] = $a['attempts_count'] > 0 ? round(($a['passed_count'] / $a['attempts_count']) * 100, 1) : 0;
        }

        $response->getBody()->write(json_encode($assessments));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// GET /api/admin/assessments/analytics - Get overall analytics and recent attempts
$app->get('/api/admin/assessments/analytics', function (Request $request, Response $response, $args) {
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stats = [
            'total_assessments' => 0,
            'total_questions' => 0,
            'total_assigned' => 0,
            'total_attempts' => 0,
            'overall_pass_rate' => 0,
            'avg_score' => 0
        ];

        $stats['total_assessments'] = (int)$conn->query('SELECT COUNT(*) FROM assessments')->fetchColumn();
        $stats['total_questions'] = (int)$conn->query('SELECT COUNT(*) FROM assessment_question_bank')->fetchColumn();
        $stats['total_assigned'] = (int)$conn->query('SELECT COUNT(*) FROM assessment_assignments')->fetchColumn();

        $attQuery = $conn->query('SELECT COUNT(*) as cnt, AVG(percentage) as avg_pct, SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) as passed_cnt FROM assessment_attempts WHERE status != \'in_progress\'')->fetch(PDO::FETCH_ASSOC);
        $stats['total_attempts'] = (int)$attQuery['cnt'];
        $stats['avg_score'] = round((float)$attQuery['avg_pct'], 1);
        $stats['overall_pass_rate'] = $stats['total_attempts'] > 0 ? round(($attQuery['passed_cnt'] / $stats['total_attempts']) * 100, 1) : 0;

        // Recent attempts
        $recentStmt = $conn->query('
            SELECT att.*, a.title as assessment_title, u."firstName", u."lastName", u.department
            FROM assessment_attempts att
            JOIN assessments a ON att.assessment_id = a.id
            JOIN users u ON att.employee_id = u.id
            WHERE att.status != \'in_progress\'
            ORDER BY att.end_time DESC LIMIT 15
        ');
        $recentAttempts = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($recentAttempts as &$ra) {
            $ra['percentage'] = round((float)$ra['percentage'], 1);
            $ra['total_score'] = (float)$ra['total_score'];
            $ra['max_score'] = (float)$ra['max_score'];
        }

        $response->getBody()->write(json_encode(['stats' => $stats, 'recent_attempts' => $recentAttempts]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// GET /api/admin/assessments/{id} - Get single assessment details and its questions
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

        // Fetch questions
        $qStmt = $conn->prepare('
            SELECT q.*, aq.order_num, aq.marks as custom_marks
            FROM assessment_questions aq
            JOIN assessment_question_bank q ON aq.question_id = q.id
            WHERE aq.assessment_id = ?
            ORDER BY aq.order_num ASC
        ');
        $qStmt->execute([$id]);
        $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($questions as &$q) {
            $q['options'] = json_decode($q['options'], true) ?: [];
            $q['correct_answers'] = json_decode($q['correct_answers'], true) ?: [];
            $q['marks'] = (int)($q['custom_marks'] ?? $q['marks']);
        }
        $assessment['questions'] = $questions;

        // Fetch assignments
        $aStmt = $conn->prepare('
            SELECT aa.*, u."firstName", u."lastName", u.email, u.department, u.position
            FROM assessment_assignments aa
            JOIN users u ON aa.employee_id = u.id
            WHERE aa.assessment_id = ?
        ');
        $aStmt->execute([$id]);
        $assessment['assignments'] = $aStmt->fetchAll(PDO::FETCH_ASSOC);

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
    $description = $data['description'] ?? '';
    $duration = (int)($data['duration_minutes'] ?? 30);
    $passing = (int)($data['passing_percentage'] ?? 70);
    $maxAttempts = (int)($data['max_attempts'] ?? 1);
    $randomizeQ = !empty($data['randomize_questions']) ? 'true' : 'false';
    $randomizeO = !empty($data['randomize_options']) ? 'true' : 'false';
    $visibility = $data['result_visibility'] ?? 'immediate';
    $status = $data['status'] ?? 'published';
    $questionIds = $data['question_ids'] ?? []; // array of {id, marks} or IDs

    if (empty($title)) {
        $response->getBody()->write(json_encode(['error' => 'Title is required']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();
    $conn->beginTransaction();

    try {
        $stmt = $conn->prepare('INSERT INTO assessments (title, description, duration_minutes, passing_percentage, max_attempts, randomize_questions, randomize_options, result_visibility, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
        $stmt->execute([$title, $description, $duration, $passing, $maxAttempts, $randomizeQ, $randomizeO, $visibility, $status, $user->id]);
        $assessmentId = $stmt->fetchColumn();

        if (!empty($questionIds)) {
            $qInsert = $conn->prepare('INSERT INTO assessment_questions (assessment_id, question_id, order_num, marks) VALUES (?, ?, ?, ?)');
            foreach ($questionIds as $idx => $qItem) {
                $qId = is_array($qItem) ? $qItem['id'] : $qItem;
                $qMarks = is_array($qItem) ? ($qItem['marks'] ?? 5) : 5;
                $qInsert->execute([$assessmentId, $qId, $idx + 1, $qMarks]);
            }
        }

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Assessment created successfully', 'id' => $assessmentId]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    } catch (\Exception $e) {
        $conn->rollBack();
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));

// PUT /api/admin/assessments/{id} - Update assessment and its questions
$app->put('/api/admin/assessments/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);

    $title = trim($data['title'] ?? '');
    $description = $data['description'] ?? '';
    $duration = (int)($data['duration_minutes'] ?? 30);
    $passing = (int)($data['passing_percentage'] ?? 70);
    $maxAttempts = (int)($data['max_attempts'] ?? 1);
    $randomizeQ = !empty($data['randomize_questions']) ? 'true' : 'false';
    $randomizeO = !empty($data['randomize_options']) ? 'true' : 'false';
    $visibility = $data['result_visibility'] ?? 'immediate';
    $status = $data['status'] ?? 'published';
    $questionIds = $data['question_ids'] ?? null; // array of {id, marks} or IDs

    $db = new Database();
    $conn = $db->getConnection();
    $conn->beginTransaction();

    try {
        $stmt = $conn->prepare('UPDATE assessments SET title = ?, description = ?, duration_minutes = ?, passing_percentage = ?, max_attempts = ?, randomize_questions = ?, randomize_options = ?, result_visibility = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $stmt->execute([$title, $description, $duration, $passing, $maxAttempts, $randomizeQ, $randomizeO, $visibility, $status, $id]);

        if ($questionIds !== null) {
            $conn->prepare('DELETE FROM assessment_questions WHERE assessment_id = ?')->execute([$id]);
            if (!empty($questionIds)) {
                $qInsert = $conn->prepare('INSERT INTO assessment_questions (assessment_id, question_id, order_num, marks) VALUES (?, ?, ?, ?)');
                foreach ($questionIds as $idx => $qItem) {
                    $qId = is_array($qItem) ? $qItem['id'] : $qItem;
                    $qMarks = is_array($qItem) ? ($qItem['marks'] ?? 5) : 5;
                    $qInsert->execute([$id, $qId, $idx + 1, $qMarks]);
                }
            }
        }

        $conn->commit();
        $response->getBody()->write(json_encode(['message' => 'Assessment updated successfully']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $conn->rollBack();
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

// POST /api/admin/assessments/{id}/assign - Assign assessment to employees
$app->post('/api/admin/assessments/{id}/assign', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $id = $args['id'];
    $data = json_decode($request->getBody()->getContents(), true);
    $employeeIds = $data['employee_ids'] ?? [];
    $dueDate = !empty($data['due_date']) ? $data['due_date'] : null;

    if (empty($employeeIds) || !is_array($employeeIds)) {
        $response->getBody()->write(json_encode(['error' => 'Please select at least one employee']));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
    }

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('
            INSERT INTO assessment_assignments (assessment_id, employee_id, assigned_by, due_date, status)
            VALUES (?, ?, ?, ?, \'assigned\')
            ON CONFLICT (assessment_id, employee_id) DO UPDATE SET due_date = EXCLUDED.due_date, status = \'assigned\'
        ');

        $count = 0;
        foreach ($employeeIds as $empId) {
            $stmt->execute([$id, $empId, $user->id, $dueDate]);
            $count++;
        }

        $response->getBody()->write(json_encode(['message' => "Assessment assigned to {$count} employee(s) successfully"]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['admin'], 'adminAssessments'));



?>
