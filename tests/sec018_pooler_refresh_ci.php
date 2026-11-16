<?php
declare(strict_types=1);

/**
 * SEC-018 Step 2G: CHARACTERIZE the actual, unmodified PHP RefreshSessions
 * class via a disposable local PgBouncer transaction-pooler and Postgres 16.
 *
 * Intentionally documents CURRENT refresh security defects as known gaps.
 * A green CI run is NOT a release approval or a fix for those defects.
 */
$required = [
    'GITHUB_ACTIONS' => 'true',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '6432',
    'DB_DATABASE' => 'sec018_rls_ci',
    'DB_USERNAME' => 'sec018_ci_runtime',
    'DB_PASSWORD' => 'SEC018_SYNTHETIC_RUNTIME',
    'DB_PDO_PREPARE_MODE' => 'pooler',
];
foreach ($required as $key => $expected) {
    if (getenv($key) !== $expected) {
        fwrite(STDERR, "REFUSED SEC-018 2G: expected isolated {$key}\n");
        exit(2);
    }
    // Database.php reads $_ENV rather than getenv() for the DB configuration.
    $_ENV[$key] = $expected;
}
foreach (['DATABASE_URL','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'] as $key) {
    if (getenv($key)) {
        fwrite(STDERR, "REFUSED SEC-018 2G: external database configuration found\n");
        exit(2);
    }
}
if (!function_exists('pcntl_fork') || !function_exists('pcntl_waitpid')) {
    fwrite(STDERR, "SEC-018 2G requires pcntl for isolated concurrency testing\n");
    exit(2);
}

require_once __DIR__ . '/../backend/src/Config/LoggingPDO.php';
require_once __DIR__ . '/../backend/src/Config/Database.php';
require_once __DIR__ . '/../backend/src/Utils/SessionVersion.php';
require_once __DIR__ . '/../backend/src/Utils/RefreshSessions.php';

use App\Config\Database;
use App\Utils\RefreshSessions;

function check2G(bool $ok, string $message): void {
    if (!$ok) throw new RuntimeException("FAIL SEC-018 2G: {$message}");
    echo "PASS SEC-018 2G: {$message}\n";
}
function pdo2G(string $role, string $password, int $port = 5432, string $database = 'sec018_rls_ci'): PDO {
    return new PDO("pgsql:host=127.0.0.1;port={$port};dbname={$database}",$role,$password,[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES=>true,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
    ]);
}
function scalar2G(PDO $pdo,string $query): mixed {
    return $pdo->query($query)->fetchColumn();
}
function uuid2G(): string {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h=bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20);
}
function fixture2G(PDO $admin,string $id,string $secret,string $userId,
    string $client='web',int $sessionVersion=1,string $expiry='future'): string {
    $expires = $expiry === 'future' ? '7 days' : '-1 hour';
    $sql="INSERT INTO public.hrms_refresh_sessions
       (id,user_id,token_hash,session_version,client_type,expires_at)
       VALUES (?,?,?,?,?,NOW() + INTERVAL '{$expires}')";
    $stmt=$admin->prepare($sql);
    $stmt->execute([$id,$userId,hash('sha256',$secret),$sessionVersion,$client]);
    return $id.'.'.$secret;
}
function sessionValue2G(PDO $conn,string $id,string $column): mixed {
    if (!in_array($column,['token_hash','revoked_at','client_type'],true)) {
        throw new LogicException('Unapproved test column');
    }
    $stmt=$conn->prepare("SELECT {$column} FROM public.hrms_refresh_sessions WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetchColumn();
}

$admin=pdo2G('postgres','SEC018_LOCAL_PG_CI_ONLY');
check2G(scalar2G($admin,'SELECT current_database()')==='sec018_rls_ci',
    'G01 disposable database verified');

// PgBouncer administrative console must report real transaction pooling.
$control=pdo2G('postgres','SEC018_LOCAL_PG_CI_ONLY',6432,'pgbouncer');
$config=$control->query('SHOW CONFIG')->fetchAll();
$settings=[];
foreach ($config as $line) $settings[$line['key']]=$line['value'];
check2G(($settings['pool_mode']??null)==='transaction','G01 actual PgBouncer transaction mode');
check2G(($settings['max_prepared_statements']??null)==='0','G01 named prepared statements disabled');
unset($control);

// All objects in public below are synthetic and exist ONLY in the ephemeral CI
// database. Broad temporary role policies are characterization fixtures, NOT
// templates for production access control.
$admin->exec(<<<'SQL'
CREATE TABLE public.users (
 id uuid PRIMARY KEY, email text NOT NULL, role text NOT NULL,
 "isActive" boolean NOT NULL, token_version integer NOT NULL
)
SQL);
$admin->exec(<<<'SQL'
CREATE TABLE public.hrms_refresh_sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES public.users(id),
 token_hash char(64) NOT NULL, session_version integer NOT NULL,
 client_type text NOT NULL CHECK (client_type IN ('web','android')),
 created_at timestamptz NOT NULL DEFAULT NOW(),
 last_used_at timestamptz, expires_at timestamptz NOT NULL,
 revoked_at timestamptz
)
SQL);
$admin->exec('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');
$admin->exec('ALTER TABLE public.hrms_refresh_sessions ENABLE ROW LEVEL SECURITY');
$admin->exec('ALTER TABLE public.hrms_refresh_sessions FORCE ROW LEVEL SECURITY');
$admin->exec('GRANT USAGE ON SCHEMA public TO sec018_ci_runtime');
$admin->exec('GRANT SELECT ON public.users TO sec018_ci_runtime');
$admin->exec('GRANT SELECT, INSERT, UPDATE ON public.hrms_refresh_sessions TO sec018_ci_runtime');
$admin->exec('CREATE POLICY ci_users_read ON public.users FOR SELECT TO sec018_ci_runtime USING (true)');
$admin->exec('CREATE POLICY ci_refresh_runtime ON public.hrms_refresh_sessions FOR ALL TO sec018_ci_runtime USING (true) WITH CHECK (true)');
$admin->exec('CREATE POLICY ci_refresh_owner_fixture ON public.hrms_refresh_sessions FOR ALL TO postgres USING (true) WITH CHECK (true)');

$alice='11111111-1111-4111-8111-111111111111';
$bob='22222222-2222-4222-8222-222222222222';
$admin->exec("INSERT INTO public.users VALUES
 ('{$alice}','alice@example.invalid','employee',true,1),
 ('{$bob}','bob@example.invalid','candidate',true,1)");

$db=new Database();
$app=$db->getConnection();
check2G($app instanceof PDO,'G02 actual HRMS Database.php uses PgBouncer connection');
check2G($app->getAttribute(PDO::ATTR_EMULATE_PREPARES)===true,
    'G02 real Database.php keeps emulated PDO prepares');
check2G(scalar2G($app,'SELECT current_user')==='sec018_ci_runtime',
    'G02 real connection uses synthetic restricted login');
for ($i=1;$i<=30;$i++) {
    $stmt=$app->prepare('SELECT ?::integer + ?::integer');
    $stmt->execute([$i,$i+1]);
    check2G((int)$stmt->fetchColumn()===(2*$i+1),'G02 parameterized pooler query '.(string)$i);
}
check2G((int)scalar2G($app,'SELECT COUNT(*) FROM pg_prepared_statements')===0,
    'G02 no persisted server-side prepared statements');

// Exercise the actual class, not the simplified Step 2E stored function.
check2G(RefreshSessions::rotate($app,'not-a-token','web')===null,
    'G03 actual rotate rejects malformed refresh credential');

$id=uuid2G();$raw=bin2hex(random_bytes(32));
$credential=fixture2G($admin,$id,$raw,$alice);
$rotated=RefreshSessions::rotate($app,$credential,'web');
check2G(is_array($rotated)&&isset($rotated['refreshToken'])
    &&$rotated['refreshToken']!==$credential,
    'G03 real RefreshSessions rotation succeeds through PgBouncer');
check2G(($rotated['user']['id']??null)===$alice,
    'G03 real rotation loads synthetic user details');
check2G(RefreshSessions::rotate($app,$credential,'web')===null,
    'G04 actual old credential replay denied');
check2G(sessionValue2G($admin,$id,'revoked_at')!==null,
    'G04 actual replay revokes refresh chain');
check2G(RefreshSessions::rotate($app,$rotated['refreshToken'],'web')===null,
    'G04 newly rotated credential cannot rescue revoked chain');

$idUnknown=uuid2G();$rawUnknown=bin2hex(random_bytes(32));
fixture2G($admin,$idUnknown,$rawUnknown,$alice);
$wrong=$idUnknown.'.'.bin2hex(random_bytes(32));
check2G(RefreshSessions::rotate($app,$wrong,'web')===null,
    'G05 unrelated wrong secret refused');
check2G(sessionValue2G($admin,$idUnknown,'revoked_at')!==null,
    'G05 CHARACTERIZATION: current code also revokes on unrelated wrong secret');
echo "KNOWN SECURITY GAP SEC-018 G05: guessed/wrong secret for known session ID causes revocation (denial of service).\n";

$idClient=uuid2G();$rawClient=bin2hex(random_bytes(32));
$credClient=fixture2G($admin,$idClient,$rawClient,$alice);
check2G(RefreshSessions::rotate($app,$credClient,'android')===null,
    'G06 mismatched web/Android client cannot rotate');
check2G(sessionValue2G($admin,$idClient,'revoked_at')===null,
    'G06 mismatched client did not revoke synthetic session');

$idExpiry=uuid2G();$rawExpiry=bin2hex(random_bytes(32));
$credExpiry=fixture2G($admin,$idExpiry,$rawExpiry,$alice,'web',1,'past');
check2G(RefreshSessions::rotate($app,$credExpiry,'web')===null,
    'G07 expired session denied');
check2G(sessionValue2G($admin,$idExpiry,'revoked_at')!==null,
    'G07 expired session marked revoked');

$idDisabled=uuid2G();$rawDisabled=bin2hex(random_bytes(32));
$credDisabled=fixture2G($admin,$idDisabled,$rawDisabled,$alice);
$admin->exec("UPDATE public.users SET \"isActive\"=false WHERE id='{$alice}'");
check2G(RefreshSessions::rotate($app,$credDisabled,'web')===null,
    'G07 inactive account denied');
$admin->exec("UPDATE public.users SET \"isActive\"=true, token_version=2 WHERE id='{$alice}'");

$idVersion=uuid2G();$rawVersion=bin2hex(random_bytes(32));
$credVersion=fixture2G($admin,$idVersion,$rawVersion,$alice,'web',1);
check2G(RefreshSessions::rotate($app,$credVersion,'web')===null,
    'G07 stale account session version denied');
$admin->exec("UPDATE public.users SET token_version=1 WHERE id='{$alice}'");

// Simulate a database exception DURING rotation. The current class must roll
// back without leaving partial token updates or an open PDO transaction.
$rollbackId='44444444-4444-4444-8444-444444444444';
$rollbackRaw=bin2hex(random_bytes(32));
$rollbackToken=fixture2G($admin,$rollbackId,$rollbackRaw,$alice);
$admin->exec(<<<'SQL'
CREATE FUNCTION public.sec018_2g_abort_rotation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id='44444444-4444-4444-8444-444444444444'::uuid THEN
    RAISE EXCEPTION 'SYNTHETIC rotation abort';
 END IF;
 RETURN NEW;
END
$$
SQL);
$admin->exec('CREATE TRIGGER sec018_2g_abort BEFORE UPDATE ON public.hrms_refresh_sessions FOR EACH ROW EXECUTE FUNCTION public.sec018_2g_abort_rotation()');
$threw=false;
try {RefreshSessions::rotate($app,$rollbackToken,'web');}
catch (PDOException $e) {$threw=true;}
check2G($threw,'G08 synthetic trigger exception propagates');
check2G(!$app->inTransaction(),'G08 actual RefreshSessions rolls back failed transaction');
check2G(sessionValue2G($admin,$rollbackId,'token_hash')===hash('sha256',$rollbackRaw),
    'G08 failed rotation leaves previous hash intact');
$admin->exec('DROP TRIGGER sec018_2g_abort ON public.hrms_refresh_sessions');
$admin->exec('DROP FUNCTION public.sec018_2g_abort_rotation()');

// Verify the Step 2E signed identity verifier works over the actual pooler,
// and that both COMMIT and cross-connection reuse clear transaction context.
$pocKey=(string)scalar2G($admin,"SELECT value FROM sec018_2e_private.keys WHERE kid='v2'");
check2G(strlen($pocKey)===64,'G09 synthetic signing key available only to CI owner');
function context2G(string $secret,string $user,string $branch,int $version,string $xid):string {
    $time=time();
    $signed=implode('|',['v2',$user,$branch,(string)$version,'hrms-db',
        (string)($time-1),(string)($time+30),$xid,bin2hex(random_bytes(12))]);
    return $signed.'|'.hash_hmac('sha256',$signed,$secret);
}
$app->beginTransaction();
$firstXid=(string)scalar2G($app,'SELECT txid_current()');
$stmt=$app->prepare("SELECT set_config('sec018_2e.signed', ?, true)");
$stmt->execute([context2G($pocKey,'alice','branch-a',3,$firstXid)]);
check2G(scalar2G($app,"SELECT sec018_2e_private.claim('uid')")==='alice',
    'G09 correctly signed Alice context works through PgBouncer');
$app->commit();
check2G(scalar2G($app,"SELECT sec018_2e_private.claim('uid')")===null,
    'G09 signed identity clears after COMMIT');
$other=pdo2G('sec018_ci_runtime','SEC018_SYNTHETIC_RUNTIME',6432);
check2G(scalar2G($other,"SELECT sec018_2e_private.claim('uid')")===null,
    'G09 other pooled client cannot inherit Alice identity');
$other->beginTransaction();
$secondXid=(string)scalar2G($other,'SELECT txid_current()');
$stmt=$other->prepare("SELECT set_config('sec018_2e.signed', ?, true)");
$stmt->execute([context2G($pocKey,'bob','branch-b',1,$secondXid)]);
check2G(scalar2G($other,"SELECT sec018_2e_private.claim('uid')")==='bob',
    'G09 second pooled client uses signed Bob identity');
$other->rollBack();
check2G(scalar2G($other,"SELECT sec018_2e_private.claim('uid')")===null,
    'G09 ROLLBACK clears Bob context');
unset($other);

// An unknown network outcome after successful rotation can cause the client
// to retry an old credential. Observe current fail-closed but disruptive policy.
$lostId=uuid2G();$lostSecret=bin2hex(random_bytes(32));
$lostCredential=fixture2G($admin,$lostId,$lostSecret,$alice);
$lostRotated=RefreshSessions::rotate($app,$lostCredential,'web');
check2G(is_array($lostRotated),'G10 hypothetical lost-response rotation committed');
check2G(RefreshSessions::rotate($app,$lostCredential,'web')===null,
    'G10 retry of old credential denied');
check2G(sessionValue2G($admin,$lostId,'revoked_at')!==null,
    'G10 CHARACTERIZATION: retry after lost response revokes chain');
echo "KNOWN AVAILABILITY GAP SEC-018 G10: lost successful response can lead to session-chain revocation on retry.\n";

// Execute two unmodified RefreshSessions::rotate() calls from TWO independent
// PHP processes through PgBouncer against a single row. No mock transaction,
// no synthetic SQL stored function: the full PHP code is called twice.
$raceId=uuid2G();$raceSecret=bin2hex(random_bytes(32));
$raceCredential=fixture2G($admin,$raceId,$raceSecret,$bob);
$admin->beginTransaction();
$lock=$admin->prepare('SELECT id FROM public.hrms_refresh_sessions WHERE id=? FOR UPDATE');
$lock->execute([$raceId]);
check2G((string)$lock->fetchColumn()===$raceId,
    'G11 independent session row lock acquired');

$children=[];
for($i=0;$i<2;$i++){
    $pid=pcntl_fork();
    if($pid===-1)throw new RuntimeException('Could not fork synthetic PHP worker');
    if($pid===0){
        try {
            // Create fresh client AFTER fork, never use inherited PDO.
            $worker=pdo2G('sec018_ci_runtime','SEC018_SYNTHETIC_RUNTIME',6432);
            $result=RefreshSessions::rotate($worker,$raceCredential,'web');
            exit(is_array($result)?0:1);
        } catch(Throwable $e){
            fwrite(STDERR,"SEC-018 2G worker exception ".get_class($e)."\n");
            exit(2);
        }
    }
    $children[]=$pid;
}
$blocked=false;
for($attempt=0;$attempt<40;$attempt++){
    $count=(int)scalar2G($admin,"SELECT COUNT(*) FROM pg_stat_activity
      WHERE datname='sec018_rls_ci' AND usename='sec018_ci_runtime'
        AND wait_event_type='Lock'");
    if($count>=2){$blocked=true;break;}
    usleep(100000);
}
$admin->commit(); // Must release lock even if workers were slower than expected.
$codes=[];
foreach($children as $pid) {
    $status=0;
    pcntl_waitpid($pid,$status);
    $codes[]=pcntl_wifexited($status)?pcntl_wexitstatus($status):2;
}
sort($codes);
check2G($blocked,'G11 both independent workers waited on actual row lock');
check2G($codes===[0,1],'G11 one actual refresh succeeds, competing refresh denied');
// Forked children may close inherited PDO sockets; verify using a fresh conn.
unset($admin,$app,$db);
$admin=pdo2G('postgres','SEC018_LOCAL_PG_CI_ONLY');
check2G(sessionValue2G($admin,$raceId,'revoked_at')!==null,
    'G11 CHARACTERIZATION: competing valid requests revoke the chain');
check2G(sessionValue2G($admin,$raceId,'token_hash')!==hash('sha256',$raceSecret),
    'G11 exactly one winning rotation updated the credential hash');
echo "KNOWN AVAILABILITY GAP SEC-018 G11: simultaneous legitimate refreshes can revoke a session.\n";
echo "SEC-018 STEP 2G ISOLATED PGBOUNCER + ACTUAL REFRESH CHARACTERIZATION PASS; current security defects remain OPEN.\n";
