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
