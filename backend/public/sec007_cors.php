<?php
/**
 * SEC-007: Explicit CORS allowlist for HRMS API requests.
 *
 * Same-origin browser traffic does not require CORS headers. Remote clients
 * must have an Origin exactly matching FRONTEND_URL or a comma-separated
 * entry in CORS_ALLOWED_ORIGINS. Development/mobile origins must be explicitly
 * configured; localhost and capacitor:// origins are NOT trusted by default.
 *
 * Keep this helper independent of Slim so it can be regression-tested.
 */
function sec007AllowedCorsOrigin(
    string $origin,
    string $frontendUrl,
    string $extraAllowedOrigins = ''
): ?string {
    if ($origin === '' || $origin === 'null' || str_contains($origin, ',')) {
        return null;
    }

    foreach (array_merge([$frontendUrl], explode(',', $extraAllowedOrigins)) as $entry) {
        $candidate = rtrim(trim($entry), '/');
        if ($candidate === '' || $candidate === '*' || $candidate === 'null') {
            continue;
        }

        // Reject malformed configured origins (paths, query parameters,
        // fragments, userinfo and wildcard hosts are not browser origins).
        if (!preg_match(
            '~\\A(?:https?://(?:[a-zA-Z0-9.-]+|\\[[0-9a-fA-F:]+\\])(?::[0-9]{1,5})?|capacitor://localhost)\\z~D',
            $candidate
        )) {
            continue;
        }

        if ($origin === $candidate) {
            return $origin;
        }
    }

    return null;
}
