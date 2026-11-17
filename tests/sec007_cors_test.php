<?php
require_once __DIR__ . '/../backend/public/sec007_cors.php';

// SEC-007 CORS authorization rules must not depend on the full HTTP app.
$cases = [[
        'case' => 'same deployment',
        'origin' => 'https://hrms-qwv3.onrender.com',
        'frontend' => 'https://hrms-qwv3.onrender.com/',
        'extras' => '',
        'expected' => 'https://hrms-qwv3.onrender.com',
    ],
    [
        'case' => 'no Origin',
        'origin' => '',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'unknown Origin',
        'origin' => 'https://attacker.example',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'not an origin',
        'origin' => 'null',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'spoofed subdomain',
        'origin' => 'https://hrms-qwv3.onrender.com.attacker.example',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'unlisted localhost',
        'origin' => 'http://localhost:8787',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'explicit dev Vite',
        'origin' => 'http://localhost:5173',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => 'http://localhost:5173,capacitor://localhost',
        'expected' => 'http://localhost:5173',
    ],
    [
        'case' => 'explicit Capacitor',
        'origin' => 'capacitor://localhost',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => 'http://localhost:5173,capacitor://localhost',
        'expected' => 'capacitor://localhost',
    ],
    [
        'case' => 'unlisted Capacitor domain',
        'origin' => 'capacitor://attacker',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => 'capacitor://localhost',
        'expected' => null,
    ],
    [
        'case' => 'wildcard config rejected',
        'origin' => '*',
        'frontend' => '*',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'misconfigured path rejected',
        'origin' => 'https://app.example',
        'frontend' => 'https://app.example/login',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'userinfo rejected',
        'origin' => 'https://host.example',
        'frontend' => 'https://user@host.example',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'http does not match https',
        'origin' => 'http://hrms-qwv3.onrender.com',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'origin list injection rejected',
        'origin' => 'https://hrms-qwv3.onrender.com, https://evil.example',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => '',
        'expected' => null,
    ],
    [
        'case' => 'allow second explicit origin',
        'origin' => 'https://mobile.example',
        'frontend' => 'https://hrms-qwv3.onrender.com',
        'extras' => 'https://other.example, https://mobile.example',
        'expected' => 'https://mobile.example',
    ]];
foreach ($cases as $case) {
    $actual = sec007AllowedCorsOrigin($case['origin'], $case['frontend'], $case['extras']);
    if ($actual !== $case['expected']) {
        fwrite(STDERR, "FAIL SEC-007: " . $case['case'] . "\n");
        exit(1);
    }
}
echo "SEC-007 CORS allowlist: " . count($cases) . " cases passed\n";
