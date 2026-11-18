# SEC-021 — Secure browser sessions and removal of persistent sensitive data

**Status:** CI VERIFIED ON FEATURE BRANCH — deployment and owner-confirmed live verification REQUIRED. **Do not mark SEC-021 CLOSED merely because CI passed.**

- Source audit: `AUDIT_REPORT.md`, Issue SEC-021 (HIGH).
- Repository: `Kondapaneni/HRMS`; remediation scoped to `fix/sec-021-client-storage-sensitive-data` and **PR [#75](https://github.com/Kondapaneni/HRMS/pull/75)**.
- Baseline `main` at investigation: `4df0af4d16232fdc65b6038263b25494d38ebad4`.
- Deploy target: Render HRMS development `https://hrms-qwv3.onrender.com/`. Do not deploy or inspect real employee credentials in CI.
- Scope: browser session storage, client-side persistent private cache, logs and native compatibility. Other audit findings, database migrations, and maintenance configuration are out of scope.

## Vulnerability and exposure inventory

The prior `frontend/src/contexts/AuthContext.jsx` wrote access JWTs to `localStorage.token` after password, email-OTP, MFA and candidate sign-in; `frontend/src/api/axios.js` read the same key to add `Authorization: Bearer` and wrote refreshed access tokens back to disk. A compromised browser JavaScript context, malicious extension or shared-profile reader could obtain the session token until its JWT expiry or server-side revocation.

`frontend/src/App.jsx` registered `createSyncStoragePersister({storage: window.localStorage})` globally with `PersistQueryClientProvider`, and configured `gcTime` to 24 hours. Its default `TANSTACK_QUERY_OFFLINE_CACHE` localStorage entry could serialize private **TanStack Query results** (not necessarily every direct Axios response). The data type depends on visited screens and access rights; no synthetic source scan proves what every individual browser ever cached.

Exposure classes potentially persisted by the previous global Query provider:

| Context | Examples of data a permitted query can return | Previously exposed persistence |
|---|---|---|
| Admin/HR employee and attendance views | Employee identities, contact and employment metadata, attendance punch/location details and documents | Any completed TanStack query response in global localStorage cache |
| Payroll | Salary information, pay periods, payslip metadata and breakdowns, subject to SEC-013 server permissions | TanStack payroll query results potentially persisted |
| Recruitment and candidate | Job applicants, application statuses, candidate profiles, personal documents and offer metadata | TanStack recruitment/candidate query results potentially persisted |
| Loan Origination and Branch Operations | Loan leads, members, application statuses, KYC/contact and financial attributes (according to API response and role permission) | TanStack loan/branch query results potentially persisted |
| Sales Origination | Sales leads and member contact/application data | TanStack sales query results potentially persisted |
| Assistant chats | Admin/employee questions and responses, potentially including HR/payroll data | `sessionStorage.hrms_admin_chat_history`, `hrms_employee_chat_history` |
| Lead/member route handoff | Full selected loan and sales lead/member objects | `sessionStorage.current_loan_lead`, `current_loan_member`, `current_sale_lead`, `current_sale_member` |
| Authentication | Short-lived web JWT access token (SEC-012 bounded and refresh-rotated, not historical 10-year token) | `localStorage.token` |
| Debugging | Axios error objects and console messages potentially containing response/config objects | Production console output and retained DevTools logs |

Visual masking in `phoneUtils.js` did not protect underlying query/storage JSON. Existing SEC-009/010/011/013 server authorization remains authoritative; this change must not grant new access.

## Technical remediation

1. **Web authentication:** Web password, email-OTP, completed MFA and candidate login no longer return session JWTs in JSON. `RefreshSessions::newSession` returns a minimal `authenticated: true` result and installs `__Secure-hrms_access` with `Secure; HttpOnly; SameSite=Strict; Path=/api`. The existing `hrms_refresh` remains single-use, hash-backed, version-bound and path-scoped to `/api/auth/refresh`. A separate `hrms_file_auth` Secure/HttpOnly/Strict cookie supports same-origin document rendering; its JWT expiry and existing SEC-003 ownership checks remain enforced. The `__Host-hrms_csrf` cookie is a **non-authenticating**, random, JavaScript-readable 256-bit value with `Secure; SameSite=Strict; Path=/` and no Domain.
2. **CSRF:** Browser-only cookie-authenticated POST/PUT/PATCH/DELETE requests require `X-HRMS-CSRF` equal to the cookie; missing, malformed and mismatched values fail with 403 before existing route logic. When an Origin header is provided it must be HTTPS and match the target host. Anonymous browser login, candidate login, OTP and completed MFA verification also reject cross-site Fetch Metadata or mismatched HTTPS Origin (loopback HTTP is allowed only in non-production localhost development). The refresh endpoint continues to require `X-HRMS-Refresh: 1`, validates Origin, and uses same-site HttpOnly refresh cookie. Explicit Bearer headers remain available for Android native clients and synthetic authorization tests; a bearer header takes precedence over the cookie.
3. **Refresh / revocation:** On web API 401, the Axios interceptor serializes a single refresh request and retries the original request with newly minted cookies; no JWT is passed to client JS. Existing `AccessToken::bounded`, MFA challenge `type` rejection, version/active status and live feature-grant checks are unchanged. Logout revokes the server-side account session version (existing SEC-012 semantics), removes access/refresh/CSRF/file-view cookies, clears TanStack memory and notifies other tabs. Password-change `signOut({localOnly:true})` expires the now-revoked cookies using a CSRF-protected cookie-cleanup endpoint. If logout revocation fails, the client does **not** claim it succeeded.
4. **Frontend data:** Removed `PersistQueryClientProvider` and `createSyncStoragePersister` entirely. The ordinary `QueryClientProvider` now retains private results **in process memory only** with a 5-minute garbage collection window (subject to mounted observers). The PHP API now emits `Cache-Control: private, no-store` on JSON responses, preventing a second on-disk HTTP cache. Removed chat and lead/member sensitive `sessionStorage` reads/writes. Theme and other explicitly non-sensitive UI preferences remain eligible for browser storage. When the new bundle runs it erases historical `token`, `TANSTACK_QUERY_OFFLINE_CACHE` / `REACT_QUERY_OFFLINE_CACHE` and six named private session keys. Logout and detected revocation also clear these keys and the in-memory query cache.
5. **Production logs:** Vite production compilation strips `console.*` and `debugger` expressions. Removed inline service worker console diagnostics. The existing non-sensitive PHP server-side diagnostics and user-facing error states remain available for operational reporting; production browser Console cannot be treated as a secure error-reporting system.
6. **Native Android:** Existing `X-HRMS-Client: android` login/refresh returns access and refresh credentials only for the native app. `NativeLocationTracker.saveSession` places them in Keystore-backed storage; WebView no longer mirrors native access JWTs into localStorage. Axios and `BackgroundLocationTracker` read current access tokens from the native bridge; foreground background-location tracker and native refresh rotation remain authoritative. The maintenance gate reads only a boolean native Keystore session hint to preserve its SEC-020 notice during `/api/me` 503 responses. Do **not** make Android rely on web cookies. A successful JavaScript build does not prove real Android 14 background tracking or signed APK update compatibility.
7. **Service worker:** The existing service worker has no resource caches or API response interception; no new service worker persistence is introduced. Existing SEC-003 private document paths and ownership verification are unchanged.

**Note:** Web CSRF cookie state is only a hint to initialize `/api/me`; it is not authorization evidence. The server always validates the signed JWT, active account, role and feature grants.

## Migration and rollout considerations

- Deploy frontend and PHP changes **together** from the exact tested squash commit; an old SPA expects a JSON `token` and will not work with a new cookie-only web login API. Avoid mixed-version releases and stale client bundles.
- On first launch after upgrade, browser localStorage `token` and old persisted TanStack Query snapshots are deleted without touching theme settings. Historical refresh cookies may permit cookie-session renewal on a protected-route request. Existing pages/tab sessions may need reload or sign-in; do not assume every tab migrates seamlessly.
- Native Android must use a release built from the matching frontend source with the same approved signing certificate. Existing installed APKs still contain old localStorage behavior until updated. The prior SEC-006 signing compatibility and attendance tracking gates remain in force; **do not force an employee to upgrade or uninstall while checked in**.
- The development Supabase data model and password hashes are unchanged. No migration, mass session revocation, maintenance switch, database write or real test email is needed to deploy this code.
- Cookies marked Secure require HTTPS in Render; isolated CI creates raw Cookie headers against localhost HTTP only for transport-neutral server assertions, not browser policy.
- Browser cache history may survive in external device backups or other browser profiles beyond the reachable origin; this code only clears storage keys it can access.

## Tests and verification gates

**Final feature-branch CI evidence:** PR [#75](https://github.com/Kondapaneni/HRMS/pull/75) at commit `66c02bbea3d9cfae610072fbb4d13293148f54e5` completed **all 16 of 16 triggered workflows successfully**, including the single-issue scope guard, SEC-021 browser cookie/CSRF/native HTTP tests, SEC-006 Android, SEC-008 MFA, SEC-012 refresh/revocation, SEC-013 payroll, SEC-018 DB pooler and SEC-020 maintenance. [Review PR checks](https://github.com/Kondapaneni/HRMS/pull/75/checks) and the detailed run links below. Only documentation changed after this tested source snapshot. Protected-main squash SHA, Render deployment and owner-confirmed live results cannot be known before merge and remain OPEN. **Never treat source assertions as proof of real-browser cookie acceptance or Android tracking behavior.**

| Gate | Test/evidence | Current status |
|---|---|---|
| Source storage/CSRF/MFA/native policy | `node tests/sec021_source_test.mjs` | **PASS** — [SEC-021 CI](https://github.com/Kondapaneni/HRMS/actions/runs/44246018104) |
| Isolated browser HTTP authentication/CSRF/refresh/logout | `node tests/sec021_browser_http_test.mjs` with disposable PostgreSQL fixture | **PASS** — [SEC-021 synthetic HTTP](https://github.com/Kondapaneni/HRMS/actions/runs/44246018104) |
| Previous SEC-008, SEC-012, SEC-018 tests | Existing synthetic PostgreSQL/HTTP workflows, adjusted to use explicit native Bearer sessions when they need a JS-readable test JWT | **PASS** — [SEC-008](https://github.com/Kondapaneni/HRMS/actions/runs/44246017992), [SEC-012](https://github.com/Kondapaneni/HRMS/actions/runs/44246018241), [SEC-018](https://github.com/Kondapaneni/HRMS/actions/runs/44246018181) |
| SEC-006 Android policy and assembly | SEC-006 workflow and Android debug build, with device tests required | **PASS source/build** — [SEC-006](https://github.com/Kondapaneni/HRMS/actions/runs/44246018297); device verification pending |
| SEC-020 Maintenance Gate | Existing source and UX regression tests, no maintenance toggles during code CI | **PASS** — [SEC-020](https://github.com/Kondapaneni/HRMS/actions/runs/44246018180) |
| Production build and console removal | `npm ci && npm run build` plus absence of former persistent-query provider | **PASS** — [SEC-021 build](https://github.com/Kondapaneni/HRMS/actions/runs/44246018104) |
| GitHub and Render | Exactly one SEC-021 PR, checks green, squash merge into protected main, Render exact SHA reported LIVE | **CI PASS** — [single-issue scope guard](https://github.com/Kondapaneni/HRMS/actions/runs/44246355026) and [16/16 CI workflows](https://github.com/Kondapaneni/HRMS/pull/75/checks); **merge and Render deployment OPEN** |
| Real browser/Android | Guided one-at-a-time owner tests with non-production/test accounts only | **OPEN** — owner/device verification pending |

### Owner live verification checklist — perform only one step at a time

1. Inspect fresh development web storage on a **dedicated development test browser**: no `localStorage.token`, `TANSTACK_QUERY_OFFLINE_CACHE`, private `sessionStorage` lead/chat entries. Do not print cookie/token values.
2. Browser test login and MFA (synthetic development accounts); verify successful protected read and no JWT in login JSON, Secure/HttpOnly/Strict access/refresh cookies, JS sees only random CSRF cookie.
3. Verify cookie-backed refresh with expected auth and no JWT in response JSON. Exercise normal navigation and maintenance-off readiness; don't intentionally expire/revoke active employee sessions.
4. Test logout for a dedicated test account: browser cookies cleared, query/cache keys cleared, pages denied after logout, no data from previous account shown in another account.
5. Test own synthetic account password-change/token-revocation with prior protected read denied (no other real sessions affected).
6. Verify payroll salary/profile confidentiality under existing permissions, candidate profile isolation, read-only employee Loan/Sales/Branch module authorization and Admin/Recruitment views.
7. Verify Android 14 current matching debug/signed build login, MFA, restart/session refresh and **approved** attendance tracking/checkout (do not check in/out during real active shifts without authorization).
8. Confirm no sensitive console logs in shipped production bundle, final repo/Render build SHA, and all test-state cleanup.

Only after all checks are PASS and documented may SEC-021 closure be proposed. Never request tokens, plaintext passwords, OTPs, MFA backup codes, personal payroll records or HRPII screenshots in chat.

## Rollback procedure

1. If CI or live behavior fails, **do not merge**, or pause affected development rollout while keeping maintenance OFF and employees uninterrupted. Investigate and fix in the same SEC-021 PR.
2. If already merged, prepare a new approved **revert PR** of the single SEC-021 squash commit; run required checks before redeployment. Revert backend and frontend **together**, not only one half. Confirm Render deploy SHA and affected synthetic sessions; do not force-push or rewrite published main.
3. This change has **no database schema migration to roll back**. Web users may need to sign in again due cookie/API incompatibility. Coordinate native APK rollback separately with the prior SEC-006 signing/update safeguards; do not downgrade/uninstall an actively tracking phone.
4. Reverting reintroduces JavaScript-readable browser JWTs and persistent PII risk. Treat rollback as an emergency development containment measure, not a security-complete permanent resolution. Revalidate original SEC-012/013/020 security controls after any rollback. Never invalidate all real employees or toggle maintenance automatically.

## Residual risks

- HttpOnly helps prevent XSS **token theft**, but XSS can still issue same-origin authenticated requests and read screen/API data; SEC-022 and stronger CSP remain separate work. Browser extensions, compromised endpoints and screenshot/clipboard history are outside this fix.
- Sensitive data remains in rendered component state and active in-memory query caches while authorized screens are open, and can appear in browser developer-network panels or logs intentionally recorded by the user. API payloads must continue to be minimized and authorization checked server-side.
- An account-wide logout still revokes that account's sessions as already required by SEC-012. Losing connectivity during logout may prevent confirmed server revocation; the client warns rather than reporting success.
- JavaScript temporarily handles freshly returned native tokens before transferring them to Keystore; Android background/native service compatibility requires real device testing and controlled APK distribution.
- Existing private records held by prior browser backups/external copies are not retroactively recoverable or erasable by this update.
- Candidate/loan detail URL refresh may return the user to the protected list when transient in-memory navigation state is missing; no personal data is written to sessionStorage to preserve the former behavior. Consider separate authenticated detail re-fetch UX enhancement if business owners require deep links.

**Closure:** OPEN. All 16 final feature-branch CI workflows passed; the protected-main squash, exact Render deployment and owner-confirmed live checks remain outstanding.
