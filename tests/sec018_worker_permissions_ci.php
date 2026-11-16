<?php
declare(strict_types=1);

/**
 * SEC-018 Step 1E: worker/function compatibility only in GitHub's disposable
 * PostgreSQL service. The checked URL, roles and secrets are synthetic.
 * No live Supabase/Render connection, outbound email, or real data access.
 */
foreach ([
    'GITHUB_ACTIONS' => 'true',
    'DB_HOST' => '127.0.0.1',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'sec018_phasea_ci',
    'DB_USERNAME' => 'postgres',
    'DB_PASSWORD' => 'SEC018_PHASEA_CI_PG_ONLY',
] as $name => $expected) {
    if (getenv($name) !== $expected) {
        fwrite(STDERR, "REFUSED SEC-018 Step 1E: non-disposable CI environment ($name)\n");
        exit(2);
    }
}
foreach (['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'] as $name) {
    if (getenv($name)) {
        fwrite(STDERR, "REFUSED SEC-018 Step 1E: external connection configuration detected\n");
        exit(2);
    }
}

function step1eCheck(bool $ok, string $label): void
{
    if (!$ok) {
        throw new RuntimeException("FAIL SEC-018 Step 1E: $label");
    }
    echo "PASS SEC-018 Step 1E: $label\n";
}
function step1eBool(mixed $value): bool
{
    return in_array($value, [true, 1, '1', 't', 'true'], true);
}
function step1eScalar(PDO $db, string $sql, array $params = []): mixed
{
    $statement = $db->prepare($sql);
    $statement->execute($params);
    return $statement->fetchColumn();
}

$db = new PDO(
    'pgsql:host=127.0.0.1;port=5432;dbname=sec018_phasea_ci',
    'postgres', 'SEC018_PHASEA_CI_PG_ONLY',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
     PDO::ATTR_EMULATE_PREPARES => true]
);
step1eCheck(step1eScalar($db, 'SELECT current_database()') === 'sec018_phasea_ci'
    && step1eScalar($db, 'SELECT current_user') === 'postgres',
    'isolated database and reviewed cron owner confirmed');

// These are the public functions present in the disposable full-table fixture.
// Two live functions not invoked by the application triggers (rls_auto_enable,
// enforce_direct_chat_two_participants) remain outside this functional test.
$publicFunctions = [
    'public.daily_attendance_master()',
    'public.finalize_attendance()',
    'public.insert_weekend_holiday_attendance()',
    'public.jsonb_diff_val(jsonb,jsonb)',
    'public.process_audit_log()',
    'public.update_assets_updated_at_column()',
    // Step 1F: ACL models of two functions whose real bodies are unavailable.
    'public.rls_auto_enable()',
    'public.enforce_direct_chat_two_participants()',
];
foreach ($publicFunctions as $signature) {
    // An absent function must not accidentally pass a negative grant check.
    step1eCheck(step1eBool(step1eScalar($db, 'SELECT to_regprocedure(?) IS NOT NULL', [$signature])),
        "disposable function fixture includes $signature");
    foreach (['anon', 'authenticated', 'hrms_runtime_restricted'] as $role) {
        $grant = step1eScalar($db,
            'SELECT has_function_privilege(?, to_regprocedure(?), ?)',
            [$role, $signature, 'EXECUTE']);
        step1eCheck(!step1eBool($grant),
            "$role cannot directly EXECUTE $signature");
    }
}
// SEC-018 Step 1F: fail fast if the structural fixture drifts from the
// previously documented read-only schema inventory: 38 tables / 407 columns /
// 78 constraints / nine non-internal row triggers. These counts do not prove
// full production schema equivalence (extensions and function bodies differ).
$inventory = [
    'application tables' => [
        'SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname=\'public\' AND c.relkind=\'r\'', 38],
    'application columns' => [
        'SELECT count(*) FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
         JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname=\'public\' AND c.relkind=\'r\' AND a.attnum>0 AND NOT a.attisdropped', 407],
    'application constraints' => [
        'SELECT count(*) FROM pg_catalog.pg_constraint co JOIN pg_catalog.pg_class c ON c.oid=co.conrelid
         JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname=\'public\'', 78],
    'non-internal application triggers' => [
        'SELECT count(*) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid
         JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
         WHERE n.nspname=\'public\' AND NOT t.tgisinternal', 9],
];
foreach ($inventory as $label => [$sql, $expected]) {
    step1eCheck((int)step1eScalar($db, $sql) === $expected,
        "synthetic fixture preserves $expected $label");
}
step1eCheck((int)step1eScalar($db,
    "SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public'") === 8,
    'six functional public routines plus two explicit ACL-only models');

foreach ([
    'public.rls_auto_enable()' => [true, 'event_trigger'],
    'public.enforce_direct_chat_two_participants()' => [false, 'trigger'],
] as $signature => [$definer, $syntheticReturn]) {
    $metadata = $db->prepare(
        'SELECT p.prosecdef, p.prorettype::regtype::text AS ret, pg_get_userbyid(p.proowner) AS owner
         FROM pg_catalog.pg_proc p WHERE p.oid=to_regprocedure(?)'
    );
    $metadata->execute([$signature]);
    $row = $metadata->fetch(PDO::FETCH_ASSOC);
    step1eCheck(is_array($row)
        && step1eBool($row['prosecdef'] ?? null) === $definer
        && ($row['ret'] ?? '') === $syntheticReturn
        && ($row['owner'] ?? '') === 'postgres',
        "synthetic ACL-only model's declared metadata for $signature");
    // Privileged catalog objects are not invoked. Real function bodies,
    // dependencies and any live DDL event registrations remain unverified.
}
step1eCheck((int)step1eScalar($db,
    'SELECT count(*) FROM pg_catalog.pg_event_trigger') === 0,
    'test fixture registers no DDL event triggers or real RLS helper execution');

step1eCheck(step1eBool(step1eScalar($db,
    "SELECT has_function_privilege('hrms_audit_executor', 'public.jsonb_diff_val(jsonb,jsonb)', 'EXECUTE')")),
    'signed audit trigger owner retains required JSON-diff function access');

step1eCheck(step1eScalar($db,
    "SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.daily_attendance_master()'::regprocedure")
    === 'postgres',
    'scheduled attendance procedure retains postgres ownership');

$userId = '22222222-2222-4222-8222-222222222222';
$db->beginTransaction();
try {
    $db->prepare('INSERT INTO public.employee ("employeeId", "userId", status, "joinDate", "weekOff")
        VALUES (?, ?::uuid, ?, CURRENT_DATE - 1, ?)')
       ->execute(['SEC018-CRON-CI', $userId, 'active', 'Neverday']);
    // Replays the cron entry point once as postgres, never touching cron.job.
    step1eScalar($db, 'SELECT public.daily_attendance_master()');
    step1eCheck((int)step1eScalar($db,
        'SELECT count(*) FROM public.attendance
         WHERE "employeeId"=?::uuid AND date=CURRENT_DATE - 1 AND status=?',
        [$userId, 'missed']) === 1,
        'postgres attendance job creates expected synthetic missed-day row');
    step1eCheck((int)step1eScalar($db,
        'SELECT count(*) FROM public.audit_logs
         WHERE entity_type=? AND target_employee_id=? AND actor_user_id IS NULL',
        ['attendance', $userId]) >= 1,
        'cron write still activates signed-audit trigger without forging a user actor');
} finally {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
}
step1eCheck((int)step1eScalar($db,
    'SELECT count(*) FROM public.employee WHERE "employeeId"=?',
    ['SEC018-CRON-CI']) === 0,
    'cron synthetic writes rolled back');

step1eCheck(step1eBool(step1eScalar($db,
    "SELECT has_table_privilege('service_role', 'public.email_queue', 'SELECT')"))
    && step1eBool(step1eScalar($db,
    "SELECT has_table_privilege('service_role', 'public.email_queue', 'UPDATE')"))
    && step1eBool(step1eScalar($db,
    "SELECT has_table_privilege('service_role', 'public.email_queue', 'INSERT')")),
    'preexisting synthetic service_role email permissions survive migration');
foreach (['anon', 'authenticated'] as $role) {
    step1eCheck(!step1eBool(step1eScalar($db,
        "SELECT has_table_privilege(?, 'public.email_queue', 'SELECT')", [$role])),
        "$role has no email_queue SELECT after revocation");
}
step1eCheck(step1eBool(step1eScalar($db,
    "SELECT rolbypassrls FROM pg_roles WHERE rolname='service_role'")),
    'synthetic email worker represents existing BYPASSRLS role');

$db->beginTransaction();
try {
    $id = step1eScalar($db,
        'INSERT INTO public.email_queue(to_email, subject, body)
         VALUES (?, ?, ?) RETURNING id',
        ['sec018-worker@example.invalid', 'SEC-018 fixture', 'No message will be delivered']);
    step1eCheck(is_string($id) && $id !== '',
        'synthetic email queue insert completed without external delivery');
    step1eCheck((string)step1eScalar($db,
        "SELECT current_setting('sec018.ci_webhook_hits', true)") === '1',
        'email webhook fired exactly once via no-network stub');
    // Switch only a disposable connection to the role used by the email worker.
    $db->exec('SET ROLE service_role');
    step1eCheck(step1eScalar($db, 'SELECT current_user') === 'service_role',
        'email worker operates under its designated non-HTTP role');
    step1eCheck((int)step1eScalar($db,
        'SELECT count(*) FROM public.email_queue WHERE id=?::uuid', [$id]) === 1,
        'worker SELECT still succeeds through original explicit grant');
    $statement = $db->prepare(
        "UPDATE public.email_queue SET status='sent' WHERE id=?::uuid");
    $statement->execute([$id]);
    step1eCheck($statement->rowCount() === 1,
        'worker delivery-status UPDATE still succeeds');
} finally {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    $db->exec('RESET ROLE');
}
step1eCheck((int)step1eScalar($db,
    'SELECT count(*) FROM public.email_queue WHERE to_email=?',
    ['sec018-worker@example.invalid']) === 0,
    'email synthetic writes rolled back with no outbound message');
echo "SEC-018 STEP 1E ISOLATED FUNCTION/WORKER REGRESSION PASSED.\n";
