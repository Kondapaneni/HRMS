<?php
declare(strict_types=1);

/**
 * SEC-018 Phase A — executable release gates against a disposable PostgreSQL
 * 16 CI service only. Migration objects exist only in that service.
 */
foreach ([
    'GITHUB_ACTIONS' => 'true',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'sec018_phasea_ci',
    'DB_USERNAME' => 'postgres',
    'DB_PASSWORD' => 'SEC018_PHASEA_CI_PG_ONLY',
] as $key=>$expected) {
    if (getenv($key)!==$expected) {
        fwrite(STDERR,"REFUSED SEC-018 Phase A: non-CI {$key}\n");
        exit(2);
    }
}
foreach (['DATABASE_URL','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'] as $key) {
    if (getenv($key)) {
        fwrite(STDERR,"REFUSED SEC-018 Phase A: external settings detected\n");
        exit(2);
    }
}
require_once dirname(__DIR__).'/backend/src/Utils/Sec018AuditContext.php';
require_once dirname(__DIR__).'/backend/src/Config/LoggingPDO.php';

use App\Config\LoggingPDO;
use App\Config\LoggingPDOStatement;
use App\Utils\Sec018AuditContext;

function verifyA(bool $ok,string $label):void {
    if(!$ok)throw new RuntimeException("FAIL SEC-018 Phase A: {$label}");
    echo "PASS SEC-018 Phase A: {$label}\n";
}
function scalarA(PDO $c,string $sql): mixed{return $c->query($sql)->fetchColumn();}
function pgA(string $role,string $pass):PDO{
    return new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci',$role,$pass,[
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES=>true
    ]);
}
$owner=pgA('postgres','SEC018_PHASEA_CI_PG_ONLY');
verifyA(scalarA($owner,'SELECT current_database()')==='sec018_phasea_ci','A01 guarded database identity');
$roles=$owner->query("SELECT rolname,rolcanlogin,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls
    FROM pg_roles WHERE rolname IN ('hrms_runtime_restricted','hrms_audit_verifier','hrms_audit_executor')
    ORDER BY rolname")->fetchAll(PDO::FETCH_ASSOC);
verifyA(count($roles)===3,'A01 three distinct restricted roles installed from migration');
foreach ($roles as $r){
    verifyA(!in_array(true,[$r['rolcanlogin'],$r['rolsuper'],$r['rolcreaterole'],$r['rolcreatedb'],$r['rolbypassrls']],true)
        && !in_array('t',array_values($r),true),"A01 role {$r['rolname']} cannot login or bypass privileges");
}
verifyA((int)scalarA($owner,"SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'sec018_runtime_%'")>=38,'A02 role-scoped RLS policies created');
verifyA((int)scalarA($owner,"SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity")===38,'A02 all 38 application tables retain RLS');
verifyA(scalarA($owner,"SELECT relforcerowsecurity FROM pg_class WHERE oid='public.hrms_refresh_sessions'::regclass")===true,'A02 FORCE RLS preserved');

$owner->exec("ALTER ROLE hrms_runtime_restricted LOGIN PASSWORD 'SEC018_PHASEA_CI_RUNTIME_ONLY'");
$keyHex='ac9f1c12ebd1677a7a32e1c79b4d2a808feca339589d302d1bdb102edc4b9e1a';
$stmt=$owner->prepare("INSERT INTO sec018_internal.audit_keys(kid,key_hex) VALUES ('v1',?)");
$stmt->execute([$keyHex]);
$runtime=new LoggingPDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci',
    'hrms_runtime_restricted','SEC018_PHASEA_CI_RUNTIME_ONLY',[]);
$runtime->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$runtime->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
$runtime->setAttribute(PDO::ATTR_EMULATE_PREPARES,true);
$runtime->setAttribute(PDO::ATTR_STATEMENT_CLASS,[LoggingPDOStatement::class,[]]);
verifyA(scalarA($runtime,'SELECT current_user')==='hrms_runtime_restricted',
    'A03 runtime connection uses non-owner restricted role');
verifyA(scalarA($runtime,"SELECT has_schema_privilege(current_user,'public','CREATE')")===false,
    'A03 no CREATE on public schema');
verifyA(scalarA($runtime,"SELECT has_table_privilege(current_user,'sec018_internal.audit_keys','SELECT')")===false,
    'A03 runtime cannot SELECT signing key');
verifyA(scalarA($runtime,"SELECT has_table_privilege(current_user,'public.audit_logs','INSERT')")===false,
    'A03 runtime cannot forge audit rows directly');
verifyA((int)scalarA($runtime,"SELECT count(*) FROM public.users")===2,
    'A03 backend compatibility SELECT works through explicit RLS policy');
try {
    $runtime->exec("ALTER TABLE public.users ADD COLUMN should_not_exist boolean");
    throw new RuntimeException('A03 prohibited ALTER unexpectedly succeeded');
} catch(PDOException $e) {
    verifyA($e->getCode()==='42501','A03 ALTER denied to runtime');
}
try {
    $runtime->exec("DELETE FROM public.users WHERE id='22222222-2222-4222-8222-222222222222'");
    throw new RuntimeException('A03 prohibited DELETE unexpectedly succeeded');
} catch(PDOException $e) {
    verifyA($e->getCode()==='42501','A03 unneeded DELETE privilege denied');
}

// No production or Render secret. This private synthetic key is static solely
// to make the isolated fixture deterministic; never log a real shared secret.
$_ENV['SEC018_AUDIT_CONTEXT_ENABLED']='true';
$_ENV['SEC018_AUDIT_HMAC_KEY']=$keyHex;
Sec018AuditContext::assertConfigured();
$alice='11111111-1111-4111-8111-111111111111';
$bob='22222222-2222-4222-8222-222222222222';
$identity=['uid'=>$alice,'tv'=>1,'ip'=>'127.0.0.1','ua'=>'SyntheticTest/1.0','sid'=>bin2hex(random_bytes(16))];
$runtime->setSec018AuditIdentity($identity);
$update=$runtime->prepare('UPDATE public.users SET "lastName"=? WHERE id=?');
$update->execute(['SignedWriter',$alice]);
verifyA($update->rowCount()===1,'A04 signed context authenticates a prepared DML statement');
$audit=$owner->query('SELECT actor_user_id,actor_role,actor_name,ip_address,session_id
  FROM public.audit_logs ORDER BY id DESC LIMIT 1')->fetch(PDO::FETCH_ASSOC);
verifyA(($audit['actor_user_id']??null)===$alice && ($audit['actor_role']??null)==='employee',
  'A04 trigger records cryptographically verified user and DB-confirmed role');
verifyA(($audit['ip_address']??null)==='127.0.0.1' && strlen((string)($audit['session_id']??''))===32,
  'A04 validated transaction audit metadata persisted');

$before=(int)scalarA($owner,'SELECT count(*) FROM public.audit_logs');
$runtime->beginTransaction();
$runtime->prepare('UPDATE public.users SET "lastName"=? WHERE id=?')->execute(['RolledBack',$alice]);
$runtime->rollBack();
verifyA((int)scalarA($owner,'SELECT count(*) FROM public.audit_logs')===$before,
  'A05 transaction rollback removes both data and audit events');
verifyA(scalarA($owner,"SELECT \"lastName\" FROM public.users WHERE id='{$alice}'")==='SignedWriter',
  'A05 aborted update did not persist');

$_ENV['SEC018_AUDIT_HMAC_KEY']=str_repeat('f',64);
$threw=false;
try {
    $runtime->prepare('UPDATE public.users SET "lastName"=? WHERE id=?')
        ->execute(['Tampered',$alice]);
} catch(PDOException $e){$threw=true;}
verifyA($threw,'A06 mismatched signer/database key fails closed');
verifyA(scalarA($owner,"SELECT \"lastName\" FROM public.users WHERE id='{$alice}'")==='SignedWriter',
  'A06 failed audit proof rolls back protected data modification');
$_ENV['SEC018_AUDIT_HMAC_KEY']=$keyHex;

// Untrusted legacy session GUC must NOT supply an actor on its own, even if
// manipulated by an SQL caller. The event can be logged as unattributed.
$runtime->clearSec018AuditIdentity();
$runtime->query("SELECT set_config('app.current_user_id','{$bob}',false)")->fetchAll();
$runtime->prepare('UPDATE public.users SET "lastName"=? WHERE id=?')
        ->execute(['NoVerifiedActor',$alice]);
$last=$owner->query('SELECT actor_user_id FROM public.audit_logs ORDER BY id DESC LIMIT 1')->fetchColumn();
verifyA($last===null,'A07 spoofed legacy session context never becomes audit actor');

// Grant rollout stays disabled by default; a separate approved deployment
// must provision matching key securely and set enabled=true.
$_ENV['SEC018_AUDIT_CONTEXT_ENABLED']='false';
verifyA(!Sec018AuditContext::enabled(),'A08 audit migration enablement remains explicit and optional');
echo "SEC-018 PHASE A SIGNED AUDIT/ROLE ACCEPTANCE PASSED (synthetic only).\n";
