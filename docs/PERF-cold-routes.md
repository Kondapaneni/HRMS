# HRMS first-visit route-loading hardening

**Status:** CODE/CI verification pending. **Scope:** frontend-only follow-up after PR #78; this does not change or close any security finding.

## Confirmed source-level root causes

1. Lazy loading from PR #78 removed most route modules from the initial bundle, but the first visit to each route had to wait for its chunk. A single outer Suspense fallback concealed the whole workspace while that happened.
2. Admin Payroll, Employee Payroll (including mobile) and Admin Employee View imported `@react-pdf/renderer` and `PayslipPDF` before any download request. The Vite build showed a **~1,425 KB (479 KB gzip)** `react-pdf.browser` chunk, a costly dependency on first visit.
3. Recruitment eagerly imported `PDFViewer` and the offer-letter PDF document even when the user had not opened the offer studio. Admin Dashboard eagerly imported Recharts before rendering any KPI.
4. On first visit, Employees and Attendance still require authorized API responses; network/server response time cannot be proven from source alone. SEC-021 intentionally prevents persistent private response caching across reloads.

## Fix

- `AppShell` uses a local React Suspense boundary around the route outlet with an accessible skeleton, retaining the authorized sidebar, header and native tracking lifecycle while a route module downloads.
- `routeWarmup.js` opportunistically loads the intended page chunk on navigation hover/keyboard focus; the authorized Admin Dashboard warms the two commonly visited Employees/Attendance pages *after its dashboard query succeeds and the browser is idle*. Preloading private admin APIs is strictly gated to the authenticated Admin role, only uses read-only endpoints, matches the page's existing TanStack keys, and remains memory-only.
- PDF renderer/components are dynamically imported **inside the user's PDF download/generation action**, and Recruitment's PDF preview is loaded only when the studio is opened. No PDF features were removed.
- Admin KPI cards and recent activity can render without waiting for Recharts; the chart area has its own local loading fallback and preserves the original bar/pie visualizations.
- The Employee chatbot module is deferred behind its own Suspense boundary.

## Evidence and limits

- CI must pass the dedicated cold-route policy, production Vite build, prior PR #78 performance checks, and SEC-021 memory-only auth/storage, SEC-008, SEC-012 and SEC-020 security checks.
- Code splitting and prefetching improve *first-visit JavaScript overhead and perceived loading*, but cannot guarantee an instant first visit if an API request or Render backend is slow.
- Background warmup introduces two **read-only** admin API requests only after the first Admin Dashboard fetch succeeds. Avoid widening this to all modules or unauthenticated users; do not persist payroll/PII data or tokens.
- Heavy PDFs/charts remain available after a user explicitly invokes the corresponding feature.

## After approved deployment

1. With a development Admin account, visit Dashboard then first-time Employees, Attendance, Payroll, Recruitment and a PDF download/offer studio; confirm normal business behavior and no protected data leaks.
2. Use Chrome Network (Fetch/XHR) to distinguish route JS asset download from API request **TTFB**, total duration, and React loading. Verify no `react-pdf.browser-*.js` is requested on opening Payroll/Recruitment until the user opens PDF features.
3. Verify Admin/Employee/Candidate MFA, login/refresh/logout, cross-tab logout and normal maintenance gating. Use a separate approved window for Android attendance; no tracking setting or employee data is modified by this PR.
4. Measure cold vs warm route timings before claiming the complete performance issue closed; slow backend APIs require separate SQL/index/load investigation.

**Change control:** Keep PR unmerged until a safe, owner-confirmed Render window; no rollback requires DB or APK changes. Any rollback must use a normal revert PR, never force-rewrite protected main.
