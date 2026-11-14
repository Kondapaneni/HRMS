# SEC-009 — Explicit backend role and feature authorization

**Severity:** CRITICAL. **Status: PARTIAL — PR #26 merged, synthetic HTTP/role CI and existing SEC-004/007/008 workflows passed. Live Render permission and functionality verification pending before closure.**

## Audit finding and threat

An externally registered candidate receives a valid HRMS JWT. Previous usage of `new AuthMiddleware()` made any valid role immediately pass access control; even `new AuthMiddleware([], 'employeeAssessments')` bypassed the supplied feature because empty required roles were treated as unrestricted. Thus candidate accounts and non-granted employees could reach salary report exports, performance reviews, employee assessments, loan applications/member PII, sales activities and branch operations APIs.

## Implementation

- **Fail-closed default:** Every protected route now declares explicit roles. The middleware rejects an empty role list with HTTP 403 instead of authorizing all authenticated JWT roles.
- **Admin-only:** All three `/api/admin/reports/{employees,attendance,payroll}` exports, `/api/admin/performance`, and the admin chatbot use `['admin']`. There is no distinct reports/performance feature grant in `user_feature_access`; unlike employee payroll and performance self-service, sensitive company-wide exports remain admin-only.
- **Employee assessments:** Six endpoints require `['employee', 'hr', 'manager']`. **Do not use `'employeeAssessments'` as a feature flag:** no such grant is exposed in the existing admin feature-access UI/schema. Assessment visibility/assignment and attempt ownership are separate data-level requirements tracked under SEC-013.
- **Loan origination:** Dashboard, lead actions, member endpoints and application CRUD require admin role or the `canLoanOrigination` delegated grant.
- **Sales origination:** Sales dashboard/leads require admin role or `canSalesOrigination`; member search used by both loan and sales accepts either module's grant.
- **Shared origination activities:** Accepts admin or staff with loan, sales or branch operations feature grant; **activity ownership/scope checks are separate SEC-011 work**, not waived by the module gate.
- **Branch operations:** Dashboards/leads/application reads and mutations require admin role or `canBranchOperations`.
- **Other previously unspecified role declarations:** General session account endpoints `/api/me`, theme and password change retain explicitly listed candidate and staff roles. MFA/setup and employee training/performance/chatbot endpoints list internal HRMS staff roles. Candidate recruitment routes retain their pre-existing explicit candidate/employee restrictions.
- **Staff feature fallback:** HR and manager roles use the employee dashboard as well as employee role, so delegated feature checks allow `employee`, `hr` and `manager` only; a candidate cannot use staff feature flags even if a database row is accidentally set.

No database migration or frontend component change is required.

## CI and security coverage

`.github/workflows/sec009.yml` uses a **disposable, synthetic PostgreSQL database**:

1. Scans all protected route declarations in `backend/public` to forbid missing/empty `AuthMiddleware` role lists and verifies the intended route policy mapping.
2. Exercises actual PHP `AuthMiddleware` against synthetic admin, candidate, employee, HR and manager claims with allowed/denied feature flags; verifies candidate denial **even if every module feature is set**.
3. Exercises actual Slim HTTP routes to assert `403` for candidate and ungranted staff across reports, performance, assessments, leads, members, sales, loans, activities, branch operations and selected POST/PUT/DELETE routes.
4. Confirms explicit candidate portal role allowance and internal staff feature grants remain usable.

## Merged code / CI evidence — 2026-11-14

- [PR #26](https://github.com/Kondapaneni/HRMS/pull/26) merged into `main` at commit `fc60dc7d4ba39f42323ab52dc1087e5673f4942e`.
- Isolated PostgreSQL tests passed, exercising the actual `AuthMiddleware` decisions for admin, candidate, ungranted employee, feature-granted employee, HR and manager. Inactive users were denied and explicitly authorized candidate portal access remained possible.
- Real Slim HTTP checks returned `403 Forbidden` for synthetic candidate tokens at admin reports, performance, assessments, loans, members, sales, origination activities, and branch operations reads/mutations. Synthetic employees without module permission were also denied.
- SEC-004, SEC-007 and SEC-008 regression workflows were green in PR checks. **No claim of live Render verification has been made yet.**

## Live verification (development accounts only)

**Do not share tokens, passwords or personal employee/customer data. Do not register unapproved accounts on production.** Use pre-existing authorized test accounts.

1. Sign in to live HRMS as an existing **candidate test account**. Confirm candidate portal login and documents/applications still work.
2. With the candidate signed in, verify protected admin reports and loan/customer endpoints **deny access**, including when entered directly by URL or a controlled API request.
3. Sign in as an internal **employee without loan/sales/branch grants**. Confirm employee dashboard and self-service still work, and those restricted APIs deny access.
4. Grant **canLoanOrigination** to a development employee via Admin → Feature Access; confirm loan module works while sales and branch operations remain denied.
5. Grant **canSalesOrigination** and **canBranchOperations** separately as needed and confirm only each permitted module works.
6. Confirm admin Reports (including payroll), Performance and loan/sales/branch dashboards remain functional under a test admin account.
7. Confirm employee assessment list/start/submit works for an assigned development employee, and candidate access is denied. **Ownership/assignment data checks remain tracked in SEC-013/011.**

### Residual independent findings

- **SEC-010**: Static allowlisting of dynamically derived SQL feature identifiers, fail-closed database-error propagation and general feature-check hardening must be assessed separately. The SEC-009 fix does not claim these are all solved.
- **SEC-011**: Staff who have a module grant may still need ownership and branch scoping on individual records, separate from route/module authorization.
- **SEC-012**: Existing JWT role changes/session revocation and long expiry remain open.
- **SEC-013**: Per-employee assessment assignments, timers and salary data authorization beyond this coarse admin-only reporting gate remain open.

**Closure gate:** CI passes, merge/deploy confirmed, and owner verifies candidate denial, unprivileged employee denial, approved feature access, and admin/employee function regression live.
