<?php
declare(strict_types=1);

/**
 * SEC-018 Step 2A — isolated, synthetic PostgreSQL role/RLS regression harness.
 *
 * NEVER run against Supabase or Render. It uses a dedicated CI-only Postgres
 * service and synthetic usernames, passwords and records.
 *
 * This fixture demonstrates RLS mechanics. It is NOT a deployable HRMS RLS
 * migration: raw SQL access can forge custom PostgreSQL GUC identities.
 */

$required = [
    'GITHUB_ACTIONS' => 'true',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'sec018_rls_ci',
    'DB_USERNAME' => 'postgres',
    'DB_PASSWORD' => 'SEC018_LOCAL_PG_CI_ONLY',
];
foreach ($required as $key => $expected) {
    if (getenv($key) !== $expected) {
        fwrite(STDERR, "REFUSED SEC-018 synthetic RLS harness: invalid {$key}\n");
        exit(2);
    }
}
foreach (['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DATABASE_URL'] as $secretName) {
    if (getenv($secretName) !== false && getenv($secretName) !== '') {
        fwrite(STDERR, "REFUSED SEC-018 synthetic RLS harness: external DB configuration present\n");
        exit(2);
    }
}

function verifySec018(bool $condition, string $label): void
{
    if (!$condition) {
        throw new RuntimeException("FAIL SEC-018: {$label}");
    }
    echo "PASS: {$label}\n";
}

function scalarSec018(PDO $conn, string $query): mixed
{
    return $conn->query($query)->fetchColumn();
}

/** Assertions for statements expected to fail with insufficient_privilege. */
function denySec018(PDO $conn, callable $operation, string $label): void
{
    // SAVEPOINT keeps the surrounding synthetic test transaction usable.
    $hasTx = $conn->inTransaction();
    if ($hasTx) $conn->exec('SAVEPOINT sec018_denial');
    try {
        $operation();
        if ($hasTx) $conn->exec('ROLLBACK TO SAVEPOINT sec018_denial');
        throw new RuntimeException("FAIL SEC-018: unexpected permission granted — {$label}");
    } catch (PDOException $exception) {
        if ($hasTx) {
            $conn->exec('ROLLBACK TO SAVEPOINT sec018_denial');
            $conn->exec('RELEASE SAVEPOINT sec018_denial');
        }
        verifySec018($exception->getCode() === '42501', "{$label} (SQLSTATE 42501)");
    }
}

function inIdentitySec018(PDO $conn, string $userId, string $branchId, callable $operation, bool $commit = false): void
{
    $conn->beginTransaction();
    try {
        $s = $conn->prepare("SELECT set_config('sec018.user_id', ?, true)");
        $s->execute([$userId]);
        $s = $conn->prepare("SELECT set_config('sec018.branch_id', ?, true)");
        $s->execute([$branchId]);
        $operation($conn);
        if ($commit) $conn->commit();
        else $conn->rollBack();
    } catch (Throwable $exception) {
        if ($conn->inTransaction()) $conn->rollBack();
        throw $exception;
    }
}

$dsn = 'pgsql:host=127.0.0.1;port=5432;dbname=sec018_rls_ci';
$admin = new PDO($dsn, 'postgres', 'SEC018_LOCAL_PG_CI_ONLY', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => true,
]);

verifySec018(scalarSec018($admin, 'SELECT current_database()') === 'sec018_rls_ci', 'T01 isolated database identity');
verifySec018(scalarSec018($admin, 'SELECT current_user') === 'postgres', 'T01 isolated schema-owner identity');

$admin->exec("CREATE ROLE sec018_ci_runtime LOGIN PASSWORD 'SEC018_SYNTHETIC_RUNTIME'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
$admin->exec("CREATE ROLE sec018_ci_mailer LOGIN PASSWORD 'SEC018_SYNTHETIC_MAILER'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT");
$admin->exec('CREATE SCHEMA sec018_ci');
$admin->exec('REVOKE ALL ON SCHEMA sec018_ci FROM PUBLIC');
$admin->exec('GRANT USAGE ON SCHEMA sec018_ci TO sec018_ci_runtime, sec018_ci_mailer');
$admin->exec('GRANT CONNECT ON DATABASE sec018_rls_ci TO sec018_ci_runtime, sec018_ci_mailer');

$tables = [
    'users' => 'id text PRIMARY KEY, email text NOT NULL',
    'branches' => 'id text PRIMARY KEY',
    'employee' => 'user_id text PRIMARY KEY REFERENCES sec018_ci.users(id), branch_id text NOT NULL REFERENCES sec018_ci.branches(id)',
    'payslips' => 'id text PRIMARY KEY, user_id text NOT NULL REFERENCES sec018_ci.users(id), amount integer NOT NULL',
    'attendance' => 'id text PRIMARY KEY, user_id text NOT NULL REFERENCES sec018_ci.users(id), branch_id text NOT NULL',
    'loan_applications' => 'id text PRIMARY KEY, user_id text NOT NULL REFERENCES sec018_ci.users(id), branch_id text NOT NULL',
    'hrms_refresh_sessions' => 'id text PRIMARY KEY, user_id text NOT NULL REFERENCES sec018_ci.users(id), token_hash text NOT NULL, revoked boolean NOT NULL DEFAULT false',
    'audit_logs' => 'id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor text NOT NULL, action text NOT NULL',
    'email_queue' => 'id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, recipient text NOT NULL, status text NOT NULL DEFAULT \'queued\'',
    'shift_times' => 'id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, label text NOT NULL',
];
foreach ($tables as $name => $definition) {
    $admin->exec("CREATE TABLE sec018_ci.{$name} ({$definition})");
    $admin->exec("ALTER TABLE sec018_ci.{$name} ENABLE ROW LEVEL SECURITY");
}
$admin->exec('ALTER TABLE sec018_ci.hrms_refresh_sessions FORCE ROW LEVEL SECURITY');

$admin->exec("INSERT INTO sec018_ci.users VALUES ('alice','alice@example.invalid'),('bob','bob@example.invalid')");
$admin->exec("INSERT INTO sec018_ci.branches VALUES ('branch-a'),('branch-b')");
$admin->exec("INSERT INTO sec018_ci.employee VALUES ('alice','branch-a'),('bob','branch-b')");
$admin->exec("INSERT INTO sec018_ci.payslips VALUES ('pay-a','alice',1200),('pay-b','bob',2400)");
$admin->exec("INSERT INTO sec018_ci.loan_applications VALUES ('loan-a','alice','branch-a'),('loan-b','bob','branch-b')");
$admin->exec("INSERT INTO sec018_ci.attendance VALUES ('att-a','alice','branch-a'),('att-b','bob','branch-b')");

$admin->exec('GRANT SELECT ON sec018_ci.users, sec018_ci.branches, sec018_ci.employee, sec018_ci.payslips, sec018_ci.attendance, sec018_ci.loan_applications, sec018_ci.hrms_refresh_sessions TO sec018_ci_runtime');
$admin->exec('GRANT INSERT ON sec018_ci.employee, sec018_ci.attendance, sec018_ci.hrms_refresh_sessions, sec018_ci.email_queue, sec018_ci.shift_times TO sec018_ci_runtime');
$admin->exec('GRANT UPDATE ON sec018_ci.employee, sec018_ci.attendance, sec018_ci.loan_applications, sec018_ci.hrms_refresh_sessions TO sec018_ci_runtime');
$admin->exec('GRANT SELECT ON sec018_ci.shift_times TO sec018_ci_runtime');
$admin->exec('GRANT USAGE ON SEQUENCE sec018_ci.email_queue_id_seq, sec018_ci.shift_times_id_seq TO sec018_ci_runtime');
$admin->exec('GRANT SELECT, UPDATE ON sec018_ci.email_queue TO sec018_ci_mailer');

$app = new PDO($dsn, 'sec018_ci_runtime', 'SEC018_SYNTHETIC_RUNTIME', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => true,
]);
$role = $app->query("SELECT rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
    FROM pg_roles WHERE rolname=current_user")->fetch(PDO::FETCH_ASSOC);
verifySec018($role !== false && !in_array(true, array_values($role), true), 'T02 runtime is not privileged');
verifySec018(scalarSec018($app, "SELECT has_schema_privilege(current_user,'sec018_ci','CREATE')") === false, 'T02 runtime cannot create schema objects');

verifySec018((int)scalarSec018($app, 'SELECT COUNT(*) FROM sec018_ci.employee') === 0, 'T03 default-deny RLS hides rows despite SELECT grant');
denySec018($app, fn() => $app->exec("INSERT INTO sec018_ci.employee VALUES ('intruder','branch-a')"), 'T03 no-policy INSERT denied');

// Deliberately illustrative policy model, NOT a secure end-to-end identity
// boundary. An app login with raw SQL access can overwrite these GUCs.
$admin->exec("CREATE POLICY users_login_lookup ON sec018_ci.users FOR SELECT TO sec018_ci_runtime USING (true)");
$admin->exec("CREATE POLICY branches_lookup ON sec018_ci.branches FOR SELECT TO sec018_ci_runtime USING (true)");
$admin->exec("CREATE POLICY employee_owner ON sec018_ci.employee FOR ALL TO sec018_ci_runtime
    USING (user_id = current_setting('sec018.user_id',true))
    WITH CHECK (user_id = current_setting('sec018.user_id',true))");
$admin->exec("CREATE POLICY payslip_owner ON sec018_ci.payslips FOR SELECT TO sec018_ci_runtime
    USING (user_id = current_setting('sec018.user_id',true))");
$admin->exec("CREATE POLICY attendance_owner ON sec018_ci.attendance FOR ALL TO sec018_ci_runtime
    USING (user_id = current_setting('sec018.user_id',true)
       AND branch_id = current_setting('sec018.branch_id',true))
    WITH CHECK (user_id = current_setting('sec018.user_id',true)
       AND branch_id = current_setting('sec018.branch_id',true))");
$admin->exec("CREATE POLICY loan_owner ON sec018_ci.loan_applications FOR ALL TO sec018_ci_runtime
    USING (user_id = current_setting('sec018.user_id',true)
       AND branch_id = current_setting('sec018.branch_id',true))
    WITH CHECK (user_id = current_setting('sec018.user_id',true)
       AND branch_id = current_setting('sec018.branch_id',true))");
$admin->exec("CREATE POLICY refresh_owner ON sec018_ci.hrms_refresh_sessions FOR ALL TO sec018_ci_runtime
    USING (user_id = current_setting('sec018.user_id',true))
    WITH CHECK (user_id = current_setting('sec018.user_id',true))");
$admin->exec("CREATE POLICY shift_read ON sec018_ci.shift_times FOR SELECT TO sec018_ci_runtime USING (true)");
$admin->exec("CREATE POLICY shift_insert ON sec018_ci.shift_times FOR INSERT TO sec018_ci_runtime WITH CHECK (true)");
$admin->exec("CREATE POLICY queue_backend_insert ON sec018_ci.email_queue FOR INSERT TO sec018_ci_runtime WITH CHECK (true)");
$admin->exec("CREATE POLICY queue_mailer_select ON sec018_ci.email_queue FOR SELECT TO sec018_ci_mailer USING (true)");
$admin->exec("CREATE POLICY queue_mailer_update ON sec018_ci.email_queue FOR UPDATE TO sec018_ci_mailer USING (true) WITH CHECK (true)");

// Trigger writes via an audited function owner, while runtime has no direct
// INSERT or SELECT on audit_logs. No client EXECUTE privilege is necessary.
$admin->exec(<<<'SQL'
CREATE FUNCTION sec018_ci.record_attendance_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, sec018_ci AS $$
BEGIN
  INSERT INTO sec018_ci.audit_logs(actor,action) VALUES (NEW.user_id,'attendance_insert');
  RETURN NEW;
END;
$$
SQL);
$admin->exec('REVOKE ALL ON FUNCTION sec018_ci.record_attendance_audit() FROM PUBLIC');
$admin->exec('CREATE TRIGGER attendance_audit AFTER INSERT ON sec018_ci.attendance FOR EACH ROW EXECUTE FUNCTION sec018_ci.record_attendance_audit()');

verifySec018((int)scalarSec018($app, 'SELECT COUNT(*) FROM sec018_ci.employee') === 0, 'T04 no identity means no employee rows');
inIdentitySec018($app,'alice','branch-a',function(PDO $db):void {
    verifySec018((int)scalarSec018($db, 'SELECT COUNT(*) FROM sec018_ci.employee') === 1, 'T04 own employee visible');
    verifySec018((int)scalarSec018($db, "SELECT COUNT(*) FROM sec018_ci.payslips WHERE id='pay-b'") === 0, 'T09 foreign payroll hidden');
    verifySec018((int)scalarSec018($db, "SELECT COUNT(*) FROM sec018_ci.loan_applications WHERE id='loan-b'") === 0, 'T11 cross-branch loan hidden');
    verifySec018((int)scalarSec018($db, "SELECT COUNT(*) FROM sec018_ci.attendance WHERE id='att-b'") === 0, 'T08 cross-branch attendance hidden');
    $changed=$db->exec("UPDATE sec018_ci.loan_applications SET branch_id='branch-a' WHERE id='loan-b'");
    verifySec018($changed===0, 'T11 foreign loan UPDATE changes zero rows');
    denySec018($db,fn()=>$db->exec("INSERT INTO sec018_ci.attendance VALUES ('foreign-attendance','bob','branch-b')"),'T08 forged attendance INSERT denied');
    denySec018($db,fn()=>$db->exec("INSERT INTO sec018_ci.hrms_refresh_sessions VALUES ('session-b','bob','hash')"),'T06 foreign refresh INSERT denied');
});
verifySec018((int)scalarSec018($app,'SELECT COUNT(*) FROM sec018_ci.employee')===0,'T14 SET LOCAL identity cleared after transaction');

inIdentitySec018($app,'alice','branch-a',function(PDO $db):void {
    $db->exec("INSERT INTO sec018_ci.hrms_refresh_sessions(id,user_id,token_hash) VALUES ('session-a','alice','hash-a')");
    $db->exec("UPDATE sec018_ci.hrms_refresh_sessions SET token_hash='hash-rotated' WHERE id='session-a'");
    verifySec018(scalarSec018($db,"SELECT token_hash FROM sec018_ci.hrms_refresh_sessions WHERE id='session-a'")==='hash-rotated','T06 forced-RLS session insert and rotation');
    $db->exec("INSERT INTO sec018_ci.attendance VALUES ('att-new','alice','branch-a')");
    verifySec018((int)scalarSec018($db,"SELECT COUNT(*) FROM sec018_ci.attendance WHERE id='att-new'")===1,'T08 authorized attendance INSERT');
},true);
verifySec018((int)scalarSec018($admin,"SELECT COUNT(*) FROM sec018_ci.audit_logs WHERE action='attendance_insert'")===1,'T12 security-definer audit trigger records event');
verifySec018((int)scalarSec018($admin,"SELECT COUNT(*) FROM sec018_ci.hrms_refresh_sessions WHERE token_hash='hash-rotated'")===1,'T06 committed session state verified');

denySec018($app,fn()=>$app->query('SELECT * FROM sec018_ci.audit_logs')->fetchAll(),'T12 direct audit access denied');
denySec018($app,fn()=>$app->exec("UPDATE sec018_ci.email_queue SET status='sent'"),'T12 backend cannot update delivery queue');
denySec018($app,fn()=>$app->exec('CREATE TABLE sec018_ci.forbidden(id integer)'),'T13 CREATE TABLE denied');
denySec018($app,fn()=>$app->exec('ALTER TABLE sec018_ci.employee ADD COLUMN forbidden boolean'),'T13 ALTER TABLE denied');
denySec018($app,fn()=>$app->exec('TRUNCATE sec018_ci.employee'),'T13 TRUNCATE denied');
denySec018($app,fn()=>$app->exec('SET ROLE postgres'),'T13 privileged role switch denied');

$app->exec("INSERT INTO sec018_ci.email_queue(recipient) VALUES ('test@example.invalid')");
$app->exec("INSERT INTO sec018_ci.shift_times(label) VALUES ('synthetic-shift')");
verifySec018((int)scalarSec018($admin,'SELECT COUNT(*) FROM sec018_ci.shift_times')===1,'T12 permitted sequence default');
$mailer = new PDO($dsn,'sec018_ci_mailer','SEC018_SYNTHETIC_MAILER',[
    PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>true
]);
verifySec018((int)scalarSec018($mailer,'SELECT COUNT(*) FROM sec018_ci.email_queue')===1,'T12 isolated mailer reads queue');
verifySec018($mailer->exec("UPDATE sec018_ci.email_queue SET status='sent' WHERE recipient='test@example.invalid'")===1,'T12 isolated mailer updates queue');
verifySec018((int)scalarSec018($admin,"SELECT COUNT(*) FROM sec018_ci.email_queue WHERE status='sent'")===1,'T12 mailer state verified');

// A custom GUC set by the same database role is forgeable. Record this known
// weakness explicitly; a future trusted identity design is REQUIRED.
inIdentitySec018($app,'alice','branch-a',function(PDO $db):void {
    $db->exec("SELECT set_config('sec018.user_id','bob',true)");
    verifySec018((int)scalarSec018($db,"SELECT COUNT(*) FROM sec018_ci.payslips WHERE id='pay-b'")===1,
        'KNOWN GAP: raw SQL can forge a GUC identity; NOT production-ready RLS');
});
echo "SEC-018 SYNTHETIC HARNESS PASS. IMPORTANT: GUC identity forgery and untested full HRMS workflows remain release blockers.\n";
