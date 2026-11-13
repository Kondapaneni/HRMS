<?php
declare(strict_types=1);

// SEC-004: no credentials, database, internet, or user records required.
require __DIR__ . '/../backend/public/sec004_gemini_security.php';

function assertSec004(bool $valid, string $label): void {
    if (!$valid) {
        fwrite(STDERR, "FAIL: {$label}\n");
        exit(1);
    }
}

$privateQuestions = [
    'What is my PAN number?',
    'What is my salary?',
    'What is Alice Smith salary?',
    'Show all employee records',
    'List bank accounts',
    'my email is alice@example.com',
    'what is net salary for PAN ABCDE1234F',
    'How do I apply for leave? Alice Smith has bank account 123456789012.',
    'How do I apply for leave\nEmail: alice@example.com',
    'Show candidates and applicant phone numbers',
    'Who is my manager?',
    'My attendance today',
    'how do i apply for leave; PAN ABCDE1234F',
    '',
];

foreach ($privateQuestions as $message) {
    assertSec004(sec004GeminiFaqPayload($message) === null, 'private/custom query blocked');
    assertSec004(sec004CallGeminiPublicFaq('dummy-key', $message) === null,
        'no outgoing request for private query');
}

$publicQuestions = [
    'What is paid leave?',
    'HOW DO I APPLY FOR LEAVE?',
    'How   do  I apply for leave',
    'What is a payslip',
    'What is employee onboarding?',
];

foreach ($publicQuestions as $message) {
    $payload = sec004GeminiFaqPayload($message);
    assertSec004(is_array($payload), 'general FAQ allowlisted');
    assertSec004(count($payload['contents'] ?? []) === 1, 'only one canonical message');
    assertSec004(($payload['contents'][0]['role'] ?? '') === 'user', 'canonical user role');
    $serialized = json_encode($payload);
    assertSec004(strpos($serialized, $message) === false ||
        $message === 'What is a payslip', 'raw input not forwarded');
    assertSec004(strpos($serialized, 'alice@example.com') === false,
        'no user metadata in external payload');
    assertSec004(!str_contains($serialized, 'ABCDE1234F'), 'no PAN in payload');
}

$employee = file_get_contents(__DIR__ . '/../backend/public/employee_chatbot_routes.php');
$admin = file_get_contents(__DIR__ . '/../backend/public/admin_chatbot_routes.php');
$helper = file_get_contents(__DIR__ . '/../backend/public/sec004_gemini_security.php');
foreach ([$employee, $admin] as $code) {
    assertSec004(str_contains($code, 'sec004CallGeminiPublicFaq($geminiApiKey, $message)'),
        'route uses private-safe Gemini gate');
    assertSec004(!str_contains($code, '$contextText'), 'no private outbound prompt construction');
    assertSec004(!str_contains($code, 'CURLOPT_SSL_VERIFYPEER, false'), 'no TLS override');
    assertSec004(!str_contains($code, 'generateContent?key='), 'no API key in query string');
}
assertSec004(str_contains($helper, 'CURLOPT_SSL_VERIFYPEER => true'),
    'TLS peer verification required');
assertSec004(str_contains($helper, 'CURLOPT_SSL_VERIFYHOST => 2'),
    'TLS hostname verification required');
assertSec004(str_contains($helper, 'CURLOPT_FOLLOWLOCATION => false'),
    'redirects disabled');
assertSec004(!str_contains($helper, 'generateContent?key='),
    'external API key never in URL');
assertSec004(!str_contains($helper, 'history') || !str_contains($helper, '$history'),
    'chat history never transmitted');

echo "SEC-004: TLS and private-data isolation regression tests passed.\n";
