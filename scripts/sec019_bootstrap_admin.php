<?php
declare(strict_types=1);

/**
 * SEC-019: Local CLI-only one-time DEV Admin bootstrap, run AFTER the
 * owner-approved Storage + application-row reset. Do not run during normal
 * application startup and never expose as a web endpoint.
 */
if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "SEC-019 Admin bootstrap is CLI-only\n");
    exit(1);
}
$ref = 'jtgqkkhqyzfbupiqwkgf';
if (getenv('SEC019_BOOTSTRAP_CONFIRM') !== 'NEW-DEV-ADMIN-' . $ref) {
    fwrite(STDERR, "SEC-019 bootstrap confirmation missing\n");
    exit(1);
}
$email = trim((string)(getenv('SEC019_BOOTSTRAP_EMAIL') ?: ''));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "SEC-019 bootstrap requires valid Admin email via local environment\n");
    exit(1);
}
$required = ['DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD'];
foreach ($required as $key) {
    if (!getenv($key)) {
        fwrite(STDERR, "SEC-019 bootstrap missing DB setting: {$key}\n");
        exit(1);
    }
}
if (getenv('DB_DATABASE') !== 'postgres') {
    fwrite(STDERR, "SEC-019 bootstrap refuses unexpected DB name\n");
    exit(1);
}
try {
    $dsn = sprintf(
        'pgsql:host=%s;port=%s;dbname=%s;sslmode=require',
        getenv('DB_HOST'), getenv('DB_PORT'), getenv('DB_DATABASE')
    );
    $pdo = new PDO($dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => true, // compatible with Supabase pooler
    ]);
    if ($pdo->query('SELECT current_user')->fetchColumn() === 'hrms_runtime_restricted') {
        throw new RuntimeException('Use owner-approved setup credentials, not runtime-restricted role');
    }
    $pdo->beginTransaction();
    $users = (int)$pdo->query('SELECT count(*) FROM public.users')->fetchColumn();
    $objects = (int)$pdo->query('SELECT count(*) FROM storage.objects')->fetchColumn();
    $employees = (int)$pdo->query('SELECT count(*) FROM public.employee')->fetchColumn();
    if ($users !== 0 || $objects !== 0 || $employees !== 0) {
        throw new RuntimeException('DEV reset not complete; refusing to create a second Admin');
    }
    // The fixed prefix guarantees policy character classes. The rest uses
    // 192 unpredictable bits, never stored in the repository or sent in email.
    $temporaryPassword = 'R7!m-' . bin2hex(random_bytes(24));
    $hash = password_hash($temporaryPassword, PASSWORD_DEFAULT);
    if (!is_string($hash)) throw new RuntimeException('Could not hash temporary password');

    $stmt = $pdo->prepare('INSERT INTO public.users
      (email,password,"firstName","lastName",role,"isActive","forcePasswordChange")
      VALUES (?, ?, ?, ?, ?, true, true) RETURNING id');
    $stmt->execute([$email,$hash,'Development','Administrator','admin']);
    $adminId = $stmt->fetchColumn();
    // Recreate minimal default settings, not historical data.
    $pdo->exec('INSERT INTO public.global_settings DEFAULT VALUES');
    $pdo->commit();
    fwrite(STDOUT, "SEC-019 new DEV Admin created. ID: {$adminId}\n");
    fwrite(STDOUT, "Email: {$email}\n");
    fwrite(STDOUT, "TEMPORARY PASSWORD (shown ONCE in this terminal; change on first login): {$temporaryPassword}\n");
    fwrite(STDOUT, "Save privately; never share the temporary password in ChatGPT or GitHub.\n");
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "SEC-019 bootstrap failed safely; review DB settings/reset status.\n");
    exit(1);
}
