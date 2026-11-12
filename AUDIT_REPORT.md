# ACME HRMS — Comprehensive Security, Performance & Code Quality Audit Report

**Audit Date:** 2026-11-11  
**Target Workspace:** [D:\Downloads\HRMS](file:///D:/Downloads/HRMS)  
**Target Stack:** React `19.2.7` + Vite `8` + Capacitor Android `8`, PHP `8.2.35` + Slim `4.*`, PostgreSQL (Supabase) + Supabase Storage & Edge Functions  
**Audit Mode:** Static & Safe CLI Verification Only (**Zero source files, schemas, or production data modified**)

---

## 1. Executive Summary

Acme HRMS is **NOT PRODUCTION READY**. Across the React frontend, Capacitor Android application, PHP/Slim API backend, PostgreSQL/Supabase data layer, and Docker/Render deployment setup, this audit identified **39 concrete findings**:

| Domain | Critical | High | Medium | Low | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Security (`SEC-001` – `SEC-024`) | 7 | 10 | 7 | 0 | **24** |
| Performance (`PERF-001` – `PERF-008`) | 0 | 5 | 3 | 0 | **8** |
| Code Quality & Architecture (`QUAL-001` – `QUAL-007`) | 0 | 3 | 3 | 1 | **7** |
| **Grand Total** | **7** | **18** | **13** | **1** | **39** |

> [!CAUTION]
> **Blocking Critical Vulnerabilities**
> 1. **Complete MFA Bypass ([SEC-008](#issue-id-sec-008)):** `/api/auth/otp/verify` issues full session JWTs without verifying `mfaEnabled` or TOTP factors.
> 2. **Broken RBAC / Empty `AuthMiddleware()` ([SEC-009](#issue-id-sec-009)):** Critical admin report exports (containing `salary`), performance reviews, employee assessments, origination loans/sales/activities, and branch operations admit any authenticated JWT—including external `candidate` users—and bypass feature-permission checks.
> 3. **Fail-Open Feature Middleware & SQL Identifier Interpolation ([SEC-010](#issue-id-sec-010)):** `AuthMiddleware` interpolates dynamic feature column names into SQL and fails open when DB checks fail.
> 4. **Critical Cross-User & Cross-Branch IDOR ([SEC-011](#issue-id-sec-011)):** Any authenticated user can overwrite draft loan applications, upload/delete KYC documents, change approval statuses/signatures, delete loan applications, reassign activities, and mutate branch-operations applications across branches.
> 5. **Broad Supabase RLS + Unauthenticated `anon` Client Access ([SEC-001](#issue-id-sec-001)) & Open Edge Email Relay ([SEC-002](#issue-id-sec-002)):** Browser clients never sign in to Supabase Auth (acting as `anon`), RLS policies broadly permit `USING (auth.jwt() ->> 'sub' IS NOT NULL)` across 26 tables, and `send-email` has no authorization check.
> 6. **Hardcoded Maintenance Bypass Password ([SEC-020](#issue-id-sec-020)):** `'AcmeDev@2026'` is embedded directly in client-side React code ([MaintenanceOverlay.jsx](file:///D:/Downloads/HRMS/frontend/src/components/MaintenanceOverlay.jsx#L33-L34)).

---

## 2. Application Architecture Overview

### 2.1 System & Repository Inventory
- **Backend (`backend/`):** PHP `8.2.35` (`slim/slim 4.*`, `slim/psr7 ^1.6`, `vlucas/phpdotenv ^5.6`, `firebase/php-jwt ^7.1`) structured with **41 PHP files in [backend/public/](file:///D:/Downloads/HRMS/backend/public)** (`15,668` LOC of inline closures), **12 files in [backend/src/](file:///D:/Downloads/HRMS/backend/src)** (`912` LOC of Config/Middleware/Utils), **11 migration scripts in [backend/scripts/](file:///D:/Downloads/HRMS/backend/scripts)** (`718` LOC), **14 HTML email templates in [backend/src/Templates/](file:///D:/Downloads/HRMS/backend/src/Templates)**, and `0` files in `backend/tests/`.
- **Frontend (`frontend/`):** React `19.2.7`, Vite `8.0.12`, Tailwind CSS, TanStack Query `5.101.0`, Axios `1.17.0`, React Router `7.17.0`, `@supabase/supabase-js 2.108.2`, `@react-pdf/renderer 4.5.1`, Capacitor `8.x` across **251 source files** in `frontend/src/` (`74,483` LOC across `.js`/`.jsx`/`.css` across `components/` [116], `pages/` [115], `utils/` [5], `assets/` [3], `contexts/` [2], `services/` [2], `api/` [1], `hooks/` [1], `lib/` [1], `plugins/` [1]). Built output ([frontend/dist/](file:///D:/Downloads/HRMS/frontend/dist)) ships a single `4,844,839`-byte (`4,731.3 KB`) monolithic JS chunk, a `1,922,833`-byte (`1,877.8 KB`) `logo.png`, and a `72,322,989`-byte (`70,627.9 KB` / `68.97 MB`) `Acme HRMS.apk`.
- **Android Native (`frontend/android/`):** Capacitor WebView wrapper pointing at `https://hrms-qwv3.onrender.com` ([capacitor.config.json](file:///D:/Downloads/HRMS/frontend/capacitor.config.json#L7-L9)) paired with native background location tracking ([LocationTrackerPlugin.java](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerPlugin.java), [LocationTrackerService.java](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java)).
- **Database & Edge (`supabase/` + PostgreSQL):** Remote PostgreSQL host (`.env` verified non-localhost), Supabase Storage buckets, and Deno Edge Function [send-email/index.ts](file:///D:/Downloads/HRMS/supabase/functions/send-email/index.ts) triggered from `email_queue`.
- **Container & PaaS Deployment:** Single multi-stage [Dockerfile](file:///D:/Downloads/HRMS/Dockerfile) combining Node `20-alpine` Vite build output into `php:8.2-apache`, launched via [docker-entrypoint.sh](file:///D:/Downloads/HRMS/docker-entrypoint.sh) on Render ([render.yaml](file:///D:/Downloads/HRMS/render.yaml)). **No `.dockerignore` exists** at repo root.

### 2.2 Complete Backend API Endpoint Map
Every Slim route verified across [backend/public/](file:///D:/Downloads/HRMS/backend/public):

- **Core Auth, Account, System & Storage Proxies ([index.php](file:///D:/Downloads/HRMS/backend/public/index.php)):**
  - `GET /`, `GET /version.json`, `GET /api/news`
  - `POST /api/login`, `POST /api/auth/otp/send`, `POST /api/auth/otp/verify`, `POST /api/logout`, `POST /api/forgot-password`, `POST /api/reset-password`
  - `GET /api/me`, `PUT /api/user/theme`, `PUT /api/change-password`
  - Public storage proxies (`GET`): `/Resume/{filename:.+}`, `/Job-Description/{filename:.+}`, `/Offer-Letter/{filename:.+}`, `/Avatar/{filename:.+}`, `/Holiday/{filename:.+}`, `/Attendance/{filename:.+}`, `/Candidate-Document/{filename:.+}`, `/Bills/{filename:.+}`, `/Loan-Document/{filename:.+}`, `/Loan-Signature/{filename:.+}`, `/Training-Video/{filename:.+}`
- **MFA ([mfa_routes.php](file:///D:/Downloads/HRMS/backend/public/mfa_routes.php)):** `POST /api/auth/mfa/verify`, `GET /api/mfa/status`, `POST /api/mfa/setup`, `POST /api/mfa/confirm`, `POST /api/mfa/backup-codes/regenerate`, `POST /api/mfa/disable`
- **Candidate Portal ([candidate_auth_routes.php](file:///D:/Downloads/HRMS/backend/public/candidate_auth_routes.php), [candidate_recruitment_routes.php](file:///D:/Downloads/HRMS/backend/public/candidate_recruitment_routes.php)):** `POST /api/candidate/register`, `POST /api/candidate/activate`, `POST /api/candidate/login`, `GET|PUT /api/candidate/profile`, `PUT /api/candidate/profile/documents-seen`, `GET|POST /api/candidate/documents`, `DELETE /api/candidate/documents/{type}`, `GET /api/candidate/jobs`, `GET|POST /api/candidate/applications`
- **Employee Portal ([employee_*_routes.php](file:///D:/Downloads/HRMS/backend/public)):**
  - Profile: `GET|PUT /api/employee/profile`, `POST /api/employee/profile/avatar`, `GET /api/employee/birthdays`
  - Attendance & Holidays: `GET /api/employee/attendance`, `POST /api/employee/attendance/punch`, `GET /api/employee/maps-rate-limit-status`, `GET /api/employee/geofences`, `GET /api/employee/holidays`
  - Leave, Expenses, Payroll, Performance: `GET /api/employee/leaves`, `POST /api/employee/leaves/apply`, `PUT /api/employee/leaves/{id}/cancel`, `GET|POST /api/employee/expenses`, `DELETE /api/employee/expenses/{id}`, `GET /api/employee/payroll`, `GET /api/employee/performance`
  - Assessments & Training & Chatbot: `GET /api/employee/assessments`, `GET /api/employee/assessments/{id}`, `POST /api/employee/assessments/{id}/start`, `PUT /api/employee/assessments/attempts/{attemptId}/save`, `POST /api/employee/assessments/attempts/{attemptId}/submit`, `GET /api/employee/assessments/attempts/{attemptId}/result`, `GET /api/employee/training/videos`, `GET|POST /api/employee/training/progress`, `POST /api/employee/chatbot/query`
- **Admin Portal ([admin_*_routes.php](file:///D:/Downloads/HRMS/backend/public)):**
  - Employees & Branches: `GET /api/branches`, `GET|POST /api/admin/employees` / `POST /api/employees`, `GET|PUT /api/admin/employees/{id}`, `PUT /api/admin/employees/{id}/settings`, `POST /api/admin/employees/convert`, `POST /api/admin/employees/{id}/promote`
  - Dashboard, Reports, Settings, Feature Access, Audit, Chatbot: `GET /api/admin/dashboard/stats`, `GET /api/admin/reports/{employees|attendance|payroll}`, `GET|POST /api/admin/settings`, `GET|POST /api/admin/feature-access`, `GET /api/admin/audit-logs`, `POST /api/admin/chatbot/query`
  - Attendance, Leaves, Expenses, Holidays, Payroll, Performance, Assets: `GET /api/admin/attendance`, `GET /api/admin/attendance/employee/{id}`, `GET /api/admin/attendance/location/{id}`, `POST /api/admin/attendance/regularize`, CRUD `/api/admin/geolocations`, CRUD `/api/admin/shifttimes`, `GET /api/admin/leaves`, `POST /api/admin/leaves/{id}/{approve|reject}`, `GET /api/admin/expenses`, `PUT /api/admin/expenses/{id}`, `GET|POST /api/admin/holidays`, `DELETE /api/admin/holidays/{date}`, `GET /api/admin/holidays/archived`, `PUT /api/admin/holidays/{date}/restore`, `GET /api/admin/payroll`, `POST /api/admin/payroll/generate`, `GET /api/admin/payroll/pending-employees`, `POST /api/admin/payroll/generate-bulk`, `DELETE /api/admin/payroll/{id}`, `GET /api/admin/performance`, CRUD + history `/api/admin/assets`
  - Recruitment, Assessments, Training: `GET /api/admin/candidates`, `POST /api/admin/send-email`, `GET|POST /api/admin/jobs`, `PUT /api/admin/jobs/{id}/status`, `GET /api/admin/applications`, `GET /api/admin/applications/{id}`, `PUT /api/admin/applications/{id}/status`, `POST /api/admin/applications/{id}/timeline`, `GET /api/admin/candidate-profiles`, `GET /api/admin/candidate-documents`, `PUT /api/admin/candidate-documents/{id}/status`, CRUD `/api/admin/assessments`, `GET /api/admin/assessments/attempts`, `DELETE /api/admin/assessments/attempts/{attemptId}`, CRUD `/api/admin/questions`, `GET|POST|DELETE /api/admin/training/videos`, `PUT /api/admin/training/videos/{id}/assign`
- **Origination (Loans, Sales, Activities) & Branch Operations:**
  - Activities: `GET|POST /api/origination/activities`, `PATCH /api/origination/activities/{id}/{reassign|toggle-status}`
  - Loan Leads & Members: `GET /api/leads/dashboard`, `POST /api/leads`, `GET /api/leads/list`, `PUT /api/leads/{id}/status`, `GET /api/members`, `GET /api/members/{phone}`
  - Loan Applications: `GET|POST /api/loans/applications`, `POST /api/loans/applications/{id}/documents`, `DELETE /api/loans/applications/{id}/documents/{docKey}`, `PATCH /api/loans/applications/{id}/status`, `DELETE /api/loans/applications/{id}`
  - Sales: `GET /api/sales/dashboard`, `GET /api/sales/leads`, `GET /api/sales/leads/list`, `POST /api/sales/leads`, `PUT /api/sales/leads/{id}/status`
  - Branch Operations: `GET /api/branch-operations/dashboard`, `GET /api/branch-operations/leads`, `GET /api/branch-operations/applications`, `POST /api/branch-operations/applications/{id}/seen`, `PUT /api/branch-operations/applications/{id}`

---

## 3. Security Audit Findings

Summary of all **24 Security Findings** organized across Cross-Cutting/Infrastructure (`SEC-001`–`SEC-007`, below), Auth & Authz ([Section 4](#4-authentication-and-authorization-findings)), API Security ([Section 5](#5-api-security-findings)), Database Security ([Section 6](#6-database-security-findings)), Frontend Security ([Section 7](#7-frontend-security-findings)), and Backend Security ([Section 8](#8-backend-security-findings)).

| ID | Title | Severity | Layer / Section | Status |
| --- | --- | --- | --- | --- |
| `SEC-001` | Broad Supabase RLS + Unauthenticated `anon` Client Access | CRITICAL | Supabase / §3 | Confirmed |
| `SEC-002` | Unauthenticated `send-email` Supabase Edge Function | CRITICAL | Edge Function / §3 | Confirmed |
| `SEC-003` | Unauthenticated Public File Proxies + Predictable Filenames | HIGH | Storage Proxy / §3 | Confirmed |
| `SEC-004` | `CURLOPT_SSL_VERIFYPEER => false` Exfiltrating PII/PAN to Gemini | HIGH | External API / §3 | Confirmed |
| `SEC-005` | Git-Tracked Sensitive Artifacts & Missing `.dockerignore` | HIGH | Repo & Docker / §3 | Confirmed |
| `SEC-006` | Insecure Android Config (`allowBackup`, Cleartext, SharedPrefs JWT) | HIGH | Android / §3 | Confirmed |
| `SEC-007` | Missing HTTP Security Headers & Wildcard JSON CORS | MEDIUM | Headers / §3 | Confirmed |
| `SEC-008` | Complete MFA Bypass in `/api/auth/otp/verify` | CRITICAL | Auth / §4 | Confirmed |
| `SEC-009` | Empty `AuthMiddleware()` Admitting Candidates/Wrong Roles | CRITICAL | AuthZ / §4 | Confirmed |
| `SEC-010` | Fail-Open Feature Enforcement & SQL Column Interpolation | CRITICAL | AuthZ / §4 | Confirmed |
| `SEC-011` | Cross-User & Cross-Branch IDOR in Loans, Activities & Branch Ops | CRITICAL | AuthZ / §4 | Confirmed |
| `SEC-012` | 10-Year Non-Revocable JWT, No-Op Logout, Weak Password Change | HIGH | Auth / §4 | Confirmed |
| `SEC-013` | Salary Data Exposure & Unvalidated Assessment Assignment/Timers | HIGH | AuthZ / §4 | Confirmed |
| `SEC-014` | Client-Side Geofence Validation & Spoofable `X-Forwarded-For` Limit | MEDIUM | Auth/Abuse / §4 | Confirmed |
| `SEC-015` | Arbitrary HTML Email Relay & Queued Plaintext Passwords | HIGH | API / §5 | Confirmed |
| `SEC-016` | Google Maps & Geocoding Keys Returned in JSON API Responses | MEDIUM | API / §5 | Confirmed |
| `SEC-017` | Direct Browser Storage Uploads Bypassing Backend Validation | MEDIUM | API / §5 | Confirmed |
| `SEC-018` | `ATTR_EMULATE_PREPARES = true`, Error Echo & Request-Time `ALTER TABLE` | HIGH | Database / §6 | Confirmed |
| `SEC-019` | Weak `uniqid()`, DB Isolation Gaps & Unverified Live Constraints | MEDIUM | Database / §6 | Confirmed / Partial |
| `SEC-020` | Hardcoded Maintenance Bypass Password (`AcmeDev@2026`) in JS Bundle | CRITICAL | Frontend / §7 | Confirmed |
| `SEC-021` | JWT & 24h Cached PII/Payroll in `localStorage` + `80` `console.*` Calls | HIGH | Frontend / §7 | Confirmed |
| `SEC-022` | Google Maps `InfoWindow` DOM XSS & 13 `dangerouslySetInnerHTML` Sinks | MEDIUM | Frontend / §7 | Confirmed |
| `SEC-023` | Vulnerable Frontend npm Dependencies (4 High, 1 Moderate) | MEDIUM | Supply Chain / §7 | Confirmed |
| `SEC-024` | Slim Debug Traces (`addErrorMiddleware(true,true,true)`) & Error Leaks | HIGH | Backend / §8 | Confirmed |

---

### Issue ID: SEC-001

- **Issue Title:** Broad Supabase RLS Policies (`sub IS NOT NULL`) Paired with Unauthenticated Browser `anon` Client Calls
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Broken Access Control / Data Layer Exposure (OWASP API1, API2)
- **Affected File:** [migrate_fix_rls_policies.php](file:///D:/Downloads/HRMS/backend/scripts/migrate_fix_rls_policies.php#L78-L82), [AuthContext.jsx](file:///D:/Downloads/HRMS/frontend/src/contexts/AuthContext.jsx), [AdminLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/AdminLayout.jsx#L37-L40), [CandidateLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/CandidateLayout.jsx#L34-L38), [loanServices.js](file:///D:/Downloads/HRMS/frontend/src/services/loanServices.js#L204), [videoCompressor.js](file:///D:/Downloads/HRMS/frontend/src/utils/videoCompressor.js#L247-L248)
- **Affected Function/API:** Supabase PostgREST & Storage RLS policies across 26 tables + `storage.objects`
- **Exact Code Location:** [migrate_fix_rls_policies.php](file:///D:/Downloads/HRMS/backend/scripts/migrate_fix_rls_policies.php#L78-L82) and [L184-L196](file:///D:/Downloads/HRMS/backend/scripts/migrate_fix_rls_policies.php#L184-L196); frontend direct queries in `AdminLayout.jsx` L37-40 (`candidate_documents`), `CandidateLayout.jsx` L34-38 (`candidate_profiles`), `loanServices.js` L204 (`branches`), and 14 components calling `supabase.storage.from(...).upload()/remove()`.
- **Current Implementation:**
  `migrate_fix_rls_policies.php` drops/creates policies with `FOR ALL TO authenticated, service_role USING (auth.jwt() ->> 'sub' IS NOT NULL)` across 26 tables and `storage.objects`, plus allows `anon` `INSERT` on `resumes` and `candidate_documents`. Meanwhile, `AuthContext.jsx` only stores the custom PHP JWT in `localStorage` and never signs in to `supabase.auth`.
- **Problem:** Any Supabase `authenticated` JWT grants full cross-tenant read/write across all 26 tables (`WITH CHECK`/`USING` checks only non-null `sub`), `anon` can insert into storage/tables directly using the public `VITE_SUPABASE_ANON_KEY`, and legitimate browser queries run unauthenticated as `anon`.
- **Root Cause:** Architectural split between custom PHP JWT authentication and direct client-side Supabase PostgREST/Storage calls without Supabase custom-claim JWT minting or strict per-row ownership RLS predicates.
- **Security/Business Impact:** Direct PostgREST/Storage exploitation bypassing all Slim middleware, RBAC, and audit logging; unauthenticated uploads and broad table exposure if any Supabase Auth token or `anon` grant exists.
- **Steps to Reproduce:**
  1. Extract public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the compiled Vite JS bundle.
  2. Issue direct REST requests to `<SUPABASE_URL>/storage/v1/object/resumes/...` or `/rest/v1/candidate_documents` using `apikey: <anon_key>`.
  3. With any `authenticated` JWT (`sub` claim non-null), query `/rest/v1/employees` or `/rest/v1/payrolls` directly without per-user filtering.
- **Recommended Fix:** Remove all direct browser Supabase DB/Storage writes, move DB and Storage operations behind authenticated Slim API endpoints (which validate ownership and upload via server-side Supabase service role), and lock Supabase RLS policies down to `service_role` or strict custom-claim ownership (`auth.jwt() ->> 'sub' = "userId"::text`).
- **Suggested Code Changes:**
```sql
-- Example strict RLS lock-down per table (run via migration once frontend direct access is removed):
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "..." ON public.employees;
CREATE POLICY "service_role_full_access" ON public.employees
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```
- **Verification Method:** Attempt anonymous PostgREST queries (`GET /rest/v1/employees`, `POST /storage/v1/object/resumes/...`) with only the public `anon` key and verify `401`/`403` responses after remediation.
- **Regression Risk:** High if frontend components ([AdminLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/AdminLayout.jsx), [CandidateLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/CandidateLayout.jsx), [loanServices.js](file:///D:/Downloads/HRMS/frontend/src/services/loanServices.js), [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx)) are not migrated to backend API endpoints first.

---

### Issue ID: SEC-002

- **Issue Title:** Unauthenticated Open Email Relay in Supabase Edge Function (`send-email`)
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Missing Authentication / Abuse of Cloud Function (OWASP API2)
- **Affected File:** [index.ts](file:///D:/Downloads/HRMS/supabase/functions/send-email/index.ts#L10-L82)
- **Affected Function/API:** Edge Function HTTP handler `POST /functions/v1/send-email`
- **Exact Code Location:** [supabase/functions/send-email/index.ts](file:///D:/Downloads/HRMS/supabase/functions/send-email/index.ts#L10-L82)
- **Current Implementation:** Sets `Access-Control-Allow-Origin: *` and reads recipient/subject/body from the HTTP request or webhook payload with no `Authorization` header verification, HMAC signature verification, or shared webhook secret check.
- **Problem:** Any internet attacker who discovers the public project's Edge Function URL can invoke `POST /functions/v1/send-email` with arbitrary recipients and HTML payloads.
- **Root Cause:** Edge Function deployed/implemented without validating Supabase Webhook secret headers or `service_role` bearer credentials.
- **Security/Business Impact:** Unauthenticated phishing from the organization's verified domain/SMTP sender, quota exhaustion, domain blocklisting, and spoofed HR/payroll/offer communications.
- **Steps to Reproduce:** Send `POST https://<project-ref>.supabase.co/functions/v1/send-email` with JSON body targeting an external email address without an admin session or webhook secret.
- **Recommended Fix:** Require a shared secret header (`X-Webhook-Secret`) verified via constant-time comparison against an Edge secret env var (plus verify JWT if JWT verification is disabled in Supabase config).
- **Suggested Code Changes:**
```ts
const secret = Deno.env.get("EMAIL_WEBHOOK_SECRET");
const provided = req.headers.get("x-webhook-secret");
if (!secret || !provided || provided !== secret) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
}
```
- **Verification Method:** Test unauthenticated POST returns `401 Unauthorized` while Postgres DB webhook / backend trigger carrying the secret succeeds.
- **Regression Risk:** Low once the database webhook or trigger calling `send-email` is configured to pass `x-webhook-secret`.

---

### Issue ID: SEC-003

- **Issue Title:** Unauthenticated Public Storage Proxies Exposing Sensitive HR, KYC, Offer Letters & Payroll-Adjacent Documents
- **Severity:** HIGH *(Confirmed)*
- **Category:** Sensitive Data Exposure / Missing Authentication (OWASP API1, API2)
- **Affected File:** [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L768-L786), [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L834-L893), [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx#L407-L416)
- **Affected Function/API:** `/Resume/{filename:.+}`, `/Offer-Letter/{filename:.+}`, `/Candidate-Document/{filename:.+}`, `/Bills/{filename:.+}`, `/Loan-Document/{filename:.+}`, `/Loan-Signature/{filename:.+}`, `/Attendance/{filename:.+}`, `/Avatar/{filename:.+}`, `/Job-Description/{filename:.+}`, `/Holiday/{filename:.+}`, `/Training-Video/{filename:.+}`
- **Exact Code Location:** [backend/public/index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L768-L786), [L834-L893](file:///D:/Downloads/HRMS/backend/public/index.php#L834-L893); predictable naming in [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx#L407-L416)
- **Current Implementation:** All 11 file proxy routes are mounted without `AuthMiddleware`, return `Access-Control-Allow-Origin: *`, and stream files directly from storage. Moreover, offer letters are uploaded as `${safeFirstName}-${safeLastName}.pdf`.
- **Problem:** Anyone on the internet can fetch candidate resumes, national ID/KYC candidate documents, expense bills, employee attendance selfies, loan applicant documents, customer loan signatures, and offer letters containing compensation terms—especially trivially enumerating `/Offer-Letter/John-Doe.pdf`.
- **Root Cause:** Storage proxies implemented as convenience pass-through URLs embedded in `<img>`/`<a>` tags instead of authenticated file endpoints or short-lived signed URLs.
- **Security/Business Impact:** Direct PII, financial/loan KYC, salary/offer, and signature breach across candidates, employees, and loan customers.
- **Steps to Reproduce:** Request `GET /Offer-Letter/<First>-<Last>.pdf` or any known path under `/Loan-Document/`, `/Candidate-Document/`, or `/Bills/` with zero cookies or `Authorization` headers.
- **Recommended Fix:** Enforce `AuthMiddleware` + ownership/branch authorization on sensitive file routes (or mint short-lived authenticated Supabase signed URLs via API), remove `Access-Control-Allow-Origin: *`, and replace `${First}-${Last}.pdf` with CSPRNG UUID filenames.
- **Suggested Code Changes:**
```php
// Replace predictable naming & unauthenticated proxy with AuthMiddleware + ownership lookup
$app->get('/Offer-Letter/{filename:.+}', function (Request $request, Response $response, $args) {
    $user = $request->getAttribute('user');
    // Verify admin recruitment access OR candidate owns offer letter matching filename
    ...
})->add(new AuthMiddleware(['admin', 'hr', 'candidate']));
```
- **Verification Method:** Unauthenticated requests to `/Offer-Letter/...`, `/Loan-Document/...`, `/Candidate-Document/...` return `401`; non-owner employee requests return `403`.
- **Regression Risk:** Medium — frontend `<img src>` / `<a href>` tags for private assets must fetch short-lived signed URLs or pass bearer blobs instead of bare unauthenticated paths.

---

### Issue ID: SEC-004

- **Issue Title:** Disabled TLS Verification (`CURLOPT_SSL_VERIFYPEER => false`) While Sending Employee PII, Salaries & PAN Data to External AI API
- **Severity:** HIGH *(Confirmed)*
- **Category:** Cryptographic Failures / Sensitive Data Exfiltration (OWASP A02, A04)
- **Affected File:** [employee_chatbot_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_chatbot_routes.php#L611), [admin_chatbot_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_chatbot_routes.php#L439)
- **Affected Function/API:** `POST /api/employee/chatbot/query`, `POST /api/admin/chatbot/query`
- **Exact Code Location:** [employee_chatbot_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_chatbot_routes.php#L611); [admin_chatbot_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_chatbot_routes.php#L439)
- **Current Implementation:** Both chatbot endpoints aggregate employee records (including salaries and PAN/PII context) into a prompt and transmit it to the external Gemini API over cURL with `CURLOPT_SSL_VERIFYPEER` explicitly set to `false` (note also `.env` inspection found `APP_CHAT_KEY` rather than `GEMINI_API_KEY` defined in `backend/.env`).
- **Problem:** Turning off TLS certificate validation exposes outbound HTTPS payloads containing full HR/salary/PII context and API keys to active Man-in-the-Middle (MitM) interception on any upstream network hop.
- **Root Cause:** Local development TLS workaround left enabled in production route handlers.
- **Security/Business Impact:** Plaintext interception of workforce salaries, personal tax identifiers (PAN), attendance, and API keys; potential compliance breach from shipping raw PII/PAN externally to third-party LLM APIs.
- **Steps to Reproduce:** Inspect cURL options on `employee_chatbot_routes.php` L611 and `admin_chatbot_routes.php` L439; simulate MitM proxy with a self-signed cert — cURL accepts it without error.
- **Recommended Fix:** Remove `CURLOPT_SSL_VERIFYPEER => false` (enforce `true` and `CURLOPT_SSL_VERIFYHOST => 2` with container CA bundle), redact PII/PAN/bank fields before third-party LLM calls, and ensure `GEMINI_API_KEY` / key config matches production.
- **Suggested Code Changes:**
```php
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
```
- **Verification Method:** Configure test proxy with untrusted CA and confirm cURL fails closed with SSL verification error (`CURLE_PEER_FAILED_VERIFICATION`).
- **Regression Risk:** Low in Linux Docker containers ([Dockerfile](file:///D:/Downloads/HRMS/Dockerfile) Debian CA certificates); Windows dev PHP must reference `curl.cainfo` in `php.ini`.

---

### Issue ID: SEC-005

- **Issue Title:** Sensitive Database Backups, Logs & Queries Tracked in Git + Missing `.dockerignore` Risking `.env` Exposure in Image
- **Severity:** HIGH *(Confirmed)*
- **Category:** Sensitive Information Exposure / Misconfiguration (OWASP A05)
- **Affected File:** [chat_backup_2026_08_06_151001.sql](file:///D:/Downloads/HRMS/chat_backup/chat_backup_2026_08_06_151001.sql), [scratch_queries.txt](file:///D:/Downloads/HRMS/scratch_queries.txt), [server.log](file:///D:/Downloads/HRMS/server.log), [.gitignore](file:///D:/Downloads/HRMS/.gitignore#L1-L13), [Dockerfile](file:///D:/Downloads/HRMS/Dockerfile#L19-L53)
- **Affected Function/API:** SCM repository & Docker build context (`COPY backend/ .`)
- **Exact Code Location:** `git ls-files` confirms tracked artifacts: `chat_backup/chat_backup_2026_08_06_151001.sql` (`91` lines, `14,620` bytes), `scratch_queries.txt` (`497` lines, `59,783` bytes), `server.log` (`9,502` bytes), `backend/composer.phar`, and `frontend/public/downloads/Acme HRMS.apk` (`72,322,989` bytes). `Test-Path D:\Downloads\HRMS\.dockerignore` returned `False`, while [Dockerfile](file:///D:/Downloads/HRMS/Dockerfile#L50) runs `COPY backend/ .`.
- **Problem:** Internal SQL backups (table structures, user UUIDs, message payloads/attachment URLs), operational logs, and developer scratch queries are committed to Git history. Additionally, without `.dockerignore`, any Docker build executed from a developer machine or CI runner with `.env` present copies `backend/.env` directly into the container filesystem (`chmod -R 755`), bypassing [docker-entrypoint.sh](file:///D:/Downloads/HRMS/docker-entrypoint.sh#L10)'s runtime generation check and potentially leaking secrets in image layers.
- **Root Cause:** Permissive `.gitignore` (ignores `.env`, `*.apk` except `frontend/public/downloads/*.apk`, `ngrok.log`, but not `server.log`, `*.sql` backups, or `scratch_queries.txt`) and complete absence of `.dockerignore`.
- **Security/Business Impact:** Leakage of production database credentials, `JWT_SECRET`, `GOOGLE_*` API keys, internal schema/data dumps, and user metadata to anyone with repo or registry pull access.
- **Steps to Reproduce:** Inspect `git ls-files` and run `docker build` from a local tree containing `backend/.env`; verify `/var/www/html/.env` exists baked into the resulting image layer.
- **Recommended Fix:** Add a strict `.dockerignore` excluding `.env*`, `.git`, `chat_backup/`, `*.log`, `*.sql`, `*.apk`, `scratch_queries.txt`, and `backend/tests/`; untrack sensitive files from Git, scrub them from history (`git filter-repo`), and rotate exposed credentials/keys.
- **Suggested Code Changes:**
```dockerignore
.git
.env
.env.*
**/.env
**/.env.*
*.log
*.sql
chat_backup/
scratch_queries.txt
frontend/public/downloads/*.apk
```
- **Verification Method:** Run `docker build` with a dummy local `backend/.env` and confirm `docker run --rm <image> ls -la /var/www/html/.env` fails (`No such file`).
- **Regression Risk:** Low — production uses [docker-entrypoint.sh](file:///D:/Downloads/HRMS/docker-entrypoint.sh) to materialize `.env` from Render OS environment variables at startup.

---

### Issue ID: SEC-006

- **Issue Title:** Insecure Android Native Configuration (Cloud Backup Enabled, Cleartext Traffic, Unencrypted JWT Storage & Logcat Leaks)
- **Severity:** HIGH *(Confirmed)*
- **Category:** Mobile Security / Insecure Data Storage & Transport (OWASP M1, M5, M9)
- **Affected File:** [AndroidManifest.xml](file:///D:/Downloads/HRMS/frontend/android/app/src/main/AndroidManifest.xml#L5-L10), [capacitor.config.json](file:///D:/Downloads/HRMS/frontend/capacitor.config.json#L7-L9), [LocationTrackerService.java](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java#L170-L465), [build.gradle](file:///D:/Downloads/HRMS/frontend/android/app/build.gradle#L20-L24)
- **Affected Function/API:** Native Android APK build & background telemetry uploader
- **Exact Code Location:** [AndroidManifest.xml](file:///D:/Downloads/HRMS/frontend/android/app/src/main/AndroidManifest.xml#L5-L10) (`android:allowBackup="true"`, `android:usesCleartextTraffic="true"`), [capacitor.config.json](file:///D:/Downloads/HRMS/frontend/capacitor.config.json#L7-L9) (`"cleartext": true`), [LocationTrackerService.java](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java#L170-L175) (unencrypted `SharedPreferences` JWT) & [L445-L465](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java#L445-L465) (Logcat logging), [build.gradle](file:///D:/Downloads/HRMS/frontend/android/app/build.gradle#L21) (`minifyEnabled false`)
- **Current Implementation:** The Android APK enables ADB/cloud backup, allows cleartext HTTP traffic in both `capacitor.config.json` and `AndroidManifest.xml`, stores employee JWTs in plaintext `SharedPreferences`, logs GPS coordinates and HTTP responses to `Log`, and disables R8/ProGuard (`minifyEnabled false`).
- **Problem:** Non-revocable 10-year JWTs and exact employee GPS telemetry can be extracted via `adb backup`, unencrypted device snapshots, USB Logcat inspection, or network downgrade/cleartext URLs.
- **Root Cause:** Capacitor template defaults left unchanged during mobile feature delivery.
- **Security/Business Impact:** Long-lived employee session hijacking and employee physical location tracking disclosure.
- **Steps to Reproduce:** Connect device running the debug/release APK via ADB (`adb backup` / `adb logcat`), inspect plaintext JWT in `/data/data/com.example.acmehrms/shared_prefs/` and live GPS telemetry in Logcat.
- **Recommended Fix:** Set `android:allowBackup="false"`, `android:usesCleartextTraffic="false"`, `"cleartext": false`, store JWT tokens in Android Keystore-backed `EncryptedSharedPreferences`, gate debug logs with `BuildConfig.DEBUG`, and enable `minifyEnabled true`.
- **Suggested Code Changes:**
```xml
<!-- AndroidManifest.xml -->
<application
    android:allowBackup="false"
    android:usesCleartextTraffic="false" ...>
```
- **Verification Method:** Run `adb logcat` and MobSF/APK analyzer against release APK verifying zero cleartext flags, `allowBackup=false`, and obfuscated DEX bytecode.
- **Regression Risk:** Low if using HTTPS endpoints exclusively; requires testing local dev via Android `network_security_config.xml` debug overrides only.

---

### Issue ID: SEC-007

- **Issue Title:** Missing Defensive HTTP Security Headers (CSP, HSTS, X-Frame-Options) & Wildcard `.json` CORS
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Security Misconfiguration (OWASP A05)
- **Affected File:** [.htaccess](file:///D:/Downloads/HRMS/backend/public/.htaccess#L10-L16), [Dockerfile](file:///D:/Downloads/HRMS/Dockerfile#L35-L41), [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L768-L786)
- **Affected Function/API:** Apache HTTP response headers & Slim CORS configuration
- **Exact Code Location:** [backend/public/.htaccess](file:///D:/Downloads/HRMS/backend/public/.htaccess#L10-L16) (`Header set Access-Control-Allow-Origin "*"` on `.json`) and absence of security headers across `.htaccess` and Apache config.
- **Current Implementation:** `mod_headers` is enabled in `Dockerfile` L35, yet `.htaccess` only emits `Access-Control-Allow-Origin "*"` for JSON files without setting `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy`.
- **Problem:** Browsers have no clickjacking protection, no MIME-sniffing protection, and no CSP mitigation should any XSS injection (such as `SEC-022`) fire.
- **Root Cause:** Security headers omitted from Apache `.htaccess` and Slim response middleware.
- **Security/Business Impact:** Increases blast radius of XSS (`SEC-022`), enables framing/clickjacking of admin HR/payroll panels, and permits cross-origin reads of JSON endpoints (`version.json` / proxies).
- **Steps to Reproduce:** Inspect response headers from Apache static/API responses for absence of `Content-Security-Policy`, `X-Frame-Options`, and `X-Content-Type-Options: nosniff`.
- **Recommended Fix:** Add strict security headers in [backend/public/.htaccess](file:///D:/Downloads/HRMS/backend/public/.htaccess) (excluding `HSTS` only if local plain HTTP needs conditional HTTPS check, enabled at edge/HTTPS), and restrict CORS `Access-Control-Allow-Origin` to the configured `FRONTEND_URL`.
- **Suggested Code Changes:**
```apache
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(self), camera=(self)"
</IfModule>
```
- **Verification Method:** `curl -I https://<host>/` and verify all security headers are present on HTML and `/api/*` responses.
- **Regression Risk:** Low for `X-Content-Type-Options` and `Referrer-Policy`; CSP `script-src` must explicitly whitelist Google Maps (`maps.googleapis.com`) and Vite scripts before enforcement (`Report-Only` first).

---

## 4. Authentication and Authorization Findings

### Issue ID: SEC-008

- **Issue Title:** Complete Multi-Factor Authentication (MFA) Bypass via Email OTP Endpoint (`/api/auth/otp/verify`)
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Identification & Authentication Failures / Broken Auth (OWASP A07, API2)
- **Affected File:** [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L328-L445), [mfa_routes.php](file:///D:/Downloads/HRMS/backend/public/mfa_routes.php#L14-L183)
- **Affected Function/API:** `POST /api/auth/otp/verify` vs `POST /api/login` + `POST /api/auth/mfa/verify`
- **Exact Code Location:** [backend/public/index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L328-L445)
- **Current Implementation:** `/api/auth/otp/verify` validates the 6-digit email `otp_code` (also stored in plaintext in the database) and immediately returns a full privileged session JWT (`'exp'` set up to 10 years if `session_timeout === 'never'`). It **never checks** `"mfaEnabled"` or `mfa_secrets`.
- **Problem:** Any user with TOTP MFA enabled—including HR administrators and payroll approvers—can completely skip TOTP verification by using the email OTP login flow instead of `/api/login` + `/api/auth/mfa/verify`.
- **Root Cause:** Secondary email OTP login path added independently of the MFA challenge check implemented in `/api/login`.
- **Security/Business Impact:** Total neutralization of MFA controls for privileged accounts if an attacker has mailbox access or steals a mailbox OTP.
- **Steps to Reproduce:**
  1. Enable TOTP MFA on an admin user via `/api/mfa/setup` & `/api/mfa/confirm`.
  2. Call `POST /api/auth/otp/send` with that admin's email and submit the email code to `POST /api/auth/otp/verify`.
  3. Observe a full authenticated admin JWT is issued with zero TOTP prompt.
- **Recommended Fix:** In `/api/auth/otp/verify`, check `users."mfaEnabled"` identical to `/api/login`; if true, return `{ mfaRequired: true, mfaToken: <short-lived scoped pre-auth JWT> }` instead of a full session JWT, and hash OTP codes at rest with short expiration and attempt lockout.
- **Suggested Code Changes:**
```php
if (!empty($user['mfaEnabled'])) {
    $mfaPayload = ['userId' => $user['id'], 'mfaPending' => true, 'exp' => time() + 300];
    $mfaToken = JWT::encode($mfaPayload, $secret, 'HS256');
    $response->getBody()->write(json_encode(['mfaRequired' => true, 'mfaToken' => $mfaToken]));
    return $response->withHeader('Content-Type', 'application/json');
}
```
- **Verification Method:** Automated API integration test verifying `/api/auth/otp/verify` returns `mfaRequired: true` (and `mfaToken` rejected by `AuthMiddleware`) when `mfaEnabled = true`.
- **Regression Risk:** Low — frontend login already supports handling `{ mfaRequired: true, mfaToken }` from `/api/login`; ensure `OtpVerify` flow triggers the same MFA prompt.

---

### Issue ID: SEC-009

- **Issue Title:** Empty `AuthMiddleware()` & Empty Role Lists Admit Candidates and Unauthorized Employees to Admin Reports, Performance, Assessments, Origination & Branch Operations
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Broken Function Level Authorization / Vertical & Horizontal Privilege Escalation (OWASP API5, A01)
- **Affected File:** [AuthMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L51), [admin_reports_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_reports_routes.php#L110), [admin_performance_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_performance_routes.php#L140), [employee_assessments_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_assessments_routes.php#L155), [origination_loans_application_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_loans_application_routes.php#L284), [branch_operations_application_routes.php](file:///D:/Downloads/HRMS/backend/public/branch_operations_application_routes.php#L424) (+ 8 other route files)
- **Affected Function/API:** `/api/admin/reports/{employees|attendance|payroll}`, `/api/admin/performance`, `/api/employee/assessments*`, `/api/leads/*`, `/api/members/*`, `/api/sales/*`, `/api/origination/activities*`, `/api/loans/applications*`, `/api/branch-operations/*`
- **Exact Code Location:**
  - Role check bypass: [AuthMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L51) (`if (empty($this->requiredRoles) || in_array($decoded->role, $this->requiredRoles)) { $roleAllowed = true; }`)
  - Missing role/feature lists:
    - [admin_reports_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_reports_routes.php#L110) (`L110, L188, L269` -> `new AuthMiddleware()`)
    - [admin_performance_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_performance_routes.php#L140) (`new AuthMiddleware()`)
    - [employee_assessments_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_assessments_routes.php#L155) (`L155, L184, L348, L377, L544, L593` -> `new AuthMiddleware([], 'employeeAssessments')`)
    - `origination_loans_dashboard_routes.php` L118, `origination_loans_leads_routes.php` L60/109/169, `origination_loans_member_routes.php` L97/198, `origination_sales_dashboard_routes.php` L114, `origination_sales_leads_routes.php` L193, `origination_activities_routes.php` L604, `origination_loans_application_routes.php` L284/418/482/534/613/640, `branch_operations_dashboard_routes.php` L332/560, `branch_operations_application_routes.php` L424/530/888
- **Current Implementation:** Passing `new AuthMiddleware()` (or `new AuthMiddleware([], 'employeeAssessments')` where `$requiredRoles` is `[]`) makes `$roleAllowed = true` immediately for **every role**, including external self-registered `candidate` accounts!
- **Problem:** Any self-registered external job candidate (via open `POST /api/candidate/register`) can authenticate and immediately call `GET /api/admin/reports/employees` (exporting all employee salaries), `GET /api/admin/reports/payroll`, `GET /api/admin/performance`, all loan/member PII endpoints (`/api/members`, `/api/loans/applications`), and all branch operations endpoints.
- **Root Cause:** Treating `AuthMiddleware` with no arguments as "default protected" without realizing `candidate` shares the same JWT issuer/secret, and relying on `empty($this->requiredRoles)` to skip both role checks and feature checks.
- **Security/Business Impact:** Unauthenticated-equivalent company-wide salary, payroll, HR performance, customer loan PII, and branch data breach via public self-registration.
- **Steps to Reproduce:**
  1. Register an external candidate via `/api/candidate/register` + `/api/candidate/activate` + `/api/candidate/login`.
  2. Call `GET /api/admin/reports/employees` with the candidate bearer token.
  3. Receive full workforce roster including `e.salary`.
- **Recommended Fix:** Reject `candidate` tokens on every non-candidate route by requiring explicit `$requiredRoles` on every `AuthMiddleware` instantiation (fail-closed if empty on privileged route groups), and check feature permissions regardless of role when `$requiredFeature` is provided.
- **Suggested Code Changes:**
```php
// Example on admin_reports_routes.php & admin_performance_routes.php:
->add(new AuthMiddleware(['admin', 'hr', 'employee'], 'reports')); // or specific feature flag
// Reject empty roles in privileged constructors or check token type/role strictly.
```
- **Verification Method:** Integration tests authenticating as `candidate` and unprivileged `employee` against every listed route verifying `403 Forbidden`.
- **Regression Risk:** Low/Medium — requires verifying exact allowed roles/feature flags per route group (`loans`, `sales`, `branchOperations`, `reports`, `performance`) against UI `ProtectedRoute` mappings.

---

### Issue ID: SEC-010

- **Issue Title:** Fail-Open Feature Authorization & Dynamic Unvalidated Column Interpolation in `AuthMiddleware`
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Broken Access Control / SQL Injection Pattern (OWASP A01, A03)
- **Affected File:** [AuthMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L41-L127)
- **Affected Function/API:** `AuthMiddleware::__invoke` (`$featureCol` check)
- **Exact Code Location:** [AuthMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L62-L64) and [L86-L127](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L86-L127)
- **Current Implementation:** Builds `$featureCol = str_starts_with($feature, 'can') ? $feature : ('can' . ucfirst($feature));` and interpolates `"$featureCol"` directly into `"SELECT \"$featureCol\" FROM user_feature_access WHERE \"userId\" = :uid"`. Furthermore, if DB connection is null (`$conn === null`) or exceptions occur (`L86-L127`), authorization fails open or passes through.
- **Problem:** Feature flags can be bypassed on database glitches/exceptions, and column names are dynamically interpolated without an allowlist.
- **Root Cause:** Defensive `try/catch` written for availability instead of security fail-closed design, and string-templated SQL identifiers instead of an explicit allowlist map.
- **Security/Business Impact:** Privilege escalation under transient DB connectivity issues or misconfigured feature keys, plus structural SQL identifier injection vector if caller-influenced keys ever reach `AuthMiddleware`.
- **Steps to Reproduce:** Simulate `$conn === null` or an invalid column exception inside `AuthMiddleware` and observe execution falling through instead of returning `500`/`403`.
- **Recommended Fix:** Map allowed feature keys through an explicit `const ALLOWED_FEATURE_COLUMNS = [...]` whitelist, reject unknown features with `403`, and immediately return `503`/`403` whenever DB verification fails (`fail-closed`).
- **Suggested Code Changes:**
```php
private const FEATURE_COLUMNS = ['reports' => 'canReports', 'assets' => 'canAssets', /* ... */];
$featureCol = self::FEATURE_COLUMNS[$feature] ?? null;
if (!$featureCol) { return $this->forbiddenResponse('Invalid feature permission'); }
if (!$conn) { return $this->serverErrorResponse('Authorization service unavailable'); }
```
- **Verification Method:** Unit test `AuthMiddleware` with mocked failing PDO connection and unknown feature strings; verify `403`/`503` fail-closed responses.
- **Regression Risk:** Low — requires enumerating every valid feature column present in `user_feature_access`.

---

### Issue ID: SEC-011

- **Issue Title:** Critical Cross-User & Cross-Branch IDOR in Loan Applications, Origination Activities & Branch Operations
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Broken Object Level Authorization / IDOR (OWASP API1)
- **Affected File:** [origination_loans_application_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_loans_application_routes.php#L197-L640), [branch_operations_application_routes.php](file:///D:/Downloads/HRMS/backend/public/branch_operations_application_routes.php#L667-L836), [origination_activities_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_activities_routes.php#L395-L507)
- **Affected Function/API:**
  - `POST /api/loans/applications` (draft overwrite), `POST /api/loans/applications/{id}/documents`, `DELETE /api/loans/applications/{id}/documents/{docKey}`, `PATCH /api/loans/applications/{id}/status`, `DELETE /api/loans/applications/{id}`
  - `PUT /api/branch-operations/applications/{id}`
  - `PATCH /api/origination/activities/{id}/reassign`
- **Exact Code Location:**
  - [origination_loans_application_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_loans_application_routes.php#L197-L231) (`L197-231` draft update, `L423-482`, `L487-534`, `L539-613`, `L618-640`)
  - [branch_operations_application_routes.php](file:///D:/Downloads/HRMS/backend/public/branch_operations_application_routes.php#L709-L836) (`L709` `$editorName = 'Branch Officer'` fallback; `L717-730`, `L824-836` missing `branch` scope)
  - [origination_activities_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_activities_routes.php#L395-L507) (missing creator/assignee/branch check)
- **Current Implementation:** SQL `UPDATE`/`DELETE` queries filter solely by `WHERE id = :id` with zero check against the authenticated user's `userId`, role, or assigned `branch`. Combined with [SEC-009](#issue-id-sec-009), even non-employees (`candidate`) pass `AuthMiddleware()`.
- **Problem:** Any authenticated caller knowing or enumerating a loan application UUID or activity ID can overwrite financial applications, delete KYC documents, forge status/signature changes, delete applications, hijack origination activities, or alter applications belonging to another branch.
- **Root Cause:** Trusting client navigation context instead of enforcing object ownership and branch boundaries in SQL predicates and server-side guards.
- **Security/Business Impact:** Financial loan tampering, unauthorized loan approval/status manipulation, destruction of KYC/audit records, and cross-branch data breach.
- **Steps to Reproduce:** Authenticate as User A (or Branch A officer / Candidate), send `PATCH /api/loans/applications/<UserB_UUID>/status` or `PUT /api/branch-operations/applications/<BranchB_UUID>`, and observe `200 OK` mutation.
- **Recommended Fix:** Resolve the caller's employee profile and `branch` strictly on the server (reject if `!$editorEmp` for branch ops instead of `'Branch Officer'` fallback), enforce `created_by = :uid` / `branch = :caller_branch` in `WHERE` clauses (unless verified `admin`/`hr` with super-permission), and enforce state-machine transition rules on status updates.
- **Suggested Code Changes:**
```php
$stmt = $conn->prepare("DELETE FROM loan_applications WHERE id = :id AND created_by = :uid AND status = 'Draft'");
$stmt->execute([':id' => $id, ':uid' => $user['userId']]);
if ($stmt->rowCount() === 0) { /* return 403/404 */ }
```
- **Verification Method:** Negative authorization tests mutating records owned by another user and another branch verifying `403`/`404` and zero modified rows.
- **Regression Risk:** Medium — legitimate supervisor/admin overrides must explicitly check an authorized supervisor/admin feature flag before bypassing `created_by`/`branch` filters.

---

### Issue ID: SEC-012

- **Issue Title:** Non-Revocable 10-Year JWTs, Stateless Logout No-Op, Plaintext DB OTPs & Unverified `/api/change-password`
- **Severity:** HIGH *(Confirmed)*
- **Category:** Session Management & Authentication Weaknesses (OWASP A07)
- **Affected File:** [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L196-L599)
- **Affected Function/API:** `/api/login`, `/api/auth/otp/verify`, `/api/logout`, `/api/change-password`
- **Exact Code Location:** [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L196-L203), [L404-L411](file:///D:/Downloads/HRMS/backend/public/index.php#L404-L411), [L328-L445](file:///D:/Downloads/HRMS/backend/public/index.php#L328-L445), [L447-L452](file:///D:/Downloads/HRMS/backend/public/index.php#L447-L452), [L562-L599](file:///D:/Downloads/HRMS/backend/public/index.php#L562-L599)
- **Current Implementation:**
  1. When `session_timeout === 'never'`, JWTs are signed with `'exp' => time() + (60 * 60 * 24 * 365 * 10)` (**10 years**).
  2. `/api/logout` is a stateless no-op that performs zero token blocklisting or `token_version` increment.
  3. `/api/change-password` updates a user's password **without verifying the current password or MFA**.
  4. Email login `otp_code` values are persisted in plaintext in PostgreSQL.
- **Problem:** Terminated employees or stolen devices retain valid JWTs for up to 10 years even after clicking Logout or getting password-reset; an attacker with brief unlocked access to a session can silently change the account password without knowing the old password.
- **Root Cause:** Purely stateless JWT minting without session/token-version revocation checks and incomplete credential-change verification.
- **Security/Business Impact:** Persistent post-termination access for ex-employees, inability to terminate compromised sessions, and silent account takeover.
- **Steps to Reproduce:** Log in, capture JWT, invoke `POST /api/logout`, then replay the same JWT against `GET /api/me` (`200 OK`); or call `PUT /api/change-password` supplying only `{ newPassword }` without `currentPassword`.
- **Recommended Fix:** Cap max JWT TTL (`15m`–`8h`) backed by short-lived refresh tokens, add a `token_version` integer column on `users` checked in `AuthMiddleware` and bumped on logout/password-change/termination, require `currentPassword` verification on `/api/change-password`, and store SHA-256/bcrypt hashes of OTPs.
- **Suggested Code Changes:**
```php
if (!password_verify($body['currentPassword'] ?? '', $user['password'])) {
    return jsonError($response, 'Current password is incorrect', 403);
}
```
- **Verification Method:** Replay JWT captured prior to `POST /api/logout` or password change; verify `401 Unauthorized`.
- **Regression Risk:** Low — requires DB `token_version` check (can be cached briefly or combined with user fetch) and frontend refresh-token interceptor handling.

---

### Issue ID: SEC-013

- **Issue Title:** Salary Data Exposure Across HR Feature Boundaries & Unvalidated Assessment Assignment / Server-Side Timer
- **Severity:** HIGH *(Confirmed)*
- **Category:** Excessive Data Exposure / Authorization & Business Logic Bypass (OWASP API3, API5)
- **Affected File:** [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L61), [employee_assessments_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_assessments_routes.php#L155-L593)
- **Affected Function/API:** `GET /api/admin/employees`, `/api/employee/assessments*`
- **Exact Code Location:** [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L61); [employee_assessments_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_assessments_routes.php#L155) (`L155, L184, L348, L377, L544, L593`)
- **Current Implementation:** `GET /api/admin/employees` returns `e.salary` even to callers whose role/feature permission is limited to non-payroll HR duties (e.g., `assets` tracking). Assessment routes (`{id}`, `start`, `save`, `submit`, `result`) do not verify caller membership in `assigned_employee_ids` or validate server-side assessment duration deadlines upon `save`/`submit`.
- **Problem:** Non-payroll staff (e.g., IT asset coordinators) receive executive and coworker compensation data; employees can open unassigned assessments or tamper with client timers to submit late.
- **Root Cause:** Returning full `employees` column projections regardless of caller feature permissions and enforcing assessment eligibility/timing solely on the React UI ([EmployeeAssessmentEngine.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/EmployeeAssessmentEngine.jsx)).
- **Security/Business Impact:** Confidential salary leakage across non-finance staff and integrity compromise of competency/compliance assessments.
- **Steps to Reproduce:** Authenticate as a user with `assets` access only and inspect JSON response of `GET /api/admin/employees`; inspect `salary` field present on all employee rows.
- **Recommended Fix:** Omit `e.salary` unless the caller holds `admin` role or `payroll`/`salary` permission; on assessment endpoints enforce `employeeId = ANY(assigned_employee_ids)` and reject `/save` or `/submit` payloads received past `started_at + duration_minutes + grace`.
- **Suggested Code Changes:**
```php
$selectSalary = $hasPayrollPerm ? 'e.salary,' : 'NULL AS salary,';
```
- **Verification Method:** Query `GET /api/admin/employees` with an `assets`-only token (`salary` omitted/null) and `POST /submit` past assessment deadline (`403`/`400`).
- **Regression Risk:** Low — check UI employee directory views when `salary` is null for non-payroll staff.

---

### Issue ID: SEC-014

- **Issue Title:** Missing Server-Side Attendance Geofence Enforcement & Spoofable `X-Forwarded-For` Rate Limiting
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Security Control Bypass (OWASP API4, A04)
- **Affected File:** [employee_attendance_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_attendance_routes.php#L51-L222), [RateLimiter.php](file:///D:/Downloads/HRMS/backend/src/Utils/RateLimiter.php#L106-L121)
- **Affected Function/API:** `POST /api/employee/attendance/punch`, `RateLimiter::getClientIp`
- **Exact Code Location:** [employee_attendance_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_attendance_routes.php#L51-L222); [RateLimiter.php](file:///D:/Downloads/HRMS/backend/src/Utils/RateLimiter.php#L106-L121)
- **Current Implementation:** Attendance punch acceptance relies on client-side coordinate checks instead of validating Haversine distance against allowed office `geolocations` server-side. `RateLimiter` trusts the user-modifiable `HTTP_X_FORWARDED_FOR` header when keying rate limits.
- **Problem:** Employees can punch in remotely from anywhere by spoofing client requests, and attackers can bypass login/OTP/forgot-password/maps rate limits simply by rotating `X-Forwarded-For` headers on each request.
- **Root Cause:** Assuming reverse-proxy headers are inherently trustworthy and trusting client geofence computations.
- **Security/Business Impact:** Attendance time-fraud and unlimited brute-force / OTP-guessing / password-reset abuse bypassing configured thresholds.
- **Steps to Reproduce:** Send sequential `/api/login` requests varying `X-Forwarded-For: 1.2.3.x` headers — rate limiter resets counter per header value; submit `/api/employee/attendance/punch` with coordinates outside office radius.
- **Recommended Fix:** Key `RateLimiter` primarily on normalized account identity (`email`/`userId`) in addition to the rightmost trusted proxy IP (`REMOTE_ADDR` / Render-verified proxy hop), and verify punch `(lat, lng)` server-side against assigned branch/user `geolocations` radii when geofencing is active.
- **Suggested Code Changes:**
```php
// Key login rate limiter by normalized email + REMOTE_ADDR (or validated Render proxy hop)
$remoteIp = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rateKey = 'login:' . strtolower(trim($email)) . ':' . $remoteIp;
```
- **Verification Method:** Send >5 failed login requests targeting one email with rotating `X-Forwarded-For` values; verify `429 Too Many Requests` triggers as configured.
- **Regression Risk:** Low — check Render proxy headers (`X-Forwarded-For` rightmost non-private hop) if multiple employees share one corporate NAT IP so per-account + IP composite limits don't lock out an office.

---

## 5. API Security Findings

### Issue ID: SEC-015

- **Issue Title:** Arbitrary Unescaped HTML Email Relay (`/api/admin/send-email`) & Queued Plaintext Credentials
- **Severity:** HIGH *(Confirmed)*
- **Category:** Injection / Sensitive Data Exposure in Logs & Queues (OWASP A03, A02)
- **Affected File:** [admin_recruitment_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_recruitment_routes.php#L59-L83), [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L529-L784), [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx#L239-L258), [welcome_email.html](file:///D:/Downloads/HRMS/backend/src/Templates/welcome_email.html#L51-L55), [promotion_letter_email.html](file:///D:/Downloads/HRMS/backend/src/Templates/promotion_letter_email.html#L44-L78)
- **Affected Function/API:** `POST /api/admin/send-email`, `POST /api/employees`, `POST /api/admin/employees/{id}/promote`
- **Exact Code Location:** [admin_recruitment_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_recruitment_routes.php#L59-L83); [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L529) & [L782-L784](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L782-L784); [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx#L239-L258)
- **Current Implementation:** `/api/admin/send-email` accepts arbitrary `to`, `subject`, and raw HTML `body` strings from the client and queues them into `email_queue`. Onboarding inserts plaintext initial passwords (`{{password}}`) into `email_queue` (`admin_employees_routes.php` L529 / `welcome_email.html`), and employee promotions interpolate raw HTML into `promotion_letter_email.html` (`L782-784`).
- **Problem:** Any compromised recruiter/admin session can use `/api/admin/send-email` to phish external targets with arbitrary HTML; anyone with read access to `email_queue` DB rows/backups sees plaintext user passwords; unescaped names/notes allow HTML injection in corporate emails.
- **Root Cause:** Rendering/constructing email HTML on the client and persisting plaintext credentials instead of temporary activation/reset links.
- **Security/Business Impact:** Corporate phishing abuse, database exposure of plaintext initial passwords, and HTML/content spoofing in official HR letters.
- **Steps to Reproduce:** Call `POST /api/admin/send-email` with arbitrary external email and `<a href="https://evil.example">Reset</a>` HTML body; inspect queued `email_queue` rows after onboarding a new employee.
- **Recommended Fix:** Replace `/api/admin/send-email` generic HTML relay with server-rendered strict templates parameterized by application ID and type, HTML-escape all user/DB placeholders via `htmlspecialchars($val, ENT_QUOTES, 'UTF-8')`, and replace plaintext passwords in `welcome_email.html` with a time-limited one-time setup token link.
- **Suggested Code Changes:**
```php
$safeName = htmlspecialchars($employeeName, ENT_QUOTES | ENT_HTML5, 'UTF-8');
```
- **Verification Method:** Supply `<img src=x onerror=alert(1)>` in candidate/promotion fields and verify HTML-escaped output (`&lt;img...`) inside rendered `email_queue` payload.
- **Regression Risk:** Low — requires migrating recruitment status emails from client-side string replacement in `AdminRecruitment.jsx` to backend PHP templates.

---

### Issue ID: SEC-016

- **Issue Title:** Server-Side Google Maps & Geocoding API Keys Disclosed to Browser Clients via API Payloads
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Credentials / Secret Exposure (OWASP API3, A05)
- **Affected File:** [employee_attendance_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_attendance_routes.php#L276-L284), [AdminAttendanceLocation.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminAttendanceLocation.jsx#L95-L110)
- **Affected Function/API:** `GET /api/employee/geofences`, `GET /api/admin/attendance/location/{id}`
- **Exact Code Location:** [employee_attendance_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_attendance_routes.php#L276) & [L284](file:///D:/Downloads/HRMS/backend/public/employee_attendance_routes.php#L284); [AdminAttendanceLocation.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminAttendanceLocation.jsx#L95) & [L110](file:///D:/Downloads/HRMS/frontend/src/pages/AdminAttendanceLocation.jsx#L110)
- **Current Implementation:** Backend endpoints return `GOOGLE_GEOCODING_API_KEY` (`employee_attendance_routes.php` L276/284) and `data.googleMapsApiKey` (`/admin/attendance/location/{id}` consumed at `AdminAttendanceLocation.jsx` L110 `script.src = "...?key=${data.googleMapsApiKey}"`).
- **Problem:** Any authenticated employee/admin inspecting browser DevTools Network responses extracts the project's Google API keys (and server geocoding keys are meant to stay strictly server-side).
- **Root Cause:** Returning raw backend `.env` API keys over JSON API responses instead of proxying Geocoding server-side and isolating an HTTP-referrer-restricted Maps JS browser key.
- **Security/Business Impact:** Google Cloud billing abuse / quota exhaustion if keys lack strict HTTP-referrer or API-specific restrictions (unverified in Google Cloud Console).
- **Steps to Reproduce:** Log in as an employee, inspect `GET /api/employee/geofences` JSON response, and observe plaintext `GOOGLE_GEOCODING_API_KEY`.
- **Recommended Fix:** Never send `GOOGLE_GEOCODING_API_KEY` to browsers — perform reverse geocoding exclusively inside the PHP backend. Use a separate HTTP-referrer-restricted `VITE_GOOGLE_MAPS_JS_KEY` restricted strictly to Maps JavaScript API on production domains.
- **Suggested Code Changes:**
```php
// Remove 'googleGeocodingApiKey' from GET /api/employee/geofences response; proxy geocode server-side.
```
- **Verification Method:** Inspect network payloads of `/api/employee/geofences` and `/api/admin/attendance/location/{id}` ensuring server-side secrets are absent.
- **Regression Risk:** Low — requires updating frontend attendance reverse-geocode calls to hit a backend proxy endpoint.

---

### Issue ID: SEC-017

- **Issue Title:** Unvalidated Direct Browser-to-Storage Uploads & Deletions Bypassing Backend Security Controls
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Unrestricted File Upload / Improper Validation (OWASP API4, A04)
- **Affected File:** [videoCompressor.js](file:///D:/Downloads/HRMS/frontend/src/utils/videoCompressor.js#L247-L248), [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx#L409-L412), [LoanDocumentsSidebar.jsx](file:///D:/Downloads/HRMS/frontend/src/components/forms/LoanDocumentsSidebar.jsx#L130-L230)
- **Affected Function/API:** Direct client Supabase Storage SDK / XHR uploads across 14 components
- **Exact Code Location:** [videoCompressor.js](file:///D:/Downloads/HRMS/frontend/src/utils/videoCompressor.js#L247-L248) (`Authorization: Bearer ${supabaseAnonKey}`); [AdminRecruitment.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminRecruitment.jsx#L409-L412); [LoanDocumentsSidebar.jsx](file:///D:/Downloads/HRMS/frontend/src/components/forms/LoanDocumentsSidebar.jsx#L130-L230)
- **Current Implementation:** File extensions, MIME types, sizes, and overwrite rules (`upsert: true`) are controlled only on the browser, uploaded directly to Supabase buckets using the public `anon` key.
- **Problem:** Attackers can bypass JS checks to upload arbitrary file types (HTML/SVG/executables), oversized payloads exhausting bucket storage, or overwrite existing candidate/loan documents with colliding predictable names.
- **Root Cause:** Offloading uploads directly to Supabase Storage without signed upload URLs minted by an authenticated backend policy check.
- **Security/Business Impact:** Storage abuse, file overwriting/destruction, and potential stored XSS if HTML/SVG files are served inline under storage origins.
- **Steps to Reproduce:** Submit `POST <SUPABASE_URL>/storage/v1/object/<bucket>/<existing-path>` directly with an HTML file using `apikey: <VITE_SUPABASE_ANON_KEY>`.
- **Recommended Fix:** Route uploads through backend endpoints (`multipart/form-data`) or issue backend-authorized single-use signed upload URLs after validating extension/magic-bytes, file size limits, ownership, and CSPRNG UUID target keys.
- **Suggested Code Changes:**
```php
// Validate magic bytes with finfo_file() on backend before storing under CSPRNG UUID filename
$finfo = new finfo(FILEINFO_MIME_TYPE);
if (!in_array($finfo->file($tmpPath), ['application/pdf', 'image/jpeg', 'image/png'], true)) { /* 415 */ }
```
- **Verification Method:** Attempt uploading an `.html` file renamed to `.pdf` or `.jpg` and verify `415 Unsupported Media Type`.
- **Regression Risk:** Medium — progress bars on large training videos (`videoCompressor.js`) can use server-signed upload URLs to retain XHR progress without exposing open buckets.

---

## 6. Database Security Findings

### Issue ID: SEC-018

- **Issue Title:** Emulated Prepares Enabled (`ATTR_EMULATE_PREPARES = true`), Error String Echoing & Request-Time `ALTER TABLE` DDL
- **Severity:** HIGH *(Confirmed)*
- **Category:** Database Security & Privilege Misconfiguration (OWASP A03, A05)
- **Affected File:** [Database.php](file:///D:/Downloads/HRMS/backend/src/Config/Database.php#L26-L30), [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L355)
- **Affected Function/API:** `Database::connect()`, `PUT /api/admin/employees/{id}/settings`
- **Exact Code Location:** [Database.php](file:///D:/Downloads/HRMS/backend/src/Config/Database.php#L26) (`PDO::ATTR_EMULATE_PREPARES = true`), [L30](file:///D:/Downloads/HRMS/backend/src/Config/Database.php#L30); [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L355) (`$conn->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT false');`)
- **Current Implementation:**
  1. `Database.php` sets `PDO::ATTR_EMULATE_PREPARES = true` instead of PostgreSQL native server-side prepared statements, and echoes connection errors on failure.
  2. `admin_employees_routes.php` L355 executes schema-altering DDL (`ALTER TABLE users`) inline during an HTTP API request, implying the runtime application DB credentials hold table ownership/DDL privileges.
- **Problem:** Emulated prepares weaken defense-in-depth type separation in PostgreSQL drivers, DB failure outputs leak internal host/port/driver details, and running DDL on an API path signals over-privileged runtime DB credentials (violating least privilege) while also acquiring `ACCESS EXCLUSIVE` locks on `users`.
- **Root Cause:** Convenience auto-migration snippet left in controller code and default PDO emulation flag.
- **Security/Business Impact:** Over-privileged DB connection compromises entire schema integrity if any query flaw occurs; DB error messages reveal infrastructure topology; `ALTER TABLE` risks table lock contention under load.
- **Steps to Reproduce:** Inspect `Database.php` L26-30 and `admin_employees_routes.php` L355; trigger a DB outage/bad host to observe echoed connection error message.
- **Recommended Fix:** Set `PDO::ATTR_EMULATE_PREPARES => false`, replace echoed DB errors with generic `500` responses + structured server error logging, move all DDL into versioned migrations ([supabase/migrations/](file:///D:/Downloads/HRMS/supabase/migrations)), and configure a least-privilege application DB role without `ALTER`/`DROP`/`CREATE` privileges.
- **Suggested Code Changes:**
```php
// Database.php
PDO::ATTR_EMULATE_PREPARES => false,
PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
```
- **Verification Method:** Query `SELECT current_user, rolsuper FROM pg_roles WHERE rolname = current_user;` in staging DB confirming non-superuser least-privilege role, and grep codebase verifying zero DDL (`ALTER`/`CREATE`/`DROP`) inside `backend/public/`.
- **Regression Risk:** Low — verify any legacy PDO named-parameter reuse across a single query (`:uid` appearing twice) works under native PostgreSQL prepares (rewrite duplicate named placeholders to unique names like `:uid1`, `:uid2` if needed).

---

### Issue ID: SEC-019

- **Issue Title:** Weak PRNG (`uniqid()`), Missing DB Row Isolation & Unverified Live Constraint/Cascade Coverage
- **Severity:** MEDIUM *(Confirmed for `uniqid()` / Partial Unverified for Live PG Constraints)*
- **Category:** Database Integrity & Weak Randomness (OWASP A02, A04)
- **Affected File:** [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L504), [backend/scripts/](file:///D:/Downloads/HRMS/backend/scripts), [supabase/migrations/](file:///D:/Downloads/HRMS/supabase/migrations)
- **Affected Function/API:** `POST /api/employees` (`uniqid()`), live PostgreSQL tables
- **Exact Code Location:** [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L504) (`uniqid()`); schema coverage inferred partially from `backend/scripts/migrate_*.php` and `supabase/migrations/20260904_update_daily_attendance_master_shift_hours.sql`.
- **Current Implementation:** Uses non-cryptographic microsecond-based `uniqid()` in `admin_employees_routes.php` L504. Meanwhile, authoritative DDL for core tables (`users`, `employees`, `payrolls`, `attendance`, `leaves`, `audit_logs`) is absent from repo migrations (created out-of-band in Supabase), so live foreign keys, `NOT NULL`, `UNIQUE`, and `ON DELETE CASCADE` definitions cannot be fully verified statically.
- **Problem:** `uniqid()` output is predictable from server timestamp; missing versioned baseline SQL DDL prevents reproducible audits, staging Parity, and constraint verification against cascading employee/loan deletions.
- **Root Cause:** Out-of-band schema creation directly in Supabase Studio without schema dump or declarative migration baseline in version control.
- **Security/Business Impact:** Predictable identifiers/tokens if `uniqid()` feeds passwords/links/IDs, plus unverified risk of orphaned payroll/audit records or accidental cascade deletion of financial history.
- **Steps to Reproduce:** Inspect `admin_employees_routes.php` L504; search repo for `CREATE TABLE public.employees` / `CREATE TABLE public.payrolls` (absent from codebase).
- **Recommended Fix:** Replace `uniqid()` with `bin2hex(random_bytes(16))` (or UUIDv4 via CSPRNG), and export a schema-only `pg_dump --schema-only` baseline migration into `supabase/migrations/` to audit and enforce `FOREIGN KEY`, `UNIQUE`, `NOT NULL`, and `ON DELETE RESTRICT` on audit/payroll/loan tables.
- **Suggested Code Changes:**
```php
$randomId = sprintf('%s%s-%s-%s-%s-%s%s%s', ...str_split(bin2hex(random_bytes(16)), 4));
```
- **Verification Method:** Check baseline DDL in staging via `pg_dump --schema-only` for foreign keys and `ON DELETE RESTRICT` on financial tables (`payrolls`, `loan_applications`, `audit_logs`). *Currently live DB constraints remain **Unverified** due to lack of local `psql` / production access.*
- **Regression Risk:** Low.

---

## 7. Frontend Security Findings

### Issue ID: SEC-020

- **Issue Title:** Hardcoded Maintenance Bypass Password (`AcmeDev@2026`) Embedded in Public Client Bundle
- **Severity:** CRITICAL *(Confirmed)*
- **Category:** Hardcoded Credentials / Security Bypass (OWASP A07)
- **Affected File:** [MaintenanceOverlay.jsx](file:///D:/Downloads/HRMS/frontend/src/components/MaintenanceOverlay.jsx#L33-L34)
- **Affected Function/API:** `MaintenanceOverlay` developer unlock handler
- **Exact Code Location:** [MaintenanceOverlay.jsx](file:///D:/Downloads/HRMS/frontend/src/components/MaintenanceOverlay.jsx#L33-L34) (`if (password.trim() === 'AcmeDev@2026') { localStorage.setItem('dev_bypass_maintenance_session', 'true'); ... }`)
- **Current Implementation:** Compares user input directly in browser JavaScript against the literal string `'AcmeDev@2026'` and enables bypass state in `localStorage`.
- **Problem:** Anyone downloading the public SPA JS bundle ([index-BrpM0sAI.js](file:///D:/Downloads/HRMS/frontend/dist/assets/index-BrpM0sAI.js)) or setting `localStorage.setItem('dev_bypass_maintenance_session', 'true')` bypasses maintenance lockouts instantly.
- **Root Cause:** Client-side hardcoded secret instead of server-verified role/bypass validation.
- **Security/Business Impact:** Exposure of static secret in production JS, unauthorized access during active database migrations/maintenance windows (risking partial writes/corruption).
- **Steps to Reproduce:** Open browser DevTools on any HRMS page, run `localStorage.setItem('dev_bypass_maintenance_session', 'true')` (or enter `'AcmeDev@2026'` when maintenance overlay appears), and reload.
- **Recommended Fix:** Remove the hardcoded client secret and `localStorage` flag entirely; enforce maintenance mode at the PHP/Slim middleware level (allowing only authenticated `admin` tokens or backend-verified one-time bypass tokens).
- **Suggested Code Changes:**
```jsx
// Remove hardcoded password check in MaintenanceOverlay.jsx and check authenticated role from /api/me
```
- **Verification Method:** Search built `frontend/dist/assets/*.js` verifying zero occurrences of `AcmeDev` and confirm maintenance-mode API requests from non-admin tokens return `503 Service Unavailable` from PHP backend.
- **Regression Risk:** Low.

---

### Issue ID: SEC-021

- **Issue Title:** JWT Session Tokens & 24-Hour Cached Sensitive Data Persisted in `localStorage` + `80` `console.*` Browser Calls
- **Severity:** HIGH *(Confirmed)*
- **Category:** Insecure Client Storage / Sensitive Data Exposure (OWASP A02, A04)
- **Affected File:** [axios.js](file:///D:/Downloads/HRMS/frontend/src/api/axios.js#L37), [AuthContext.jsx](file:///D:/Downloads/HRMS/frontend/src/contexts/AuthContext.jsx#L105-L130), [App.jsx](file:///D:/Downloads/HRMS/frontend/src/App.jsx#L111-L126), [phoneUtils.js](file:///D:/Downloads/HRMS/frontend/src/utils/phoneUtils.js#L8-L49)
- **Affected Function/API:** Auth storage & TanStack Query persistence (`createSyncStoragePersister`)
- **Exact Code Location:**
  - JWT persistence: [axios.js](file:///D:/Downloads/HRMS/frontend/src/api/axios.js#L37), [AuthContext.jsx](file:///D:/Downloads/HRMS/frontend/src/contexts/AuthContext.jsx#L105) (`L105, L115, L130`); repo-wide scan found `24` `localStorage.` and `19` `sessionStorage.` references.
  - Cache persistence: [App.jsx](file:///D:/Downloads/HRMS/frontend/src/App.jsx#L111-L126) (`createSyncStoragePersister({ storage: window.localStorage })`, `gcTime: 24h`)
  - Console logs: `80` `console.log`/`warn`/`error` calls across `frontend/src/`.
- **Current Implementation:** Bearer JWTs live in `localStorage`, and `App.jsx` persists **every TanStack Query response** (employee rosters, salaries, payslips, loan applicant KYC/bank fields, audit logs) into unencrypted `localStorage` for 24 hours, even though `phoneUtils.js` masks PII visually in React components.
- **Problem:** Any XSS payload (`SEC-022`), malicious browser extension, or shared workstation retains full readable JSON dumps of HR/financial data and 10-year session JWTs for 24h+ even after browser tabs close.
- **Root Cause:** Using `localStorage` JWT storage instead of `HttpOnly; Secure; SameSite=Lax/Strict` cookies, paired with global unbounded TanStack Query disk persistence.
- **Security/Business Impact:** Shared-terminal PII/payroll breach and trivial session theft via any DOM XSS.
- **Steps to Reproduce:** Log in as HR Admin, visit Payroll/Employees/Loans, then inspect `Application -> Local Storage -> TANSTACK_QUERY_OFFLINE_CACHE` and `token` in Chrome DevTools.
- **Recommended Fix:** Move session JWTs to `HttpOnly; Secure; SameSite=Strict` cookies (with CSRF token protection or custom header), disable `createSyncStoragePersister` on sensitive/PII routes (or remove entirely for web), clear caches thoroughly on logout, and strip sensitive `console.*` logs in production Vite builds (`esbuild.drop: ['console', 'debugger']`).
- **Suggested Code Changes:**
```js
// App.jsx: remove createSyncStoragePersister for sensitive web portals, or restrict shouldDehydrateQuery
dehydrateOptions: {
  shouldDehydrateQuery: (q) => ['public', 'holidays', 'branches'].includes(q.queryKey[0])
}
```
- **Verification Method:** After logout and during active admin sessions, verify `localStorage` contains zero JWTs and zero employee salary/loan/PII query entries.
- **Regression Risk:** Medium — migrating web auth from `localStorage` Bearer headers to `HttpOnly` cookies requires Capacitor mobile handling (`capacitor.config.json`) or dedicated native token flow (`EncryptedSharedPreferences`).

---

### Issue ID: SEC-022

- **Issue Title:** Stored DOM XSS in Google Maps `InfoWindow` (`AdminAttendanceLocation.jsx`) & 13 `dangerouslySetInnerHTML` Email Previews
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Cross-Site Scripting (OWASP A03)
- **Affected File:** [AdminAttendanceLocation.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminAttendanceLocation.jsx#L70-L92), [emailTemplates/*.jsx](file:///D:/Downloads/HRMS/frontend/src/components/emailTemplates) (`13` files)
- **Affected Function/API:** `showPhotoInfo()`, email template preview components
- **Exact Code Location:** [AdminAttendanceLocation.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminAttendanceLocation.jsx#L70-L92); `dangerouslySetInnerHTML` verified in 13 files under `components/emailTemplates/` (`PromotionEmailTemplate.jsx:139`, `LeaveEmailTemplate.jsx:14`, `CandidateOfferEmailTemplate.jsx:15`, etc.).
- **Current Implementation:** `showPhotoInfo()` builds raw HTML template strings interpolating `photoUrl` and `address` directly into `infoWindow.setContent(content)`. Likewise, 13 email preview templates render HTML strings via `dangerouslySetInnerHTML`.
- **Problem:** If `address` (returned via geocoding/API or user-submitted attendance data) or `photoUrl` contains `<img src=x onerror=...>`, opening an employee's map pin executes arbitrary JavaScript in an **Admin's browser**, compromising admin sessions and `localStorage` tokens/data ([SEC-021](#issue-id-sec-021)).
- **Root Cause:** Building DOM strings via template concatenation instead of DOM nodes/`textContent` or sanitization.
- **Security/Business Impact:** Stored XSS targeting HR Administrators during attendance audits, enabling privilege escalation and data exfiltration.
- **Steps to Reproduce:** Store an attendance punch or geocoded `address` payload containing `<img src=x onerror="alert(document.domain)">` and open `/admin/attendance/location?id=<id>` as an Admin clicking the marker.
- **Recommended Fix:** Construct `infoWindow.setContent(domElement)` using `document.createElement()` + `.textContent` and URL scheme validation (`/^https?:\/\//i`); sanitize/escape values inside React email preview templates or convert previews to native JSX.
- **Suggested Code Changes:**
```js
const addrSpan = document.createElement('span');
addrSpan.textContent = address || 'Not available';
```
- **Verification Method:** Test attendance location render with `<script>`/`<img onerror=...>` strings in `address`/`photoUrl` verifying literal inert text rendering and zero script execution.
- **Regression Risk:** Low.

---

### Issue ID: SEC-023

- **Issue Title:** Known Vulnerable Frontend npm Packages (`npm audit`: 4 High, 1 Moderate)
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Vulnerable and Outdated Components (OWASP A06)
- **Affected File:** [package.json](file:///D:/Downloads/HRMS/frontend/package.json), [package-lock.json](file:///D:/Downloads/HRMS/frontend/package-lock.json)
- **Affected Function/API:** `axios` (`1.17.0`), `react-router-dom` (`7.17.0`), transitive `react-router`, `follow-redirects`, `form-data`
- **Exact Code Location:** Verified via `npm.cmd audit --json` in `D:\Downloads\HRMS\frontend`: `{"info":0,"low":0,"moderate":1,"high":4,"critical":0,"total":5}`.
- **Current Implementation:** Bundled dependencies carry High advisories across `axios` (`1.0.0 - 1.19.0`, including prototype pollution gadgets, ReDoS, `maxBodyLength`/redirect SSRF advisories), `react-router` (`6.0.0 - 7.18.1`, backslash open-redirect CVE-2025-68470 bypass & route-matching DoS), `follow-redirects`, and `form-data` (CRLF injection). (Composer reported `0` advisories; `dist/` contains zero `.map` sourcemaps.)
- **Problem:** Public client SPA ships packages with known open-redirect and prototype-pollution/DoS advisories.
- **Root Cause:** Infrequent lockfile dependency patching and absence of automated dependency checks in CI.
- **Security/Business Impact:** Increases exposure to client-side open-redirect / ReDoS / multipart injection defects.
- **Steps to Reproduce:** Run `npm.cmd audit` inside `D:\Downloads\HRMS\frontend`.
- **Recommended Fix:** Upgrade `axios` and `react-router-dom` (`npm audit fix`) to patched releases and enforce `npm audit --audit-level=high` + `composer audit` in CI.
- **Suggested Code Changes:**
```powershell
npm update axios react-router-dom
npm audit
```
- **Verification Method:** Re-run `npm.cmd audit` and confirm `0` high/critical vulnerabilities.
- **Regression Risk:** Low for minor/patch upgrades; test multipart uploads and router navigation after upgrade.


---

## 8. Backend Security Findings

*(Negative Security Check: Static pattern scans across [backend/src/](file:///D:/Downloads/HRMS/backend/src) and [backend/public/](file:///D:/Downloads/HRMS/backend/public) verified zero usage of `eval()`, `shell_exec()`, `system()`, `passthru()`, `proc_open()`, `popen()`, `unserialize()`, `extract()`, dynamic PHP `include($var)`, or PHP `session_start()`.)*

### Issue ID: SEC-024

- **Issue Title:** Production Debug Error Stack Traces (`addErrorMiddleware(true, true, true)`) & Verbose JWT / DB Diagnostics
- **Severity:** HIGH *(Confirmed)*
- **Category:** Security Misconfiguration / Information Disclosure (OWASP A05)
- **Affected File:** [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L30), [AuthMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L46), [Database.php](file:///D:/Downloads/HRMS/backend/src/Config/Database.php#L30)
- **Affected Function/API:** Global Slim error middleware, `AuthMiddleware::__invoke()`, `Database::connect()`
- **Exact Code Location:** [index.php](file:///D:/Downloads/HRMS/backend/public/index.php#L30) (`$app->addErrorMiddleware(true, true, true);`); [AuthMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/AuthMiddleware.php#L46) (`"Invalid or expired token: " . $e->getMessage() . " (Secret empty? " . (empty($secret) ? 'yes' : 'no') . ")"`); [Database.php](file:///D:/Downloads/HRMS/backend/src/Config/Database.php#L30)
- **Current Implementation:** Slim enables `displayErrorDetails = true` unconditionally regardless of `APP_ENV`, `AuthMiddleware` returns internal JWT library exception text plus whether `JWT_SECRET` is empty, and `Database.php` echoes raw PDO connection error details.
- **Problem:** Any unhandled exception (such as runtime `::uuid` cast failures in `PERF-007`) renders file paths, SQL snippets, driver states, and stack traces in HTTP error responses; malformed bearer tokens reveal backend JWT secret initialization state (`Secret empty? yes/no`).
- **Root Cause:** Local debugging flags hardcoded directly in production container entrypoint files.
- **Security/Business Impact:** Reconnaisance aid exposing database table names, filesystem layout, dependency versions, and misconfigured secrets during outages.
- **Steps to Reproduce:** Send an invalid malformed bearer header `Authorization: Bearer bad.token` to any protected endpoint or trigger a PHP exception (e.g., invalid UUID parameter in branch-ops/activities endpoints).
- **Recommended Fix:** Set `$displayErrorDetails = ($_ENV['APP_ENV'] ?? 'production') === 'development';` (defaulting to `false`), return generic `"Unauthorized"` / `"Internal server error"` payloads with a correlation ID, and log exception details solely to server `stderr`.
- **Suggested Code Changes:**
```php
$isDev = ($_ENV['APP_ENV'] ?? 'production') === 'development';
$app->addErrorMiddleware($isDev, true, true);
// AuthMiddleware.php:
return $this->unauthorizedResponse('Invalid or expired token');
```
- **Verification Method:** Send invalid token and invalid route UUID against API and inspect JSON/HTML responses confirming zero stack traces, file paths, or `Secret empty?` hints.
- **Regression Risk:** Low — check Render server logs (`stderr`) continue receiving structured PHP error logs (`logErrors: true`).

---

## 9. Performance Audit Findings

| ID | Title | Severity | Layer | Status |
| --- | --- | --- | --- | --- |
| `PERF-001` | Monolithic `4.62 MB` JS Bundle + `1.83 MB` `logo.png` (No Code Splitting) | HIGH | Frontend | Confirmed |
| `PERF-002` | Tripled `68.97 MB` APK Inside `dist/` & Re-Embedded Inside APK Itself | HIGH | Build / Mobile | Confirmed |
| `PERF-003` | `refetchOnMount: 'always'` + Unbounded Synchronous `localStorage` Persister | HIGH | Frontend Cache | Confirmed |
| `PERF-004` | Hardcoded `1,200 ms` Login Delay, 5s Supabase Polling & SW Unregister Loop | MEDIUM | Frontend UX | Confirmed |
| `PERF-005` | Unbounded Android `WakeLock` & Continuous 30s Dual GPS/Network Polling | MEDIUM | Android Native | Confirmed |
| `PERF-006` | `63` Wildcard `SELECT *`/`alias.*` Queries, Blocking AI Calls & Runtime DDL | HIGH | Backend / API | Confirmed |
| `PERF-007` | Sparse Explicit Indexing (`15` Indexes) & Index-Bypassing `::uuid` Casts | HIGH | Database | Confirmed (Live `EXPLAIN` Unverified) |
| `PERF-008` | Single Apache Worker Model Without PgBouncer, Prepared Cache or Shared Cache | MEDIUM | Infra / DB | Confirmed |

---

### Issue ID: PERF-001

- **Issue Title:** Monolithic `4,731.3 KB` (`4.62 MB`) Frontend JS Bundle Without Route-Based Code Splitting + `1,877.8 KB` (`1.83 MB`) `logo.png`
- **Severity:** HIGH *(Confirmed)*
- **Category:** Frontend Bundle Size & Initial Load Performance
- **Affected File:** [App.jsx](file:///D:/Downloads/HRMS/frontend/src/App.jsx#L1-L108), [frontend/dist/assets/index-BrpM0sAI.js](file:///D:/Downloads/HRMS/frontend/dist/assets), [frontend/dist/logo.png](file:///D:/Downloads/HRMS/frontend/dist/logo.png)
- **Affected Function/API:** SPA route registration and static branding asset delivery
- **Exact Code Location:** [App.jsx](file:///D:/Downloads/HRMS/frontend/src/App.jsx#L1-L108) (static synchronous ES imports of all pages/modules); measured build output: `index-BrpM0sAI.js` = `4,844,839 bytes` (`4,731.3 KB`), `index-DPm_u7qw.css` = `141,133 bytes` (`137.8 KB`), `logo.png` = `1,922,833 bytes` (`1,877.8 KB`).
- **Current Implementation:** All admin, candidate, employee, PDF renderer (`@react-pdf/renderer`), Recharts charting, org-chart, webcam, WebGL fluid (`webgl-fluid`), and loan form pages are eagerly imported into a single ~4.84 MB JS chunk, alongside an ~1.92 MB uncompressed PNG logo.
- **Problem:** A candidate opening `/login` or `/jobs` on mobile data downloads nearly ~6.8 MB of uncompressed/non-split JavaScript, CSS, and logo assets before first interactive render, causing severe parse/compile CPU stalls on mid-tier Android devices.
- **Root Cause:** Synchronous top-level imports across 115 page components in `App.jsx` and missing asset optimization / Vite `manualChunks`.
- **Security/Business Impact:** Slow First Contentful Paint / Time-to-Interactive, high mobile bounce rates on candidate portal, and inflated Render bandwidth egress.
- **Steps to Reproduce:** Inspect `D:\Downloads\HRMS\frontend\dist\assets` and `D:\Downloads\HRMS\frontend\dist\logo.png` sizes after `npm run build`.
- **Recommended Fix:** Convert route pages in `App.jsx` to `React.lazy(() => import(...))` + `<Suspense fallback={<PageLoader />}>`, configure `build.rollupOptions.output.manualChunks` in [vite.config.js](file:///D:/Downloads/HRMS/frontend/vite.config.js) to split heavy libraries (`@react-pdf/renderer`, `recharts`, `framer-motion`), and compress `logo.png` to WebP/optimized PNG (< 50 KB).
- **Suggested Code Changes:**
```jsx
const AdminPayroll = React.lazy(() => import('./pages/AdminPayroll'));
const AdminRecruitment = React.lazy(() => import('./pages/AdminRecruitment'));
```
- **Verification Method:** Run `npm.cmd run build` and verify initial entry chunk drops below ~300–500 KB and `logo.png`/WebP < 50 KB.
- **Regression Risk:** Low — wrap lazy routes in `<Suspense>` and an ErrorBoundary to handle chunk load retries after deployments.

---

### Issue ID: PERF-002

- **Issue Title:** `68.97 MB` Android APK (`Acme HRMS.apk`) Committed to Git, Copied into `dist/`, and Re-Embedded Inside Itself
- **Severity:** HIGH *(Confirmed)*
- **Category:** Build Bloat / Mobile App Size & Storage Waste
- **Affected File:** [Acme HRMS.apk](file:///D:/Downloads/HRMS/frontend/public/downloads/Acme%20HRMS.apk), [.gitignore](file:///D:/Downloads/HRMS/.gitignore#L12-L13), [vite.config.js](file:///D:/Downloads/HRMS/frontend/vite.config.js)
- **Affected Function/API:** `vite build` public asset copy + `npx cap sync android`
- **Exact Code Location:** Identical `72,322,989`-byte (`70,627.9 KB`) APK verified at three paths: `frontend/public/downloads/Acme HRMS.apk`, `frontend/dist/downloads/Acme HRMS.apk`, and `frontend/android/app/src/main/assets/public/downloads/Acme HRMS.apk`. Explicitly exempted from ignore in [.gitignore](file:///D:/Downloads/HRMS/.gitignore#L13) (`!frontend/public/downloads/*.apk`).
- **Current Implementation:** Placing the compiled APK inside `frontend/public/downloads/` causes Vite to copy the entire 72.3 MB APK into `frontend/dist/downloads/`, which Capacitor `cap sync android` then copies directly into `android/app/src/main/assets/public/downloads/`, recursively doubling the APK payload.
- **Problem:** Inflates Git history, Docker web image size (copied into Apache `/var/www/html/public/`), and mobile APK download sizes by ~72 MB per build.
- **Root Cause:** Hosting binary release artifacts inside Vite's `public/` directory instead of external object storage / GitHub Releases.
- **Security/Business Impact:** Bloated Docker builds/deploys on Render, wasted mobile user data, and broken recursive APK packaging.
- **Steps to Reproduce:** Inspect byte lengths of the three APK paths and run `git ls-files | grep apk`.
- **Recommended Fix:** Remove `frontend/public/downloads/Acme HRMS.apk` from Git (`!frontend/public/downloads/*.apk`) and serve APK downloads from Supabase Storage / GitHub Releases CDN outside `frontend/public/`.
- **Suggested Code Changes:**
```gitignore
# Remove "!frontend/public/downloads/*.apk" from .gitignore
```
- **Verification Method:** Run `npm.cmd run cap:sync` and confirm `frontend/dist/downloads/` and `android/app/src/main/assets/public/downloads/` do not contain `.apk` files.
- **Regression Risk:** Low — update download button links in frontend UI to point to the hosted release URL.

---

### Issue ID: PERF-003

- **Issue Title:** TanStack Query `refetchOnMount: 'always'` Negates Caching While Synchronous `localStorage` Persister Blocks Main Thread
- **Severity:** HIGH *(Confirmed)*
- **Category:** Client State & Rendering Performance
- **Affected File:** [App.jsx](file:///D:/Downloads/HRMS/frontend/src/App.jsx#L111-L126)
- **Affected Function/API:** Global `QueryClient` + `PersistQueryClientProvider`
- **Exact Code Location:** [App.jsx](file:///D:/Downloads/HRMS/frontend/src/App.jsx#L111-L126)
- **Current Implementation:** Configures `createSyncStoragePersister({ storage: window.localStorage })` (`gcTime: 24h`) alongside `refetchOnMount: 'always'`.
- **Problem:** Every route navigation or component remount forces fresh network API calls (`refetchOnMount: 'always'`) even when data is fresh (`staleTime` ignored), immediately followed by synchronous `JSON.stringify` + `localStorage.setItem` blocking the JS main thread on large employee/payroll datasets (capped at 5 MB browser `localStorage` quota, risking `QuotaExceededError`).
- **Root Cause:** Conflicting cache policies meant to ensure fresh HR views while keeping offline persistence enabled.
- **Security/Business Impact:** Redundant backend API storms on navigation, UI jank from synchronous `localStorage` serialization, `QuotaExceededError` crashes, plus severe PII exposure ([SEC-021](#issue-id-sec-021)).
- **Steps to Reproduce:** Navigate back and forth between Dashboard, Employees, and Attendance while watching Chrome DevTools Network & Performance tabs.
- **Recommended Fix:** Remove `createSyncStoragePersister` (or move purely non-sensitive config caches to async IndexedDB via `idb`, already in `package.json`), set `refetchOnMount: true` (respecting `staleTime`, e.g., `60_000` ms) with explicit invalidation on mutations.
- **Suggested Code Changes:**
```js
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000, refetchOnMount: true, retry: 1 } }
});
```
- **Verification Method:** Navigate between cached tabs within `60s` and observe zero redundant `GET /api/*` requests and zero synchronous `localStorage` writes.
- **Regression Risk:** Low — ensure all mutations call `queryClient.invalidateQueries` for affected keys cleanly.

---

### Issue ID: PERF-004

- **Issue Title:** Artificial `1,200 ms` Login Delay, Aggressive 5s Polling in `AdminLayout`, & Conflicting Service Worker Registration
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Frontend Latency & Unnecessary Background Network Traffic
- **Affected File:** [AuthContext.jsx](file:///D:/Downloads/HRMS/frontend/src/contexts/AuthContext.jsx#L81), [AdminLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/AdminLayout.jsx#L37-L40), [main.jsx](file:///D:/Downloads/HRMS/frontend/src/main.jsx#L6-L12), [index.html](file:///D:/Downloads/HRMS/frontend/index.html#L62-L72)
- **Affected Function/API:** Auth bootstrap delay, admin badge polling, PWA Service Worker lifecycle
- **Exact Code Location:** [AuthContext.jsx](file:///D:/Downloads/HRMS/frontend/src/contexts/AuthContext.jsx#L81) (`minDelay = 1200`), [AdminLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/AdminLayout.jsx#L37-L40) (`candidate_documents` queried every 5s), [main.jsx](file:///D:/Downloads/HRMS/frontend/src/main.jsx#L6-L12) vs [index.html](file:///D:/Downloads/HRMS/frontend/index.html#L62-L72)
- **Current Implementation:** `AuthContext` enforces an artificial 1.2s splash delay on startup; `AdminLayout` polls Supabase `candidate_documents` every 5 seconds continuously while open; `index.html` registers `/service-worker.js` while `main.jsx` immediately runs code unregistering service workers.
- **Problem:** Adds fixed 1.2s wait to every cold launch, generates continuous 5s polling load per idle admin browser tab (12 req/min × active admins), and causes Service Worker install/unregister churn on page loads.
- **Root Cause:** Splash-animation pacing coupled into auth resolution and conflicting PWA legacy cleanup in `main.jsx`.
- **Security/Business Impact:** Degraded perceived load performance and unnecessary DB/Supabase quota pressure at 100–1,000 concurrent admins.
- **Steps to Reproduce:** Load app with Network tab open and observe >=1.2s loading state, 5-second `candidate_documents` polling intervals in Admin portal, and `serviceWorker` registration/unregistration logs.
- **Recommended Fix:** Remove artificial `minDelay` in `AuthContext`, increase polling interval (`60s` + `refetchIntervalInBackground: false`) or use Supabase Realtime/backend SSE, and unify Service Worker intent (remove registration in `index.html` if intentionally disabled, or remove unregistration in `main.jsx`).
- **Suggested Code Changes:**
```js
// AdminLayout.jsx: poll at 60s instead of 5s and pause when tab is hidden
refetchInterval: 60000,
refetchIntervalInBackground: false,
```
- **Verification Method:** Measure startup TTFP without `minDelay` and verify polling stops when browser tab loses focus.
- **Regression Risk:** Low.

---

### Issue ID: PERF-005

- **Issue Title:** Android Native Unbounded `WakeLock` & Continuous 30-Second Dual-Provider High-Accuracy GPS Polling
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Mobile Resource & Battery Exhaustion
- **Affected File:** [LocationTrackerService.java](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java#L122-L275)
- **Affected Function/API:** `LocationTrackerService` background foreground-service loop
- **Exact Code Location:** [LocationTrackerService.java](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java#L122) (unbounded `wakeLock.acquire()`) & [L269-L275](file:///D:/Downloads/HRMS/frontend/android/app/src/main/java/com/example/acmehrms/LocationTrackerService.java#L269-L275) (30s `GPS_PROVIDER` + `NETWORK_PROVIDER` updates with `minDistance=0`)
- **Current Implementation:** Acquires a partial CPU `WakeLock` with no timeout (`wakeLock.acquire()`) and registers dual location listeners (`GPS_PROVIDER` and `NETWORK_PROVIDER`) firing every 30 seconds with `minDistance = 0` meters—even when `tracking_interval_minutes` in [AdminSettings.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminSettings.jsx#L240-L252) defaults to 15 minutes!
- **Problem:** Prevents Android CPU deep-sleep for an entire shift and wakes GPS/Network radios every 30 seconds even for stationary office workers.
- **Root Cause:** Aggressive provider intervals and un-timeouted `WakeLock` intended to prevent Doze throttling.
- **Security/Business Impact:** Rapid battery drain leading field staff to force-stop or disable permissions, plus excess mobile telemetry/HTTP traffic.
- **Steps to Reproduce:** Inspect `LocationTrackerService.java` L122 & L269-275 and monitor Battery Historian / `adb shell dumpsys power` during an 8-hour shift.
- **Recommended Fix:** Use Google Play Services `FusedLocationProviderClient` aligned with `tracking_interval_minutes` + nonzero distance displacement (`minDistanceMeters`), or acquire bounded per-upload `WakeLock` (`wakeLock.acquire(10_000L)`) released in `finally`.
- **Suggested Code Changes:**
```java
// Acquire bounded WakeLock only during HTTP sync
wakeLock.acquire(15_000L);
```
- **Verification Method:** Run Android Studio Energy Profiler / `dumpsys batterystats` over a 1-hour background test verifying deep-sleep CPU residency and reduced wakeups.
- **Regression Risk:** Low/Medium — verify Android 12–16 foreground service location delivery respects configured interval.

---

### Issue ID: PERF-006

- **Issue Title:** `63` Wildcard `SELECT *`/`alias.*` Queries, Heavy Synchronous Chatbot Queries & Runtime DDL Overhead
- **Severity:** HIGH *(Confirmed)*
- **Category:** Backend & Payload Performance (OWASP API4)
- **Affected File:** [backend/public/](file:///D:/Downloads/HRMS/backend/public) (`63` wildcard matches), [admin_chatbot_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_chatbot_routes.php), [employee_chatbot_routes.php](file:///D:/Downloads/HRMS/backend/public/employee_chatbot_routes.php), [admin_employees_routes.php](file:///D:/Downloads/HRMS/backend/public/admin_employees_routes.php#L355)
- **Affected Function/API:** Chatbot query handlers, list/report endpoints, employee settings handler
- **Exact Code Location:** Pattern scan verified `63` `SELECT *` / `alias.*` queries across `backend/src` & `backend/public`; `admin_employees_routes.php` L355 executes `ALTER TABLE` during requests; chatbot routes execute multi-module queries and block PHP worker threads on synchronous Gemini cURL requests (with Gzip buffering in [GzipMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/GzipMiddleware.php) holding response bodies in memory).
- **Problem:** Wildcard column fetches over-transfer unused JSON/BLOB/large text fields from Supabase PostgreSQL to Apache/PHP (`63` query sites), unpaginated endpoints return growing full tables (`applications`, `employees`, `loan_applications`), and blocking synchronous cURL/SQL operations tie up Apache `prefork`/`mod_php` workers.
- **Root Cause:** Lack of repository DTO projections, mandatory pagination caps, and async worker queues.
- **Security/Business Impact:** Elevated response latencies, high DB-to-App egress latency (remote Supabase Postgres), and PHP worker pool saturation under concurrent requests.
- **Steps to Reproduce:** Inspect query counts via `LoggingPDO` / [PerformanceLoggingMiddleware.php](file:///D:/Downloads/HRMS/backend/src/Middleware/PerformanceLoggingMiddleware.php) and grep `SELECT *` / `alias.*` across `backend/public/`.
- **Recommended Fix:** Replace all `63` wildcard `SELECT` statements with explicit column lists, enforce default pagination (`LIMIT <= 100` capped server-side) on every list/report endpoint, remove runtime DDL (`L355`), and add strict HTTP `CURLOPT_TIMEOUT` / intent-routed partial DB context in chatbot endpoints.
- **Suggested Code Changes:**
```php
$limit = min(100, max(1, (int)($params['limit'] ?? 25)));
$offset = max(0, ((int)($params['page'] ?? 1) - 1) * $limit);
```
- **Verification Method:** Profile API payload sizes and DB round-trips with `PerformanceLoggingMiddleware` before and after projection/pagination fixes.
- **Regression Risk:** Low — check UI components for any unexpected fields removed by explicit projections.

---

### Issue ID: PERF-007

- **Issue Title:** Sparse Explicit Indexing (`15` Repo Indexes) & Unsafe Type Casts (`::uuid`) Causing Sequential Scans and Cast Crashes
- **Severity:** HIGH *(Confirmed as Architectural Defect / Live `EXPLAIN ANALYZE` Unverified)*
- **Category:** PostgreSQL Schema & Query Optimization
- **Affected File:** [origination_activities_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_activities_routes.php), [branch_operations_dashboard_routes.php](file:///D:/Downloads/HRMS/backend/public/branch_operations_dashboard_routes.php), [branch_operations_application_routes.php](file:///D:/Downloads/HRMS/backend/public/branch_operations_application_routes.php), [backend/scripts/](file:///D:/Downloads/HRMS/backend/scripts)
- **Affected Function/API:** Origination & branch-operations SQL joins/filters; core HRMS tables (`attendance`, `leaves`, `payrolls`, `audit_logs`)
- **Exact Code Location:** `CREATE INDEX` search across all `.php`/`.sql` files found only `15` explicit indexes (`migrate_fix_rls_policies.php` [7], `migrate_loan_applications.php` [2], `migrate_loan_audit_logs.php` [2], `migrate_loan_documents_column.php` [1], `migrate_sales_tables.php` [3]); `::uuid` casts on varchar/text `e.branch` / `created_by` columns in `origination_activities_routes.php`, `branch_operations_dashboard_routes.php`, and `branch_operations_application_routes.php`.
- **Current Implementation:** Core operational queries filter/sort across `attendance(employeeId, date)`, `leaves(employeeId, status)`, `payrolls(employeeId, month, year)`, `audit_logs(createdAt, module)`, `users(email)` without version-controlled composite indexes, while branch/activity queries apply `e.branch::uuid` / `created_by::uuid` casts inline without regex guards.
- **Problem:** Non-SARGable `::uuid` type casts bypass B-tree indexes on the underlying `varchar`/`text` columns and throw PostgreSQL `22P02 invalid input syntax for type uuid` fatal errors if any legacy/malformed non-UUID string exists in the column. Additionally, unindexed foreign keys/date filters degrade into full sequential scans as row counts grow.
- **Root Cause:** Mixed `UUID` vs `VARCHAR`/`TEXT` column types across organically added tables (`employees.branch`, `loan_applications.created_by`) and ad-hoc index additions.
- **Security/Business Impact:** Sudden `500` errors on branch dashboards/activities whenever non-UUID branch IDs exist, and `O(N)` sequential scan degradation at 5k–50k employees.
- **Steps to Reproduce:** Insert or encounter any text label or empty string in `employees.branch` and query `GET /api/branch-operations/dashboard` or `/api/origination/activities`.
- **Recommended Fix:** Standardize foreign-key columns (`branch`, `created_by`, `employeeId`) cleanly onto consistent `UUID` types (with regex/nullable migration cleanup), or guard expressions without casting indexed columns (`branch::text = :branch_str`), and deploy composite B-tree indexes listed in [Section 10](#10-postgresql-query-optimization).
- **Suggested Code Changes:** See [Section 10](#10-postgresql-query-optimization) for concrete `CREATE INDEX CONCURRENTLY` statements and SARGable join rewrites.
- **Verification Method:** Run `EXPLAIN (ANALYZE, BUFFERS)` in an isolated staging database seeded with realistic row volumes. *(Not executed during this audit—marked Unverified for live PG execution plans.)*
- **Regression Risk:** Low using `CREATE INDEX CONCURRENTLY` during non-peak windows after deduplicating/validating non-UUID column rows.

---

### Issue ID: PERF-008

- **Issue Title:** Single-Container Apache/mod_php Execution Without PgBouncer Pooling, Persistent Connections, or Shared Cross-Worker Cache
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Infrastructure & Database Connection Scalability
- **Affected File:** [Dockerfile](file:///D:/Downloads/HRMS/Dockerfile#L23-L70), [Database.php](file:///D:/Downloads/HRMS/backend/src/Config/Database.php), [Cache.php](file:///D:/Downloads/HRMS/backend/src/Utils/Cache.php)
- **Affected Function/API:** Per-request `Database::connect()` & `Cache` backend
- **Exact Code Location:** [Dockerfile](file:///D:/Downloads/HRMS/Dockerfile#L23-L70) (`php:8.2-apache` single-container runtime); [Database.php](file:///D:/Downloads/HRMS/backend/src/Config/Database.php) connecting per request to remote Postgres (`DB_HOST` != localhost); [Cache.php](file:///D:/Downloads/HRMS/backend/src/Utils/Cache.php) local file/process caching.
- **Current Implementation:** Every HTTP API request opens a fresh TCP + TLS + PostgreSQL handshake to the remote Supabase database, uses `ATTR_EMULATE_PREPARES = true`, and stores app caches locally inside container filesystem/memory (`Cache.php`), which cannot share invalidations across horizontally scaled replicas.
- **Problem:** Remote TCP + Postgres connection setup dominates P95 latency for lightweight endpoints (e.g., `/api/me`, `AuthMiddleware` per-request lookup), exhausts PostgreSQL `max_connections` under bursts, and causes stale cache divergence if scaled beyond 1 container.
- **Root Cause:** Early single-instance PaaS container deployment using direct DB port connections rather than Supabase's Supavisor/PgBouncer pooler + PHP-FPM/OPcache tuning + Redis/shared cache.
- **Security/Business Impact:** Connection-slot exhaustion (`FATAL: remaining connection slots are reserved`) under traffic spikes (500–1,000 concurrent users) and stale permission cache risk across replicas.
- **Steps to Reproduce:** Inspect `Database.php` PDO DSN/options and `Dockerfile` Apache/PHP setup; connect concurrency test in staging to observe connection count saturation. *(Live load testing intentionally skipped against production.)*
- **Recommended Fix:** Route app queries through Supabase's **Transaction Pooler (PgBouncer / port `6543`)** or session pooler, enable PHP OPcache (`opcache.enable=1`, `validate_timestamps=0` in Docker builds), consolidate per-request `AuthMiddleware` user/feature queries cleanly, and back `Cache.php` with Redis if scaling horizontally.
- **Suggested Code Changes:**
```ini
; Recommended php.ini OPcache production settings in Dockerfile
opcache.enable=1
opcache.memory_consumption=128
opcache.max_accelerated_files=10000
opcache.validate_timestamps=0
```
- **Verification Method:** Load test staging with `k6`/`wrk` monitoring `pg_stat_activity` connection counts and P95 response latency.
- **Regression Risk:** Low — when using PgBouncer in **Transaction** pooling mode, disable `PDO::ATTR_PERSISTENT` and avoid session-level prepared state assumptions (or use session pooler with `ATTR_EMULATE_PREPARES => false` appropriately tested).

---

## 10. PostgreSQL Query Optimization

> [!NOTE]
> Local `psql` was unavailable in the audit environment, and no queries were run against the remote production Supabase database (`IMPORTANT EXECUTION RULE #4/#5`). Specific execution plans (`EXPLAIN ANALYZE`) remain **Unverified**; recommendations below are derived directly from static SQL and migration inspection.

### 10.1 Observed Query & Schema Bottlenecks
1. **Wildcard Projections (`63` occurrences):** Endpoints across `backend/public/` use `SELECT *` or `alias.*`, pulling unnecessary columns (long notes, JSON blobs `form_data`, documents metadata) on list views.
2. **Sparse Version-Controlled Indexes (`15` explicit `CREATE INDEX` statements found):** Existing migrations only index `application_timeline`, `applications(candidate_id)`, `attendance_punches(employeeId)`, `candidate_documents(candidate_id)`, `leaves(approvedBy)`, `training_videos(created_by)`, `loan_applications`, `loan_application_audit_logs`, and `sale_leads`. Missing explicit composite indexes on `attendance`, `leaves(employeeId)`, `payrolls`, `audit_logs`, `email_queue`, and `activity` filters expose queries to sequential scans at scale.
3. **Non-SARGable `::uuid` Type Casts:** Casting text/varchar columns (`e.branch::uuid`, `created_by::uuid`) prevents index usage and crashes on legacy/non-UUID rows (`PERF-007`).
4. **Runtime Schema Mutation (`ALTER TABLE`):** `admin_employees_routes.php` L355 issues DDL on an active API route, acquiring brief `ACCESS EXCLUSIVE` locks.

### 10.2 Recommended Database Index & Query Optimization Matrix

| Target Area / Query Pattern | Current Bottleneck | Recommended Optimization SQL / Refactor | Expected Gain (Verify via Staging `EXPLAIN`) |
| --- | --- | --- | --- |
| Attendance daily/monthly lookups & admin grid | Missing verified composite `(employeeId, date)` index | `CREATE INDEX CONCURRENTLY idx_attendance_emp_date ON public.attendance ("employeeId", date DESC);` | Eliminates sequential scan on 50k+ daily rows |
| Leave balances & approval queue | Filtered by `employeeId`, `status`, dates | `CREATE INDEX CONCURRENTLY idx_leaves_emp_status ON public.leaves ("employeeId", status, "startDate" DESC);` | Fast pending-leave & employee history lookup |
| Payroll period listing & duplicate generation guard | Filtered by `month`, `year`, `employeeId` | `CREATE UNIQUE INDEX CONCURRENTLY idx_payrolls_emp_month_year ON public.payrolls ("employeeId", month, year);` | Prevents duplicate payroll race conditions + speeds lookups |
| Audit log filtered pagination (`/api/admin/audit-logs`) | Filter/sort by `createdAt`, `module`, `action` | `CREATE INDEX CONCURRENTLY idx_audit_logs_created_mod ON public.audit_logs ("createdAt" DESC, module, action);` | Eliminates full table sort on growing audit history |
| Branch operations & origination activities | `e.branch::uuid` / `created_by::uuid` casts | Normalize column data types to `UUID` cleanly or compare text-to-text, plus `CREATE INDEX CONCURRENTLY idx_employees_branch ON public.employees (branch);` | Prevents `22P02` cast errors and enables Index Scans |
| Loan applications list & documents JSONB queries | Heavy `documents`/`form_data` payloads on list views | Project summary fields only on `/api/loans/applications` list; omit large `form_data` JSON unless fetching detail view `{id}` | Cuts JSON payload size and network transfer dramatically |
| All `63` `SELECT *`/`alias.*` endpoints & unpaginated lists | Unbounded response rows | Specify explicit column projections and cursor/offset `LIMIT <= 100` (`keyset` pagination for `audit_logs`) | Bounds memory, PHP JSON encoding, and Postgres I/O |

---

## 11. Code Quality Findings

| ID | Title | Severity | Layer | Status |
| --- | --- | --- | --- | --- |
| `QUAL-001` | `1,772` Repo ESLint Issues (`757` in `src/`) incl. `rules-of-hooks` & `no-undef` Bugs | HIGH | Frontend | Confirmed |
| `QUAL-002` | Zero Automated Tests (`0` PHP, `0` JS) & Zero CI/CD Pipeline | HIGH | Testing / DevOps | Confirmed |
| `QUAL-003` | `15,668` LOC Inline Closures in `backend/public/` (No Controller/Service/Repo) | HIGH | Backend Arch | Confirmed |
| `QUAL-004` | Hardcoded Static `5%` / `12%` KPI Percentages Presented as Live Metrics | MEDIUM | Business Logic | Confirmed |
| `QUAL-005` | Global `Date.prototype` Mutation & Conflicting SW Lifecycle (`main.jsx` vs `index.html`) | MEDIUM | Frontend Core | Confirmed |
| `QUAL-006` | Ad-Hoc Root PHP Scripts (`add_column`, `debug_tracker`, `test_tracker`) & Mixed Migrations | MEDIUM | Schema / Repo | Confirmed |
| `QUAL-007` | UI-Only PII Masking (`phoneUtils.js`) & Android Placeholder ID (`com.example.acmehrms`) | LOW | Frontend / Mobile | Confirmed |

---

### Issue ID: QUAL-001

- **Issue Title:** Failing ESLint Suite (`1,772` Total Issues Repo-Wide; `757` in `src/`) Containing Critical `rules-of-hooks` & `no-undef` Runtime Defects
- **Severity:** HIGH *(Confirmed)*
- **Category:** Code Quality & Runtime Stability
- **Affected File:** [eslint.config.js](file:///D:/Downloads/HRMS/frontend/eslint.config.js), [AdminLayout.jsx](file:///D:/Downloads/HRMS/frontend/src/components/AdminLayout.jsx#L34), [EmployeeMobileExpenses.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/EmployeeMobileExpenses.jsx#L108-L130), [OriginationMobileLoanLeadDetails.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/OriginationMobileLoanLeadDetails.jsx#L56), [OriginationMobileSaleLeadDetails.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/OriginationMobileSaleLeadDetails.jsx#L64), [AddEmployeeModal.jsx](file:///D:/Downloads/HRMS/frontend/src/components/AddEmployeeModal.jsx#L59), [AdminBulkPayroll.jsx](file:///D:/Downloads/HRMS/frontend/src/pages/AdminBulkPayroll.jsx#L49), [LoanDocumentsSidebar.jsx](file:///D:/Downloads/HRMS/frontend/src/components/forms/LoanDocumentsSidebar.jsx#L138)
- **Affected Function/API:** Frontend linting config and runtime React component correctness
- **Exact Code Location:**
  - `npm.cmd run lint` (`eslint .`): failed exit code `1` (`258` files scanned, `189` with issues, **`1,723 errors, 49 warnings`**; includes compiled Android asset `android/app/src/main/assets/public/assets/index-CZwYNijs.js`).
  - `eslint src` (source-only): failed exit code `1` (`246` files scanned, `182` with issues, **`712 errors, 45 warnings`**): `no-unused-vars` (`574`), `react-hooks/refs` (`53`), `react-hooks/exhaustive-deps` (`45`), `react-hooks/set-state-in-effect` (`44`), `no-empty` (`19`), `react-hooks/immutability` (`4`), `no-undef` (`3`), `react-hooks/rules-of-hooks` (`1`), `react-hooks/purity` (`1`), etc.
- **Current Implementation:**
  - `AdminLayout.jsx:34` calls `useQuery` conditionally after an early return (`rules-of-hooks` violation).
  - `EmployeeMobileExpenses.jsx:108, 114, 130` calls `toast` without importing it (`no-undef` `ReferenceError` crash).
  - `OriginationMobileLoanLeadDetails.jsx:56` & `OriginationMobileSaleLeadDetails.jsx:64` mutate `lead` state directly in place (`react-hooks/immutability`).
  - `AddEmployeeModal.jsx:59` & `AdminBulkPayroll.jsx:49` invoke `const`-declared functions inside `useEffect` before their declarations.
- **Problem:** Active runtime crashes (`ReferenceError: toast is not defined`, conditional hook crashes), missed bug signals hidden behind 574 unused-var errors, and scanning compiled Capacitor assets inside `android/`.
- **Root Cause:** Absence of pre-commit or CI lint gates and missing `android/**` ignore pattern in `eslint.config.js`.
- **Security/Business Impact:** Production UI crashes in mobile expense claims and admin layouts, stale state bugs, and high maintenance friction.
- **Steps to Reproduce:** Run `npm.cmd run lint` and `npx.cmd eslint src` inside `D:\Downloads\HRMS\frontend`.
- **Recommended Fix:** Ignore `android/**` and `dist/**` cleanly in `eslint.config.js`, immediately fix the `rules-of-hooks`, `no-undef`, and `react-hooks/immutability` defects, and systematically clear remaining lint errors.
- **Suggested Code Changes:**
```js
// EmployeeMobileExpenses.jsx: add missing import
import toast from 'react-hot-toast';
// AdminLayout.jsx: move early return BELOW all useQuery / Hook declarations
```
- **Verification Method:** Re-run `npm.cmd run lint` and confirm `0` errors across `src/`.
- **Regression Risk:** Low — verify mobile expenses toasts and conditional AdminLayout auth rendering after moving hooks above early returns.

---

### Issue ID: QUAL-002

- **Issue Title:** Zero Automated Test Coverage (`0` PHP Tests, `0` Frontend Tests) & No CI/CD Quality Gates
- **Severity:** HIGH *(Confirmed)*
- **Category:** Verification / Software Engineering Process
- **Affected File:** [backend/composer.json](file:///D:/Downloads/HRMS/backend/composer.json), [backend/tests/](file:///D:/Downloads/HRMS/backend/tests), [frontend/package.json](file:///D:/Downloads/HRMS/frontend/package.json)
- **Affected Function/API:** Entire codebase & deployment workflow
- **Exact Code Location:** `backend/tests` contains `0` files; `frontend/` contains `0` `*.test.*` files; `Test-Path .github` returned `False`; `phpunit`/`phpstan`/`phpcs` are absent from `composer.json` and environment.
- **Current Implementation:** Deployments push directly from `main` to Render ([render.yaml](file:///D:/Downloads/HRMS/render.yaml)) without automated security, authorization, payroll calculation, or frontend build/lint checks.
- **Problem:** Every refactor or hotfix carries high regression risk—particularly across financial calculations (payroll, loans), RBAC (`AuthMiddleware`), and state transitions.
- **Root Cause:** Rapid feature development without test harness bootstrap.
- **Security/Business Impact:** Recurring security regressions (e.g., empty `AuthMiddleware()` slipping into new modules undetected) and broken production releases.
- **Steps to Reproduce:** Inspect `backend/tests`, `composer.json`, `package.json`, and `.github`.
- **Recommended Fix:** Introduce PHPUnit integration tests for Auth/MFA/RBAC/IDOR/Payroll calculations, PHPStan (`level 5+`), Vitest for React validation/state logic, and a GitHub Actions workflow running `php -l`, PHPUnit, PHPStan, `composer audit`, `eslint`, `npm audit`, and `vite build` on every PR.
- **Suggested Code Changes:** Add `phpunit/phpunit` and `phpstan/phpstan` to `require-dev` in `backend/composer.json` and create `.github/workflows/ci.yml`.
- **Verification Method:** Trigger CI pipeline on PR verifying all test, lint, static-analysis, and dependency audit steps execute automatically.
- **Regression Risk:** None (additive tooling).

---

### Issue ID: QUAL-003

- **Issue Title:** Monolithic Procedural Route Architecture (`15,668` LOC Inline Closures in `backend/public/`)
- **Severity:** HIGH *(Confirmed)*
- **Category:** Separation of Concerns & Maintainability
- **Affected File:** [backend/public/](file:///D:/Downloads/HRMS/backend/public) (`41` files, `15,668` LOC vs `912` LOC in `backend/src/`)
- **Affected Function/API:** All API controllers/handlers
- **Exact Code Location:** [backend/public/](file:///D:/Downloads/HRMS/backend/public) (`admin_chatbot_routes.php` `1,196` lines, `admin_attendance_routes.php` `1,080` lines, `employee_chatbot_routes.php` `1,076` lines, `branch_operations_application_routes.php` `888` lines, `index.php` `898` lines, `admin_employees_routes.php` `831` lines, `origination_loans_application_routes.php` `640` lines, etc.).
- **Current Implementation:** HTTP routing, request parsing, RBAC/branch checks, business validation, email queuing, external cURL calls, and raw PDO SQL statements are embedded inline inside anonymous route closures inside `public/` (web root).
- **Problem:** Business logic and authorization checks are duplicated inconsistently across files (causing bugs like `SEC-008`, `SEC-009`, `SEC-011`, and inconsistent `::uuid` handling), unit testing handlers requires full HTTP bootstrapping, and application logic resides inside the Apache `DocumentRoot` (`backend/public/`).
- **Root Cause:** Adding new route files sequentially directly under `backend/public/` without extracting `App\Controllers`, `App\Services`, and `App\Repositories` under PSR-4 `backend/src/`.
- **Security/Business Impact:** High defect rate, inconsistent security enforcement across similar modules, and exposure of `.php` source files if Apache PHP execution ever misconfigures inside `DocumentRoot`.
- **Steps to Reproduce:** Inspect line counts and structure of `backend/public/*.php` vs `backend/src/`.
- **Recommended Fix:** Incrementally refactor shared domain logic (Auth/MFA/OTP tokens, Employee lookup & salary projection, Branch scoping, Email queueing, File validation, Loan/Branch status state machine) into `backend/src/Services/` & `backend/src/Repositories/`, keeping `backend/public/index.php` strictly as a thin front-controller outside application source code.
- **Suggested Code Changes:** Extract `App\Services\AuthorizationService`, `App\Services\EmailQueueService`, `App\Repositories\LoanApplicationRepository` under `backend/src/`.
- **Verification Method:** PHPUnit unit tests directly exercising `Service` and `Repository` classes independent of Slim HTTP routing.
- **Regression Risk:** Medium — perform module-by-module extraction backed by HTTP contract tests to preserve identical JSON response shapes.

---

### Issue ID: QUAL-004

- **Issue Title:** Hardcoded Static Dashboard Trend Metrics (`percent_change_active: 5`, `percent_change_converted: 12`)
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Business Logic & Data Integrity
- **Affected File:** [origination_loans_dashboard_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_loans_dashboard_routes.php#L86-L88), [origination_sales_dashboard_routes.php](file:///D:/Downloads/HRMS/backend/public/origination_sales_dashboard_routes.php#L82-L84), [branch_operations_dashboard_routes.php](file:///D:/Downloads/HRMS/backend/public/branch_operations_dashboard_routes.php#L299-L301)
- **Affected Function/API:** `/api/leads/dashboard`, `/api/sales/dashboard`, `/api/branch-operations/dashboard`
- **Exact Code Location:** `origination_loans_dashboard_routes.php` L86 & L88; `origination_sales_dashboard_routes.php` L82 & L84; `branch_operations_dashboard_routes.php` L299 & L301
- **Current Implementation:** All three executive dashboards return constant integers `5` and `12` as period-over-period growth metrics (`percent_change_active: 5`, `percent_change_converted: 12`).
- **Problem:** Decision-makers view fabricated fixed `+5%` / `+12%` trend badges regardless of actual lead/application volume increases or drops.
- **Root Cause:** Placeholder stub values left in place after wiring lead counts.
- **Security/Business Impact:** Misleading operational KPI reporting across loan origination, sales, and branch operations dashboards.
- **Steps to Reproduce:** Call `/api/leads/dashboard`, `/api/sales/dashboard`, or `/api/branch-operations/dashboard` with varying datasets and observe constant `5` and `12`.
- **Recommended Fix:** Compute true period-over-period SQL deltas (current 30d / month vs previous 30d / month) or explicitly return `null` until historical period comparison exists.
- **Suggested Code Changes:** Query `FILTER (WHERE created_at >= ...)` across current and previous periods to calculate true percentage change (guarding divide-by-zero).
- **Verification Method:** Unit/integration tests with seeded prior-month vs current-month records verifying accurate percentage calculations (including negative growth and 0 baseline).
- **Regression Risk:** Low — check UI handles `0`, negative numbers, and `null` ("N/A").

---

### Issue ID: QUAL-005

- **Issue Title:** Global `Date.prototype` Mutation (`main.jsx`) & Conflicting Service Worker Registration (`main.jsx` vs `index.html`)
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Anti-Patterns & Lifecycle Reliability
- **Affected File:** [main.jsx](file:///D:/Downloads/HRMS/frontend/src/main.jsx#L6-L28), [index.html](file:///D:/Downloads/HRMS/frontend/index.html#L62-L72)
- **Affected Function/API:** Global bootstrap (`main.jsx`) & HTML entry point (`index.html`)
- **Exact Code Location:** [main.jsx](file:///D:/Downloads/HRMS/frontend/src/main.jsx#L6-L12) (SW unregister) & [L15-L28](file:///D:/Downloads/HRMS/frontend/src/main.jsx#L15-L28) (`Date.prototype` mutation); [index.html](file:///D:/Downloads/HRMS/frontend/index.html#L62-L72) (SW registration)
- **Current Implementation:** `main.jsx` alters built-in `Date.prototype` methods globally and unregisters service workers that `index.html` registers on load.
- **Problem:** Extending `Date.prototype` globally risks subtle incompatibilities with third-party date/PDF/charting libraries (`date-fns`, `@react-pdf/renderer`, `recharts`) and timezone edge cases; racing SW register/unregister wastes startup work and creates unpredictable offline/update behavior with `UpdateOverlay.jsx`.
- **Root Cause:** Quick global timezone/formatting patch and incomplete PWA rollback.
- **Security/Business Impact:** Unpredictable timezone/date formatting bugs in payroll/attendance/leave UI and erratic asset caching.
- **Steps to Reproduce:** Inspect `main.jsx` L6-28 and `index.html` L62-72.
- **Recommended Fix:** Remove `Date.prototype` mutation and move formatting into pure helper functions (using `date-fns` or explicit `Intl.DateTimeFormat` with tenant timezone); remove redundant SW registration in `index.html` if SW caching is disabled.
- **Suggested Code Changes:** Extract pure `formatAppDate(date)` helpers and drop prototype monkey-patching.
- **Verification Method:** Search `frontend/src/` for `.prototype.` mutations (`0` matches) and run date/payroll/attendance rendering checks.
- **Regression Risk:** Low/Medium — audit any call sites relying on the custom `Date.prototype` methods first before removing.

---

### Issue ID: QUAL-006

- **Issue Title:** Ad-Hoc Root Debug/DDL PHP Files (`add_column.php`, `debug_tracker.php`, `test_tracker.php`) & Fragmented Schema Migrations
- **Severity:** MEDIUM *(Confirmed)*
- **Category:** Code Hygiene & Environment Reproducibility
- **Affected File:** [add_column.php](file:///D:/Downloads/HRMS/add_column.php), [debug_tracker.php](file:///D:/Downloads/HRMS/debug_tracker.php), [test_tracker.php](file:///D:/Downloads/HRMS/test_tracker.php), [backend/scripts/](file:///D:/Downloads/HRMS/backend/scripts) (`11` files), [supabase/migrations/](file:///D:/Downloads/HRMS/supabase/migrations)
- **Affected Function/API:** Repository root scripts & DB migration governance
- **Exact Code Location:** Repo root PHP scripts (`add_column.php`, `debug_tracker.php`, `test_tracker.php`), `11` PHP migration scripts in `backend/scripts/`, `1` `.sql` file in `supabase/migrations/`, plus inline `ALTER TABLE` inside `admin_employees_routes.php` L355.
- **Current Implementation:** Database evolution spans ad-hoc root scripts, standalone CLI PHP scripts, inline request DDL, and one Supabase SQL migration file—with no idempotent version table tracking which migrations ran on which environment.
- **Problem:** Impossible to spin up a clean matching PostgreSQL schema from Git alone; developer scratch/debug scripts accumulate in root alongside tracked SQL dumps (`SEC-005`).
- **Root Cause:** Iterative live DB adjustments directly against Supabase without a single migration runner.
- **Security/Business Impact:** Schema drift between dev, staging, and production; unexpected runtime column errors during deploys.
- **Steps to Reproduce:** Attempt to initialize a fresh PostgreSQL instance solely from repo `.sql` files (missing core table DDL).
- **Recommended Fix:** Consolidate baseline schema and all future DDL changes into sequential timestamped `.sql` files under [supabase/migrations/](file:///D:/Downloads/HRMS/supabase/migrations) and remove ad-hoc root debug/DDL scripts (`add_column.php`, `debug_tracker.php`, `test_tracker.php`, runtime `ALTER TABLE`).
- **Suggested Code Changes:** Capture `pg_dump --schema-only` baseline migration into `supabase/migrations/` and retire `backend/scripts/migrate_*.php` once folded in.
- **Verification Method:** Apply consolidated migrations cleanly to a fresh ephemeral Postgres container verifying 100% of API endpoints boot without schema errors.
- **Regression Risk:** Low.

---

### Issue ID: QUAL-007

- **Issue Title:** UI-Only PII Masking (`phoneUtils.js`) While Transmitting Plaintext PII & Android Placeholder Build Metadata (`com.example.acmehrms`)
- **Severity:** LOW *(Confirmed)*
- **Category:** Privacy-by-Design & Release Hygiene
- **Affected File:** [phoneUtils.js](file:///D:/Downloads/HRMS/frontend/src/utils/phoneUtils.js#L8-L49), [build.gradle](file:///D:/Downloads/HRMS/frontend/android/app/build.gradle#L4-L11)
- **Affected Function/API:** `maskPhoneNumber`, `maskAddress`, Android `defaultConfig`
- **Exact Code Location:** [phoneUtils.js](file:///D:/Downloads/HRMS/frontend/src/utils/phoneUtils.js#L8-L49); [build.gradle](file:///D:/Downloads/HRMS/frontend/android/app/build.gradle#L4-L11) (`namespace = "com.example.acmehrms"`, `applicationId "com.example.acmehrms"`, `versionCode 1`, `versionName "1.0"`).
- **Current Implementation:** Customer/employee phone numbers and addresses are transmitted unmasked in JSON API responses (and persisted to `localStorage` via `PERF-003`) before being masked visually in JSX via `maskPhoneNumber`/`maskAddress`. Android production Gradle configuration still uses `com.example.acmehrms` and static version `1.0`.
- **Problem:** Anyone viewing browser DevTools or `localStorage` reads unmasked PII despite the visual mask; shipping `com.example.*` `applicationId` causes Play Store package rejection and blocks clean app versioning.
- **Root Cause:** Cosmetic UI masking substituted for backend role-based field redaction, and uncustomized Capacitor Android init config.
- **Security/Business Impact:** Over-exposure of customer/applicant PII in network payloads and non-unique/unupdatable Android package metadata.
- **Steps to Reproduce:** Inspect Network response for `/api/branch-operations/applications` or `build.gradle` L4-11.
- **Recommended Fix:** Perform PII masking server-side on PHP responses when the caller's role does not require unmasked contact info, and assign a genuine reverse-DNS Android `applicationId` (e.g., `com.acmecorp.hrms`) with automated `versionCode`/`versionName` increments.
- **Suggested Code Changes:** Move `maskPhone`/`maskAddress` helper into PHP response serialization unless `$canViewUnmaskedPii` is verified.
- **Verification Method:** Check DevTools Network JSON response confirms masked strings returned directly from API.
- **Regression Risk:** Low — check workflows requiring outbound call links (`tel:`) or address verification receive unmasked values only for explicitly authorized roles.

---

## 12. Scalability Assessment

> [!IMPORTANT]
> **Measurement Disclaimer:** No production load tests or staging benchmarks were executed against the live remote Supabase database during this audit (`IMPORTANT EXECUTION RULE #5`). Therefore, the ratings below **do not claim supported capacity**; they document concrete **observed architectural bottlenecks** at each tier.

| Target Tier | Readiness Verdict (Static Architecture Analysis) | Primary Observed Bottlenecks Limiting Scale | Required Pre-Conditions Before Load Testing |
| --- | --- | --- | --- |
| **100 Concurrent Users** | **Degraded / Fragile** | 1. Remote non-pooled per-request PDO TCP/TLS connections to PostgreSQL (`Database.php`).<br>2. Per-request `AuthMiddleware` DB round-trip to `user_feature_access`.<br>3. `AdminLayout` polling Supabase every `5s` + TanStack `refetchOnMount: 'always'` causing multiplicative API traffic.<br>4. Blocking synchronous Gemini HTTP requests pinning Apache `mod_php` workers. | Route Postgres via PgBouncer/pooler; enable PHP OPcache; switch `AdminLayout` polling to `60s`; disable `refetchOnMount: 'always'`; put hard timeouts on chatbot cURL. |
| **500 Concurrent Users** | **Fails / Saturated** | 1. PostgreSQL `max_connections` exhaustion from 1:1 Apache worker-to-Postgres connections.<br>2. Apache `prefork`/`mod_php` worker exhaustion when heavy unpaginated/report/chatbot endpoints block.<br>3. Initial bundle spike (~`6.8 MB` static download per uncached login: `4.62 MB` JS + `1.83 MB` logo + CSS).<br>4. Rate limiter writes / file contention or single-container local cache (`Cache.php`). | PgBouncer Transaction/Session pooling; horizontal containers behind load balancer + Redis shared cache + CDN for Vite chunks & lazy routes; async queue for heavy reports/emails/AI. |
| **1,000 Concurrent Users** | **Fails (Architectural Ceiling)** | 1. Single-container stateful deployment (`Dockerfile` Apache + local `Cache.php` + file-based `RateLimiter`).<br>2. Storage proxies streaming files through PHP (`index.php` L768-893) saturate PHP memory and network bandwidth.<br>3. Every 30s mobile `LocationTrackerService` check-in across 1k users hits `33+ req/s` baseline telemetry alone. | Offload file downloads directly to authenticated short-lived Supabase Signed URLs (CDN-backed); Redis rate-limiting & session/token-version cache; batch/interval-aligned mobile GPS uploads (`5m`–`15m`). |
| **5,000 Employees** | **Bottlenecked** | 1. Missing explicit composite indexes on `attendance`, `leaves`, `payrolls`, `audit_logs` (~1.8M attendance rows/year at 5k staff).<br>2. Unpaginated employee/payroll/bulk-payroll endpoints transfer MBs of JSON.<br>3. `63` `SELECT *`/`alias.*` queries + synchronous `localStorage` query persistence hit browser 5 MB quota and freeze UI. | Add composite indexes ([Section 10](#10-postgresql-query-optimization)), strict server pagination (`limit <= 100`), explicit projections, and drop global `localStorage` persister. |
| **10,000 Employees** | **Fails on Heavy Views** | 1. Sequential table scans & sorts on `attendance` (~3.6M rows/year) and `audit_logs`.<br>2. Full-roster context assembly in `admin_chatbot_routes.php` overflows token limits and PHP memory.<br>3. Bulk payroll generation loop (`admin_payroll_routes.php`) exceeds Apache HTTP request timeout. | Keyset pagination for logs/attendance; chunked background workers for bulk payroll generation; summary aggregations for chatbot instead of raw employee dumps; table partitioning roadmap. |
| **50,000 Employees** | **Requires Architectural Scaling** | 1. Single-process PHP payroll runs, unpartitioned `attendance` (~18M rows/year) & `audit_logs`, in-memory client filtering/tables, and unindexed text/UUID joins.<br>2. Client-side DataTable full-list rendering causes severe React DOM slowdowns. | Server-side search/sort/pagination everywhere; time-range partitioning (`attendance`, `audit_logs` by month/year); read replicas for BI/reports/chatbot; background job queue + PgBouncer + Redis. |

---

## 13. Dependency Vulnerability Assessment

### 13.1 Backend Composer Dependencies (`backend/composer.json` & `composer.lock`)
- **Command Run:** `php D:\Downloads\HRMS\backend\composer.phar audit --working-dir=D:\Downloads\HRMS\backend`
- **Declared Production Packages (`composer.json`):** `php: ^8.0`, `slim/slim: 4.*`, `slim/psr7: ^1.6`, `vlucas/phpdotenv: ^5.6`, `firebase/php-jwt: ^7.1`. (`composer.lock`: Present; `require-dev`: None.)
- **Observed Result:** **`No security vulnerability advisories found.`** (`0` advisories).
- **Gap:** No `require-dev` tooling (`phpunit`, `phpstan`, `squizlabs/php_codesniffer`) installed or locked.

### 13.2 Frontend npm Dependencies (`frontend/package.json` & `package-lock.json`)
- **Command Run:** `npm.cmd audit --json` inside `D:\Downloads\HRMS\frontend` (`package-lock.json`: Present; runtime Node `v24.22.1`, npm `11.19.1`).
- **Observed Summary:** **5 total vulnerabilities** (`0 Critical`, **`4 High`**, **`1 Moderate`**, `0 Low`).

| Package | Installed / Type | Severity | Vulnerable Range | Fix Available | Key Observed Advisories |
| --- | --- | --- | --- | --- | --- |
| `axios` | `1.17.0` (Direct) | **High** | `1.0.0 - 1.19.0` | `true` | Prototype pollution auth/header/socket gadgets (`GHSA-xj6q-8x83-jv6g`, `GHSA-mmx7-hfxf-jppx`), ReDoS (`GHSA-c29m-xwm3-cm6r`, `GHSA-mghh-pgcx-3jjj`), `formToJSON` DoS (`GHSA-pmv8-rq9r-6j72`), `maxBodyLength`/redirect SSRF bypasses |
| `follow-redirects` | Transitive (via `axios`) | **High** | `1.16.0 - 1.16.1` | `true` | Cross-origin credential stripping & `sensitiveHeaders` bypasses (`GHSA-q3jh-wrc6-jgq8`, `GHSA-8r9p-f939-6h3c`, `GHSA-mrwp-f3q8-3g9p`) |
| `form-data` | Transitive (via `axios`) | **High** | `4.0.0 - 4.0.5` | `true` | CRLF injection via unescaped multipart fields/filenames (`GHSA-hmw2-7cc7-3qxx`) |
| `react-router` | Transitive (via `react-router-dom`) | **High** | `6.0.0 - 7.18.1` | `true` | Backslash Open Redirect CVE-2025-68470 bypass (`GHSA-wrjc-x8rr-h8h6`), Route Matching DoS (`GHSA-chx6-hx7r-mcp5`), SSR/RSC XSS & CSRF advisories |
| `react-router-dom` | `7.17.0` (Direct) | **Moderate** | `6.0.0-alpha.0 - 7.17.0` | `true` | Inherits `react-router` advisories |

- **Additional Bundle Bloat Packages Observed (`npm.cmd list --depth=0`):** `webgl-fluid: 0.4.0`, `react-organizational-chart: 2.2.1`, `emoji-picker-react: 4.19.1`, `recharts: 3.8.1`, `@react-pdf/renderer: 4.5.1` bundled eagerly into a single JS file (`PERF-001`).

---

## 14. Recommended Fixes & Prioritized Remediation Checklist

*(Audit-only report: zero source edits applied yet.)*

### Phase A — Immediate Fixes (Emergency / Pre-Traffic Blockers — Days 1–2)
- [ ] **Lock `AuthMiddleware` fail-closed (`SEC-009`, `SEC-010`):** Reject empty `$requiredRoles` on privileged routes (`admin_*`, `employee_*`, `origination_*`, `branch_operations_*`), explicitly block `candidate` role tokens everywhere outside `/api/candidate/*`, whitelist feature column names (`FEATURE_COLUMNS`), and return `503`/`403` on DB failures.
- [ ] **Fix Complete MFA Bypass (`SEC-008`):** Require TOTP verification challenge (`mfaRequired` + short-lived `mfaToken`) inside `/api/auth/otp/verify` whenever `mfaEnabled = true`, and hash `otp_code` at rest.
- [ ] **Remediate Critical IDORs (`SEC-011`):** Enforce `created_by = :uid` and caller `branch` ownership on all loan application drafts/documents/status/deletes, activity reassignments, and branch-operations mutations; remove the `'Branch Officer'` non-employee fallback (`L709`).
- [ ] **Lock Supabase Edge Function & RLS + Rotate Credentials (`SEC-001`, `SEC-002`, `SEC-005`):** Enforce `x-webhook-secret` on `send-email`, drop permissive `USING (sub IS NOT NULL)` / `anon` policies once client writes move server-side, remove `'AcmeDev@2026'` from [MaintenanceOverlay.jsx](file:///D:/Downloads/HRMS/frontend/src/components/MaintenanceOverlay.jsx#L33-L34) (`SEC-020`), create `.dockerignore`, scrub Git-tracked SQL backup/log files, and rotate DB password, `JWT_SECRET`, and Google API keys.
- [ ] **Disable Production Debug Leaks & MitM SSL Bypass (`SEC-004`, `SEC-024`):** Set `addErrorMiddleware($isDev, true, true)`, remove `(Secret empty?)` diagnostics and `Database.php` error echoing, and re-enable `CURLOPT_SSL_VERIFYPEER => true` / `CURLOPT_SSL_VERIFYHOST => 2`.

### Phase B — High-Priority Fixes (Security & Data Integrity — Week 1–2)
- [ ] **Secure Document Access & Uploads (`SEC-003`, `SEC-017`):** Put `AuthMiddleware` + ownership checks or short-lived signed Supabase URLs in front of `/Offer-Letter/`, `/Resume/`, `/Candidate-Document/`, `/Loan-Document/`, `/Loan-Signature/`, `/Bills/`, `/Attendance/`, validate magic bytes server-side, and switch from `${First}-${Last}.pdf` to CSPRNG UUID filenames.
- [ ] **Fix Sessions, Logout & Password Changes (`SEC-012`):** Replace 10-year JWTs (`session_timeout = 'never'`) with short-lived access tokens + refresh tokens + `token_version` revocation checked on `AuthMiddleware` and bumped on `/api/logout` & password change; verify `currentPassword` on `/api/change-password`.
- [ ] **Tighten Salary, Assessments, & Email Relay (`SEC-013`, `SEC-015`):** Restrict `e.salary` projection to payroll-authorized users; enforce `assigned_employee_ids` & server-side timer deadlines on assessments; replace `/api/admin/send-email` open HTML body relay with HTML-escaped server templates; replace plaintext passwords in `welcome_email.html` with one-time setup links.
- [ ] **Harden Database & Client Storage (`SEC-018`, `SEC-021`):** Remove runtime `ALTER TABLE` from `admin_employees_routes.php` L355, set `PDO::ATTR_EMULATE_PREPARES => false` with least-privilege DB role, migrate web JWTs from `localStorage` to `HttpOnly; Secure; SameSite=Strict` cookies, disable global `localStorage` TanStack persistence (`PERF-003`), and strip production `console.*` logs.
- [ ] **Harden Android Build (`SEC-006`, `PERF-002`):** Remove `Acme HRMS.apk` from `frontend/public/downloads/`, set `allowBackup="false"` and `usesCleartextTraffic="false"`, encrypt native JWTs in `EncryptedSharedPreferences`, gate debug logs, enable `minifyEnabled true`, and set genuine `applicationId` (`QUAL-007`).

### Phase C — Medium-Priority Fixes (Performance, DB & Quality — Week 2–4)
- [ ] **Deploy Bundle Splitting, Asset & Polling Fixes (`PERF-001`, `PERF-003`, `PERF-004`):** Add `React.lazy` routes & `manualChunks`, optimize `logo.png` (<50 KB), remove artificial `1,200 ms` `AuthContext` delay, set `AdminLayout` polling >= `60s`, respect `staleTime`, and clean `main.jsx`/`index.html` SW conflict + `Date.prototype` mutation (`QUAL-005`).
- [ ] **Database Pooling, Indexes & API Pagination (`PERF-006`, `PERF-007`, `PERF-008`, §10):** Route Postgres through PgBouncer pooler, enable OPcache, fix `::uuid` index-busting casts, apply composite indexes via `CREATE INDEX CONCURRENTLY`, replace all `63` wildcard queries with explicit projections + pagination caps, and enforce server-side attendance geofencing + trustworthy rate-limit keys (`SEC-014`).
- [ ] **Fix XSS Sinks, Headers, Google Key Exposure & npm Advisories (`SEC-007`, `SEC-016`, `SEC-022`, `SEC-023`):** Escape/DOM-build `AdminAttendanceLocation.jsx` InfoWindow & email templates, keep `GOOGLE_GEOCODING_API_KEY` server-side, add security headers (`CSP`, `X-Frame-Options`, `X-Content-Type-Options`, restricted CORS), and run `npm update axios react-router-dom`.
- [ ] **Fix Critical Frontend Lint Bugs & Establish CI/Tests (`QUAL-001`, `QUAL-002`, `QUAL-004`, `QUAL-006`):** Ignore `android/**` in `eslint.config.js`, fix `rules-of-hooks`, `no-undef`, and state-immutability bugs, replace hardcoded `5%`/`12%` KPI metrics with real SQL comparisons, add PHPUnit/PHPStan/Vitest + GitHub Actions CI, and tune Android `WakeLock` + GPS intervals (`PERF-005`).

### Phase D — Low-Priority & Long-Term Architectural Improvements (Ongoing)
- [ ] **Modularize Monolithic PHP Route Files (`QUAL-003`):** Incrementally extract `backend/public/*.php` closures (`15,668` LOC) into `backend/src/Controllers/`, `Services/`, and `Repositories/`, moving private app source out of Apache `DocumentRoot`.
- [ ] **Move PII Masking Server-Side (`QUAL-007`):** Apply contact/address masking in backend serializers rather than UI-only formatting (`phoneUtils.js`), and formalize table partitioning/read-replica strategy before reaching 10,000–50,000 employees.

---

## 15. Testing and Verification Results

| Tool / Verification Method | Target Scope | Outcome / Exact Metrics Observed | Notes & Unverified Gaps |
| --- | --- | --- | --- |
| `php -l` (PHP `8.2.35`) | `backend/src`, `backend/public`, `backend/scripts`, root PHP (`67` files) | **Passed:** `67` files checked, **`0` failures** | Syntax check only; does not detect logic/runtime errors |
| `php backend/composer.phar audit` | `backend/composer.lock` (`slim/slim`, `slim/psr7`, `vlucas/phpdotenv`, `firebase/php-jwt`) | **Passed:** `No security vulnerability advisories found.` (`0` advisories) | Zero dev/static-analysis deps declared |
| `npm.cmd audit --json` | `frontend/package-lock.json` | **Failed (`5` vulnerabilities):** **`4 High`, `1 Moderate`**, `0 Critical`, `0 Low` | Affects `axios`, `follow-redirects`, `form-data`, `react-router`, `react-router-dom` |
| `npm.cmd run lint` (`eslint .`) | Repo-wide frontend tree (`258` files scanned) | **Failed (exit code `1`):** **`1,723 errors, 49 warnings`** (`1,772` total across `189` files) | Polluted by compiled Capacitor bundle `frontend/android/app/src/main/assets/public/assets/index-CZwYNijs.js` |
| `eslint.cmd src --format json` | Source tree only (`frontend/src`, `246` files scanned) | **Failed (exit code `1`):** **`712 errors, 45 warnings`** (`757` total across `182` files) | Exposed `AdminLayout.jsx:34` (`rules-of-hooks`), `EmployeeMobileExpenses.jsx` (`no-undef` `toast`), state mutation (`immutability`), `574` `no-unused-vars` |
| Build Output Inspection (`frontend/dist`) | Static bundle artifacts | Verified `index-BrpM0sAI.js` = `4,844,839 B`, `logo.png` = `1,922,833 B`, `Acme HRMS.apk` = `72,322,989 B` (tripled), **zero `.map` sourcemaps** | Bundle split & asset compression needed |
| Static Pattern Sweeps (`Select-String`, `git ls-files`) | Security sinks, tracked secrets, unsafe PHP | Verified: `0` dangerous PHP `eval`/`shell_exec`/`unserialize`/`session_start`; `63` `SELECT *`/`alias.*`; `15` `CREATE INDEX`; `13` `dangerouslySetInnerHTML`; `24` `localStorage.` / `19` `sessionStorage.`; `80` `console.*`; `Missing .dockerignore`; tracked `.sql`/`server.log`/`scratch_queries.txt`/`.apk` | Comprehensive manual code inspection completed across backend, frontend, Android, and Supabase layers |
| **PHPUnit / Automated Tests** | Backend & Frontend test suites | **Not Run — None Exist** (`backend/tests`: `0` files; `frontend`: `0` `*.test.*`; `.github`: absent; `phpunit` not installed) | **Unverified** |
| **PHPStan / PHP_CodeSniffer** | PHP static analysis & coding standards | **Not Run — Not Installed** (`phpstan`, `phpcs` unavailable in environment) | **Unverified** |
| **PostgreSQL `EXPLAIN ANALYZE` & Load Tests** | Live DB query plans & concurrency throughput | **Not Run** (`psql` unavailable locally; no destructive queries or load tests executed against remote Supabase Postgres per safety rules) | **Unverified** (requires isolated staging DB benchmark) |

---

## 16. Final Production Readiness Assessment

### Verdict: **NOT PRODUCTION READY**

While Acme HRMS implements functional workflows across Core HR, Payroll, Attendance, Recruitment, Assessments, Loan Origination, Sales, Branch Operations, and Android Field Tracking, **shipping to production in its current state exposes the organization to immediate data-breach, financial-fraud, and availability risks**:

1. **Unacceptable Data Breach Surface:** External candidates or unprivileged employees can exploit empty `AuthMiddleware()` routes ([SEC-009](#issue-id-sec-009)) and missing object/branch IDOR checks ([SEC-011](#issue-id-sec-011)) to export company-wide employee salaries and alter financial loan/branch records. Public storage proxies ([SEC-003](#issue-id-sec-003)) and overly broad Supabase RLS + unauthenticated `send-email` ([SEC-001](#issue-id-sec-001), [SEC-002](#issue-id-sec-002)) further compound external exposure.
2. **Broken Authentication & Fail-Open Security Controls:** Complete TOTP MFA bypass on email OTP ([SEC-008](#issue-id-sec-008)), hardcoded client maintenance unlock `'AcmeDev@2026'` ([SEC-020](#issue-id-sec-020)), 10-year non-revocable JWTs ([SEC-012](#issue-id-sec-012)), unencrypted `localStorage` PII persistence ([SEC-021](#issue-id-sec-021)), and disabled TLS verification (`CURLOPT_SSL_VERIFYPEER => false`) while streaming salary/PAN context to Gemini ([SEC-004](#issue-id-sec-004)) violate enterprise security baselines.
3. **Lack of Quality Gates, Scalability Ceilings & Runtime React Crashes:** `0` automated tests, `0` CI pipelines, `757` ESLint violations in `src/` (including conditional React hooks and undefined `toast` crashes), `4.62 MB` single-bundle blocking mobile loads, tripled `68.97 MB` APKs, unpooled Postgres connections, and `::uuid` cast errors prevent reliable enterprise scaling.

**Release Gate Recommendation:** Block general production rollout and new onboarding until all **7 Critical** (`SEC-001`, `SEC-002`, `SEC-008`, `SEC-009`, `SEC-010`, `SEC-011`, `SEC-020`) and **Phase B High-priority** security & DB fixes are patched, secret material/credentials tracked or leaked in Git/clients are rotated, baseline automated authorization/API tests pass in CI, and staging `EXPLAIN ANALYZE` + load verification confirm stability under target user concurrency.
