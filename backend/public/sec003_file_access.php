<?php
/**
 * SEC-003: authenticated, owner-checked access to private Supabase Storage.
 * HRMS uses its own JWT, not Supabase Auth. File routes accept a short-lived,
 * HttpOnly, same-site cookie minted from an already authenticated API request.
 */
use App\Config\Database;
use App\Utils\SessionVersion;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function sec003SafePath(string $path): bool {
    if ($path === '' || strlen($path) > 512 || str_contains($path, '\\')
        || str_contains($path, '//') || str_contains($path, "\0")) return false;
    if (!preg_match('~\A[\pL\pN][\pL\pN _.,()/-]*\z~u', $path)) return false;
    foreach (explode('/', $path) as $part) {
        if ($part === '' || $part === '.' || $part === '..') return false;
    }
    return true;
}

function sec003StorageUrl(string $base, string $bucket, string $path): string {
    return rtrim($base, '/') . '/storage/v1/object/authenticated/' . $bucket . '/'
        . implode('/', array_map('rawurlencode', explode('/', $path)));
}

function sec003Result(Response $response, int $status): Response {
    $response->getBody()->write($status === 401 ? 'Authentication required.'
        : ($status === 403 ? 'File access denied.' : 'File unavailable.'));
    return $response->withStatus($status)
        ->withHeader('Content-Type', 'text/plain; charset=utf-8')
        ->withHeader('Cache-Control', 'private, no-store');
}

function sec003Principal(Request $request, $conn): ?array {
    $auth = trim($request->getHeaderLine('Authorization'));
    if ($auth !== '') {
        if (!preg_match('/\ABearer\s+([A-Za-z0-9._-]+)\z/i', $auth, $parts)) return null;
        $token = $parts[1];
    } else {
        $token = (string) ($request->getCookieParams()['hrms_file_auth'] ?? '');
    }
    if ($token === '' || strlen($token) > 8192) return null;
    $secret = (string) ($_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?: '');
    if ($secret === '') return null;
    try {
        $claims = JWT::decode($token, new Key($secret, 'HS256'));
        // SEC-008: Document requests bypass the normal AuthMiddleware, so
        // reject scoped first-factor MFA JWTs before consulting the database.
        // Session tokens from older deployments may omit the type claim.
        if (
            (isset($claims->type) && $claims->type !== 'session') ||
            empty($claims->role)
        ) return null;
        $id = (string) ($claims->id ?? '');
        if (!preg_match('/\A[0-9a-f-]{36}\z/i', $id)) return null;
        $stmt = $conn->prepare('SELECT role, "isActive", token_version FROM public.users WHERE id::text = ? LIMIT 1');
        $stmt->execute([$id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user || !in_array($user['isActive'], [true, 1, '1', 't', 'true'], true)) return null;
        if (($user['role'] ?? '') !== $claims->role
            || !SessionVersion::matches($claims, $user)) return null;
        return ['id' => $id, 'role' => (string) $user['role']];
    } catch (Throwable $e) {
        return null;
    }
}

function sec003HasRow($conn, string $sql, array $params): bool {
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchColumn() !== false;
}

function sec003LoanPermission($conn, string $id, string $bucket, string $path): bool {
    $stmt = $conn->prepare('SELECT e."employeeId", e.branch,
        COALESCE(f."canLoanOrigination", false) AS can_loan,
        COALESCE(f."canBranchOperations", false) AS can_branch
        FROM public.employee e
        LEFT JOIN public.user_feature_access f ON f."userId" = e."userId"
        WHERE e."userId"::text = ? LIMIT 1');
    $stmt->execute([$id]);
    $employee = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$employee) return false;
    $loan = in_array($employee['can_loan'], [true, 1, '1', 't', 'true'], true);
    $branch = in_array($employee['can_branch'], [true, 1, '1', 't', 'true'], true);
    if (!$loan && !$branch) return false;

    if ($bucket === 'loan_documents') {
        $needle = '/Loan-Document/' . $path;
        $stmt = $conn->prepare('SELECT application_id FROM public.loan_documents
            WHERE RIGHT(url, LENGTH(?)) = ? LIMIT 1');
        $stmt->execute([$needle, $needle]);
        $applicationId = $stmt->fetchColumn();
        if ($applicationId === false) return false;
        $stmt = $conn->prepare('SELECT created_by, branch FROM public.loan_applications
            WHERE id::text = ? OR application_id = ? OR lead_id = ? LIMIT 1');
        $stmt->execute([$applicationId, $applicationId, $applicationId]);
    } else {
        $needle = '/Loan-Signature/' . $path;
        $stmt = $conn->prepare('SELECT created_by, branch FROM public.loan_applications
            WHERE POSITION(? IN COALESCE(signatures::text, \'\')) > 0 LIMIT 1');
        $stmt->execute([$needle]);
    }
    $application = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$application) return false;
    $owner = (string) ($application['created_by'] ?? '');
    if ($loan && ($owner === $id || $owner === (string) $employee['employeeId'])) return true;
    return $branch && !empty($employee['branch'])
        && (string) $application['branch'] === (string) $employee['branch'];
}

function sec003TrainingAssigned($conn, string $userId, string $needle): bool {
    $stmt = $conn->prepare('SELECT id FROM public.employee WHERE "userId"::text = ? LIMIT 1');
    $stmt->execute([$userId]);
    $employeeId = $stmt->fetchColumn();
    if (!$employeeId) return false;
    return sec003HasRow($conn, 'SELECT 1 FROM public.training_videos
        WHERE RIGHT(video_url, LENGTH(?)) = ?
        AND assigned_employee_ids @> ?::jsonb LIMIT 1',
        [$needle, $needle, json_encode([(string) $employeeId])]);
}

function sec003CanRead($conn, array $user, string $bucket, string $path): bool {
    $id = $user['id'];
    $role = $user['role'];
    if ($role === 'admin') return true;

    // Profile pictures are visible to other signed-in HRMS members, not the internet.
    if ($bucket === 'avatars') return in_array($role, ['employee', 'candidate', 'hr', 'manager'], true);

    if ($role === 'candidate') {
        if ($bucket === 'candidate_documents') {
            if (str_starts_with($path, $id . '/')) return true;
            $needle = '/Candidate-Document/' . $path;
            return sec003HasRow($conn, 'SELECT 1 FROM public.candidate_documents
                WHERE candidate_id::text = ? AND RIGHT(file_path, LENGTH(?)) = ? LIMIT 1',
                [$id, $needle, $needle]);
        }
        if ($bucket === 'resumes') {
            if (str_starts_with($path, 'Resume-' . $id . '-')) return true;
            $needle = '/Resume/' . $path;
            return sec003HasRow($conn, 'SELECT 1 FROM public.applications
                WHERE candidate_id::text = ? AND RIGHT(resume_url, LENGTH(?)) = ? LIMIT 1',
                [$id, $needle, $needle])
                || sec003HasRow($conn, 'SELECT 1 FROM public.candidate_profiles
                    WHERE user_id::text = ? AND POSITION(? IN resume_url::text) > 0 LIMIT 1',
                    [$id, $needle]);
        }
        if ($bucket === 'offer_letters') {
            // An old offer can be read by the candidate it was actually emailed to.
            $needle = '/Offer-Letter/' . $path;
            return sec003HasRow($conn, 'SELECT 1 FROM public.email_queue q
                JOIN public.users u ON LOWER(u.email) = LOWER(q.to_email)
                WHERE u.id::text = ? AND q.subject LIKE \'Job Offer:%\'
                AND POSITION(? IN q.body) > 0 LIMIT 1', [$id, $needle]);
        }
        return false;
    }

    if (!in_array($role, ['employee', 'hr', 'manager'], true)) return false;
    if ($bucket === 'expenses') {
        $needle = '/Bills/' . $path;
        return sec003HasRow($conn, 'SELECT 1 FROM public.expenses
            WHERE user_id::text = ? AND RIGHT(bill_url, LENGTH(?)) = ? LIMIT 1',
            [$id, $needle, $needle]);
    }
    if ($bucket === 'attendance') {
        $needle = '/Attendance/' . $path;
        return sec003HasRow($conn, 'SELECT 1 FROM public.attendance
            WHERE "employeeId"::text = ?
            AND (RIGHT("checkInPhoto", LENGTH(?)) = ?
                OR RIGHT("checkOutPhoto", LENGTH(?)) = ?) LIMIT 1',
            [$id, $needle, $needle, $needle, $needle])
            || sec003HasRow($conn, 'SELECT 1 FROM public.attendance_punches
                WHERE "employeeId"::text = ? AND RIGHT(photo, LENGTH(?)) = ? LIMIT 1',
                [$id, $needle, $needle]);
    }
    if (in_array($bucket, ['loan_documents', 'loan_signatures'], true)) {
        return sec003LoanPermission($conn, $id, $bucket, $path);
    }
    if ($bucket === 'training_videos') {
        return sec003TrainingAssigned($conn, $id, '/Training-Video/' . $path);
    }
    return false;
}

function sec003Serve(Request $request, Response $response, array $args,
    string $bucket, string $disposition = 'inline'): Response {
    $path = (string) ($args['filename'] ?? '');
    if (!sec003SafePath($path)) return sec003Result($response, 404);
    // Deny anonymously without requiring any database or Storage connection.
    if ($request->getHeaderLine('Authorization') === ''
        && empty($request->getCookieParams()['hrms_file_auth'])) {
        return sec003Result($response, 401);
    }
    try {
        $conn = (new Database())->getConnection();
        if (!$conn) return sec003Result($response, 503);
        $user = sec003Principal($request, $conn);
        if (!$user) return sec003Result($response, 401);
        if (!sec003CanRead($conn, $user, $bucket, $path)) return sec003Result($response, 403);
    } catch (Throwable $e) {
        error_log('SEC-003 file permission check failed');
        return sec003Result($response, 503);
    }

    $config = sec001Config();
    if (!$config) return sec003Result($response, 503);
    [$base, $key] = $config;
    $url = sec003StorageUrl($base, $bucket, $path);
    $requestHeaders = "apikey: " . $key . "\r\n";
    $range = $request->getHeaderLine('Range');
    if ($bucket === 'training_videos' && preg_match('/\Abytes=\d*-\d*\z/', $range)) {
        $requestHeaders .= "Range: " . $range . "\r\n";
    }
    $context = stream_context_create([
        'http' => [
            'method' => 'GET', 'header' => $requestHeaders,
            'timeout' => 30, 'follow_location' => 0,
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $stream = @fopen($url, 'rb', false, $context);
    if (!$stream) {
        error_log('SEC-003 private Storage GET failed for bucket ' . $bucket);
        return sec003Result($response, 404);
    }
    $filename = str_replace('"', '_', basename($path));
    if ($bucket === 'training_videos') {
        $headers = stream_get_meta_data($stream)['wrapper_data'] ?? [];
        foreach ($headers as $header) {
            if (preg_match('/\AHTTP\/\S+\s+(206)\b/', $header)) {
                $response = $response->withStatus(206);
            }
            if (preg_match('/\A(Content-Range|Content-Length|Accept-Ranges):\s*(.+)\z/i', $header, $parts)) {
                $response = $response->withHeader($parts[1], trim($parts[2]));
            }
        }
    }
    return $response
        ->withBody(new \Slim\Psr7\Stream($stream))
        ->withHeader('Content-Type', getMimeType($path))
        ->withHeader('Content-Disposition', $disposition . '; filename="' . $filename . '"')
        ->withHeader('Cache-Control', 'private, no-store, max-age=0')
        ->withHeader('Referrer-Policy', 'no-referrer')
        ->withHeader('X-Content-Type-Options', 'nosniff');
}
