# HRMS Layer 2 — Safe browser HTTP static-asset caching

## Decision and scope
Layer 2 accelerates **public, immutable frontend build assets** in browser HTTP
cache. It does **not** persist API data, introduce offline mode, change TanStack
Query retention, change PHP authorization, or modify Android location tracking.

Application stack: Vite 8-generated frontend assets copied into
`backend/public/` in the existing PHP 8.2 Apache Docker image. Apache already
enables `mod_headers` and processes `backend/public/.htaccess`.

## HTTP cache contract

| Resource | HTTP policy | Rationale |
|---|---|---|
| Existing, hashed `/assets/*-HASH.js/css` | `public, max-age=31536000, immutable` | New content receives a different asset URL |
| Hashed `/assets/` local fonts/images | Same immutable policy | Only generated versioned asset filenames qualify |
| `/favicon.png`, `/logo.png`, apple touch/PWA icons | `public, max-age=3600, must-revalidate` | Stable URLs may change |
| `/manifest.json` | `no-cache, must-revalidate` | Avoid stale install metadata |
| `/index.html` and SPA deep-link fallback | `no-store` and `Pragma: no-cache` | Never reuse old application entry document |
| `/version.json` PHP route | `no-store` and `Pragma: no-cache` | Existing client update detection stays fresh |
| `/api/*` | Existing `no-store` policy unchanged | Protected/maintenance/auth responses remain private |
| `/Avatar/`, `/Resume/`, `/Loan-Document/`, other PHP media proxies | Existing per-route no-store policies unchanged | Never mark dynamic private files public/immutable |
| Unversioned JS/CSS and missing assets | Not given immutable TTL | A URL without a proven content hash must not persist for a year |

The Apache immutable rule requires **both** an original `/assets/` request path
and a matching content-hashed filename, protecting against accidentally giving
SPA fallback HTML or PHP documents a long-lived cache lifetime. Existing browser
security headers (HSTS/CSP/frame policy/nosniff) remain unchanged.

## Online-only guarantee
The HTML bootstrap previously registered `/service-worker.js` on every load,
while the React entry unregistered it. Registration is removed, the obsolete
worker source is deleted, and the entrypoint's one-time cleanup remains so
existing browsers can discard an old registration. No offline fetch, GPS queue,
IndexedDB API cache, or TanStack persistence is introduced.

Removing service-worker registration may change PWA install prompts. Android
native foreground/background tracking code is not modified.

## Automated acceptance
Run `node tests/layer2_http_cache_policy_test.mjs` before building.
After `cd frontend && npm ci && npm run build`, run
`node tests/layer2_http_cache_policy_test.mjs --built` from the repository root.
The frontend performance and SEC-021 memory-cache workflows invoke the guard
and retain their prior regression checks.

Before an approved deployment, inspect the PR diff and CI. After any separately
approved release, optionally verify response headers for `/`, a private API,
`/version.json`, a hashed JS/CSS file, and a public icon. Such manual production
testing is **not** claimed by these source/build assertions.

## Rollback and limitations
Rollback by reverting this Layer 2 PR and redeploying through the existing
reviewed Render process. No schema, Redis configuration, persistent data,
secrets, APK, or service state needs migration.

Immutable assets are cached under their **specific hash URLs** by the browser.
The HTML/version response remains no-store, so future deployments supply new
asset URLs. Already-open tabs can continue executing their already-loaded
JavaScript until the existing version-check flow updates them. External Google
Fonts resources follow Google's cache headers, not this Apache policy.

HTTP caching can reduce repeat asset transfer; **no measured speedup is claimed**
without an approved browser/device benchmark.
