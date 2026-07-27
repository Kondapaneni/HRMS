<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\AssessmentConstants;

/** @var \Slim\App $app */

// GET /api/employee/assessments - List assigned assessments for current employee
$app->get('/api/employee/assessments', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $sql = '
            SELECT 
                a.*,
                jsonb_array_length(a.selected_questions) as questions_count,
                (jsonb_array_length(a.selected_questions) * a.marks_per_question) as total_marks,
                (SELECT COUNT(*) FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.employee_id = :uid AND att.status != \'in_progress\') as attempts_used,
                (SELECT att.id FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.employee_id = :uid AND att.status = \'in_progress\' LIMIT 1) as in_progress_attempt_id,
                (SELECT att.percentage FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.employee_id = :uid AND att.status != \'in_progress\' ORDER BY att.percentage DESC LIMIT 1) as highest_score,
                (SELECT att.passed FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.employee_id = :uid AND att.status != \'in_progress\' ORDER BY att.percentage DESC LIMIT 1) as has_passed,
                (SELECT att.id FROM assessment_attempts att WHERE att.assessment_id = a.id AND att.employee_id = :uid AND att.status != \'in_progress\' ORDER BY att.end_time DESC LIMIT 1) as latest_attempt_id
            FROM assessments a
            WHERE a.status = \'Active\'
            ORDER BY a.created_at DESC
        ';
        $stmt = $conn->prepare($sql);
        $stmt->execute(['uid' => $user->id]);
        $assessments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($assessments as &$item) {
            $item['instructions'] = AssessmentConstants::DEFAULT_INSTRUCTIONS;
            $item['questions_count'] = (int)$item['questions_count'];
            $item['total_marks'] = (int)$item['total_marks'];
            $item['attempts_used'] = (int)$item['attempts_used'];
            $item['highest_score'] = $item['highest_score'] !== null ? round((float)$item['highest_score'], 1) : null;
            $item['has_passed'] = $item['has_passed'] === true || $item['has_passed'] === 'true' || $item['has_passed'] == 1 || $item['has_passed'] === 't';
            $item['attempts_remaining'] = $item['max_attempts'] > 0 ? max(0, (int)$item['max_attempts'] - $item['attempts_used']) : 999;
        }

        $response->getBody()->write(json_encode($assessments));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware([], 'employeeAssessments'));

// GET /api/employee/assessments/{id} - Get assessment details for instructions page
$app->get('/api/employee/assessments/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('SELECT id, title, department, duration_minutes, passing_percentage, max_attempts, marks_per_question, randomize_questions, randomize_options, result_visibility, assessment_date, selected_questions, status FROM assessments WHERE id = ? AND status = \'Active\'');
        $stmt->execute([$id]);
        $assessment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$assessment) {
            $response->getBody()->write(json_encode(['error' => 'Assessment not found or inactive']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        if (!empty($assessment['selected_questions']) && is_string($assessment['selected_questions'])) {
            $decoded = json_decode($assessment['selected_questions'], true);
            if (is_array($decoded)) $assessment['selected_questions'] = $decoded;
        }

        $response->getBody()->write(json_encode($assessment));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware([], 'employeeAssessments'));

// POST /api/employee/assessments/{id}/start - Start or resume an exam session
$app->post('/api/employee/assessments/{id}/start', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // Verify assignment and get assessment rules
        $stmt = $conn->prepare('SELECT * FROM assessments WHERE id = ? AND status = \'Active\'');
        $stmt->execute([$id]);
        $assessment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$assessment) {
            $response->getBody()->write(json_encode(['error' => 'Assessment not assigned or not available']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // Enforce Assessment Date if specified
        if (!empty($assessment['assessment_date'])) {
            $today = date('Y-m-d');
            if ($today !== $assessment['assessment_date']) {
                $response->getBody()->write(json_encode(['error' => 'This assessment is scheduled for ' . $assessment['assessment_date'] . '. You can only attempt it on that date. Today is ' . $today . '.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
            }
        }

        // Check if there is an in-progress attempt
        $attStmt = $conn->prepare('SELECT * FROM assessment_attempts WHERE assessment_id = ? AND employee_id = ? AND status = \'in_progress\' LIMIT 1');
        $attStmt->execute([$id, $user->id]);
        $attempt = $attStmt->fetch(PDO::FETCH_ASSOC);

        if (!$attempt) {
            // Check attempt limit
            $countStmt = $conn->prepare('SELECT COUNT(*) FROM assessment_attempts WHERE assessment_id = ? AND employee_id = ? AND status != \'in_progress\'');
            $countStmt->execute([$id, $user->id]);
            $attemptsUsed = (int)$countStmt->fetchColumn();

            if ($assessment['max_attempts'] > 0 && $attemptsUsed >= $assessment['max_attempts']) {
                $response->getBody()->write(json_encode(['error' => 'You have used all allowable attempts for this assessment.']));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
            }

            // Create new attempt
            $newNum = $attemptsUsed + 1;
            $insStmt = $conn->prepare('
                INSERT INTO assessment_attempts (assessment_id, employee_id, attempt_number, start_time, status, answers_data)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP, \'in_progress\', \'{}\'::jsonb)
                RETURNING id, start_time
            ');
            $insStmt->execute([$id, $user->id, $newNum]);
            $row = $insStmt->fetch(PDO::FETCH_ASSOC);
            $attemptId = $row['id'];
            $startTime = $row['start_time'];
            $savedAnswers = [];
        } else {
            $attemptId = $attempt['id'];
            $startTime = $attempt['start_time'];
            $savedAnswers = json_decode($attempt['answers_data'], true) ?: [];
        }

        // Fetch questions for this assessment
        $rawQs = json_decode($assessment['selected_questions'], true) ?: [];
        $selectedQs = [];
        foreach ($rawQs as $item) {
            if (is_array($item) && isset($item['id'])) {
                $selectedQs[] = (string)$item['id'];
            } elseif (is_string($item)) {
                $selectedQs[] = $item;
            }
        }
        $questions = [];
        
        if (!empty($selectedQs)) {
            $placeholders = implode(',', array_fill(0, count($selectedQs), '?'));
            $qStmt = $conn->prepare("
                SELECT id, question_text as title, question_type, options
                FROM department_question_bank
                WHERE id IN ($placeholders)
            ");
            $qStmt->execute($selectedQs);
            $fetchedQuestions = $qStmt->fetchAll(PDO::FETCH_ASSOC);

            // Reorder to match the selected_questions array
            $qMap = [];
            foreach ($fetchedQuestions as $q) {
                $qMap[$q['id']] = $q;
            }
            $orderNum = 1;
            foreach ($selectedQs as $qId) {
                if (isset($qMap[$qId])) {
                    $q = $qMap[$qId];
                    $q['order_num'] = $orderNum++;
                    $q['marks'] = (int)$assessment['marks_per_question'];
                    $questions[] = $q;
                }
            }
        }
        foreach ($questions as &$q) {
            $options = json_decode($q['options'], true) ?: [];
            if ($assessment['randomize_options'] === true || $assessment['randomize_options'] === 'true' || $assessment['randomize_options'] == 1 || $assessment['randomize_options'] === 't') {
                shuffle($options);
            }
            $q['options'] = $options;
            $q['marks'] = (int)$q['marks'];
            // Do NOT include correct_answers here for security!
        }

        if ($assessment['randomize_questions'] === true || $assessment['randomize_questions'] === 'true' || $assessment['randomize_questions'] == 1 || $assessment['randomize_questions'] === 't') {
            shuffle($questions);
        }

        // Calculate deadline timestamp in seconds
        $startEpoch = strtotime($startTime);
        $durationMins = (int)$assessment['duration_minutes'];
        $deadlineEpoch = $durationMins > 0 ? $startEpoch + ($durationMins * 60) : 0;

        $response->getBody()->write(json_encode([
            'attempt_id' => $attemptId,
            'assessment' => [
                'id' => $assessment['id'],
                'title' => $assessment['title'],
                'duration_minutes' => $durationMins,
                'passing_percentage' => (int)$assessment['passing_percentage'],
                'result_visibility' => $assessment['result_visibility'],
                'instructions' => AssessmentConstants::DEFAULT_INSTRUCTIONS
            ],
            'deadline_timestamp' => $deadlineEpoch,
            'server_time' => time(),
            'questions' => $questions,
            'saved_answers' => $savedAnswers
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware([], 'employeeAssessments'));

// PUT /api/employee/assessments/attempts/{attemptId}/save - Auto save progress
$app->put('/api/employee/assessments/attempts/{attemptId}/save', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $attemptId = $args['attemptId'];
    $data = json_decode($request->getBody()->getContents(), true);
    $answers = $data['answers'] ?? [];

    $db = new Database();
    $conn = $db->getConnection();

    try {
        $checkStmt = $conn->prepare('SELECT id FROM assessment_attempts WHERE id = ? AND employee_id = ? AND status = \'in_progress\'');
        $checkStmt->execute([$attemptId, $user->id]);
        if (!$checkStmt->fetch()) {
            $response->getBody()->write(json_encode(['error' => 'Attempt not found or already submitted']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $stmt = $conn->prepare('UPDATE assessment_attempts SET answers_data = ?::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND employee_id = ? AND status = \'in_progress\'');
        $stmt->execute([json_encode($answers), $attemptId, $user->id]);

        $response->getBody()->write(json_encode(['success' => true, 'timestamp' => time()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => 'Failed to save progress: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware([], 'employeeAssessments'));

// POST /api/employee/assessments/attempts/{attemptId}/submit - Submit and auto-grade MCQ answers
$app->post('/api/employee/assessments/attempts/{attemptId}/submit', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $attemptId = $args['attemptId'];
    $data = json_decode($request->getBody()->getContents(), true);
    $incomingAnswers = $data['answers'] ?? null;
    $proctoringVideoUrl = $data['proctoring_video_url'] ?? null;
    $submitReason = $data['submit_reason'] ?? 'manual';

    $db = new Database();
    $conn = $db->getConnection();
    $conn->beginTransaction();

    try {
        // Fetch attempt and assessment
        $attStmt = $conn->prepare('
            SELECT att.*, a.passing_percentage, a.result_visibility, a.id as assessment_id, a.selected_questions, a.marks_per_question
            FROM assessment_attempts att
            JOIN assessments a ON att.assessment_id = a.id
            WHERE att.id = ? AND att.employee_id = ? AND att.status = \'in_progress\'
        ');
        $attStmt->execute([$attemptId, $user->id]);
        $attempt = $attStmt->fetch(PDO::FETCH_ASSOC);

        if (!$attempt) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            $response->getBody()->write(json_encode(['error' => 'Attempt not found or already submitted']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $answers = $incomingAnswers !== null ? $incomingAnswers : (json_decode($attempt['answers_data'], true) ?: []);

        $rawQs = json_decode($attempt['selected_questions'], true) ?: [];
        $selectedQs = [];
        foreach ($rawQs as $item) {
            if (is_array($item) && isset($item['id'])) {
                $selectedQs[] = (string)$item['id'];
            } elseif (is_string($item)) {
                $selectedQs[] = (string)$item;
            }
        }
        $questions = [];
        if (!empty($selectedQs)) {
            $placeholders = implode(',', array_fill(0, count($selectedQs), '?'));
            $qStmt = $conn->prepare("
                SELECT id, correct_option, correct_options as correct_answers, question_text as title, options
                FROM department_question_bank
                WHERE id IN ($placeholders)
            ");
            $qStmt->execute($selectedQs);
            $questions = $qStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        if (empty($questions)) {
            throw new \Exception('No questions found for this assessment attempt.');
        }

        $totalScore = 0.0;
        $maxScore = 0.0;
        $evaluatedBreakdown = [];

        foreach ($questions as $q) {
            $qId = (string)$q['id'];
            $correctAnsRaw = json_decode($q['correct_answers'], true) ?: [];
            if (empty($correctAnsRaw) && isset($q['correct_option']) && $q['correct_option'] !== null && $q['correct_option'] !== '') {
                $correctAnsRaw = [ (int)$q['correct_option'] ];
            }
            $origOptions = json_decode($q['options'], true) ?: [];
            $marks = (float)$attempt['marks_per_question'];
            $maxScore += $marks;

            // Map correct answers from indices (e.g. [0]) or text to actual option text strings
            $cleanCorrect = [];
            foreach ($correctAnsRaw as $c) {
                if (is_numeric($c) && isset($origOptions[(int)$c])) {
                    $cleanCorrect[] = trim((string)$origOptions[(int)$c]);
                } else {
                    $cleanCorrect[] = trim((string)$c);
                }
            }

            // Robust answer lookup by string ID, int ID, or raw ID
            $userAnsObj = $answers[$qId] ?? $answers[$q['id']] ?? $answers[(int)$qId] ?? [];
            $userAnsList = is_array($userAnsObj) && isset($userAnsObj['answer']) ? $userAnsObj['answer'] : ($userAnsObj ?: []);
            if (!is_array($userAnsList)) {
                $userAnsList = [$userAnsList];
            }

            // Map user answers from indices (if any) or text to actual option text strings
            $cleanUser = [];
            foreach ($userAnsList as $u) {
                if (is_numeric($u) && isset($origOptions[(int)$u]) && !in_array((string)$u, $origOptions, true)) {
                    $cleanUser[] = trim((string)$origOptions[(int)$u]);
                } else {
                    $cleanUser[] = trim((string)$u);
                }
            }

            sort($cleanCorrect);
            sort($cleanUser);

            $isCorrect = ($cleanCorrect === $cleanUser) && !empty($cleanCorrect);
            $awarded = $isCorrect ? $marks : 0.0;
            $totalScore += $awarded;

            $evaluatedBreakdown[$qId] = [
                'answer' => $cleanUser,
                'is_correct' => $isCorrect,
                'marks_awarded' => $awarded,
                'max_marks' => $marks,
                'correct_answers' => $attempt['result_visibility'] !== 'hidden' ? $cleanCorrect : [],
                'title' => $q['title'],
                'options' => $origOptions
            ];
        }

        $percentage = $maxScore > 0 ? round(($totalScore / $maxScore) * 100, 2) : 0.0;
        $passed = $percentage >= (float)$attempt['passing_percentage'];

        // Update attempt record to completed/graded
        $upStmt = $conn->prepare('
            UPDATE assessment_attempts 
            SET status = \'graded\', end_time = CURRENT_TIMESTAMP, score = ?, total_marks = ?, percentage = ?, passed = ?, answers_data = ?::jsonb, proctoring_video_url = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ');
        $upStmt->execute([(int)$totalScore, (int)$maxScore, $percentage, $passed ? 'true' : 'false', json_encode($evaluatedBreakdown), $proctoringVideoUrl, $attemptId]);

        // If passed, update assignment status
        if ($passed) {
            $conn->prepare('UPDATE assessment_assignments SET status = \'completed\' WHERE assessment_id = ? AND employee_id = ?')->execute([$attempt['assessment_id'], $user->id]);
        }

        $conn->commit();

        // Build flat breakdown for frontend
        $breakdownArr = [];
        foreach ($evaluatedBreakdown as $qId => $item) {
            $breakdownArr[] = [
                'title' => $item['title'],
                'correct' => $item['is_correct'],
                'marks_earned' => $item['marks_awarded'],
                'marks_possible' => $item['max_marks']
            ];
        }

        $response->getBody()->write(json_encode([
            'message' => 'Assessment submitted and evaluated successfully!',
            'attempt_id' => $attemptId,
            'score' => (int)$totalScore,
            'total_marks' => (int)$maxScore,
            'percentage' => $percentage,
            'passed' => $passed,
            'passing_percentage' => (int)$attempt['passing_percentage'],
            'result_visibility' => $attempt['result_visibility'],
            'submit_reason' => $submitReason,
            'breakdown' => $attempt['result_visibility'] === 'immediate' ? $breakdownArr : []
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        if ($conn->inTransaction()) {
            $conn->rollBack();
        }
        $response->getBody()->write(json_encode(['error' => 'Evaluation failed: ' . $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware([], 'employeeAssessments'));

// Helper function for cleaning array values
function val($item) {
    return is_scalar($item) ? strval($item) : '';
}

// GET /api/employee/assessments/attempts/{attemptId}/result - Get result for graded attempt
$app->get('/api/employee/assessments/attempts/{attemptId}/result', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $attemptId = $args['attemptId'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        $stmt = $conn->prepare('
            SELECT att.*, a.title as assessment_title, a.result_visibility, a.passing_percentage
            FROM assessment_attempts att
            JOIN assessments a ON att.assessment_id = a.id
            WHERE att.id = ? AND att.employee_id = ? AND att.status != \'in_progress\'
        ');
        $stmt->execute([$attemptId, $user->id]);
        $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$attempt) {
            $response->getBody()->write(json_encode(['error' => 'Result not found or assessment is in progress']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $breakdown = json_decode($attempt['answers_data'], true) ?: [];

        $response->getBody()->write(json_encode([
            'attempt_id' => $attemptId,
            'assessment_title' => $attempt['assessment_title'],
            'total_score' => (float)$attempt['total_score'],
            'max_score' => (float)$attempt['max_score'],
            'percentage' => round((float)$attempt['percentage'], 1),
            'passed' => $attempt['passed'] === true || $attempt['passed'] === 'true' || $attempt['passed'] == 1 || $attempt['passed'] === 't',
            'passing_percentage' => (int)$attempt['passing_percentage'],
            'result_visibility' => $attempt['result_visibility'],
            'start_time' => $attempt['start_time'],
            'end_time' => $attempt['end_time'],
            'breakdown' => $attempt['result_visibility'] !== 'hidden' ? $breakdown : null
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware([], 'employeeAssessments'));

?>
