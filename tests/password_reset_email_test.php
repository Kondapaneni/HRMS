<?php
// Regression: the HTML email must include both a clickable reset link and a
// visible fallback URL. This test does not generate or expose real tokens.
$templatePath = __DIR__ . '/../backend/src/Templates/reset_password.html';
$template = file_get_contents($templatePath);
if ($template === false) {
    fwrite(STDERR, "Reset email template not found\n");
    exit(1);
}
$exampleUrl = 'https://hrms-qwv3.onrender.com/reset-password?token=test-only-123';
$rendered = str_replace(
    ['{{resetLink}}', '{{currentYear}}'],
    [htmlspecialchars($exampleUrl, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'), '2026'],
    $template
);
$checks = [
    'Click-through link' => str_contains($rendered, 'href="' . $exampleUrl . '"'),
    'Visible fallback URL' => str_contains($rendered, '>' . $exampleUrl . '</a>'),
    'No unrendered reset placeholder' => !str_contains($rendered, '{{resetLink}}'),
    'Expiry notice' => str_contains($rendered, 'expires in 1 hour'),
];
foreach ($checks as $name => $passed) {
    if (!$passed) {
        fwrite(STDERR, "FAIL: {$name}\n");
        exit(1);
    }
}
echo "Password reset email template checks passed.\n";
