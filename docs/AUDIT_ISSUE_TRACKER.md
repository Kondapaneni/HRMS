# HRMS Audit Issue Tracker — Checklist

**As of:** 2026-11-14 (reconciled with screenshot of earlier HRMS audit progress supplied by the project owner)  
**Baseline:** [AUDIT_REPORT.md](../AUDIT_REPORT.md) (2026-11-11), [GitHub commits](https://github.com/Kondapaneni/HRMS/commits/main), CI runs and owner-confirmed Android 14 testing.  
**Important:** Original audit is a historical baseline, not an up-to-date closure record. "Pending / not verified" does **not** prove a vulnerability is still exploitable; it means no completed remediation and verification were established in this progress review.

## Progress

- **39 total:** 24 SEC, 8 PERF, 7 QUAL.
- **6 findings previously recorded as Fixed / development closed:** SEC-001 through SEC-006. The owner's earlier audit screenshot explicitly labels SEC-001 through SEC-004 "Fixed"; SEC-005 and SEC-006 were subsequently closed for development.
- **2 development closures supported by completed scope-limited verification:** SEC-005 (owner-accepted residual risk) and SEC-006 (Android 14 release-device testing).
- **4 fixes needing deployment / live security verification to establish full closure:** SEC-001, SEC-002, SEC-003, SEC-004. Their *previously recorded Fixed* designation is preserved; it is **not** proof that live database migrations, Edge Function deployment or security regression checks happened.
- **2 partially remediated:** SEC-017 and QUAL-002.
- **31 pending / not verified:** no completed fix/verification established by this review.
- **0 of 7 critical findings independently verified fully closed.** This tracker does not declare HRMS production ready.

Legend: `[x]` = **previously recorded Fixed in owner-provided audit history or closed for development**; `[ ]` = not so recorded. This checkbox is a **fix-progress marker, not a production security sign-off**. See each item's remaining deployment/verification requirements.

## Security — SEC-001 to SEC-024

- [x] **SEC-001** — Broad Supabase RLS and anonymous client access (**CRITICAL**) · **Fixed (previous audit record); deployment verification pending** — Earlier tracker screenshot marks Fixed and new backend protections are merged. Still need to confirm Supabase RLS migration was applied and unauthorized live access is denied. [Remediation](SEC-001-remediation.md)
- [x] **SEC-002** — Unauthenticated Supabase email Edge Function (**CRITICAL**) · **Fixed (previous audit record); deployment verification pending** — Earlier tracker screenshot marks Fixed and email webhook hardening is committed. Still need to confirm queue-token migration, Edge Function deployment and live relay-denial tests. [Commit](https://github.com/Kondapaneni/HRMS/commit/ca2d13fcdc)
- [x] **SEC-003** — Public document proxies and predictable sensitive filenames (**HIGH**) · **Fixed (previous audit record); deployment verification pending** — Earlier tracker screenshot marks Fixed; access-controlled PHP file proxies are merged. Still need to confirm private-bucket migration and live cross-user/anonymous access tests. [Remediation](SEC-003-remediation.md)
- [x] **SEC-004** — Insecure Gemini TLS and external personal-data exposure (**HIGH**) · **Fixed (previous audit record); live validation pending** — Earlier tracker screenshot marks Fixed; Gemini TLS/PII safeguards and FAQ fallback are merged and focused CI passed. Still confirm live chatbot and transport behavior. [Remediation](SEC-004-remediation.md)
- [x] **SEC-005** — Tracked sensitive files and unsafe Docker build context (**HIGH**) · **Closed for development** — Current-tree and Docker secret exposure mitigated; accepted residual historical risk, credential rotation and history/image review before production. [Remediation](SEC-005-remediation.md)
- [x] **SEC-006** — Android backup, HTTP, native JWT storage and Logcat (**HIGH**) · **Closed for development** — Five original Android native vulnerabilities fixed; signed APK and Android 14 tracking/security/recovery tested. Legacy token migration not runtime-tested; fresh-install rollout. [Remediation](SEC-006-remediation.md)
- [ ] **SEC-007** — Missing HTTP security headers and wildcard CORS (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-008** — Email OTP MFA bypass (**CRITICAL**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-009** — Missing authorization and role restrictions (**CRITICAL**) · **Pending / not verified** — No completed remediation plus verification established in this review.
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

## Development closure and production caveats

- **Historical status reconciliation:** The project owner supplied an image of the earlier audit tracker showing SEC-001, SEC-002, SEC-003 and SEC-004 as "Fixed". Those are now checked as *recorded fixed*. This is evidence of a prior progress assessment, not evidence of the live production configuration. Do not interpret `[x]` for these four findings as security validation or permission to launch.
- **SEC-005:** The project owner accepted historical-secret exposure risks during development. Historical Git/cache/image review and credential rotation remain mandatory before using real production data.
- **SEC-006:** The user successfully tested the signed APK on Android 14, native tracking, app reopening, Android process crash recovery, checkout, and targeted Logcat leak patterns. The original native fixes are present in source and GitHub build checks passed. A legacy plaintext-token migration runtime test is not necessary for a fresh-install-only development rollout; perform it if upgrading legacy employee devices. Targeted checks are not a full independent penetration test.
- **SEC-001, SEC-002, SEC-003:** Prior tracker marks Fixed. SQL migrations and live Supabase/Edge configuration must still be verified independently; GitHub merges do not execute migrations automatically.
- **SEC-004:** Prior tracker marks Fixed and source/CI verified, but live chatbot validation and third-party telemetry validation remain.
- **SEC-017, QUAL-002:** Existing changes address only part of their original audit scope.

## Evidence

- [SEC-001 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43388981505)
- [SEC-002 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43399397060)
- [SEC-003 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43404100799)
- [SEC-004 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43423452540)
- [SEC-005 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43427290070)
- [SEC-006 CI + signed APK publish](https://github.com/Kondapaneni/HRMS/actions/runs/43494506110)
