<?php
declare(strict_types=1);

// SEC-018 native PDO prepared-statement regression against CI-only isolated
// PostgreSQL and PgBouncer session mode (NOT Supabase / NOT Render).
if (getenv('GITHUB_ACTIONS') !== 'true'
    || getenv('DB_HOST') !== '127.0.0.1'
    || getenv('DB_DATABASE') !== 'sec018_phasea_ci') {
    fwrite(STDERR, "REFUSED: native HTTP exercise is CI-only\n");
    exit(2);
}
foreach (['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY'] as $var) {
    if (getenv($var)) throw new RuntimeException('Refused external credentials');
}

function checkNative(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException("SEC-018 native HTTP FAIL: " . $message);
    echo "PASS native PHP session pooler: " . $message . "\n";
}
function nativeCall(string $method, string $path, ?string $token=null, ?array $body=null): array {
    $headers=['Content-Type: application/json','Accept: application/json'];
    if ($token!==null) $headers[]='Authorization: Bearer ' . $token;
    $curl=curl_init('http://127.0.0.1:8789' . $path);
    curl_setopt_array($curl,[
        CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_CUSTOMREQUEST=>$method,
        CURLOPT_HTTPHEADER=>$headers,
        CURLOPT_TIMEOUT=>20,
        CURLOPT_FOLLOWLOCATION=>false,
    ]);
    if ($body!==null) curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($body,JSON_THROW_ON_ERROR));
    $raw=curl_exec($curl);
    if ($raw===false) throw new RuntimeException('HTTP transport failure');
    $status=curl_getinfo($curl,CURLINFO_RESPONSE_CODE);
    curl_close($curl);
    checkNative(!preg_match('/SQLSTATE|PDOException|Stack trace|SEC018_PHASEA_CI_|ac9f1c12/i',$raw),
        "sanitized " . $method . " " . $path);
    return [$status,json_decode($raw,true)];
}

// Real PHP routes with native prepares; seeded synthetic accounts were created
// by tests/sec018_restricted_http_ci.php earlier in the same CI job.
$tokens=[];
foreach (['admin','employee','candidate'] as $role) {
    [$status,$data]=nativeCall('POST',$role==='candidate'?'/api/candidate/login':'/api/login',null,[
        'email'=>$role.'-ci@example.invalid',
        'password'=>'SEC018-CI-Password1!',
    ]);
    checkNative($status===200 && !empty($data['token']), "$role login with native prepares");
    $tokens[$role]=$data['token'];
}
foreach ([
    ['/api/admin/assets','admin'],
    ['/api/admin/settings','admin'],
    ['/api/admin/audit-logs?limit=5','admin'],
    ['/api/admin/employees?limit=5','admin'],
    ['/api/admin/feature-access?limit=5','admin'],
    ['/api/admin/attendance','admin'],
    ['/api/admin/jobs','admin'],
    ['/api/admin/payroll','admin'],
    ['/api/admin/training/videos','admin'],
    ['/api/employee/profile','employee'],
    ['/api/employee/attendance','employee'],
    ['/api/employee/training/videos','employee'],
    ['/api/candidate/profile','candidate'],
    ['/api/candidate/jobs','candidate'],
    ['/api/candidate/applications','candidate'],
] as [$path,$role]) {
    [$status]=nativeCall('GET',$path,$tokens[$role]);
    checkNative($status===200, "$role can read $path ($status)");
}
foreach (['/api/admin/assets','/api/admin/settings','/api/admin/audit-logs'] as $path) {
    [$status]=nativeCall('GET',$path,$tokens['employee']);
    checkNative($status===403, "employee forbidden $path ($status)");
}
// Native prepared statements must preserve signed audit actor and atomic
// data/audit changes on a synthetic disposable test asset.
[$status,$body]=nativeCall('POST','/api/admin/assets',$tokens['admin'],[
    'name'=>'SEC018 native SQL CI test asset','category'=>'Laptop',
]);
checkNative($status===201 && !empty($body['data']['id']), 'audited asset INSERT');
$assetId=$body['data']['id'];
[$status]=nativeCall('PUT','/api/admin/assets/'.$assetId,$tokens['admin'],[
    'name'=>'SEC018 native SQL CI updated',
]);
checkNative($status===200,'audited asset UPDATE');
$owner=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci',
    'postgres','SEC018_PHASEA_CI_PG_ONLY',
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$stmt=$owner->prepare('SELECT action_type, actor_user_id FROM public.audit_logs WHERE entity_id=? AND action_type IN (\'INSERT\',\'UPDATE\')');
$stmt->execute([$assetId]);
$entries=$stmt->fetchAll(PDO::FETCH_ASSOC);
$types=array_column($entries,'action_type');
checkNative(in_array('INSERT',$types,true)&&in_array('UPDATE',$types,true)
    && count(array_filter($entries, fn($x)=>$x['actor_user_id']==='33333333-3333-4333-8333-333333333333'))>=2,
    'signed Admin actor on native INSERT and UPDATE');
[$status]=nativeCall('DELETE','/api/admin/assets/'.$assetId,$tokens['admin']);
checkNative($status===200,'test asset cleaned up via API');

echo "SEC-018 NATIVE PREPARES HTTP SMOKE PASS\n";
