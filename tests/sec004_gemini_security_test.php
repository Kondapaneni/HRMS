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
    assertSec004(sec004LocalFaqResponse($message) === null,
        'no public FAQ fallback for private question');
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

// Regression: generic FAQ must never become a private leave/salary summary
// when Gemini is unavailable, unconfigured, or returns an error.
$allPublicFaqs = [
    'What is paid leave?', 'What is unpaid leave?', 'What is sick leave?',
    'How do I apply for leave?', 'How to apply for leave?',
    'How do I request leave?', 'How do I mark attendance?',
    'How do I check in?', 'How do I submit an expense claim?',
    'How to submit an expense claim?', 'What is a payslip?',
    'What is gross salary?', 'What is net salary?',
    'What is employee onboarding?', 'What is a performance review?',
];
foreach ($allPublicFaqs as $faq) {
    $answer = sec004LocalFaqResponse($faq);
    assertSec004(is_string($answer) && strlen($answer) > 35,
        'all approved FAQs have substantive, static offline answers');
}
$paidDefinition = sec004LocalFaqResponse('What is paid leave?');
assertSec004(str_contains($paidDefinition, 'Paid leave is approved time away from work'),
    'paid leave provides an explanation');
assertSec004(!str_contains($paidDefinition, 'Remaining Paid Leaves'),
    'paid leave does not leak personalized leave balances');
assertSec004(sec004LocalFaqResponse('HOW DO I APPLY FOR LEAVE?') !== null,
    'case-insensitive FAQ handling');
assertSec004(sec004LocalFaqResponse('How   do I  apply for leave!') !== null,
    'FAQ whitespace normalization');
foreach ([
    'How many paid leaves do I have?', 'What is my leave balance?',
    'My salary', 'Show salaries overview', 'What is my PAN number?',
    'What is paid leave? My email is alice@example.com'
] as $privateQuestion) {
    assertSec004(sec004LocalFaqResponse($privateQuestion) === null,
        'personal or modified question stays in authenticated local engine');
}

$employee = file_get_contents(__DIR__ . '/../backend/public/employee_chatbot_routes.php');
$admin = file_get_contents(__DIR__ . '/../backend/public/admin_chatbot_routes.php');
$helper = file_get_contents(__DIR__ . '/../backend/public/sec004_gemini_security.php');
foreach ([$employee, $admin] as $code) {
    assertSec004(str_contains($code, 'sec004CallGeminiPublicFaq($geminiApiKey, $message)'),
        'route uses private-safe Gemini gate');
    assertSec004(str_contains($code, '$aiResponseText = sec004LocalFaqResponse($message);'),
        'route uses privacy-safe general FAQ fallback');
    assertSec004(strpos($code, '$aiResponseText = sec004LocalFaqResponse($message);') <
        strpos($code, 'fallbackLocalRuleEngine(') ||
        strpos($code, '$aiResponseText = sec004LocalFaqResponse($message);') <
        strpos($code, 'fallbackAdminLocalRuleEngine('),
        'FAQ fallback runs before personal-data keyword engine');
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
