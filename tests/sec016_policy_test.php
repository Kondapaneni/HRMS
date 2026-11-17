<?php
declare(strict_types=1);

require __DIR__ . '/../backend/vendor/autoload.php';
use App\Security\MapsConfig;

function sec016Check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}

$browser = 'SEC016_BROWSER_TEST_PUBLIC_ONLY';
$geocode = 'SEC016_GEOCODE_TEST_SECRET_NEVER_SEND';
$legacy = 'SEC016_LEGACY_TEST_SECRET_NEVER_SEND';
sec016Check(MapsConfig::browserKey([]) === null, 'Missing browser key must fail closed');
sec016Check(MapsConfig::browserKey(['GOOGLE_MAPS_BROWSER_API_KEY' => '']) === null, 'Empty browser key must fail closed');
sec016Check(MapsConfig::browserKey(['GOOGLE_MAPS_BROWSER_API_KEY' => $browser,
    'GOOGLE_GEOCODING_API_KEY' => $geocode, 'GOOGLE_MAPS_API_KEY' => $legacy]) === $browser,
    'Dedicated browser key should work');
sec016Check(MapsConfig::browserKey(['GOOGLE_MAPS_BROWSER_API_KEY' => $geocode,
    'GOOGLE_GEOCODING_API_KEY' => $geocode]) === null, 'Geocoding/browser key reuse must fail closed');
sec016Check(MapsConfig::browserKey(['GOOGLE_MAPS_BROWSER_API_KEY' => $legacy,
    'GOOGLE_MAPS_API_KEY' => $legacy]) === null, 'Legacy mixed/browser key reuse must fail closed');
echo "PASS SEC-016 server/browser key segregation policy\n";
