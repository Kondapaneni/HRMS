<?php
declare(strict_types=1);
if ((getenv('DB_DATABASE') ?: '') !== 'sec015_test') {
    fwrite(STDERR, "Refusing SEC-015 assertions outside sec015_test\n");
    exit(1);
}
$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec015_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
function check015(bool $condition, string $label): void {
    if (!$condition) throw new RuntimeException($label);
}
$emails=$pdo->query('SELECT to_email,subject,body FROM email_queue ORDER BY subject')->fetchAll(PDO::FETCH_ASSOC);
check015(count($emails)===22,'Only twenty approved recruitment emails, one setup and one promotion should be queued');
$recipients=array_count_values(array_column($emails,'to_email'));
check015(!isset($recipients['outsider@example.invalid']) && !isset($recipients['external@example.invalid']),'No arbitrary external recipient');
check015(($recipients['sec015-new-employee@example.invalid']??0)===1,'Exactly one onboarding email');
check015(($recipients['employee-old@example.invalid']??0)===1,'Exactly one promotion email');
$recruit=$pdo->query("SELECT body FROM email_queue WHERE subject LIKE 'Good News!%' LIMIT 1")->fetchColumn();
check015(is_string($recruit),'Shortlist email exists');
check015(str_contains($recruit,'&lt;a href=&quot;https://malicious.invalid&quot;&gt;'),'Untrusted job title must be escaped');
check015(!str_contains($recruit,'<a href="https://malicious.invalid">'),'Cannot embed candidate/job HTML into template');
$interview=$pdo->query("SELECT body FROM email_queue WHERE subject LIKE 'Interview Invitation%' LIMIT 1")->fetchColumn();
check015(is_string($interview),'Interview email exists');
check015(str_contains($interview,'&lt;img src=x onerror=alert(1)&gt;'),'Interview notes HTML must be escaped');
check015(!str_contains($interview,'<img src=x onerror=alert(1)>'),'No executable interview note markup');
$promotion=$pdo->query("SELECT body,subject FROM email_queue WHERE to_email='employee-old@example.invalid' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
check015((bool)$promotion,'Promotion email exists');
check015(str_contains($promotion['body'],'&lt;img src=x onerror=alert(1)&gt;'),'Promotion position is HTML escaped');
check015(str_contains($promotion['body'],'&lt;svg onload=alert(1)&gt;'),'Promotion employee name/notes are HTML escaped');
check015(!str_contains($promotion['body'],'<img src=x onerror=alert(1)>')&&!str_contains($promotion['body'],'<svg onload=alert(1)>'),'No raw HTML in promotion dynamic fields');
check015(!str_contains($promotion['subject'],"\r")&&!str_contains($promotion['subject'],"\n"),'Promotion subject has no header controls');

$stmt=$pdo->prepare('SELECT id,password,reset_token, EXTRACT(EPOCH FROM (reset_token_expires - CURRENT_TIMESTAMP)) AS seconds,
 "forcePasswordChange",token_version FROM users WHERE email=?');
$stmt->execute(['sec015-new-employee@example.invalid']);
$user=$stmt->fetch(PDO::FETCH_ASSOC);
check015((bool)$user,'New user was created');
check015(strlen((string)$user['password'])>30 && !password_verify('NeverEmailMySecret!1',$user['password']),'No admin-generated/legacy initial password can authenticate');
check015((int)$user['seconds']>0 && (int)$user['seconds']<=3600,'One-hour invitation expiry enforced by DB clock');
check015(in_array($user['forcePasswordChange'],[true,'t','true',1,'1'],true),'Setup remains mandatory');
check015((bool)preg_match('/\A[a-f0-9]{64}\z/',(string)$user['reset_token']),'Cryptographically random setup token');
$stmt=$pdo->prepare('SELECT body FROM email_queue WHERE to_email=?');
$stmt->execute(['sec015-new-employee@example.invalid']);
$body=(string)$stmt->fetchColumn();
check015(str_contains($body,'/reset-password?token='),'Welcome email links to established one-time reset flow');
check015(str_contains($body,'&lt;img src=x onerror=alert(1)&gt;'),'Onboarding name must be escaped');
check015(!str_contains($body,'{{password}}')&&!str_contains($body,'Temporary Password')&&!str_contains($body,'NeverEmailMySecret!1'),'Welcome email contains no plaintext initial password');
check015(!str_contains($body,'<img src=x onerror=alert(1)>'),'Onboarding HTML is escaped');
$token=(string)$user['reset_token'];
check015(str_contains($body,$token),'Email link uses newly created token, not a password');
$limits=$pdo->query("SELECT COUNT(*) FROM rate_limits WHERE action='recruitment_notification'")->fetchColumn();
check015((int)$limits===20,'Per-user notification throttle persisted twenty legitimate attempts');

function reset015(string $token): array {
    $body=json_encode(['token'=>$token,'newPassword'=>'NewEmployeePassword!2026']);
    $context=stream_context_create(['http'=>[
        'method'=>'POST',
        'header'=>"Content-Type: application/json\r\nAccept-Encoding: identity\r\n",
        'content'=>$body,
        'ignore_errors'=>true,
        'timeout'=>12,
    ]]);
    $response=file_get_contents('http://127.0.0.1:8776/api/reset-password',false,$context);
    $header=$http_response_header[0] ?? '';
    return ['status'=>(int)(preg_match('/\s(\d{3})\s/', $header, $m)?$m[1]:0),'response'=>$response];
}
$first=reset015($token);
check015($first['status']===200,'One-time account setup link permits a password to be set');
$again=reset015($token);
check015($again['status']===400,'Replaying consumed setup link is denied');
$stmt->execute(['sec015-new-employee@example.invalid']);
$after=$stmt->fetch(PDO::FETCH_ASSOC);
check015($after['reset_token']===null && password_verify('NewEmployeePassword!2026',$after['password']),'Successful setup consumes token and persists chosen password');
check015((int)$after['token_version']===1,'Setup password reset revokes prior sessions');
check015(in_array($after['forcePasswordChange'],[false,'f','false',0,'0'],true),'Mandatory setup flag cleared');
echo "PASS SEC-015 disposable SQL and HTTP: no arbitrary relay, all dynamic mail HTML escaped, no plaintext initial password, one-hour consumed setup link, throttle enforced\n";
