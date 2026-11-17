<?php

namespace App\Security;

/**
 * SEC-016: Maps JS requires a publicly visible key. It must be independently
 * restricted to trusted HTTP referrers and Maps JavaScript API. Server
 * geocoding / legacy mixed-use credentials must never become fallbacks.
 */
final class MapsConfig
{
    public static function browserKey(array $environment): ?string
    {
        $browser = trim((string)($environment['GOOGLE_MAPS_BROWSER_API_KEY'] ?? ''));
        if ($browser === '') {
            return null;
        }
        foreach (['GOOGLE_GEOCODING_API_KEY', 'GOOGLE_MAPS_API_KEY'] as $serverName) {
            $serverKey = trim((string)($environment[$serverName] ?? ''));
            if ($serverKey !== '' && hash_equals($serverKey, $browser)) {
                return null;
            }
        }
        return $browser;
    }
}
