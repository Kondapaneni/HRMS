# SEC-021 — Insecure client storage and sensitive data exposure

**Status:** OPEN — pending CI, exact Render deployment, and owner-confirmed live verification.  
**Baseline:** `main` commit `4df0af4d16232fdc65b6038263b25494d38ebad4` (2026-11-17).  
**Scope:** SEC-021 only. Prior SEC-001–SEC-020 controls must remain intact.

## Exposure analysis

Before remediation, `frontend/src/api/axios.js`, `frontend/src/contexts/AuthContext.jsx`, and `CandidateLogin.jsx` stored bounded signed **access** JWTs as `localStorage.token`. This made a usable bearer credential available to JavaScript on an origin that also processes payroll, identity documents and loan-application data. Historical audit claims of ten-year JWTs relate to the earlier pre-SEC-012 implementation; current tokens are bounded under SEC-012. Refresh credentials were already separate: web refresh in `hrms_refresh` HttpOnly/Secure/SameSite=Strict cookie scoped to `/api/auth/refresh`, native Android refresh encrypted through Android Keystore. Browser refresh rotation/replay invalidation is backend-enforced.

The old `PersistQueryClientProvider` + `createSyncStoragePersister({storage: window.localStorage})` persisted the **entire TanStack query cache** (usual default storage key `REACT_QUERY_OFFLINE_CACHE`, and historic audit key `TANSTACK_QUERY_OFFLINE_CACHE`). The application-wide `gcTime: 24h` could retain any successfully fetched query, including employee rosters/IDs/contact details, payroll/payslip records, recruitment candidates/application documents, origination leads/loan KYC/banking fields, branch activities, and audit/expense data, to the extent those hooks populated the cache in that browser. A source-level capability does not prove every data set was actually present on each workstation. Retention in localStorage can outlast tab closure and user logout.

Additional per-tab `sessionStorage` JSON snapshots were stored under `current_loan_lead`, `current_loan_member`, `current_sale_lead`, `current_sale_member`, `hrms_admin_chat_history`, and `hrms_employee_chat_history`. Chat answers can include personnel or salary details. Logs such as raw Axios errors could contain headers, request bodies, and private response payloads.

## Remediation approach and migration

1. **Browser:** JWT bearer access remains in JavaScript **memory only**, never localStorage/sessionStorage. It is restored after a full page load using the existing web refresh cookie and `POST /api/auth/refresh` with the `X-HRMS-Refresh: 1` gate. The server requires HTTPS same-origin (if Origin is supplied) and rotates the one-use cookie under a cross-tab Web Lock when supported. This avoids the broad change to cookie-authenticate every protected API route. Protected routes still require explicit `Authorization: Bearer ...`, JWT signature/TTL/MFA `type=session`, live role/feature verification and account-version revocation. Because ordinary state-changing APIs remain Bearer-authenticated and do **not** use the refresh cookie to authorize them, they are not vulnerable to ambient-cookie CSRF. The cookie-using refresh endpoint retains custom-header and strict-origin defenses; same-site cookie scope is unchanged.
2. **Native Android:** Access JWT is read directly from the Keystore-backed bridge for Axios and the foreground tracking service. `saveNativeSession`, `refreshNativeSession` and `clearNativeSession` retain the native credential path. The WebView no longer mirrors access into localStorage. No Android signing or APK distribution is performed in this PR.
3. **Cache and private records:** Replace persisted TanStack Query provider with memory-only `QueryClientProvider`; shorten inactive query retention. Delete the two legacy query-persistence keys and the legacy access token on app bootstrap and logout. Remove chatbot and lead/member sessionStorage snapshots. The selected lead/member may no longer survive a hard reload; returning to its list and reopening the record is the safe UX fallback.
4. **HTTP cache and diagnostics:** Add `Cache-Control: no-store` and `Pragma: no-cache` to every `/api/` response. Suppress production browser `console.*` and debugger output at build time; keep development console diagnostics and existing user-facing toasts. Remove raw Axios error logging from the API interceptor.
5. **Logout isolation:** Continue server-side account/session revocation on normal logout; clear native bridge, browser access memory, private session keys and TanStack Query memory. A nonsensitive localStorage event instructs other tabs to forget stale accounts. A failed network logout blocks silent restoration in that tab instead of claiming the backend revoked the credential. Clearing local state is **not** equivalent to confirmed remote revocation.

### Compatibility considerations

This changes browser startup from synchronous localStorage-token lookup to an asynchronous refresh-cookie round trip, including after page reload and candidate redirect. Existing web logins with a valid HttpOnly refresh cookie should recover; legacy JWT-only clients with no refresh cookie must sign in again. Refresh serialization uses `navigator.locks` when supported; browser engines without Web Locks may race independent tabs and trigger SEC-012 replay-family revocation, requiring a fresh login. A stale older deployed tab can retain an old localStorage JWT until its code reloads, though the bounded token still expires or is revoked. The browser file-preview cookie `hrms_file_auth` remains subject to the earlier SEC-003 controls and must be checked during live document verification.

No database schema or destructive operations are required. Do not clear the entire browser origin, Android data, or real employee sessions merely to test migration. Use only development accounts and synthetic CI data.

## Tests and verification

- `tests/sec021_policy_test.mjs`: source policy for storage, cookie/CSRF gate, query retention, no-store headers, Android and production console suppression.
- `tests/sec021_browser_session_test.mjs`: isolated Node VM simulation of actual browser refresh/restore, no token persistence, logout blocking and native session retrieval (synthetic credentials, no network).
- `.github/workflows/sec021.yml`: PHP syntax, SEC-008/012/020 policy regressions, production build and bundle checks. Existing SEC-012 synthetic PostgreSQL/HTTP refresh and logout tests, SEC-006 native static checks, and other path-triggered workflows must also pass.
- **CI status:** pending.
- **Render deployed merge SHA:** pending.
- **Live owner verification:** pending for Admin/Employee/Candidate login, MFA/email OTP, tab reload and refresh, logout and server-side JWT replay refusal, revocation, payroll confidentiality, loan/sales/branch permissions, recruitment, offline handling, cookie attributes, local/session storage absence, and Android 14 login/foreground service/background attendance after expiry.

### Non-destructive live test sequence (one step per owner report)

After green CI, one squash merge, and successful Render deployment of the exact merge SHA: (1) read-only network/storage inspection (no credentials pasted); (2) Admin login/MFA and refresh; (3) Employee permissions and payroll cache absence; (4) logout/reload; (5) controlled test-account revocation; (6) Candidate portal; (7) loan/sales/branch permission smoke; (8) Android 14 Keystore-backed app login and attendance tracking while checked in, **only in an approved safe window**. No real employee session revocation, production write/destructive query, maintenance toggle, or interruption to attendance is authorized by this document.

## Rollback

If a release-critical regression occurs, stop promotion and revert **the single SEC-021 squash commit using a new normal revert PR**; never force-push/rebase/rewrite `main`. Re-deploy the known-good prior commit under the established Render process. The prior build can read valid SEC-012 sessions but brings back the known access-token and private-cache storage exposure: avoid shared terminals and require an approved follow-up security fix. Browser migration cleanup is one-way; removed local caches/chats will not be restored. Backend database schema is unchanged, so no database rollback or production credential rotation is needed solely for this code rollback (assess any confirmed historical exposure separately).

## Residual risks / closure gate

A hostile script already executing on the origin can issue authorized requests or intercept an in-memory access token; this does not remediate SEC-022 XSS/CSP. Malicious browser extensions, compromised devices, screenshots, client download history, browser process memory, and intentionally downloaded documents are not eliminated by cache policy. Web refresh replies contain a bounded JWT accessible in the currently executing JS context; moving access JWT into an HttpOnly cookie would require a separate, fully tested same-origin CSRF strategy and backend route/file/auth review, not an untested production switch. No independent production penetration test is claimed. **SEC-021 must remain OPEN until all CI, Render exact-SHA, and owner-confirmed live checks pass.**
