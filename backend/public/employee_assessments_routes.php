<?php

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Middleware\AuthMiddleware;
use App\Config\Database;
use App\Utils\AssessmentConstants;

/** @var \Slim\App $app */

function queueAssessmentResultEmail($conn, $attemptId, $userId, $assessmentId, $totalScore, $maxScore, $percentage, $passed) {
    try {
        $stmtUser = $conn->prepare('SELECT "firstName", "lastName", email FROM users WHERE id = ?');
        $stmtUser->execute([$userId]);
        $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['email'])) {
            return;
        }

        $stmtA = $conn->prepare('SELECT title, result_visibility FROM assessments WHERE id = ?');
        $stmtA->execute([$assessmentId]);
        $assessment = $stmtA->fetch(PDO::FETCH_ASSOC);
        $assessmentTitle = $assessment['title'] ?? 'Assessment';

        $templatePath = __DIR__ . '/../src/Templates/assessment_result_email.html';
        if (!file_exists($templatePath)) {
            return;
        }
        $rawTemplate = file_get_contents($templatePath);

        $frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? '', '/');
        $resultLink = !empty($frontendUrl) ? ($frontendUrl . '/employee/assessments/result?attemptId=' . $attemptId) : ('/employee/assessments/result?attemptId=' . $attemptId);

        $employeeName = trim(($user['firstName'] ?? '') . ' ' . ($user['lastName'] ?? ''));
        if (empty($employeeName)) $employeeName = 'Employee';

        $resultOutcome = $passed ? 'Passed' : 'Needs Retake';

        $body = $rawTemplate;
        $body = str_replace('{{employeeName}}', htmlspecialchars($employeeName), $body);
        $body = str_replace('{{assessmentTitle}}', htmlspecialchars($assessmentTitle), $body);
        $body = str_replace('{{finalPercentage}}', htmlspecialchars((string)round($percentage, 1)), $body);
        $body = str_replace('{{resultOutcome}}', htmlspecialchars($resultOutcome), $body);
        $body = str_replace('{{obtainedMarks}}', htmlspecialchars((string)$totalScore), $body);
        $body = str_replace('{{totalMarks}}', htmlspecialchars((string)$maxScore), $body);
        $body = str_replace('{{resultLink}}', htmlspecialchars($resultLink), $body);
        $body = str_replace('{{currentYear}}', date('Y'), $body);

        $subject = "Your Assessment Results: " . $assessmentTitle;

        $stmtQueue = $conn->prepare('INSERT INTO email_queue (to_email, subject, body) VALUES (?, ?, ?)');
        $stmtQueue->execute([$user['email'], $subject, $body]);
    } catch (\Exception $e) {
        error_log('Failed to queue assessment result email: ' . $e->getMessage());
    }
}

// GET /api/employee/assessments - List assigned assessments for current employee
$app->get('/api/employee/assessments', function (Request $request, Response $response, $args) {
    if (!ob_get_level() && extension_loaded('zlib') && strpos($request->getHeaderLine('Accept-Encoding'), 'gzip') !== false) {
        @ob_start('ob_gzhandler');
    }

    $user = $request->getAttribute('user');
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // 1. Backend Caching of static active assessment metadata (TTL 5 minutes)
        $cacheFile = sys_get_temp_dir() . '/assessments_meta_cache.json';
        $metaList = null;
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
            $metaList = json_decode(file_get_contents($cacheFile), true);
        }
        if (!is_array($metaList)) {
            $stmtMeta = $conn->query('SELECT id, title, department, duration_minutes, marks_per_question, max_attempts, assessment_date, created_at, status, COALESCE(questions_count, 0) AS questions_count, assigned_employee_ids FROM assessments WHERE status = \'Active\' ORDER BY created_at DESC');
            $metaList = $stmtMeta->fetchAll(PDO::FETCH_ASSOC);
            @file_put_contents($cacheFile, json_encode($metaList));
        }

        // 2. Fetch employee department and attempt stats in single scans
        $stmtUser = $conn->prepare('SELECT department FROM users WHERE id = ?');
        $stmtUser->execute([$user->id]);
        $userDept = trim((string)$stmtUser->fetchColumn());

        $stmtAtt = $conn->prepare('
            SELECT 
                assessment_id,
                COUNT(*) FILTER (WHERE status != \'in_progress\') AS attempts_used,
                MAX(id::text) FILTER (WHERE status = \'in_progress\') AS in_progress_attempt_id,
                MAX(percentage) FILTER (WHERE status != \'in_progress\') AS highest_score,
                COALESCE(BOOL_OR(passed) FILTER (WHERE status != \'in_progress\'), false) AS has_passed
            FROM assessment_attempts
            WHERE employee_id = ?
            GROUP BY assessment_id
        ');
        $stmtAtt->execute([$user->id]);
        $attemptsData = [];
        while ($row = $stmtAtt->fetch(PDO::FETCH_ASSOC)) {
            $attemptsData[$row['assessment_id']] = $row;
        }

        // 3. Merge and return only explicit required columns
        $assessments = [];
        foreach ($metaList as $meta) {
            $assignedIds = [];
            if (!empty($meta['assigned_employee_ids'])) {
                $decoded = json_decode($meta['assigned_employee_ids'], true);
                if (is_array($decoded)) {
                    $assignedIds = $decoded;
                }
            }

            // Only employees specifically assigned get access
            if (!in_array($user->id, $assignedIds)) {
                continue;
            }

            $att = $attemptsData[$meta['id']] ?? null;
            $attemptsUsed = $att ? (int)$att['attempts_used'] : 0;
            $maxAttempts = (int)$meta['max_attempts'];
            $questionsCount = (int)$meta['questions_count'];
            $marksPerQ = (int)$meta['marks_per_question'];
            $highestScore = ($att && $att['highest_score'] !== null) ? round((float)$att['highest_score'], 1) : null;
            $hasPassed = $att ? ($att['has_passed'] === true || $att['has_passed'] === 'true' || $att['has_passed'] == 1 || $att['has_passed'] === 't') : false;
            $inProgressId = ($att && !empty($att['in_progress_attempt_id'])) ? $att['in_progress_attempt_id'] : null;

            $assessments[] = [
                'id' => $meta['id'],
                'title' => $meta['title'],
                'department' => $meta['department'],
                'duration_minutes' => (int)$meta['duration_minutes'],
                'marks_per_question' => $marksPerQ,
                'max_attempts' => $maxAttempts,
                'assessment_date' => $meta['assessment_date'],
                'created_at' => $meta['created_at'],
                'status' => $meta['status'],
                'questions_count' => $questionsCount,
                'total_marks' => $questionsCount * $marksPerQ,
                'attempts_used' => $attemptsUsed,
                'attempts_remaining' => $maxAttempts > 0 ? max(0, $maxAttempts - $attemptsUsed) : 999,
                'highest_score' => $highestScore,
                'has_passed' => $hasPassed,
                'in_progress_attempt_id' => $inProgressId
            ];
        }

        $response->getBody()->write(json_encode($assessments));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    } catch (\Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(500);
    }
})->add(new AuthMiddleware(['employee', 'hr', 'manager']));

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
})->add(new AuthMiddleware(['employee', 'hr', 'manager']));

// POST /api/employee/assessments/{id}/start - Start or resume an exam session
$app->post('/api/employee/assessments/{id}/start', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $id = $args['id'];
    $db = new Database();
    $conn = $db->getConnection();

    try {
        // Verify assignment and get assessment rules
        $stmt = $conn->prepare('
            SELECT id, title, duration_minutes, passing_percentage, max_attempts, marks_per_question,
                   randomize_questions, randomize_options, result_visibility, assessment_date,
                   selected_questions, assigned_employee_ids
            FROM assessments
            WHERE id = ? AND status = \'Active\'
        ');
        $stmt->execute([$id]);
        $assessment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$assessment) {
            $response->getBody()->write(json_encode(['error' => 'Assessment not assigned or not available']));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        // Check if explicitly assigned to this employee
        $assignedIds = [];
        if (!empty($assessment['assigned_employee_ids'])) {
            $decoded = json_decode($assessment['assigned_employee_ids'], true);
            if (is_array($decoded)) {
                $assignedIds = $decoded;
            }
        }
        
        if (!in_array($user->id, $assignedIds)) {
            $response->getBody()->write(json_encode(['error' => 'You are not assigned to this assessment']));
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
        $attStmt = $conn->prepare('
            SELECT id, start_time, answers_data
            FROM assessment_attempts
            WHERE assessment_id = ? AND employee_id = ? AND status = \'in_progress\'
            LIMIT 1
        ');
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
})->add(new AuthMiddleware(['employee', 'hr', 'manager']));

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
})->add(new AuthMiddleware(['employee', 'hr', 'manager']));

// POST /api/employee/assessments/attempts/{attemptId}/submit - Submit and auto-grade MCQ answers
$app->post('/api/employee/assessments/attempts/{attemptId}/submit', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    $attemptId = $args['attemptId'];
    $data = json_decode($request->getBody()->getContents(), true);
    $incomingAnswers = $data['answers'] ?? null;
    // Remove proctoringVideoUrl reading from payload
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
            SET status = \'graded\', end_time = CURRENT_TIMESTAMP, score = ?, total_marks = ?, percentage = ?, passed = ?, answers_data = ?::jsonb, updated_at = CURRENT_TIMESTAMP, submit_reason = ?
            WHERE id = ?
        ');
        $upStmt->execute([(int)$totalScore, (int)$maxScore, $percentage, $passed ? 'true' : 'false', json_encode($evaluatedBreakdown), $submitReason, $attemptId]);

        $conn->commit();

        // Dispatch Assessment Results & Scorecard email
        queueAssessmentResultEmail($conn, $attemptId, $user->id, $attempt['assessment_id'], (int)$totalScore, (int)$maxScore, $percentage, $passed);

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
})->add(new AuthMiddleware(['employee', 'hr', 'manager']));

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
})->add(new AuthMiddleware(['employee', 'hr', 'manager']));

?>
