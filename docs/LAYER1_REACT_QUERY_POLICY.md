# HRMS Layer 1 — TanStack Query: production data-policy contract

## Completion criterion
Layer 1 is complete when each routine mounted application read uses the reviewed
TanStack Query data layer or an explicitly reviewed, isolated hook, and *every*
read is assigned an appropriate freshness/retention rule. Completing the layer
**does not mean enabling shared/long-lived caching for private HRMS records**.

The automated guard is `tests/layer1_full_coverage_test.mjs`, together with
`tests/no_shared_cache_policy_test.mjs`, `tests/mounted_remote_requests_test.mjs`
and the browser-mounted Branch pilot suite.

## Data retention policy

| Class | Modules/data | Freshness | After unmount | Policy |
|---|---|---:|---:|---|
| Branch reference | ID/name-only admin/employee branch dropdown | 5 minutes | 5 minutes | Reuse verified account-scoped in-memory list |
| Holiday references | Admin holiday calendar/archive and Employee web/mobile holiday calendar | 3 minutes | 5 minutes | Reuse reviewed in-memory holiday records; mutations invalidate |
| Published jobs | Published job listing in Candidate Dashboard (including mobile) and Candidate Jobs | 1 minute | 2 minutes | Reuse postings only; candidate applications/profile always fetched independently |
| Protected business views | Admin employee, payroll, attendance, leave, finance, reports, settings, assessment; employee/mobile PII; candidate documents, profile, applications; Loan/Sales/Branch Operations dashboards, leads and applications | 0 | 0 | Mount-specific key, fresh GET each visit; no stale protected record reuse |
| Live/safety state | MFA, auth, feature permissions, maintenance, GPS/attendance tracking/geofences, exams | 0 / server-authoritative | 0 | Never retain authorization outcomes or live action state |

No QueryClient, access token or payroll/employee/customer data is persisted to
Local Storage, Session Storage, IndexedDB or a service worker.

## Authentication and permissions
The PHP API is the authorization authority. Do not interpret data in React
Query as permission to enter or submit a protected screen. Login and logout
discard the full memory QueryClient. Cross-tab logout clears all private views.
A 401/403 hides prior query data and disables retries until the session changes.
Late responses are cancelled and rejected on session-epoch changes.
App switching, native tracking and Maintenance Mode remain independent.

## Data integrity and mutations
Mounted view keys include an auth epoch, a unique view identity, and all query
scope parameters. Filters and pagination cannot share stale responses. Writes
using `useRemoteTask` trigger safe-reference invalidation, and affected
mounted views use the existing scoped refresh controller. Explicit scope
refresh also invalidates eligible inactive holiday references.

Routine reads previously implemented as a manual effect on Admin Bulk Payroll
now use a cancellable TanStack query with no data retention; generation uses a
managed mutation and refreshes Payroll and pending employees after success.

## Responsive request deduplication
A route with separate mobile and desktop data components mounts the visible
component only, instead of CSS-hiding one while letting both query the API.
That rule is enforced for Employee, Loan Origination, Sales Origination, and
Branch Operations pages. Purely presentational child components receiving data
through props need not be split.

## Performance trade-offs and acceptance
- Revisited fresh reference queries should avoid network requests within TTL.
- Protected-data revisits still require the backend to re-verify authorization,
  so a loading skeleton may appear on those pages.
- Optional Employee Dashboard cards load separately from attendance controls.
- Route-code-only preloading remains separate from data caching.
- The suite must verify remount reuse, independent filters, 401/403 failure,
  account switch/logout, cross-tab logout, mutation invalidation, focus TTL,
  and lack of browser persistence.

Automated CI and Render health checks demonstrate implementation integrity;
they are **not** a substitute for authenticated, device-specific production
navigation timings or a comprehensive security penetration test.

Layer 2 (HTTP static asset caching) and Layer 3 (Redis) are separate projects.
