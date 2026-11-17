<?php
// SEC-003 pure helper tests; no real HRMS user data or credentials needed.
require __DIR__ . '/../backend/public/sec003_file_access.php';

function checkSec003(bool $ok, string $description): void {
    if (!$ok) {
        fwrite(STDERR, 'FAIL: ' . $description . PHP_EOL);
        exit(1);
    }
}
foreach (['employee-42-photo.jpg', 'abc/receipt_2026.pdf',
    'candidate/document (1).pdf', 'Resume-123-sample.pdf', 'loan/file-name.png'] as $valid) {
    checkSec003(sec003SafePath($valid), 'safe path: ' . $valid);
}
foreach (['', '..', '../file.pdf', 'x/../secret.pdf', './file.pdf',
    '/file.pdf', 'x//file.pdf', 'x\..\\foo.jpg', 'x?y.pdf',
    'x#y.pdf', 'x%2fy.pdf', 'x/' . str_repeat('a', 511)] as $invalid) {
    checkSec003(!sec003SafePath($invalid), 'reject path: ' . $invalid);
}
$url = sec003StorageUrl('https://example.supabase.co/', 'expenses', 'employee 1/receipt.pdf');
checkSec003($url ===
    'https://example.supabase.co/storage/v1/object/authenticated/expenses/employee%201/receipt.pdf',
    'private authenticated Storage API URL');
checkSec003(strpos($url, '/object/public/') === false, 'no public Storage downloads');

echo "SEC-003 safe path and private Storage URL tests passed." . PHP_EOL;
