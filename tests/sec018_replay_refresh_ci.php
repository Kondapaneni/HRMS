<?php
declare(strict_types=1);

/**
 * SEC-018 Step 2E: isolated transaction-bound identity and refresh race tests.
 * Depends ONLY on prior synthetic CI scripts for disposable test roles and
 * pgcrypto extension. No live DB, runtime source, keys or employee data.
 */

foreach ([
    'GITHUB_ACTIONS' => 'true', 'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432', 'DB_DATABASE' => 'sec018_rls_ci',
    'DB_USERNAME' => 'postgres', 'DB_PASSWORD' => 'SEC018_LOCAL_PG_CI_ONLY',
] as $env => $required) {
    if (getenv($env) !== $required) {
        fwrite(STDERR, "REFUSED SEC-018 2E: non-synthetic {$env}\n");
        exit(2);
    }
}
foreach (['DATABASE_URL','SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY'] as $env) {
    if (getenv($env)) {
        fwrite(STDERR, "REFUSED SEC-018 2E: external connection configured\n");
        exit(2);
    }
}
if (!function_exists('pcntl_fork') || !function_exists('pcntl_waitpid')) {
    fwrite(STDERR, "SEC-018 2E requires pcntl for real competing PostgreSQL connections\n");
    exit(2);
}

function sec018EAssert(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException("FAIL SEC-018 2E: {$label}");
    echo "PASS SEC-018 2E: {$label}\n";
}
function sec018EScalar(PDO $conn, string $sql): mixed {
    return $conn->query($sql)->fetchColumn();
}
function sec018EConnection(string $role, string $password): PDO {
    return new PDO('pgsql:host=127.0.0.1;port=5432;dbname=sec018_rls_ci',
        $role, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => true,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
}
function sec018ESign(string $key, string $uid, string $branch, int $version,
    string $xid, int $issued, int $expires): string {
    // Transaction XID is signed: a token is unusable in any other SQL txn.
    $payload = implode('|', [
        'v2', $uid, $branch, (string)$version, 'hrms-db',
        (string)$issued, (string)$expires, $xid, bin2hex(random_bytes(12)),
    ]);
    return $payload . '|' . hash_hmac('sha256', $payload, $key);
}
function sec018ESetContext(PDO $conn, string $value): void {
    $stmt = $conn->prepare("SELECT set_config('sec018_2e.signed', ?, true)");
    $stmt->execute([$value]);
}
function sec018EVisible(PDO $conn): int {
    return (int)sec018EScalar($conn, 'SELECT COUNT(*) FROM sec018_2e_data.payslips');
}
function sec018ERotate(PDO $conn, string $id, string $secret, string $next): string {
    $stmt = $conn->prepare('SELECT sec018_2e_private.rotate_refresh(?,?,?)');
    $stmt->execute([$id,$secret,$next]);
    return (string)$stmt->fetchColumn();
}

$admin = sec018EConnection('postgres', 'SEC018_LOCAL_PG_CI_ONLY');
$app = sec018EConnection('sec018_ci_runtime', 'SEC018_SYNTHETIC_RUNTIME');
$preauth = sec018EConnection('sec018_ci_preauth', 'SEC018_SYNTHETIC_PREAUTH');
sec018EAssert(sec018EScalar($admin,'SELECT current_database()')==='sec018_rls_ci',
    'E01 guards verified disposable DB');
sec018EAssert(sec018EScalar($app,'SELECT current_user')==='sec018_ci_runtime',
    'E01 restricted SQL login');

foreach (['sec018_2e_private','sec018_2e_data'] as $schema) {
    $admin->exec("CREATE SCHEMA {$schema}");
    $admin->exec("REVOKE ALL ON SCHEMA {$schema} FROM PUBLIC");
}
$admin->exec('GRANT USAGE ON SCHEMA sec018_2e_private TO sec018_ci_runtime, sec018_ci_preauth, sec018_ci_verifier');
$admin->exec('GRANT USAGE ON SCHEMA sec018_2e_data TO sec018_ci_runtime, sec018_ci_verifier');
$admin->exec('CREATE TABLE sec018_2e_private.keys (kid text PRIMARY KEY, value text NOT NULL)');
$admin->exec('REVOKE ALL ON TABLE sec018_2e_private.keys FROM PUBLIC');
$admin->exec('GRANT SELECT ON TABLE sec018_2e_private.keys TO sec018_ci_verifier');
$key = bin2hex(random_bytes(32)); // ephemeral only; never printed
$insert=$admin->prepare('INSERT INTO sec018_2e_private.keys VALUES (?,?)');
$insert->execute(['v2',$key]);
$admin->exec('CREATE TABLE sec018_2e_private.accounts (uid text PRIMARY KEY, branch text NOT NULL, active boolean NOT NULL, version integer NOT NULL)');
$admin->exec("INSERT INTO sec018_2e_private.accounts VALUES ('alice','branch-a',true,1),('bob','branch-b',true,1)");
$admin->exec('REVOKE ALL ON TABLE sec018_2e_private.accounts FROM PUBLIC');
$admin->exec('GRANT SELECT ON sec018_2e_private.accounts TO sec018_ci_verifier');

$admin->exec(<<<'SQL'
CREATE FUNCTION sec018_2e_private.claim(wanted text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS $$
DECLARE
    pieces text[];
    token text;
    secret text;
    expected text;
    good integer := 0;
    idx integer;
    now_epoch bigint;
    row_account record;
BEGIN
    token := pg_catalog.current_setting('sec018_2e.signed',true);
    IF token IS NULL OR length(token)>550 THEN RETURN NULL; END IF;
    pieces := pg_catalog.string_to_array(token,'|');
    IF pg_catalog.array_length(pieces,1) IS DISTINCT FROM 10 THEN RETURN NULL; END IF;
    IF pieces[1]<>'v2' OR pieces[5]<>'hrms-db'
       OR pieces[2] !~ '^[a-z][a-z0-9_-]{0,31}$'
       OR pieces[3] !~ '^[a-z][a-z0-9_-]{0,31}$'
       OR pieces[4] !~ '^[0-9]{1,9}$'
       OR pieces[6] !~ '^[0-9]{1,12}$'
       OR pieces[7] !~ '^[0-9]{1,12}$'
       OR pieces[8] !~ '^[0-9]{1,20}$'
       OR pieces[9] !~ '^[a-f0-9]{24}$'
       OR pieces[10] !~ '^[a-f0-9]{64}$' THEN RETURN NULL; END IF;
    IF pg_catalog.txid_current_if_assigned() IS NULL OR
       pieces[8] <> pg_catalog.txid_current_if_assigned()::text THEN RETURN NULL; END IF;
    now_epoch := pg_catalog.date_part('epoch',pg_catalog.clock_timestamp())::bigint;
    IF pieces[6]::bigint > now_epoch+5
       OR pieces[7]::bigint<=now_epoch
       OR pieces[7]::bigint<=pieces[6]::bigint
       OR pieces[7]::bigint-pieces[6]::bigint>60 THEN RETURN NULL; END IF;
    SELECT k.value INTO secret FROM sec018_2e_private.keys k WHERE k.kid=pieces[1];
    IF secret IS NULL THEN RETURN NULL; END IF;
    expected := pg_catalog.encode(sec018_ext.hmac(
         pg_catalog.convert_to(pg_catalog.array_to_string(pieces[1:9],'|'),'UTF8'),
         pg_catalog.convert_to(secret,'UTF8'),'sha256'),'hex');
    FOR idx IN 1..64 LOOP
        good := good | (pg_catalog.ascii(pg_catalog.substr(expected,idx,1))
             # pg_catalog.ascii(pg_catalog.substr(pieces[10],idx,1)));
    END LOOP;
    IF good<>0 THEN RETURN NULL; END IF;
    SELECT a.uid,a.branch,a.active,a.version INTO row_account
      FROM sec018_2e_private.accounts a WHERE a.uid=pieces[2];
    IF NOT FOUND OR NOT row_account.active OR row_account.branch<>pieces[3]
        OR row_account.version<>pieces[4]::integer THEN RETURN NULL; END IF;
    CASE wanted
      WHEN 'uid' THEN RETURN pieces[2];
      WHEN 'branch' THEN RETURN pieces[3];
      ELSE RETURN NULL;
    END CASE;
END
$$
SQL);
$admin->exec('REVOKE ALL ON FUNCTION sec018_2e_private.claim(text) FROM PUBLIC');
$admin->exec('ALTER FUNCTION sec018_2e_private.claim(text) OWNER TO sec018_ci_verifier');
$admin->exec('GRANT EXECUTE ON FUNCTION sec018_2e_private.claim(text) TO sec018_ci_runtime');

$admin->exec('CREATE TABLE sec018_2e_data.payslips(id text PRIMARY KEY, uid text NOT NULL, branch text NOT NULL)');
$admin->exec('ALTER TABLE sec018_2e_data.payslips ENABLE ROW LEVEL SECURITY');
$admin->exec("INSERT INTO sec018_2e_data.payslips VALUES ('a','alice','branch-a'),('b','bob','branch-b')");
$admin->exec('GRANT SELECT ON sec018_2e_data.payslips TO sec018_ci_runtime');
$admin->exec(<<<'SQL'
CREATE POLICY identity_scope ON sec018_2e_data.payslips FOR SELECT TO sec018_ci_runtime
USING (uid=sec018_2e_private.claim('uid') AND branch=sec018_2e_private.claim('branch'))
SQL);

sec018EAssert(sec018EVisible($app)===0,'E02 unsigned request denied');

$app->beginTransaction();
$xid=(string)sec018EScalar($app,'SELECT txid_current()');
$now=time();
$first=sec018ESign($key,'alice','branch-a',1,$xid,$now-1,$now+30);
sec018ESetContext($app,$first);
sec018EAssert(sec018EVisible($app)===1,'E02 correctly signed and transaction-bound identity grants one row');
$app->commit();
sec018EAssert(sec018EVisible($app)===0,'E02 COMMIT clears context');
$app->beginTransaction();
$newXid=(string)sec018EScalar($app,'SELECT txid_current()');
sec018EAssert($newXid!==$xid,'E03 fresh transaction has distinct XID');
sec018ESetContext($app,$first);
sec018EAssert(sec018EVisible($app)===0,'E03 same signed context cannot replay in a new transaction');
$app->rollBack();

$app->beginTransaction();
$rollbackXid=(string)sec018EScalar($app,'SELECT txid_current()');
$rollbackToken=sec018ESign($key,'alice','branch-a',1,$rollbackXid,time()-1,time()+30);
sec018ESetContext($app,$rollbackToken);
sec018EAssert(sec018EVisible($app)===1,'E04 signed context valid before rollback');
$app->rollBack();
$app->beginTransaction();
sec018EScalar($app,'SELECT txid_current()');
sec018ESetContext($app,$rollbackToken);
sec018EAssert(sec018EVisible($app)===0,'E04 rolled-back signed context cannot replay');
$app->rollBack();

// Live revocation changes are synthetic OWNER updates ONLY.
$app->beginTransaction();
$revokeXid=(string)sec018EScalar($app,'SELECT txid_current()');
$revokeToken=sec018ESign($key,'alice','branch-a',1,$revokeXid,time()-1,time()+30);
sec018ESetContext($app,$revokeToken);
sec018EAssert(sec018EVisible($app)===1,'E05 token valid before account change');
$admin->exec("UPDATE sec018_2e_private.accounts SET active=false WHERE uid='alice'");
sec018EAssert(sec018EVisible($app)===0,'E05 deactivated account loses row access within same SQL transaction');
$admin->exec("UPDATE sec018_2e_private.accounts SET active=true,version=2 WHERE uid='alice'");
sec018EAssert(sec018EVisible($app)===0,'E05 session-version bump denies old signed context');
$app->rollBack();

$app->beginTransaction();
$branchXid=(string)sec018EScalar($app,'SELECT txid_current()');
$updated=sec018ESign($key,'alice','branch-a',2,$branchXid,time()-1,time()+30);
sec018ESetContext($app,$updated);
sec018EAssert(sec018EVisible($app)===1,'E06 updated session version works');
$admin->exec("UPDATE sec018_2e_private.accounts SET branch='branch-b' WHERE uid='alice'");
sec018EAssert(sec018EVisible($app)===0,'E06 live branch change invalidates prior signed branch');
$app->rollBack();
$admin->exec("UPDATE sec018_2e_private.accounts SET branch='branch-a' WHERE uid='alice'");

// Refresh model: restricted SECURITY DEFINER gate, FOR UPDATE serializes two
// competing logins; random wrong secrets do NOT revoke a session. Reuse of a
// previously VALID old secret revokes the chain (current HRMS semantics).
$admin->exec(<<<'SQL'
CREATE TABLE sec018_2e_private.refresh_tokens(
  id text PRIMARY KEY, uid text NOT NULL,
  current_hash text NOT NULL, previous_hash text,
  revoked boolean NOT NULL DEFAULT false, version integer NOT NULL
)
SQL);
$admin->exec('ALTER TABLE sec018_2e_private.refresh_tokens ENABLE ROW LEVEL SECURITY');
$admin->exec('ALTER TABLE sec018_2e_private.refresh_tokens FORCE ROW LEVEL SECURITY');
$admin->exec('REVOKE ALL ON sec018_2e_private.refresh_tokens FROM PUBLIC');
$admin->exec('GRANT SELECT, UPDATE ON sec018_2e_private.refresh_tokens TO sec018_ci_verifier');
$admin->exec('CREATE POLICY verifier_access ON sec018_2e_private.refresh_tokens FOR ALL TO sec018_ci_verifier USING (true) WITH CHECK (true)');
$admin->exec(<<<'SQL'
CREATE FUNCTION sec018_2e_private.rotate_refresh(token_id text, presented_secret text, next_secret text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $$
DECLARE
  session_row record;
  account_row record;
  incoming_hash text;
  future_hash text;
BEGIN
  IF token_id IS NULL OR length(token_id)>80
     OR presented_secret !~ '^[a-f0-9]{64}$'
     OR next_secret !~ '^[a-f0-9]{64}$' THEN RETURN 'invalid'; END IF;
  SELECT * INTO session_row FROM sec018_2e_private.refresh_tokens
    WHERE id=token_id FOR UPDATE;
  IF NOT FOUND OR session_row.revoked THEN RETURN 'invalid'; END IF;
  SELECT * INTO account_row FROM sec018_2e_private.accounts
    WHERE uid=session_row.uid;
  IF NOT FOUND OR NOT account_row.active OR
      account_row.version<>session_row.version THEN RETURN 'revoked'; END IF;
  incoming_hash:=pg_catalog.encode(sec018_ext.digest(
    pg_catalog.convert_to(presented_secret,'UTF8'),'sha256'),'hex');
  future_hash:=pg_catalog.encode(sec018_ext.digest(
    pg_catalog.convert_to(next_secret,'UTF8'),'sha256'),'hex');
  IF session_row.current_hash=incoming_hash THEN
     UPDATE sec018_2e_private.refresh_tokens
       SET previous_hash=current_hash,current_hash=future_hash
       WHERE id=token_id;
     RETURN 'rotated';
  END IF;
  IF session_row.previous_hash=incoming_hash THEN
     UPDATE sec018_2e_private.refresh_tokens SET revoked=true WHERE id=token_id;
     RETURN 'replay-revoked';
  END IF;
  RETURN 'invalid';
END
$$
SQL);
$admin->exec('REVOKE ALL ON FUNCTION sec018_2e_private.rotate_refresh(text,text,text) FROM PUBLIC');
$admin->exec('ALTER FUNCTION sec018_2e_private.rotate_refresh(text,text,text) OWNER TO sec018_ci_verifier');
$admin->exec('GRANT EXECUTE ON FUNCTION sec018_2e_private.rotate_refresh(text,text,text) TO sec018_ci_preauth');
sec018EAssert(sec018EScalar($preauth,"SELECT has_table_privilege(current_user,'sec018_2e_private.refresh_tokens','SELECT')")===false,'E07 pre-auth has no direct refresh table SELECT');

$secretA=bin2hex(random_bytes(32));
$nextA=bin2hex(random_bytes(32));
$hashA=hash('sha256',$secretA);
$ins=$admin->prepare('INSERT INTO sec018_2e_private.refresh_tokens VALUES (?,?,?,NULL,false,2)');
$ins->execute(['session-a','alice',$hashA]);
sec018EAssert(sec018ERotate($preauth,'session-a',bin2hex(random_bytes(32)),bin2hex(random_bytes(32)))==='invalid','E07 random invalid guess does not revoke');
sec018EAssert(sec018EScalar($admin,"SELECT revoked FROM sec018_2e_private.refresh_tokens WHERE id='session-a'")===false,'E07 session stays active after invalid guess');

$preauth->beginTransaction();
sec018EAssert(sec018ERotate($preauth,'session-a',$secretA,$nextA)==='rotated','E08 rotation occurs inside transaction');
$preauth->rollBack();
sec018EAssert(sec018EScalar($admin,"SELECT current_hash FROM sec018_2e_private.refresh_tokens WHERE id='session-a'")===$hashA,'E08 rollback restores original refresh hash');
sec018EAssert(sec018ERotate($preauth,'session-a',$secretA,$nextA)==='rotated','E08 original token remains usable after rolled-back rotation');

// Account revocation across requests
$admin->exec("UPDATE sec018_2e_private.accounts SET active=false WHERE uid='alice'");
sec018EAssert(sec018ERotate($preauth,'session-a',$nextA,bin2hex(random_bytes(32)))==='revoked','E09 deactivated account cannot rotate');
$admin->exec("UPDATE sec018_2e_private.accounts SET active=true,version=3 WHERE uid='alice'");
sec018EAssert(sec018ERotate($preauth,'session-a',$nextA,bin2hex(random_bytes(32)))==='revoked','E09 revoked session version cannot rotate');

// Concurrent requests: first update holds the row lock until COMMIT; second
// calls the gate using the same presented secret and waits on that lock.
$raceOld=bin2hex(random_bytes(32));
$raceNew=bin2hex(random_bytes(32));
$raceSecond=bin2hex(random_bytes(32));
$ins->execute(['session-race','alice',hash('sha256',$raceOld)]);
$admin->exec("UPDATE sec018_2e_private.refresh_tokens SET version=3 WHERE id='session-race'");

$preauth->beginTransaction();
sec018EAssert(sec018ERotate($preauth,'session-race',$raceOld,$raceNew)==='rotated','E10 first refresh holds row lock');
$pid=pcntl_fork();
if($pid===-1)throw new RuntimeException('pcntl_fork failed');
if($pid===0) {
    try {
        // New independent PostgreSQL connection, never reuse a PDO after fork.
        $second=sec018EConnection('sec018_ci_preauth','SEC018_SYNTHETIC_PREAUTH');
        $res=sec018ERotate($second,'session-race',$raceOld,$raceSecond);
        exit($res==='replay-revoked'?0:1);
    } catch(Throwable $e) {
        fwrite(STDERR,"SEC-018 2E competing refresh failed: ".$e->getMessage()."\n");
        exit(1);
    }
}
// Confirm that the second session really blocks on the first row lock.
$blocked=false;
for($attempt=0;$attempt<30;$attempt++) {
    $n=(int)sec018EScalar($admin, "SELECT count(*) FROM pg_stat_activity
        WHERE datname='sec018_rls_ci' AND usename='sec018_ci_preauth'
          AND wait_event_type='Lock'");
    if($n>0){$blocked=true;break;}
    usleep(100000);
}
$preauth->commit();
$wait=0;
pcntl_waitpid($pid,$wait);
// PHP fork inherits already-open PDO handles; the child exiting may close
// their shared PostgreSQL transports. Reconnect the parent after waitpid.
// This does not change any synthetic transaction: the winner committed above.
unset($admin,$preauth);
$admin=sec018EConnection('postgres','SEC018_LOCAL_PG_CI_ONLY');
$preauth=sec018EConnection('sec018_ci_preauth','SEC018_SYNTHETIC_PREAUTH');
sec018EAssert($blocked,'E10 second PostgreSQL connection waited on first row lock');
sec018EAssert(pcntl_wifexited($wait)&&pcntl_wexitstatus($wait)===0,'E10 competing refresh observes first committed rotation');
sec018EAssert(sec018EScalar($admin,"SELECT revoked FROM sec018_2e_private.refresh_tokens WHERE id='session-race'")===true,'E10 replayed old credential revokes chain');
sec018EAssert(sec018ERotate($preauth,'session-race',$raceNew,bin2hex(random_bytes(32)))==='invalid','E10 revoked chain cannot be renewed');
sec018EAssert(sec018EScalar($admin,"SELECT current_hash FROM sec018_2e_private.refresh_tokens WHERE id='session-race'")===hash('sha256',$raceNew),'E10 only winning rotation changed token hash');

// The concurrency case also demonstrates a REAL UX risk: two honest refresh
// calls with the same token may cause chain revocation. This isolated harness
// tests behavior, not a safe resolution for legitimate multi-client races.
echo "PASS SEC-018 2E synthetic-only. GAP: concurrent legitimate refresh can revoke the session; real transaction pooler, current HRMS RefreshSessions, MFA and signer-compromise tests remain pending.\n";
