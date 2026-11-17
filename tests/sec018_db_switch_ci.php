<?php
declare(strict_types=1);

// SEC-018: opt-in safe fallback and fail-closed connection identity tests.
// Run ONLY in GitHub's synthetic PostgreSQL service after acceptance setup.
foreach ([
    'GITHUB_ACTIONS'=>'true',
    'DB_HOST'=>'127.0.0.1',
    'DB_PORT'=>'5432',
    'DB_DATABASE'=>'sec018_phasea_ci',
    'DB_USERNAME'=>'postgres',
    'DB_PASSWORD'=>'SEC018_PHASEA_CI_PG_ONLY',
] as $name=>$value) {
    if (getenv($name)!==$value) {
        fwrite(STDERR,"REFUSED SEC-018 DB switch CI: $name unexpected\n");
        exit(2);
    }
}
foreach (['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY'] as $name) {
    if (getenv($name)) {
        fwrite(STDERR,"REFUSED SEC-018 DB switch CI: external settings found\n");
        exit(2);
    }
}

require_once dirname(__DIR__).'/backend/src/Utils/Sec018AuditContext.php';
require_once dirname(__DIR__).'/backend/src/Config/LoggingPDO.php';
require_once dirname(__DIR__).'/backend/src/Config/Database.php';

use App\Config\Database;
use App\Config\LoggingPDO;

$mode=$argv[1]??'';
$cases=['default','restricted','missing-password','wrong-role','missing-audit','native','native-transaction-denied'];
if (!in_array($mode,$cases,true)) {
    fwrite(STDERR,"Usage: php tests/sec018_db_switch_ci.php [default|restricted|missing-password|wrong-role|missing-audit]\n");
    exit(2);
}
foreach (['DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD'] as $key) {
    $_ENV[$key]=(string)getenv($key);
}
$_ENV['DB_PDO_PREPARE_MODE']=str_starts_with($mode, 'native')?'native':'pooler';
// Simulate unsafe shared transaction-pooler settings WITHOUT a live connection.
if ($mode==='native-transaction-denied') $_ENV['DB_PORT']='6543';
$_ENV['SEC018_DB_USE_RESTRICTED']=$mode==='default'?'false':'true';
$_ENV['SEC018_DB_USERNAME']=in_array($mode,['default','wrong-role'],true)?'postgres':'hrms_runtime_restricted';
$_ENV['SEC018_DB_PASSWORD']=match($mode) {
    'missing-password'=>'',
    'default','wrong-role'=>'SEC018_PHASEA_CI_PG_ONLY',
    default=>'SEC018_PHASEA_CI_RUNTIME_ONLY'
};
$_ENV['SEC018_AUDIT_CONTEXT_ENABLED']=$mode==='missing-audit'?'false':'true';
$_ENV['SEC018_AUDIT_HMAC_KEY']=str_repeat('a',64);

$conn=(new Database())->getConnection();
if (in_array($mode,['missing-password','wrong-role','missing-audit','native-transaction-denied'],true)) {
    if ($conn!==null) {
        throw new RuntimeException("FAIL SEC-018 DB switch $mode: privileged fallback or audit bypass");
    }
} else {
    if (!$conn instanceof LoggingPDO) {
        throw new RuntimeException("FAIL SEC-018 DB switch $mode: failed to connect");
    }
    $expectedRole=$mode==='default'?'postgres':'hrms_runtime_restricted';
    if ($conn->query('SELECT current_user')->fetchColumn()!==$expectedRole) {
        throw new RuntimeException("FAIL SEC-018 DB switch $mode: unexpected role");
    }
    if ((bool)$conn->getAttribute(PDO::ATTR_EMULATE_PREPARES) !== ($mode!=='native')) {
        throw new RuntimeException("FAIL SEC-018 DB switch $mode: unexpected prepare mode");
    }
    $stmt=$conn->prepare('SELECT ?::integer + ?::integer');
    $stmt->execute([2,3]);
    if ((int)$stmt->fetchColumn()!==5) {
        throw new RuntimeException("FAIL SEC-018 DB switch $mode: bound SQL failed");
    }
}
echo "PASS SEC-018 DB switch $mode\n";

// Container startup must forward the security settings to PHP's Dotenv;
// merely configuring them in Render does not make Apache see them.
$entrypoint=file_get_contents(dirname(__DIR__).'/docker-entrypoint.sh');
if ($entrypoint===false) throw new RuntimeException('Missing Docker entrypoint');
foreach ([
  'DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD',
  'SEC018_DB_USE_RESTRICTED','SEC018_DB_USERNAME','SEC018_DB_PASSWORD',
  'SEC018_AUDIT_CONTEXT_ENABLED','SEC018_AUDIT_HMAC_KEY','DB_PDO_PREPARE_MODE'
] as $name) {
    if (!preg_match('/\\b'.preg_quote($name,'/').'\\b/', $entrypoint)) {
        throw new RuntimeException("FAIL SEC-018 Docker env forwarding: $name missing");
    }
}
echo "PASS SEC-018 Docker env whitelist integrity\n";
