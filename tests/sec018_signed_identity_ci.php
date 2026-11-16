<?php
declare(strict_types=1);

/**
 * SEC-018 Step 2C — synthetic signed database-identity proof of concept.
 *
 * The script MUST run immediately after sec018_rls_ci.php in the disposable
 * GitHub Actions PostgreSQL 16 service. NOT a production RLS migration.
 *
 * Threat boundary: raw SQL executed as a restricted runtime DB login may set
 * any custom GUC, but cannot produce another user's valid HMAC without the
 * signing key. Full PHP/backend compromise remains out of scope.
 */

foreach ([
    'GITHUB_ACTIONS' => 'true',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'sec018_rls_ci',
    'DB_USERNAME' => 'postgres',
    'DB_PASSWORD' => 'SEC018_LOCAL_PG_CI_ONLY',
] as $name => $requiredValue) {
    if (getenv($name) !== $requiredValue) {
        fwrite(STDERR, "REFUSED SEC-018 signed identity: invalid CI environment {$name}\n");
        exit(2);
    }
}
foreach (['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'] as $name) {
    if (($value = getenv($name)) !== false && $value !== '') {
        fwrite(STDERR, "REFUSED SEC-018 signed identity: external database config present\n");
        exit(2);
    }
}

function sec018SignedCheck(bool $check, string $label): void
{
    if (!$check) throw new RuntimeException("SEC-018 2C FAIL: {$label}");
    echo "PASS SEC-018 2C: {$label}\n";
}

function sec018SignedScalar(PDO $conn, string $sql): mixed
{
    return $conn->query($sql)->fetchColumn();
}

function sec018SignedDeny(PDO $conn, callable $action, string $label): void
{
    $wasInTx = $conn->inTransaction();
    if ($wasInTx) $conn->exec('SAVEPOINT sec018_signed_deny');
    try {
        $action();
        if ($wasInTx) $conn->exec('ROLLBACK TO SAVEPOINT sec018_signed_deny');
        throw new RuntimeException("SEC-018 2C FAIL: {$label} unexpectedly succeeded");
    } catch (PDOException $e) {
        if ($wasInTx) {
            $conn->exec('ROLLBACK TO SAVEPOINT sec018_signed_deny');
            $conn->exec('RELEASE SAVEPOINT sec018_signed_deny');
        }
        sec018SignedCheck($e->getCode() === '42501', "{$label} denied (42501)");
    }
}

function sec018SignedToken(string $secret, string $subject, string $branch, int $iat, int $exp, string $audience = 'hrms-db'): string
{
    $requestId = bin2hex(random_bytes(12));
    $payload = implode('|', ['v1', $subject, $branch, $audience, (string)$iat, (string)$exp, $requestId]);
    return $payload . '|' . hash_hmac('sha256', $payload, $secret);
}

function sec018SignedInTransaction(PDO $conn, string $token, callable $action, bool $commit = false): void
{
    $conn->beginTransaction();
    try {
        $stmt = $conn->prepare("SELECT set_config('sec018.signed_context', ?, true)");
        $stmt->execute([$token]);
        $action($conn);
        if ($commit) $conn->commit();
        else $conn->rollBack();
    } catch (Throwable $e) {
        if ($conn->inTransaction()) $conn->rollBack();
        throw $e;
    }
}

$dsn = 'pgsql:host=127.0.0.1;port=5432;dbname=sec018_rls_ci';
$admin = new PDO($dsn, 'postgres', 'SEC018_LOCAL_PG_CI_ONLY', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => true,
]);
$app = new PDO($dsn, 'sec018_ci_runtime', 'SEC018_SYNTHETIC_RUNTIME', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => true,
]);
sec018SignedCheck(sec018SignedScalar($admin, 'SELECT current_database()') === 'sec018_rls_ci', 'P01 disposable PostgreSQL database');
sec018SignedCheck(sec018SignedScalar($app, 'SELECT current_user') === 'sec018_ci_runtime', 'P01 restricted runtime identity');

$admin->exec("CREATE ROLE sec018_ci_verifier NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
$admin->exec("CREATE ROLE sec018_ci_preauth LOGIN PASSWORD 'SEC018_SYNTHETIC_PREAUTH'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
foreach (['sec018_guard', 'sec018_ext', 'sec018_signed'] as $schema) {
    $admin->exec("CREATE SCHEMA {$schema}");
    $admin->exec("REVOKE ALL ON SCHEMA {$schema} FROM PUBLIC");
}
$admin->exec('CREATE EXTENSION pgcrypto WITH SCHEMA sec018_ext');
$admin->exec('GRANT USAGE ON SCHEMA sec018_ext TO sec018_ci_verifier');
$admin->exec('GRANT USAGE ON SCHEMA sec018_guard TO sec018_ci_verifier, sec018_ci_runtime, sec018_ci_preauth');
$admin->exec('GRANT USAGE ON SCHEMA sec018_signed TO sec018_ci_runtime, sec018_ci_verifier');
$admin->exec('GRANT CONNECT ON DATABASE sec018_rls_ci TO sec018_ci_preauth');

// Signing key is randomly generated for this CI run; never logged or committed.
// Only a dedicated NOLOGIN function owner can read the database copy.
// The PHP signing service keeps its separate in-memory copy in this POC.
$key = bin2hex(random_bytes(32));
$admin->exec('CREATE TABLE sec018_guard.signing_keys (kid text PRIMARY KEY, secret text NOT NULL)');
$admin->exec('REVOKE ALL ON TABLE sec018_guard.signing_keys FROM PUBLIC');
$insert = $admin->prepare('INSERT INTO sec018_guard.signing_keys (kid,secret) VALUES (?,?)');
$insert->execute(['v1', $key]);
$admin->exec('GRANT SELECT ON TABLE sec018_guard.signing_keys TO sec018_ci_verifier');

// Return only a verified claim, never the signing key. A GUC is treated as
// attacker-controlled until the signature, audience, time and encoding pass.
// All objects/functions referenced by SECURITY DEFINER are schema qualified.
$admin->exec(<<<'SQL'
CREATE FUNCTION sec018_guard.verified_claim(claim text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $func$
DECLARE
    token text;
    pieces text[];
    canonical text;
    signing_key text;
    expected text;
    issued bigint;
    expires bigint;
    now_epoch bigint;
    mismatch integer := 0;
    i integer;
BEGIN
    token := pg_catalog.current_setting('sec018.signed_context', true);
    IF token IS NULL OR length(token) > 512 THEN RETURN NULL; END IF;
    pieces := pg_catalog.string_to_array(token, '|');
    IF pg_catalog.array_length(pieces,1) IS DISTINCT FROM 8 THEN RETURN NULL; END IF;
    IF pieces[1] <> 'v1' OR pieces[4] <> 'hrms-db' THEN RETURN NULL; END IF;
    IF pieces[2] !~ '^[a-z][a-z0-9_-]{0,31}$'
        OR pieces[3] !~ '^[a-z][a-z0-9_-]{0,31}$'
        OR pieces[5] !~ '^[0-9]{1,12}$'
        OR pieces[6] !~ '^[0-9]{1,12}$'
        OR pieces[7] !~ '^[a-f0-9]{24}$'
        OR pieces[8] !~ '^[a-f0-9]{64}$' THEN
        RETURN NULL;
    END IF;
    issued := pieces[5]::bigint;
    expires := pieces[6]::bigint;
    now_epoch := pg_catalog.extract(epoch FROM pg_catalog.clock_timestamp())::bigint;
    IF issued > now_epoch + 5 OR expires <= now_epoch
        OR expires <= issued OR expires - issued > 60 THEN
        RETURN NULL;
    END IF;

    SELECT k.secret INTO signing_key
        FROM sec018_guard.signing_keys AS k WHERE k.kid = pieces[1];
    IF signing_key IS NULL THEN RETURN NULL; END IF;
    canonical := pg_catalog.array_to_string(pieces[1:7], '|');
    expected := pg_catalog.encode(
        sec018_ext.hmac(
            pg_catalog.convert_to(canonical,'UTF8'),
            pg_catalog.convert_to(signing_key,'UTF8'),
            'sha256'
        ),
        'hex'
    );
    -- Compare every character. String equality may short-circuit.
    FOR i IN 1..64 LOOP
        mismatch := mismatch | (pg_catalog.ascii(pg_catalog.substr(expected,i,1))
            # pg_catalog.ascii(pg_catalog.substr(pieces[8],i,1)));
    END LOOP;
    IF mismatch <> 0 THEN RETURN NULL; END IF;
    CASE claim
        WHEN 'user_id' THEN RETURN pieces[2];
        WHEN 'branch_id' THEN RETURN pieces[3];
        ELSE RETURN NULL;
    END CASE;
END
$func$;
SQL);
$admin->exec('REVOKE ALL ON FUNCTION sec018_guard.verified_claim(text) FROM PUBLIC');
$admin->exec('ALTER FUNCTION sec018_guard.verified_claim(text) OWNER TO sec018_ci_verifier');
$admin->exec('GRANT EXECUTE ON FUNCTION sec018_guard.verified_claim(text) TO sec018_ci_runtime');

// The POC identity RLS table is intentionally separate from the original
// forged-GUC fixture. It models payroll and forced-RLS refresh access.
$admin->exec('CREATE TABLE sec018_signed.payroll (id text PRIMARY KEY,user_id text NOT NULL,branch_id text NOT NULL,amount integer NOT NULL)');
$admin->exec('CREATE TABLE sec018_signed.refresh_sessions (id text PRIMARY KEY,user_id text NOT NULL,token_hash text NOT NULL)');
foreach (['payroll', 'refresh_sessions'] as $table) {
    $admin->exec("ALTER TABLE sec018_signed.{$table} ENABLE ROW LEVEL SECURITY");
}
$admin->exec('ALTER TABLE sec018_signed.refresh_sessions FORCE ROW LEVEL SECURITY');
$admin->exec("INSERT INTO sec018_signed.payroll VALUES ('alice-pay','alice','branch-a',1200),('bob-pay','bob','branch-b',2400)");
$admin->exec('GRANT SELECT, INSERT, UPDATE ON sec018_signed.payroll, sec018_signed.refresh_sessions TO sec018_ci_runtime');
$admin->exec(<<<'SQL'
CREATE POLICY payroll_signed ON sec018_signed.payroll FOR ALL TO sec018_ci_runtime
USING (user_id = sec018_guard.verified_claim('user_id')
    AND branch_id = sec018_guard.verified_claim('branch_id'))
WITH CHECK (user_id = sec018_guard.verified_claim('user_id')
    AND branch_id = sec018_guard.verified_claim('branch_id'))
SQL);
$admin->exec(<<<'SQL'
CREATE POLICY refresh_signed ON sec018_signed.refresh_sessions FOR ALL TO sec018_ci_runtime
USING (user_id = sec018_guard.verified_claim('user_id'))
WITH CHECK (user_id = sec018_guard.verified_claim('user_id'))
SQL);

sec018SignedCheck((int)sec018SignedScalar($app,'SELECT count(*) FROM sec018_signed.payroll') === 0,'P02 no signed context => RLS default deny');
sec018SignedCheck((int)sec018SignedScalar($app,'SELECT count(*) FROM sec018_signed.refresh_sessions') === 0,'P02 forced RLS default deny');
sec018SignedCheck(sec018SignedScalar($app,"SELECT has_table_privilege(current_user,'sec018_guard.signing_keys','SELECT')") === false,'P03 SQL runtime has no signing-key SELECT');
sec018SignedCheck(sec018SignedScalar($app,"SELECT has_schema_privilege(current_user,'sec018_ext','USAGE')") === false,'P03 SQL runtime cannot access HMAC extension schema');
sec018SignedDeny($app, fn()=>$app->query('SELECT secret FROM sec018_guard.signing_keys')->fetchAll(),'P03 direct secret read');
sec018SignedDeny($app, fn()=>$app->exec("SET ROLE sec018_ci_verifier"),'P03 verifier role switching');

$now = time();
$alice = sec018SignedToken($key,'alice','branch-a',$now-1,$now+30);
$bob = sec018SignedToken($key,'bob','branch-b',$now-1,$now+30);

sec018SignedInTransaction($app,$alice,function(PDO $conn):void {
    sec018SignedCheck(sec018SignedScalar($conn,"SELECT sec018_guard.verified_claim('user_id')")==='alice','P04 HMAC verified Alice identity');
    sec018SignedCheck((int)sec018SignedScalar($conn,'SELECT count(*) FROM sec018_signed.payroll')===1,'P04 own payroll visible');
    sec018SignedCheck((int)sec018SignedScalar($conn,"SELECT count(*) FROM sec018_signed.payroll WHERE id='bob-pay'")===0,'P04 foreign payroll hidden');
    sec018SignedCheck($conn->exec("UPDATE sec018_signed.payroll SET amount=999 WHERE id='bob-pay'")===0,'P04 cross-user UPDATE changes zero rows');
    $conn->exec("SELECT set_config('sec018.user_id','bob',true)");
    $conn->exec("SELECT set_config('sec018.branch_id','branch-b',true)");
    sec018SignedCheck((int)sec018SignedScalar($conn,"SELECT count(*) FROM sec018_signed.payroll WHERE id='bob-pay'")===0,'P05 forging legacy unsigned GUC does not change verified identity');
    sec018SignedDeny($conn,fn()=>$conn->exec("INSERT INTO sec018_signed.payroll VALUES ('forged-pay','bob','branch-b',9999)"),'P04 foreign payroll INSERT');
    $conn->exec("INSERT INTO sec018_signed.refresh_sessions VALUES ('refresh-a','alice','hash-a')");
    $conn->exec("UPDATE sec018_signed.refresh_sessions SET token_hash='hash-rotated' WHERE id='refresh-a'");
    sec018SignedCheck(sec018SignedScalar($conn,"SELECT token_hash FROM sec018_signed.refresh_sessions WHERE id='refresh-a'")==='hash-rotated','P09 signed-context forced-RLS refresh rotation');
},true);
sec018SignedCheck((int)sec018SignedScalar($app,'SELECT count(*) FROM sec018_signed.payroll')===0,'P07 COMMIT clears signed transaction context');
sec018SignedCheck((int)sec018SignedScalar($admin,"SELECT count(*) FROM sec018_signed.payroll WHERE id='forged-pay'")===0,'P04 denied INSERT leaves no rows');
sec018SignedCheck(sec018SignedScalar($admin,"SELECT token_hash FROM sec018_signed.refresh_sessions WHERE id='refresh-a'")==='hash-rotated','P09 session rotation committed');

$bad = [
    'unsigned context' => 'v1|bob|branch-b|hrms-db|1|2|abcdef0123456789abcdef01|' . str_repeat('0',64),
    'tampered subject' => str_replace('|alice|','|bob|',$alice),
    'tampered branch' => str_replace('|branch-a|','|branch-b|',$alice),
    'wrong audience' => sec018SignedToken($key,'bob','branch-b',$now-1,$now+30,'hrms-web'),
    'expired signed context' => sec018SignedToken($key,'bob','branch-b',$now-100,$now-10),
    'future signed context' => sec018SignedToken($key,'bob','branch-b',$now+100,$now+120),
    'overlong signed lifetime' => sec018SignedToken($key,'bob','branch-b',$now-1,$now+600),
    'malformed context' => 'not-a-token',
];
foreach ($bad as $label=>$token) {
    sec018SignedInTransaction($app,$token,function(PDO $conn) use($label):void {
        sec018SignedCheck(sec018SignedScalar($conn,"SELECT sec018_guard.verified_claim('user_id')")===null,"P06 rejects {$label}");
        sec018SignedCheck((int)sec018SignedScalar($conn,'SELECT count(*) FROM sec018_signed.payroll')===0,"P06 RLS hides rows for {$label}");
    });
}

sec018SignedInTransaction($app,$bob,function(PDO $conn):void {
    sec018SignedCheck((int)sec018SignedScalar($conn,'SELECT count(*) FROM sec018_signed.payroll')===1,'P07 Bob identity works on reused connection');
    sec018SignedCheck((int)sec018SignedScalar($conn,"SELECT count(*) FROM sec018_signed.payroll WHERE id='alice-pay'")===0,'P07 cannot inherit Alice scope from prior request');
    sec018SignedCheck($conn->exec("UPDATE sec018_signed.refresh_sessions SET token_hash='stolen' WHERE id='refresh-a'")===0,'P09 foreign refresh update changes zero rows');
});
sec018SignedCheck(sec018SignedScalar($admin,"SELECT token_hash FROM sec018_signed.refresh_sessions WHERE id='refresh-a'")==='hash-rotated','P09 foreign token hash unchanged');

// Separate synthetic pre-auth role: no direct table privileges. This models
// only limited lookup discovery; NOT authentication or refresh verification.
$admin->exec('CREATE TABLE sec018_signed.login_directory(email text PRIMARY KEY,user_id text NOT NULL)');
$admin->exec('ALTER TABLE sec018_signed.login_directory ENABLE ROW LEVEL SECURITY');
$admin->exec("INSERT INTO sec018_signed.login_directory VALUES ('alice@example.invalid','alice'),('bob@example.invalid','bob')");
$admin->exec('GRANT SELECT ON sec018_signed.login_directory TO sec018_ci_verifier');
// The NOLOGIN verifier can perform the narrowly scoped lookup despite RLS.
$admin->exec("CREATE POLICY login_lookup_verifier ON sec018_signed.login_directory FOR SELECT TO sec018_ci_verifier USING (true)");
$admin->exec(<<<'SQL'
CREATE FUNCTION sec018_guard.pre_auth_lookup(lookup_email text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $func$
DECLARE
    result_id text;
BEGIN
    IF lookup_email IS NULL OR length(lookup_email) > 254 THEN RETURN NULL; END IF;
    SELECT d.user_id INTO result_id FROM sec018_signed.login_directory AS d
        WHERE d.email = lookup_email LIMIT 1;
    RETURN result_id;
END
$func$
SQL);
$admin->exec('REVOKE ALL ON FUNCTION sec018_guard.pre_auth_lookup(text) FROM PUBLIC');
$admin->exec('ALTER FUNCTION sec018_guard.pre_auth_lookup(text) OWNER TO sec018_ci_verifier');
$admin->exec('GRANT EXECUTE ON FUNCTION sec018_guard.pre_auth_lookup(text) TO sec018_ci_preauth');
$preauth = new PDO($dsn,'sec018_ci_preauth','SEC018_SYNTHETIC_PREAUTH',[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES=>true,
]);
sec018SignedCheck(sec018SignedScalar($preauth,"SELECT sec018_guard.pre_auth_lookup('alice@example.invalid')")==='alice','P10 limited pre-auth lookup works');
sec018SignedDeny($preauth,fn()=>$preauth->query('SELECT * FROM sec018_signed.login_directory')->fetchAll(),'P10 no raw login-directory SELECT');
sec018SignedDeny($preauth,fn()=>$preauth->query('SELECT * FROM sec018_signed.payroll')->fetchAll(),'P10 no payroll access');
sec018SignedDeny($preauth,fn()=>$preauth->query("SELECT sec018_guard.verified_claim('user_id')")->fetchAll(),'P10 no signed verifier access');

echo "SEC-018 STEP 2C SYNTHETIC SIGNED IDENTITY PASS. Pre-auth authentication, token replay, signing-service compromise, and real pooler remain unresolved.\n";
