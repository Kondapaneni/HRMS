<?php
/**
 * SEC-001: Only the authenticated HRMS PHP backend may mutate Supabase Storage.
 * SUPABASE_SECRET_KEY is a server-only sb_secret_ key (never VITE_-prefixed).
 */
use App\Config\Database;
use App\Middleware\AuthMiddleware;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;

function sec001Reply(Response $response, int $status, array $body): Response {
    $response->getBody()->write(json_encode($body));
    return $response->withStatus($status)->withHeader('Content-Type', 'application/json');
}

function sec001ValidPath(string $path): bool {
    return strlen($path) > 0 && strlen($path) <= 240
        && preg_match('~^[A-Za-z0-9][A-Za-z0-9_./-]*$~D', $path) === 1
        && !str_contains($path, '..') && !str_contains($path, '//')
        && !str_ends_with($path, '/');
}

/**
 * SEC-017: The browser supplies only a requested ownership-scoped name.
 * The actual Storage object name is minted on the server with 128 bits of
 * CSPRNG entropy. Preserve scope prefixes and extensions because authorization,
 * existing file proxies and domain records depend on them.
 */
function sec017GeneratedPath(string $requestedPath): ?string {
    $dot = strrpos($requestedPath, '.');
    if ($dot === false) return null;
    $storedPath = substr($requestedPath, 0, $dot)
        . '-' . bin2hex(random_bytes(16))
        . substr($requestedPath, $dot);
    return sec001ValidPath($storedPath) ? $storedPath : null;
}

function sec001Flag($value): bool {
    return in_array($value, [true, 1, '1', 't', 'true'], true);
}

function sec001Permission($conn, object $user, string $bucket, string $path): bool {
    $id = (string) ($user->id ?? '');
    $role = (string) ($user->role ?? '');
    $buckets = ['avatars', 'resumes', 'candidate_documents', 'attendance', 'expenses',
        'holidays', 'job_descriptions', 'offer_letters', 'training_videos',
        'loan_documents', 'loan_signatures'];
    if ($id === '' || !in_array($bucket, $buckets, true)) return false;
    if ($role === 'admin') return true;
    if ($role === 'candidate') {
        return match ($bucket) {
            'resumes' => str_starts_with($path, 'Resume-' . $id . '-'),
            'avatars' => str_starts_with($path, 'candidate-' . $id . '-'),
            'candidate_documents' => str_starts_with($path, $id . '/'),
            default => false
        };
    }
    if ($role !== 'employee') return false;

    $stmt = $conn->prepare('SELECT e."employeeId", e.branch,
        COALESCE(f."canLoanOrigination", false) AS can_loan,
        COALESCE(f."canBranchOperations", false) AS can_branch
        FROM employee e LEFT JOIN user_feature_access f ON f."userId" = e."userId"
        WHERE e."userId" = :uid LIMIT 1');
    $stmt->execute([':uid' => $id]);
    $employee = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$employee) return false;
    $empId = (string) $employee['employeeId'];
    if ($bucket === 'avatars') return str_starts_with($path, $empId . '-');
    if ($bucket === 'attendance') return str_starts_with($path, 'attendance-' . $empId . '-');
    if ($bucket === 'expenses') return str_starts_with($path, $id . '/');
    if (!in_array($bucket, ['loan_documents','loan_signatures'], true)) return false;
    if (!sec001Flag($employee['can_loan']) && !sec001Flag($employee['can_branch'])) return false;

    $appId = $bucket === 'loan_signatures' ? explode('/', $path, 2)[0] : explode('_', $path, 2)[0];
    $stmt = $conn->prepare('SELECT created_by, branch FROM loan_applications
        WHERE id::text = :uuid_id OR application_id = :human_id LIMIT 1');
    $stmt->execute([':uuid_id' => $appId, ':human_id' => $appId]);
    $application = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$application) return false;
    $owner = (string) ($application['created_by'] ?? '');
    if (sec001Flag($employee['can_loan']) && ($owner === $id || $owner === $empId)) return true;
    return sec001Flag($employee['can_branch']) && !empty($employee['branch'])
        && (string) $employee['branch'] === (string) ($application['branch'] ?? '');
}

function sec001Mime(string $bucket, string $path, string $sample): ?string {
    $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $types = [
        'jpg' => ['image/jpeg', ['image/jpeg']],
        'jpeg' => ['image/jpeg', ['image/jpeg']],
        'png' => ['image/png', ['image/png']],
        'avif' => ['image/avif', ['image/avif']],
        'webp' => ['image/webp', ['image/webp']],
        'gif' => ['image/gif', ['image/gif']],
        'pdf' => ['application/pdf', ['application/pdf']],
        'doc' => ['application/msword', ['application/msword', 'application/x-ole-storage']],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ['application/zip','application/x-zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
        'mp4' => ['video/mp4', ['video/mp4']],
        'webm' => ['video/webm', ['video/webm']],
        'mov' => ['video/quicktime', ['video/quicktime']]
    ];
    $images = ['jpg','jpeg','png','webp','gif','avif'];
    $docs = ['pdf','doc','docx'];
    $allowed = match ($bucket) {
        'avatars','attendance','holidays','loan_documents','loan_signatures' => $images,
        'offer_letters' => ['pdf'],
        'job_descriptions','resumes' => $docs,
        'candidate_documents','expenses' => array_merge($images, $docs),
        'training_videos' => ['mp4','webm','mov'],
        default => []
    };
    if (!in_array($ext, $allowed, true) || !isset($types[$ext])) return null;
    $detected = (new finfo(FILEINFO_MIME_TYPE))->buffer($sample);
    return in_array($detected, $types[$ext][1], true) ? $types[$ext][0] : null;
}

function sec001Config(): ?array {
    $url = rtrim((string) ($_ENV['SUPABASE_URL'] ?? getenv('SUPABASE_URL')
        ?: ($_ENV['VITE_SUPABASE_URL'] ?? getenv('VITE_SUPABASE_URL') ?: '')), '/');
    $key = (string) ($_ENV['SUPABASE_SECRET_KEY'] ?? getenv('SUPABASE_SECRET_KEY') ?: '');
    if (!str_starts_with($key, 'sb_secret_') || !filter_var($url, FILTER_VALIDATE_URL)
        || parse_url($url, PHP_URL_SCHEME) !== 'https') return null;
    return [$url,$key];
}

/**
 * SEC-017: DELETE /storage/v1/object/{bucket} returns an array of deleted
 * objects. HTTP 2xx alone does not prove that the requested path existed or
 * was removed. The bucket_id field is optional in newer Supabase responses.
 */
function sec017DeleteResponseConfirmsPath(string $body, string $bucket, string $path): bool {
    $objects = json_decode($body, true);
    if (!is_array($objects) || !array_is_list($objects)) return false;
    foreach ($objects as $object) {
        if (!is_array($object) || ($object['name'] ?? null) !== $path) continue;
        if (array_key_exists('bucket_id', $object) && $object['bucket_id'] !== $bucket) continue;
        return true;
    }
    return false;
}

function sec001Call(string $url, string $key, string $method, $body, array $headers,
    int $size = 0, ?string $deletedBucket = null, ?string $deletedPath = null): bool {
    $ch = curl_init($url);
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 300,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => array_merge(['apikey: ' . $key], $headers),
    ];
    if ($method === 'POST') {
        $opts[CURLOPT_UPLOAD] = true;
        $opts[CURLOPT_CUSTOMREQUEST] = 'POST';
        $opts[CURLOPT_INFILE] = $body;
        $opts[CURLOPT_INFILESIZE] = $size;
    } else {
        $opts[CURLOPT_CUSTOMREQUEST] = 'DELETE';
        $opts[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $opts);
    $data = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    if ($data === false || $status < 200 || $status >= 300) {
        error_log('SEC-001 Storage error: HTTP ' . $status . ' ' . $error);
        return false;
    }
    if ($method === 'DELETE' && (
        $deletedBucket === null || $deletedPath === null ||
        !sec017DeleteResponseConfirmsPath($data, $deletedBucket, $deletedPath)
    )) {
        error_log('SEC-017 Storage DELETE response did not confirm exact object');
        return false;
    }
    return true;
}

$app->post('/api/storage/upload', function (Request $request, Response $response) {
    $q = $request->getQueryParams();
    $bucket = (string) ($q['bucket'] ?? '');
    $path = (string) ($q['path'] ?? '');
    if (!sec001ValidPath($path)) return sec001Reply($response, 400, ['error' => 'Invalid file path']);
    $conn = (new Database())->getConnection();
    if (!$conn || !sec001Permission($conn, $request->getAttribute('user'), $bucket, $path)) {
        return sec001Reply($response, 403, ['error' => 'Upload not permitted']);
    }
    // SEC-017: Validate request length and file signature before even inspecting
    // server-only Storage configuration. Rejected content never reaches Storage.
    $limit = $bucket === 'training_videos' ? 250 * 1024 * 1024 : 20 * 1024 * 1024;
    $length = (int) $request->getHeaderLine('Content-Length');
    if ($length <= 0) return sec001Reply($response, 411, ['error' => 'Content-Length required']);
    if ($length > $limit) return sec001Reply($response, 413, ['error' => 'File too large']);
    $input = fopen('php://input', 'rb');
    $tmp = tmpfile();
    if (!$input || !$tmp) return sec001Reply($response, 500, ['error' => 'Unable to read file']);
    $bytes = stream_copy_to_stream($input, $tmp, $limit + 1);
    fclose($input);
    if ($bytes !== $length || $bytes === 0) {
        fclose($tmp);
        return sec001Reply($response, 400, ['error' => 'Invalid upload length']);
    }
    rewind($tmp);
    $sample = fread($tmp, 4096);
    rewind($tmp);
    $mime = sec001Mime($bucket, $path, $sample);
    if (!$mime) {
        fclose($tmp);
        return sec001Reply($response, 415, ['error' => 'Unsupported or invalid file type']);
    }
    // Final path is unpredictable even when clients choose predictable names.
    $storedPath = sec017GeneratedPath($path);
    if ($storedPath === null) {
        fclose($tmp);
        return sec001Reply($response, 400, ['error' => 'Invalid file path']);
    }
    $config = sec001Config();
    if (!$config || !function_exists('curl_init')) {
        fclose($tmp);
        return sec001Reply($response, 503, ['error' => 'Storage is not configured']);
    }
    [$url,$key] = $config;
    $encoded = implode('/', array_map('rawurlencode', explode('/', $storedPath)));
    $ok = sec001Call($url . '/storage/v1/object/' . $bucket . '/' . $encoded,
        $key, 'POST', $tmp, ['Content-Type: ' . $mime, 'x-upsert: false', 'Expect:'], $bytes);
    fclose($tmp);
    if (!$ok) return sec001Reply($response, 502, ['error' => 'File upload failed']);
    return sec001Reply($response, 201, ['path' => $storedPath, 'key' => $bucket . '/' . $storedPath]);
})->add(new AuthMiddleware(['admin','employee','candidate']));

$app->delete('/api/storage/object', function (Request $request, Response $response) {
    $q = $request->getQueryParams();
    $bucket = (string) ($q['bucket'] ?? '');
    $path = (string) ($q['path'] ?? '');
    if (!sec001ValidPath($path)) return sec001Reply($response, 400, ['error' => 'Invalid file path']);
    $conn = (new Database())->getConnection();
    if (!$conn || !sec001Permission($conn, $request->getAttribute('user'), $bucket, $path)) {
        return sec001Reply($response, 403, ['error' => 'Delete not permitted']);
    }
    $config = sec001Config();
    if (!$config || !function_exists('curl_init')) return sec001Reply($response, 503, ['error' => 'Storage is not configured']);
    [$url,$key] = $config;
    $ok = sec001Call($url . '/storage/v1/object/' . $bucket, $key, 'DELETE',
        json_encode(['prefixes' => [$path]]), ['Content-Type: application/json'], 0, $bucket, $path);
    if (!$ok) return sec001Reply($response, 502, ['error' => 'File deletion not confirmed']);
    return sec001Reply($response, 200, ['path' => $path]);
})->add(new AuthMiddleware(['admin','employee','candidate']));
