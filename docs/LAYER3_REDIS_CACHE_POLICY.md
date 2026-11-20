# HRMS Layer 3 — Redis-compatible server-side reference cache

## Threat model and scope
The backend's PHP 8.2 + Apache runtime accesses PostgreSQL via an
authorization-verified request. The new `App\\Cache\\RedisReferenceCache`
implements **optional, bounded, in-memory Key Value read-through caching**
for the audited `GET /api/branches` response containing **branch IDs and names only**.

Do **not** cache passwords, JWTs, refresh tokens, authorization grants, account
revocation, maintenance mode, current attendance, payment/approval decisions,
employee directory, payroll, candidate documents, lead/loan records, GPS or
private media. All protected API responses retain the HTTP `no-store` policy.
Other endpoints continue reading PostgreSQL directly.

A feature flag defaults to disabled (`HRMS_REDIS_ENABLED` must equal `true`).
The `REDIS_URL` value is read only from the existing private Render environment
and is never placed into frontend Vite bundles, response bodies, log messages
or Redis keys. The optional native PHP redis extension is compiled at Docker
build time; if Redis is disconnected, every read falls back to SQL. No Redis
server is embedded into the HRMS container.

## Authorized read path
1. `AuthMiddleware(['admin', 'employee'])` validates JWT signature,
   token/session version, active account and live role against PostgreSQL.
2. After authorization, the verified user/role/org/branch claims are hashed
   into the `hrms:ref:v1:branches:<sha256>` key.
3. Successful cache hit returns only branch ID/name array.
4. Miss performs the original SQL query and caches the result for 40–45 seconds
   with small TTL jitter (never longer than 45).
5. A Redis error or missing configuration bypasses the cache; SQL errors
   propagate normally rather than returning a successful empty response.

The existing branch query is global, but keys are per-verified-user and
per-organization/branch identity to prevent cross-account re-use. After logout
the old JWT cannot pass middleware; Redis entries expire independently.
No separate cache result can authorize an action. A branch must always be
validated by its protected write endpoint.

No current API writes branch-directory records. A future branch create/rename/
delete route MUST add a post-commit invalidation strategy or disable this
reference cache until a safe namespace-version strategy is reviewed.
Externally changed branch names can be at most 45 seconds stale while the
cache is enabled. Never treat a cached reference as an authorization decision.

## Redis infrastructure and operation
- Use Render Key Value (Valkey, Redis protocol compatible) in the **Singapore**
  region, private internal URL. Prefer a non-persistent/ephemeral cache since
  PostgreSQL is authoritative; `allkeys_lru` is suitable for evictable data.
- Set **private** `REDIS_URL` (internal connection URL) and
  `HRMS_REDIS_ENABLED=true` on the HRMS service only when connectivity and
  deployment are approved.
- Use a supported URL `redis://` or `rediss://`, optional percent-encoded
  ACL credentials, and bounded timeouts. TLS certificate checks are not disabled.
- Never enable Redis as a login, maintenance or location source of truth.
- The cache tracks hit/miss/fallback counters in PHP request memory only.
  This initial stage does not publish sensitive per-user metrics externally.
- Operational rollback is immediate: set `HRMS_REDIS_ENABLED=false` or unset
  `REDIS_URL`; next request reads PostgreSQL. No cache flush or SQL migration
  is required. Code rollback: revert the Layer 3 PR.

## Verification
The new `tests/layer3_redis_cache_test.php` exercises isolation, repeated
reads, invalidation, corrupted entry fallback, DB failure propagation and
Redis read/write outages with fake and actual disposable Redis. The paired
source guard checks authorization ordering, SQL fallback and the
restricted data family. GitHub Actions additionally checks production
Docker compilation and existing SEC-020, SEC-021, and uncached private paths.

No production SQL writes, credentials, GPS, notifications, or Android
services are touched by these tests. This pilot is not evidence of measurable
production latency improvements; production benchmarks need a safe, approved
monitoring window. Redis is **not** required for correctness.
