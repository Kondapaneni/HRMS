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
    $headers=['Content-Type: application/json','Accept: application/json','X-HRMS-Client: android'];
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
// Disposable branch/lead fixture for native prepared-statement queries that
// previously reused one :branch or :search placeholder many times.
$owner=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci',
    'postgres','SEC018_PHASEA_CI_PG_ONLY',
    [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$employeeId='44444444-4444-4444-8444-444444444444';
$branchId='10000000-0000-4000-8000-000000000001';
$leadId='10000000-0000-4000-8000-000000000021';
$owner->prepare('INSERT INTO public.branches(id,name) VALUES (?,?)')
    ->execute([$branchId,'Synthetic Native Branch']);
$owner->prepare('UPDATE public.employee SET branch=? WHERE "userId"=?')
    ->execute([$branchId,$employeeId]);
$owner->prepare('INSERT INTO public.user_feature_access ("userId","canLoanOrigination","canSalesOrigination","canBranchOperations") VALUES (?,true,true,true)')
    ->execute([$employeeId]);
$owner->prepare("INSERT INTO public.loan_leads(id,name,phone,address,status,created_by,branch) VALUES (?,?,?,?,?,?,?)")
    ->execute([$leadId,'Native Loan','9900000000','Synthetic Only','Converted',$employeeId,$branchId]);
$owner->prepare("INSERT INTO public.sale_leads(name,phone,address,status,created_by,branch) VALUES (?,?,?,?,?,?)")
    ->execute(['Native Sale','9900000001','Synthetic Only','New',$employeeId,$branchId]);
$owner->prepare("INSERT INTO public.loan_applications(application_id,lead_id,created_by,branch) VALUES (?,?,?,?)")
    ->execute(['LA-SEC018-NATIVE',$leadId,$employeeId,$branchId]);
foreach ([
  '/api/members?search=Native',
  '/api/members/9900000000',
  '/api/leads/list?search=Native',
  '/api/sales/leads?search=Native',
  '/api/branch-operations/dashboard?pipeline=all',
  '/api/branch-operations/dashboard?pipeline=all&employee_id='.$employeeId,
  '/api/branch-operations/dashboard?pipeline=sales',
  '/api/branch-operations/dashboard?pipeline=loans',
  '/api/branch-operations/leads?search=Native',
  '/api/branch-operations/leads?search=Native&pipeline=all&employee_id='.$employeeId,
] as $path) {
    [$status]=nativeCall('GET',$path,$tokens['employee']);
    checkNative($status===200, "scoped native query $path ($status)");
}

// A forged branch parameter must never relocate an employee's sales lead.
[$salesStatus,$salesCreated]=nativeCall('POST','/api/sales/leads',$tokens['employee'],[
    'name'=>'Synthetic Native Branch-Spoof Probe',
    'phone'=>'9900000002',
    'address'=>'Synthetic Only',
    'branch'=>'20000000-0000-4000-8000-000000000002',
]);
checkNative($salesStatus===201 && !empty($salesCreated['data']['id']),
    'delegated sales lead created with server-side branch');
$branchCheck=$owner->prepare('SELECT branch FROM public.sale_leads WHERE id=?');
$branchCheck->execute([$salesCreated['data']['id']]);
checkNative((string)$branchCheck->fetchColumn()===$branchId,
    'client-selected branch ignored for employee sales creation');

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
