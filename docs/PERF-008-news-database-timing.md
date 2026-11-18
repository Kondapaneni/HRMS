# PERF-008 Step 2A — Database connection versus settings query

**Status:** Diagnostic-only source change, opt-in and disabled by default.
No database schema changes, new authentication paths, storage changes or
alteration of the public `/api/news` response.

## Baseline (18 November 2026)

Browser test (three sequential requests per endpoint, with no credentials):

| Endpoint | Total average | TTFB samples |
| --- | ---: | --- |
| `GET /version.json` | 120 ms | 164 / 78 / 72 ms |
| `GET /api/news` | 1,023 ms | 1,066 / 921 / 1,067 ms |

A separate Render log sample showed server-side `/api/news` audit
durations around 0.74–1.06 s. Those measurements do **not** prove
how much is database handshake versus SQL versus application overhead.

## New diagnostic

The existing public `GET /api/news` endpoint has two monotonic measurements:

- `connection_and_identity_ms`: `Database::getConnection()`, including
  PDO connect/configuration and the mandatory `SELECT current_user`
  identity verification. This is **not** pure TCP handshake time.
- `settings_query_ms`: the existing one-row `global_settings` SELECT
  and `PDO::FETCH_ASSOC` row fetch.

The only added log line has this exact layout:

`PERF008_NEWS connection_and_identity_ms=<numeric> settings_query_ms=<numeric>`

It never records client addresses, user IDs, tokens, SQL text, row
contents, credentials, request payloads or query parameter values.
Neither metric appears in HTTP headers or responses.

## Enable only during an approved controlled live test

The extra measurements are **off by default**, even when a client
sends `perf_probe`. During an approved low-traffic deployment window,
temporarily set `PERF008_NEWS_TIMING_ENABLED=true` on Render. Then send
a small number of existing safe, unauthenticated
`GET /api/news?perf_probe=<unique>` probes, one at a time.

A request is logged only when BOTH are true:

1. Render has set `PERF008_NEWS_TIMING_ENABLED=true`.
2. The request includes a `perf_probe` query parameter (value is never
   inspected or logged by the new diagnostic).

Collect only numeric metrics from Render logs, compare medians across
samples, and remove the temporary variable after diagnosis.
Do not modify database settings, credentials, or session handling.

## Interpretation

- If `connection_and_identity_ms` dominates, investigate connection
  pooling, network geography and mandatory session identity verification
  separately. Do **not** disable SEC-018 identity verification.
- If `settings_query_ms` dominates, inspect SQL execution plan, DB
  connection mode and row size using a controlled read-only review.
- If both are small but request audit remains slow, inspect middleware
  and server/runtime scheduling instead.

Because `/api/news` affects the maintenance gate and tracking interval,
the endpoint response and its security behavior must remain unchanged.
This change is diagnostic only. Do not claim a performance improvement
until a later controlled optimization is measured.


## Step 2C — Separate PDO construction from identity verification

Read-only findings: Render is in Singapore, while Supabase PostgreSQL is in
Mumbai (`ap-south-1`). Six opt-in Step 2A samples returned 200 OK; the
average `connection_and_identity_ms` was **568.04 ms** and the average
`settings_query_ms` was **124.13 ms**. The variable was then returned
to `false`; a subsequent request succeeded without additional probe logs.

This diagnostic splits the existing connection total into two **additional**
request-local measurements:

- `pdo_connect_ms`: elapsed time constructing a new `LoggingPDO`,
  including PDO connection setup, network/TLS and pooler authentication.
- `identity_check_ms`: elapsed time performing the **unchanged**
  mandatory `SELECT current_user` with its result fetch.

`connection_and_identity_ms` remains the overall stage, including
PDO configuration and any other connection initialization work.
`settings_query_ms` remains the one-row SELECT and fetch.

The fixed log format has exactly four numeric fields:
`PERF008_NEWS connection_and_identity_ms=... pdo_connect_ms=... identity_check_ms=... settings_query_ms=...`.

The measurement only runs for explicit `/api/news?perf_probe=...` calls
when `PERF008_NEWS_TIMING_ENABLED=true`; the flag remains **off by
default**. No SQL text, identities, token values, cookie values, header
data, server endpoints, IPs or query parameter values are logged.
The HTTP response, account/session enforcement, SEC-018 identity check,
database connection mode and attendance configuration remain unchanged.

The difference between `connection_and_identity_ms` and the two new
substage fields is ordinary PHP/driver configuration and other
`getConnection()` work. It is not automatically a third database query.
No persistent PDO connections are enabled by this diagnostic.

A cached in-process PDO connection does not generate fresh substage
timings, so the route omits the diagnostic log for that case rather
than reporting misleading zeros. Apache request handling ordinarily
begins with a fresh PHP state.

**Deployment policy:** This PR is diagnostic only. After CI passes,
obtain explicit approval for a controlled production deployment,
briefly enable the flag, collect ~6 sequential public probes, compute
stage medians, disable the flag and verify the disablement. Do not
change DB credentials, ports, pooling modes, or Render region in this step.
