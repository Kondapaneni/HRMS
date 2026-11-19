<?php
declare(strict_types=1);
// PERF-008: Execute only against a disposable PHP 8.2 Apache Docker image in CI.
// No application database access, HTTP requests, or production credentials.
$expected = [
    'opcache.enable' => '1',
    'opcache.enable_cli' => '0',
    'opcache.memory_consumption' => '128',
    'opcache.interned_strings_buffer' => '16',
    'opcache.max_accelerated_files' => '10000',
    'opcache.validate_timestamps' => '0',
    'opcache.save_comments' => '1',
    'opcache.jit_buffer_size' => '0',
];
if (!extension_loaded('Zend OPcache')) {
    fwrite(STDERR, "FAIL PERF-008: Zend OPcache extension missing\n");
    exit(1);
}
foreach ($expected as $setting => $value) {
    if ((string) ini_get($setting) !== $value) {
        fwrite(STDERR, "FAIL PERF-008: invalid " . $setting . "\n");
        exit(1);
    }
}
echo "PASS PERF-008: PHP 8.2 Apache OPcache configuration\n";
