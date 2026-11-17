# HRMS Audit Issue Tracker — Checklist

**As of:** 2026-11-14 (SEC-001–SEC-009 closed after source/CI review and owner-confirmed live testing)  
**Baseline:** [AUDIT_REPORT.md](../AUDIT_REPORT.md) (2026-11-11), [GitHub commits](https://github.com/Kondapaneni/HRMS/commits/main), CI runs and owner-confirmed Android 14 testing.  
**Important:** Original audit is a historical baseline, not an up-to-date closure record. "Pending / not verified" does **not** prove a vulnerability is still exploitable; it means no completed remediation and verification were established in this progress review.

## Progress

- **39 original findings:** 24 security (SEC), 8 performance (PERF), 7 code quality (QUAL).
- **9 closed:** SEC-001 through SEC-009. Owner-confirmed live validation includes six staged SEC-009 checks on 2026-11-14 covering candidate access, ungranted and granted employee features, and admin functionality.
- **2 partially fixed / still open:** SEC-017 and QUAL-002.
- **28 pending / not verified:** No completed remediation and verification established in this progress review.
- **30 still open in total:** 2 partial + 28 pending.
- **9 / 39 closed = 23.1%.** Security 9 / 24 closed (37.5%); performance 0 / 8; quality 0 / 7.
- **4 of the 7 critical-severity findings closed (SEC-001, SEC-002, SEC-008 and SEC-009); 3 critical findings remain open (SEC-010, SEC-011, SEC-020).** HRMS is **not cleared for production** as a whole.

Legend: `[x]` = **CLOSED** in the project issue tracker on the basis of owner confirmation of the completed fix, testing, and live deployment; `[ ]` = **OPEN** (partial or pending). The owner-confirmed live verification for SEC-001–004 is recorded as their testimony, **not an independently repeated production security test** in this session. Previous risk/rollout caveats remain documented and are not erased by closure.

## Security — SEC-001 to SEC-024

- [x] **SEC-001** — Broad Supabase RLS and anonymous client access (**CRITICAL**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Source fixes and focused CI recorded. Owner confirms production/deployed validation; current session has not independently queried live RLS policies or unauthorized access scenarios. [Remediation](SEC-001-remediation.md)
- [x] **SEC-002** — Unauthenticated Supabase email Edge Function (**CRITICAL**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Source fixes and focused CI recorded. Owner confirms database/Edge deployment and testing; current session has not independently inspected live deployment. [Commit](https://github.com/Kondapaneni/HRMS/commit/ca2d13fcdc)
- [x] **SEC-003** — Public document proxies and predictable sensitive filenames (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Source fixes and focused CI recorded. Owner confirms storage access restrictions were deployed and tested; current session has not independently inspected live private-bucket settings. [Remediation](SEC-003-remediation.md)
- [x] **SEC-004** — Insecure Gemini TLS and external personal-data exposure (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Gemini TLS and PII safeguards merged with passing CI; owner confirms live validation. This session did not independently inspect production outbound requests. [Remediation](SEC-004-remediation.md)
- [x] **SEC-005** — Tracked sensitive files and unsafe Docker build context (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Current Git/Docker protection passed focused CI and owner confirms live testing/deployment. **Residual historical credential/data exposure risks and pre-production rotation requirements remain documented**; closure does not imply historical secrets were removed from Git history. [Remediation](SEC-005-remediation.md)
- [x] **SEC-006** — Android backup, HTTP, native JWT storage and Logcat (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Signed APK CI passed and Android 14 device checks passed for background tracking, app reopening, app-process crash recovery, checkout and targeted Logcat patterns. Legacy plaintext-token migration was not runtime-tested; fresh-install development rollout is the accepted scope. [Remediation](SEC-006-remediation.md)
- [x] **SEC-007** — Missing HTTP security headers and wildcard CORS (**MEDIUM**) · **CLOSED — Fixed, deployed and live-tested (2026-11-14)** — PR #17 merged; CI passed. Owner confirmed live headers on / and /manifest.json; unauthorized-origin CORS denial for /version.json, /manifest.json and API preflight; admin login/dashboard/employee/attendance; Google Maps and location markers after refresh; Android check-in/background punch/check-out; and all available document previews/downloads. **Residual:** strict script/resource CSP remains *Report-Only*; the enforced policy covers frame-ancestors/base-uri. Full strict CSP hardening is future work and SEC-022 remains open. [Remediation](SEC-007-remediation.md) · [PR #17](https://github.com/Kondapaneni/HRMS/pull/17)
- [x] **SEC-008** — Email OTP MFA bypass (**CRITICAL**) · **CLOSED — Code merged, CI passed, and owner-confirmed live HRMS testing (2026-11-14)** — PR #20 unifies confirmed MFA checks across password/email OTP, issues only 5-minute pending tokens before TOTP, and denies pending tokens to protected APIs/documents; PR #22 confirms permission/enrollment cases. Owner reported five passed live employee tests: (1) no admin grant → MFA hidden/no prompt, (2) grant without setup → setup visible/no prompt, (3) completed setup → MFA prompt, (4) invalid code rejected/valid code accepted, (5) email OTP requires MFA before dashboard and valid TOTP completes login. Synthetic CI additionally tested administrator MFA protection; **live privileged-admin login was not separately reported**. This closure is owner-confirmed, not an independently repeated production test. Residual OTP at-rest/email queue risks and long-lived JWTs remain in SEC-012/SEC-015. [Remediation](SEC-008-remediation.md) · [PR #20](https://github.com/Kondapaneni/HRMS/pull/20) · [PR #22](https://github.com/Kondapaneni/HRMS/pull/22)
- [x] **SEC-009** — Missing authorization and role restrictions (**CRITICAL**) · **CLOSED — Code merged, CI passed, owner-confirmed live testing (2026-11-14)** — PR #26 enforces explicit route roles, forbids empty role lists, makes sensitive admin reports/performance admin-only, excludes candidates from employee/loan/sales/branch APIs, and checks delegated origination feature grants. Real synthetic HTTP/role CI passed. Owner confirmed six live steps: (1) candidate dashboard/applications/documents still function, (2) candidate receives 403 on employee admin report, (3) candidate receives 403 across five additional restricted APIs, (4) ungranted employee receives 403 across four restricted module endpoints, (5) employee with only Loan Origination grant can access loan API while Sales and Branch Operations return 403, (6) Admin Reports, Performance, Payroll and Dashboard all function. **Owner-reported checks, not independently repeated live tests**; the granted-loan test verifies endpoint authorization, not every loan operation. SEC-010/011/013 remain separate findings. [Remediation](SEC-009-remediation.md) · [PR #26](https://github.com/Kondapaneni/HRMS/pull/26)
- [ ] **SEC-010** — Fail-open feature permissions and SQL interpolation (**CRITICAL**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-011** — Cross-user and cross-branch IDOR (**CRITICAL**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-012** — Long-lived JWTs, logout and password-change security (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-013** — Salary access and assessment authorization/timers (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-014** — Server-side attendance geofences and rate limiting (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-015** — Arbitrary HTML email relay and queued credentials (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-016** — Google Maps/geocoding API key exposure (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-017** — Direct client storage uploads lacking backend validation (**MEDIUM**) · **Partial** — SEC-001 secured browser-to-storage mutation paths in code; live uploads, file validation and authorization remain to be verified. [SEC-001 remediation](SEC-001-remediation.md)
- [ ] **SEC-018** — Emulated SQL prepares, error echoes and runtime DDL (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-019** — Weak IDs, DB isolation and constraints (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-020** — Hardcoded maintenance bypass credential (**CRITICAL**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-021** — Browser localStorage JWT/PII and console logging (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-022** — Maps InfoWindow and HTML XSS sinks (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-023** — Vulnerable frontend npm dependencies (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-024** — Production debug stack traces and diagnostic leaks (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.

## Performance — PERF-001 to PERF-008

- [ ] **PERF-001** — Large frontend bundle and logo (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-002** — Large APK tracked and bundled into website (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-003** — React Query refetching and localStorage persistence (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-004** — Login delay, frequent admin polling and service worker duplication (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-005** — Unbounded Android wakelock and frequent GPS polling (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-006** — Wildcard SQL queries and runtime overhead (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-007** — Sparse indexes and inefficient UUID casts (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-008** — Single-container PHP/database pooling limitations (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.

## Quality — QUAL-001 to QUAL-007

- [ ] **QUAL-001** — ESLint failures and hook/runtime defects (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-002** — Insufficient automated test coverage and CI gates (**HIGH**) · **Partial** — Focused security regression tests and GitHub Actions checks exist; comprehensive frontend, backend and integration test coverage not established. [Workflows](https://github.com/Kondapaneni/HRMS/tree/main/.github/workflows)
- [ ] **QUAL-003** — Large procedural backend route files (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-004** — Hardcoded dashboard trend metrics (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-005** — Global Date modification and duplicate service worker setup (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-006** — Debug/DDL scripts and fragmented migrations (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-007** — UI-only PII masking and placeholder Android app ID (**LOW**) · **Pending / not verified** — No completed remediation plus verification established in this review.

## Closure evidence and remaining release risks

- **SEC-001–SEC-006 (all CLOSED):** On 2026-11-14, the project owner explicitly confirmed that every issue SEC-001 through SEC-006 was **fixed, tested and deployed live**. GitHub contains the code changes, remediation notes and focused CI evidence. Record the user's explicit live-test confirmation as the basis of closure; do **not** imply this session independently inspected all live Supabase migrations, Edge settings or external API telemetry.
- **SEC-005 historical risks:** The [SEC-005 remediation document](SEC-005-remediation.md) records accepted development-only residual risks. Review historical Git/Docker exposures, determine whether real PII or valid secrets were exposed, and rotate affected credentials before real production data or users. Closure here does not mean historical exposures are erased.
- **SEC-006 upgrade scope:** Android 14 and signed APK tracking/security behavior were tested. Migration of a plaintext token from a legacy APK was not tested. The owner has chosen new signed APK installations during development; legacy-upgrade testing is needed if that rollout assumption changes.
- **Remaining three critical findings:** SEC-010, SEC-011, and SEC-020 remain open, so the original audit's **not production ready** assessment still applies.
- **SEC-007:** Closed on 2026-11-14 after source/CI and owner-confirmed live checks for headers, untrusted CORS origins, admin pages, Google Maps, native tracking, and available document downloads. The stricter script/resource CSP remains *Report-Only*, not enforced; plan a separately tested CSP hardening follow-up, and do not treat SEC-022 XSS risks as fixed.
- **SEC-008:** Closed 2026-11-14 after verified source/CI plus owner-reported five-step live employee MFA enrollment and login testing, including the original email OTP bypass path. Admin-account bypass was covered by synthetic CI, not by a separately reported live admin test; do not infer more than tested.
- **SEC-009:** Closed on 2026-11-14 following merged role/feature route restrictions, successful synthetic HTTP/role CI, and six owner-confirmed live HRMS verification steps spanning candidate denial, employee feature restrictions, and working admin functionality. This is owner-confirmed rather than an independent production penetration test; record-level security remains separately tracked in SEC-011/013.
- **SEC-017, QUAL-002:** Marked PARTIAL, not closed. SEC-017 has safer storage mutation code linked to SEC-001; QUAL-002 has focused CI but not complete test coverage.

## Evidence

- [SEC-001 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43388981505)
- [SEC-002 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43399397060)
- [SEC-003 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43404100799)
- [SEC-004 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43423452540)
- [SEC-005 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43427290070)
- [SEC-006 CI + signed APK publish](https://github.com/Kondapaneni/HRMS/actions/runs/43494506110)
