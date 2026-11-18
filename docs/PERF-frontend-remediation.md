# HRMS frontend navigation and freshness remediation — performance PR

**Status:** SOURCE PATCH PREPARED, pending CI, owner-approved deployment, production measurement and live regression. This is a performance remediation; it does **not** reopen or weaken SEC-021 client-storage security.

## Confirmed source causes
- Root QueryClient `refetchOnMount: 'always'` bypassed `staleTime` and sent requests on each remount. Shared in-memory cache remains available for SPA navigation, but full browser reload cannot persist private query data under SEC-021.
- Protected bootstrap deliberately held every new protected document load for a **minimum 1,200ms** after entering `fetchProfile`, on top of HTTP-only-cookie refresh then `/api/me`. The patch removes only the artificial timer and the now-unused `useLocation` subscription that rerendered AuthProvider on every navigation; it retains server-authoritative refresh, identity and role gates and the maintenance middleware.
- `App.jsx` eagerly imported nearly every protected route, putting large modules in the initial dependency graph. Protected pages/layouts now use `React.lazy`, with a Suspense loading surface outside persistent authentication and tracking components. Public sign-in and recovery remain eager to avoid delaying them.
- Admin pending-document badge was refetched **every 5 seconds** and the Employee news query every **15 seconds**; they now poll every 30s and 60s respectively, while mutations invalidate relevant badge caches.
- TanStack Query v5 `invalidateQueries([key])` calls in AdminEmployeeView, AddLeadSidebar, Employee/Candidate profile pages, MFA security card and CandidateDocuments were legacy signatures, now corrected. AdminPerformance and CandidateDocuments query-level `refetchOnMount: 'always'` overrides were replaced with freshness-aware policies. They now use filter objects and also invalidate related lists and dashboard counts; employee edit, attendance regularization, candidate conversion and document updates also invalidate dependent queries.
- Attendance gets a shorter 10s freshness period; the Employees roster uses 60s. Background fetches retain cached rows instead of requiring a full-page loader. Admin Dashboard, Employees and Attendance also consume TanStack Query AbortSignals in Axios, cancelling obsolete in-flight read requests during rapid navigation or search changes.

## Scope and safety
- No backend API, auth cookie, token format, Android native tracker, database schema, security middleware or persistent data storage changes.
- The original `QueryClientProvider` remains a module-scope, in-memory cache, and logout still clears it. We must **not** reintroduce TanStack/localStorage private payroll or PII persistence.
- `refetchOnMount: true` does not mean fresh data is instantly available: queries become stale on schedule; background request time still depends on server latency. Where a mutation changes data, invalidation refreshes cached dependent queries.
- Attendance is relatively volatile; it revalidates when stale on mount or window focus, but no polling is added by this PR.
- The maintenance gate continues polling at its SEC-020 cadence and is not bypassed or removed.

## Required checks before closing the performance finding
1. CI frontend build, SEC-021 regression and performance policy tests must pass.
2. Inspect generated Vite entry and dynamic chunks and compare raw/gzip sizes with the old ~4.65MB entry; Chrome Performance/Network can quantify TTFB, parse/execute, bootstrap timing and background fetch.
3. In an authorized safe deployment window, verify Admin Dashboard → Employees → Attendance → Employees (quick return uses cached table without a blocking loader); revisit after 10–60s to confirm background freshness; employee edit and attendance regularization invalidate relevant list/dashboard queries.
4. Verify Admin and Employee login/OTP/MFA, browser reload recovery, logout/cross-tab isolation, Candidate login, Admin delegated feature authorization and SEC-020 maintenance overlay without toggling maintenance.
5. Verify Android 14 login and existing attendance tracking/session behavior using an approved nonworking window; no actual employee data edits or location test without fresh approval.
6. Capture measured bundle and user-observed timings; do **not** mark PERF-001/003/004 closed without these results. SEC-021 remains CLOSED independently.

## Rollback
Revert this **single performance squash commit** through an ordinary PR if a functional regression occurs. Avoid force-pushing main, and treat an auto-deployed docs-only main commit as a deployment gate. All changes are frontend-only; no data migration is required.
