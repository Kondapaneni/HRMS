<?php
declare(strict_types=1);
if (getenv('GITHUB_ACTIONS') !== 'true' || getenv('DB_DATABASE') !== 'sec018_phasea_ci') exit(2);
require_once __DIR__.'/../backend/src/Utils/Sec018AuditContext.php';
require_once __DIR__.'/../backend/src/Config/LoggingPDO.php';
require_once __DIR__.'/../backend/src/Utils/SessionVersion.php';
require_once __DIR__.'/../backend/src/Utils/RefreshSessions.php';
use App\Config\LoggingPDO;
use App\Utils\RefreshSessions;
function check(bool $ok,string $label): void { if (!$ok) throw new RuntimeException($label); echo "PASS $label\n"; }
function connectRuntime(int $port): LoggingPDO {
 return new LoggingPDO("pgsql:host=127.0.0.1;port=$port;dbname=sec018_phasea_ci",'hrms_runtime_restricted','SEC018_PHASEA_CI_RUNTIME_ONLY',[
 PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>true,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC]);
}
$port=(int)($argv[1]??5432);
if (!in_array($port,[5432,6432],true)) exit(2);
if (($argv[2]??'')==='rotate') {
 // Child process uses its own socket; never inherits a PDO connection.
 $credential=trim((string)fgets(STDIN));
 echo json_encode(RefreshSessions::rotate(connectRuntime($port),$credential,'web'),JSON_THROW_ON_ERROR);
 exit;
}
$owner=new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci','postgres','SEC018_PHASEA_CI_PG_ONLY',[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
$a='11111111-1111-4111-8111-111111111111'; $b='22222222-2222-4222-8222-222222222222';
$_ENV['SEC018_AUDIT_CONTEXT_ENABLED']='true';
$_ENV['SEC018_AUDIT_HMAC_KEY']='ac9f1c12ebd1677a7a32e1c79b4d2a808feca339589d302d1bdb102edc4b9e1a';
$c=connectRuntime($port);
$prepared=$c->prepare('UPDATE public.users SET "lastName"=? WHERE id=?');
$d=connectRuntime($port);
$identity=fn($id)=>['uid'=>$id,'tv'=>1,'ip'=>'127.0.0.1','ua'=>'SEC018','sid'=>bin2hex(random_bytes(16))];
$c->setSec018AuditIdentity($identity($a)); $d->setSec018AuditIdentity($identity($b));
$actor=fn()=>$owner->query('SELECT actor_user_id FROM public.audit_logs ORDER BY timestamp DESC, audit_id DESC LIMIT 1')->fetchColumn();
$prepared->execute(['Alice-'.$port,$a]);
check($actor()===$a,'prepared statement keeps original PDO after second connection is created');
$d->prepare('UPDATE public.users SET "lastName"=? WHERE id=?')->execute(['Bob-'.$port,$b]);
check($actor()===$b,'independent connection attributes Bob');
$c->beginTransaction();
$prepared->execute(['Explicit-'.$port,$a]);
$proof=$c->query("SELECT current_setting('sec018.audit_payload') p,current_setting('sec018.audit_mac') m")->fetch();
$c->commit();
check($actor()===$a,'explicit transaction commits without nested begin');
$c->clearSec018AuditIdentity();
$c->beginTransaction();
$c->prepare("SELECT set_config('sec018.audit_payload',?,true),set_config('sec018.audit_mac',?,true)")->execute([$proof['p'],$proof['m']]);
$denied=false;
try {$prepared->execute(['Replayed',$a]);}catch(Throwable $e){$denied=true;}
$c->rollBack();
check($denied,'signed proof cannot replay in a later transaction');
$c->setSec018AuditIdentity($identity($a));
$count=(int)$owner->query('SELECT count(*) FROM public.audit_logs')->fetchColumn();
$c->beginTransaction(); $prepared->execute(['Rollback',$a]); $c->rollBack();
check((int)$owner->query('SELECT count(*) FROM public.audit_logs')->fetchColumn()===$count,'rollback preserves data/audit atomicity');
$c->clearSec018AuditIdentity();
$c->exec("SELECT set_config('app.current_user_id','$b',false)");
$prepared->execute(['Anonymous-'.$port,$a]);
check($actor()===null,'legacy session setting cannot impersonate an actor');
// Missing verifier fails even on a SELECT without an audit trigger.
$c->setSec018AuditIdentity($identity($a));
$owner->exec("ALTER FUNCTION sec018_internal.verified_audit_actor() RENAME TO disabled_audit_actor");
try { $denied=false; try {$c->query('SELECT 1');}catch(Throwable $e){$denied=true;} check($denied,'missing verifier fails closed'); }
finally {$owner->exec("ALTER FUNCTION sec018_internal.disabled_audit_actor() RENAME TO verified_audit_actor");}
$c->clearSec018AuditIdentity(); $d->clearSec018AuditIdentity();
// Independent sockets race for one row; exactly one may get a replacement.
$user=['id'=>$a,'token_version'=>1];
$token=RefreshSessions::issue($c,$user,'web');
$id=explode('.',$token)[0];
check(RefreshSessions::rotate($d,$id.'.'.str_repeat('0',64),'web')===null,'random secret denied');
check($owner->query("SELECT revoked_at IS NULL FROM public.hrms_refresh_sessions WHERE id='$id'")->fetchColumn()===true,'random secret does not revoke known id');
$children=[];
for($i=0;$i<2;$i++) {
 $proc=proc_open([PHP_BINARY,__FILE__,(string)$port,'rotate'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
 if(!is_resource($proc)) throw new RuntimeException('child failed');
 $children[]=[$proc,$pipes];
}
foreach($children as [$proc,$pipes]) {fwrite($pipes[0],$token."\n");fclose($pipes[0]);}
$results=[];
foreach($children as [$proc,$pipes]) {$out=stream_get_contents($pipes[1]);$err=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);check(proc_close($proc)===0,'concurrent PHP child succeeds: '.$err);$results[]=json_decode($out,true,512,JSON_THROW_ON_ERROR);}
$winners=array_values(array_filter($results));
check(count($winners)===1,'exactly one concurrent refresh issues replacement');
check(RefreshSessions::rotate($c,$token,'web')===null,'lost-response retry cannot mint another replacement');
check(RefreshSessions::rotate($c,$winners[0]['refreshToken'],'web')!==null,'winning replacement survives duplicate and lost-response retry');
$hash=hash('sha256',explode('.',$token)[1]);
$owner->prepare("UPDATE public.hrms_refresh_sessions SET used_token_hashes=jsonb_set(used_token_hashes,ARRAY[?],to_jsonb(EXTRACT(EPOCH FROM clock_timestamp())-60)) WHERE id=?")->execute([$hash,$id]);
check(RefreshSessions::rotate($c,$token,'web')===null,'proven replay denied outside grace');
check($owner->query("SELECT revoked_at IS NOT NULL FROM public.hrms_refresh_sessions WHERE id='$id'")->fetchColumn()===true,'proven old replay revokes session family');
foreach(['anon','authenticated'] as $role) {
 $owner->beginTransaction();$owner->exec('SET LOCAL ROLE '.$role);
 try { $denied=false;try {$owner->query('SELECT * FROM public.users');}catch(PDOException $e){$denied=true;}check($denied,"$role cannot read application data"); }
 finally {$owner->rollBack();}
}
foreach(['TRUNCATE public.users','CREATE TABLE public.forbidden(id int)','SET ROLE postgres'] as $sql) {
 $denied=false;try {$c->exec($sql);}catch(PDOException $e){$denied=true;}check($denied,'restricted role denies '.$sql);
}
// PostgreSQL reports an ineffective GRANT as a warning, not an exception.
$c->exec('GRANT SELECT ON public.users TO anon');
check(!$owner->query("SELECT has_table_privilege('anon','public.users','SELECT')")->fetchColumn(),'ineffective GRANT cannot change target ACL');
check(!$c->query("SELECT has_table_privilege(current_user,'public.users','SELECT WITH GRANT OPTION')")->fetchColumn(),'runtime has no grant option');
check(!$c->query("SELECT has_database_privilege(current_user,current_database(),'TEMP')")->fetchColumn(),'no ambient temporary object creation');
echo "SEC018 ADVERSARIAL PASSED port=$port\n";
