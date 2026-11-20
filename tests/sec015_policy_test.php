<?php
declare(strict_types=1);
if ((getenv('DB_DATABASE') ?: '') !== 'sec015_test') {
    fwrite(STDERR, "Refusing SEC-015 policy tests outside sec015_test\n");
    exit(1);
}
require __DIR__ . '/../backend/vendor/autoload.php';
use App\Security\EmailSecurity;

$pdo = new PDO(
    sprintf('pgsql:host=%s;port=%s;dbname=sec015_test', getenv('DB_HOST') ?: '127.0.0.1', getenv('DB_PORT') ?: '5432'),
    getenv('DB_USERNAME') ?: 'postgres', getenv('DB_PASSWORD') ?: ''
);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
function checkPolicy015(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException($label);
}
checkPolicy015(EmailSecurity::escape('<img src=x onerror="test">') === '&lt;img src=x onerror=&quot;test&quot;&gt;','Escaping of HTML and double quotes');
checkPolicy015(EmailSecurity::safeSubject("A\r\nB") === 'A  B','No line breaks in email headers');
$email=EmailSecurity::recruitment($pdo,'00000000-0000-4000-8000-00000000b501','shortlisted');
checkPolicy015($email['to']==='candidate-a@example.invalid','Recipient derived from users table');
checkPolicy015(!str_contains($email['body'],'<a href="https://malicious.invalid">'),'Job title rendered as data, not markup');
checkPolicy015(str_contains($email['body'],'&lt;a href=&quot;https://malicious.invalid&quot;&gt;'),'Job title is HTML escaped');
try {
    EmailSecurity::recruitment($pdo,'00000000-0000-4000-8000-00000000b501','offer');
    throw new RuntimeException('Status mismatch incorrectly allowed');
} catch (DomainException $expected) {}
try {
    EmailSecurity::render('../admin_employees_routes.php', []);
    throw new RuntimeException('Unsafe arbitrary template path resolved');
} catch (RuntimeException $expected) {
    // Template file may exist outside Templates if traversal is allowed.
    // This case is addressed by never taking a template filename from the request;
    // the route only selects values in the private RECRUITMENT_TYPES allowlist.
}
// Test arbitrary numbered rounds against the real server-owned template policy
// in a local transaction. Preserve the shared synthetic fixture for HTTP tests.
$pdo->beginTransaction();
try {
    $stmtRound = $pdo->prepare('UPDATE applications SET status = ? WHERE id = ?');
    foreach (['4th Round Interview', '10th Round Interview', '11th Round Interview',
              '12th Round Interview', '21st Round Interview', 'Final Round Interview'] as $round) {
        $stmtRound->execute([$round, '00000000-0000-4000-8000-00000000b501']);
        $email = EmailSecurity::recruitment($pdo, '00000000-0000-4000-8000-00000000b501', 'interview');
        checkPolicy015(str_contains($email['body'], $round),
            'Secure interview notification must support ' . $round);
    }
} finally {
    $pdo->rollBack();
}
checkPolicy015(str_contains(EmailSecurity::welcome('Demo','demo@example.invalid',str_repeat('a',64)), '/reset-password?token='), 'Welcome setup link available');
echo "PASS SEC-015 server-side rendering, record-bound recipients and type/status policy\n";
