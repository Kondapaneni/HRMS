# ACME HRMS — Consolidated Audit, Issue Status and Remediation Report

**Consolidated:** 2026-11-17 · **Original static audit:** 2026-11-11 · **Repository:** `Kondapaneni/HRMS`

This is the **single audit and issue-evidence report**. It contains the latest reconciled status, the full original 39-finding audit baseline, owner-reported live checks, CI/source evidence, detailed SEC remediation history, applicable security change-control notes, and the Android APK distribution guide, and the secure Candidate Offer Letter portal guide. The original static audit is **historical**, not evidence that a fixed issue remains exploitable. Closure does **not** mean all operational/release risks are resolved or that an independent production penetration test occurred.

**Documentation cleanup scope:** All 26 former Markdown documents from `docs/` are preserved in this report, with their historical notes distinguished from current issue status. The working-branch cleanup deletes their redundant copies; `README.md`, code, tests, migrations, workflows and other application files remain untouched.

## Current consolidated status — 2026-11-17

- **39 original findings:** 24 security (SEC-001–SEC-024), 8 performance (PERF-001–PERF-008), and 7 quality (QUAL-001–QUAL-007).
- **20 closed / 39 (51.3%):** SEC-001 through SEC-020 at their *documented* security scope; **20 / 24 security findings (83.3%)**. All seven original critical-severity findings are closed at their recorded scopes.
- **19 still open:** SEC-021–SEC-024, PERF-001–PERF-008, QUAL-001–QUAL-007. QUAL-002 has a partial improvement but is **not closed**. No PERF or QUAL finding is marked closed.
- **SEC-019 reconciliation:** the separate tracker predated final owner-confirmed SEC-019 closure. On 2026-11-17, the [SEC-019 closure record](#sec-019-remediation-and-verification) reports PR #70's deployed single squash commit, complete live steps 4A–4F, database checks, and accepted follow-ups. This supersedes the old pending status.
- **Important residuals:** SEC-018 backup/restore recovery not independently verified (owner accepted risk); SEC-015 historical queued credentials/rotation needs separate release work; SEC-005 historical exposure/rotation may remain; legacy SEC-019 loan document aliases and retired cleanup-function record remain. Overall **HRMS is not granted production readiness** by this report.

## Security issue index

| Issue | Current status | Details |
| --- | --- | --- |
| [SEC-001](#issue-id-sec-001) | Closed at documented scope | [Remediation and evidence](#sec-001-remediation-and-verification) |
| [SEC-002](#issue-id-sec-002) | Closed at documented scope | [Remediation and evidence](#sec-002-remediation-and-verification) |
| [SEC-003](#issue-id-sec-003) | Closed at documented scope | [Remediation and evidence](#sec-003-remediation-and-verification) |
| [SEC-004](#issue-id-sec-004) | Closed at documented scope | [Remediation and evidence](#sec-004-remediation-and-verification) |
| [SEC-005](#issue-id-sec-005) | Closed at documented scope | [Remediation and evidence](#sec-005-remediation-and-verification) |
| [SEC-006](#issue-id-sec-006) | Closed at documented scope | [Remediation and evidence](#sec-006-remediation-and-verification) |
| [SEC-007](#issue-id-sec-007) | Closed at documented scope | [Remediation and evidence](#sec-007-remediation-and-verification) |
| [SEC-008](#issue-id-sec-008) | Closed at documented scope | [Remediation and evidence](#sec-008-remediation-and-verification) |
| [SEC-009](#issue-id-sec-009) | Closed at documented scope | [Remediation and evidence](#sec-009-remediation-and-verification) |
| [SEC-010](#issue-id-sec-010) | Closed at documented scope | [Remediation and evidence](#sec-010-remediation-and-verification) |
| [SEC-011](#issue-id-sec-011) | Closed at documented scope | [Remediation and evidence](#sec-011-remediation-and-verification) |
| [SEC-012](#issue-id-sec-012) | Closed at documented scope | [Remediation and evidence](#sec-012-remediation-and-verification) |
| [SEC-013](#issue-id-sec-013) | Closed at documented scope | [Remediation and evidence](#sec-013-remediation-and-verification) |
| [SEC-014](#issue-id-sec-014) | Closed at documented scope | [Remediation and evidence](#sec-014-remediation-and-verification) |
| [SEC-015](#issue-id-sec-015) | Closed at documented scope | [Remediation and evidence](#sec-015-remediation-and-verification) |
| [SEC-016](#issue-id-sec-016) | Closed at documented scope | [Remediation and evidence](#sec-016-remediation-and-verification) |
| [SEC-017](#issue-id-sec-017) | Closed at documented scope | [Remediation and evidence](#sec-017-remediation-and-verification) |
| [SEC-018](#issue-id-sec-018) | Closed at documented scope | [Remediation and evidence](#sec-018-remediation-and-verification) |
| [SEC-019](#issue-id-sec-019) | Closed at documented scope | [Remediation and evidence](#sec-019-remediation-and-verification) |
| [SEC-020](#issue-id-sec-020) | Closed at documented scope | [Remediation and evidence](#sec-020-remediation-and-verification) |
| [SEC-021](#issue-id-sec-021) | Open / no verified closure | [Remediation status](#sec-021-remediation-and-verification) |
| [SEC-022](#issue-id-sec-022) | Open / no verified closure | [Remediation status](#sec-022-remediation-and-verification) |
| [SEC-023](#issue-id-sec-023) | Open / no verified closure | [Remediation status](#sec-023-remediation-and-verification) |
| [SEC-024](#issue-id-sec-024) | Open / no verified closure | [Remediation status](#sec-024-remediation-and-verification) |

For the eight PERF findings and seven QUAL findings, see the [original audit baseline](#historical-audit-baseline-2026-11-11) and the [current progress tracker](#current-progress-tracker-and-closure-evidence). No undocumented live validation is implied.

## Current progress tracker and closure evidence

### HRMS Audit Issue Tracker — Checklist

**As of:** 2026-11-17, reconciled with the later SEC-019 final closure commit `54eb2e58e6982868ccbd9f5e6a45f9f765215ce5`.
**Baseline:** [AUDIT_REPORT.md](#historical-audit-baseline-2026-11-11) (2026-11-11), [GitHub commits](https://github.com/Kondapaneni/HRMS/commits/main), CI runs and owner-confirmed Android 14 testing.  
**Important:** Original audit is a historical baseline, not an up-to-date closure record. "Pending / not verified" does **not** prove a vulnerability is still exploitable; it means no completed remediation and verification were established in this progress review.

#### Progress

- **39 original findings:** 24 security (SEC), 8 performance (PERF), 7 code quality (QUAL).
- **20 closed:** SEC-001 through SEC-020, each at its documented verification scope. SEC-019 closed on 2026-11-17 after owner-led live checks, deployed code/CI and independent read-only database postconditions. **SEC-018 recovery remains unverified and its residual risk explicitly accepted.** SEC-015 historical credential/queue risk remains separate release work.
- **1 partially fixed / still open:** QUAL-002.
- **18 pending / not verified:** No completed remediation plus verification established in this progress review.
- **19 still open in total:** 1 partial (QUAL-002) + 18 pending.
- **20 / 39 closed = 51.3%.** Security 20 / 24 closed (83.3%); performance 0 / 8; quality 0 / 7.
- **All 7 of the 7 original critical-severity findings closed** (SEC-001, SEC-002, SEC-008, SEC-009, SEC-010, SEC-011 and SEC-020). **This does not clear HRMS for production**: open high/medium findings, credential rotation and wider release gates remain.

Legend: `[x]` = **CLOSED** in the project issue tracker at its stated, verified scope; a closure explicitly marked **risk accepted** means an identified residual is deliberately deferred rather than tested or resolved. `[ ]` = **OPEN** (partial or pending). The owner-confirmed live verification for SEC-001–004 and SEC-018 is testimony, **not an independently repeated production penetration test**. Previous risk/rollout caveats remain documented and are not erased by closure.

#### Security — SEC-001 to SEC-024

- [x] **SEC-001** — Broad Supabase RLS and anonymous client access (**CRITICAL**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Source fixes and focused CI recorded. Owner confirms production/deployed validation; current session has not independently queried live RLS policies or unauthorized access scenarios. [Remediation](#sec-001-remediation-and-verification)
- [x] **SEC-002** — Unauthenticated Supabase email Edge Function (**CRITICAL**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Source fixes and focused CI recorded. Owner confirms database/Edge deployment and testing; current session has not independently inspected live deployment. [Commit](https://github.com/Kondapaneni/HRMS/commit/ca2d13fcdc)
- [x] **SEC-003** — Public document proxies and predictable sensitive filenames (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Source fixes and focused CI recorded. Owner confirms storage access restrictions were deployed and tested; current session has not independently inspected live private-bucket settings. [Remediation](#sec-003-remediation-and-verification)
- [x] **SEC-004** — Insecure Gemini TLS and external personal-data exposure (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Gemini TLS and PII safeguards merged with passing CI; owner confirms live validation. This session did not independently inspect production outbound requests. [Remediation](#sec-004-remediation-and-verification)
- [x] **SEC-005** — Tracked sensitive files and unsafe Docker build context (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Current Git/Docker protection passed focused CI and owner confirms live testing/deployment. **Residual historical credential/data exposure risks and pre-production rotation requirements remain documented**; closure does not imply historical secrets were removed from Git history. [Remediation](#sec-005-remediation-and-verification)
- [x] **SEC-006** — Android backup, HTTP, native JWT storage and Logcat (**HIGH**) · **CLOSED — Fixed, tested, deployed live (owner-confirmed 2026-11-14)** — Signed APK CI passed and Android 14 device checks passed for background tracking, app reopening, app-process crash recovery, checkout and targeted Logcat patterns. Legacy plaintext-token migration was not runtime-tested; fresh-install development rollout is the accepted scope. [Remediation](#sec-006-remediation-and-verification)
- [x] **SEC-007** — Missing HTTP security headers and wildcard CORS (**MEDIUM**) · **CLOSED — Fixed, deployed and live-tested (2026-11-14)** — PR #17 merged; CI passed. Owner confirmed live headers on / and /manifest.json; unauthorized-origin CORS denial for /version.json, /manifest.json and API preflight; admin login/dashboard/employee/attendance; Google Maps and location markers after refresh; Android check-in/background punch/check-out; and all available document previews/downloads. **Residual:** strict script/resource CSP remains *Report-Only*; the enforced policy covers frame-ancestors/base-uri. Full strict CSP hardening is future work and SEC-022 remains open. [Remediation](#sec-007-remediation-and-verification) · [PR #17](https://github.com/Kondapaneni/HRMS/pull/17)
- [x] **SEC-008** — Email OTP MFA bypass (**CRITICAL**) · **CLOSED — Code merged, CI passed, and owner-confirmed live HRMS testing (2026-11-14)** — PR #20 unifies confirmed MFA checks across password/email OTP, issues only 5-minute pending tokens before TOTP, and denies pending tokens to protected APIs/documents; PR #22 confirms permission/enrollment cases. Owner reported five passed live employee tests: (1) no admin grant → MFA hidden/no prompt, (2) grant without setup → setup visible/no prompt, (3) completed setup → MFA prompt, (4) invalid code rejected/valid code accepted, (5) email OTP requires MFA before dashboard and valid TOTP completes login. Synthetic CI additionally tested administrator MFA protection; **live privileged-admin login was not separately reported**. This closure is owner-confirmed, not an independently repeated production test. SEC-012 subsequently closed the OTP-verifier-at-rest and long-lived JWT findings; queued OTP/email exposure remains in SEC-015. [Remediation](#sec-008-remediation-and-verification) · [PR #20](https://github.com/Kondapaneni/HRMS/pull/20) · [PR #22](https://github.com/Kondapaneni/HRMS/pull/22)
- [x] **SEC-009** — Missing authorization and role restrictions (**CRITICAL**) · **CLOSED — Code merged, CI passed, owner-confirmed live testing (2026-11-14)** — PR #26 enforces explicit route roles, forbids empty role lists, makes sensitive admin reports/performance admin-only, excludes candidates from employee/loan/sales/branch APIs, and checks delegated origination feature grants. Real synthetic HTTP/role CI passed. Owner confirmed six live steps: (1) candidate dashboard/applications/documents still function, (2) candidate receives 403 on employee admin report, (3) candidate receives 403 across five additional restricted APIs, (4) ungranted employee receives 403 across four restricted module endpoints, (5) employee with only Loan Origination grant can access loan API while Sales and Branch Operations return 403, (6) Admin Reports, Performance, Payroll and Dashboard all function. **Owner-reported checks, not independently repeated live tests**; the granted-loan test verifies endpoint authorization, not every loan operation. SEC-010/011/013 remain separate findings. [Remediation](#sec-009-remediation-and-verification) · [PR #26](https://github.com/Kondapaneni/HRMS/pull/26)
- [x] **SEC-010** — Fail-open feature permissions and SQL interpolation (**CRITICAL**) · **CLOSED — Fix merged, isolated CI and regression CI passed, owner-confirmed live verification (2026-11-14)** — PR #29 allowlists 11 configured feature columns, denies unknown/malformed permission keys, treats PostgreSQL false flags correctly, and returns sanitized 503 if the database cannot verify feature grants or active account status. Synthetic CI tested granted/denied features, SQL errors, missing users and disconnected database; SEC-008/009 regression CI also passed. The project owner confirmed four live checks: (1) Admin Dashboard and Feature Access work after Render deployment; (2) an ungranted employee receives 403 on Loan Origination while Employee Dashboard works; (3) after granting Loan Origination the same test employee receives 200 and the Loan page works; (4) after revoking the grant, the **existing employee session**, without logging out or refreshing, immediately receives 403. **Owner-reported live results, not independent penetration testing**; deliberately disrupting the live database was avoided, with failure cases tested in isolated CI. SEC-011 and SEC-012 were subsequently closed on their own evidence; SEC-018 remains open. [Remediation](#sec-010-remediation-and-verification) · [PR #29](https://github.com/Kondapaneni/HRMS/pull/29)
- [x] **SEC-011** — Cross-user and cross-branch IDOR (**CRITICAL**) · **CLOSED — Fix merged, two-branch HTTP/DB CI passed, owner-confirmed live authorization regression (2026-11-14)** — PR #32 enforces creator AND current branch for delegated loan drafts, lists, documents, status and deletion; branch-scoped Branch Operations edits; and branch-permission-controlled activity reassignment, retaining explicit admin exceptions. Owner reported: (1) employee's own synthetic development loans/dashboard work; (2) another employee in the same branch cannot see a foreign loan; (3) foreign loan document endpoint returns 404 to a non-owner using an empty-document request; (4) employee in another branch cannot see a foreign loan while own branch data works; (5A) personal activities 200 / branch activities 403 without branch grant; (5B) branch activities 200 with grant; (5C) Branch Operations applications 200 with grant and cross-branch foreign loan hidden; (6) Admin Dashboard and Feature Access operate normally. A temporary 403 in 5C was traced to feature-permission setup and passed after enabling the proper grant for that account. **Evidence boundary:** Live tests were owner-reported and primarily read-only; destructive/unauthorized mutations and admin backend overrides were tested on isolated synthetic two-branch PostgreSQL CI, not on real customer data. Admin is a feature-permission manager and does not have employee-module navigation; no such navigation was required for Step 6. SEC-012 and SEC-020 were subsequently closed; SEC-013/017/018 remain separately tracked. [Remediation](#sec-011-remediation-and-verification) · [PR #32](https://github.com/Kondapaneni/HRMS/pull/32)
- [x] **SEC-012** — Long-lived JWTs, logout and password-change security (**HIGH**) · **CLOSED — Code merged, migration applied, development deployment and owner-confirmed browser/Android 14 verification passed (2026-11-14)** — [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) implemented bounded JWTs, version-based account revocation, hashed email OTP verifiers, web/native rotating refresh; [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) added reachable Admin/Employee Change Password UI. Green synthetic PostgreSQL/auth/RLS/frontend CI and Android debug-build CI. Live development Employee tests confirmed: logout and password-change/reset replayed JWTs returned 401; missing/wrong current password denied; old passwords rejected; OTP HMAC storage verified with read-only SQL (no plaintext verifier), MFA required after email OTP, invalid MFA denied and valid MFA accepted, OTP reuse returned 400; web refresh rotation, secure HttpOnly cookie and header gate verified; bounded JWT and naturally expired JWT rejected; private-file anonymous 401 and unowned synthetic-file 403. Android 14 owner verified current debug APK login/MFA, session persisted after app restart, background location punches continued across a 15-minute JWT expiry without reopening, Supabase showed a current-version native refresh rotation, checkout cleared the notification, and zero further punches occurred in six minutes. Supabase settings independently reconfirmed: `session_timeout=never` (one-hour access + 14-day refresh), tracking 2 minutes, maintenance OFF. **Evidence limits:** Owner-reported live tests plus read-only DB verification, not a production penetration test; synthetic CI covers candidate flows, historical ten-year signed-token rejection, replay-chain invalidation and absolute refresh expiry. A properly signed replacement distribution APK is still outstanding; Historical SEC-015 email-queue credential exposure and SEC-021 web localStorage access-JWT risks remain separate release concerns. [Remediation](#sec-012-remediation-and-verification)
- [x] **SEC-013** — Salary access and assessment authorization/timers (**HIGH**) · **CLOSED — Fixes deployed, focused synthetic CI passed, owner-confirmed development live verification and cleanup (2026-11-15)** — [PR #43](https://github.com/Kondapaneni/HRMS/pull/43) applies live payroll-feature authorization, backend salary/detail/payslip/timeline redaction, compensation-write restrictions, assessment assignment/owner validation, and PostgreSQL-enforced timed save/submit with 30-second grace and row locks. [PR #44](https://github.com/Kondapaneni/HRMS/pull/44) corrects UTC-vs-IST assessment dates and midnight refresh, tested at 01:04 IST. Focused SEC-013 synthetic authenticated HTTP/PostgreSQL CI, SEC-009 cross-role regressions, India-midnight frontend CI and production frontend builds passed; Render development deploy was independently confirmed live. Owner reported live PASSED: Admin salary/directory; assets-only and employees-only no-payroll salary redaction/detail/payslips/timeline; fake-UUID salary-edit/promotion 403; payroll ON allowed salary read then OFF removed access on the **same employee session**; unassigned assessment hidden/detail 404/start 403; authorized assigned assessment start, timer and successful submission; foreign completed attempt result 404; dedicated 1-minute synthetic attempt expired save 403, submit 403 and resume 403 with original attempt unchanged. Cleanup confirmed: timer assessment Archived with expired record preserved; other synthetic assessments retained/archived appropriately; Payroll/Employees/Assets temporary test grants restored; employee and Admin interfaces still work. **Evidence boundary:** Live checks and cleanup are **owner-reported**, not an independently reproduced production penetration test. Live denied salary writes used fake UUIDs; broader unauthorized mutations/expiry/revocation scenarios were tested in isolated synthetic CI. No real-user production clearance. [Remediation](#sec-013-remediation-and-verification)
- [x] **SEC-014** — Server-side attendance geofences and rate limiting (**MEDIUM**) · **CLOSED — Fix merged, isolated HTTP/PostgreSQL CI passed, Render development deployment live, and owner-confirmed safe live verification/cleanup (2026-11-15)** — [PR #46](https://github.com/Kondapaneni/HRMS/pull/46) enforces server-side Haversine checks for geofence-enabled check-in/out before attendance writes, while retaining permitted roaming interval punches. Credential throttling uses hashed normalized account plus socket-peer identities instead of attacker-supplied forwarding headers; map quotas use authenticated employee identity. [Final focused SEC-014 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43682349266) and the associated security/Android regressions passed. Owner reported development checks: geofence ON with saved office; missing-GPS and synthetic offsite check-ins each returned 403 with attendance unchanged; genuine inside-office check-in 200, one authorized interval punch 200, and inside-office checkout 200 with the same attendance record and location markers preserved; Admin rate-limit settings were unchanged, authenticated map-status returned 200, and Admin/Employee regressions, completed test attendance and tracking cleanup passed. The **offsite interval-punch allowance was verified in isolated CI only** (the live offsite attempt was deliberately skipped); login/OTP/reset abuse was not attempted live. **Evidence boundary:** Live results and GPS position were owner-reported, not independently attested or production penetration-tested; company-wide geofences are not branch-assigned, and claimed GPS coordinates do not prove physical presence. [Remediation](#sec-014-remediation-and-verification)
- [x] **SEC-015** — Arbitrary HTML email relay and queued credentials (**HIGH**) · **CLOSED for verified development-remediation scope (2026-11-15)** — [PR #48](https://github.com/Kondapaneni/HRMS/pull/48) merged with passing focused synthetic HTTP/PostgreSQL/frontend and related regression CI; Render development fix deployed. Server-owned email templates and allowlisted `{applicationId,type}` reject caller-supplied recipients/HTML, enforce status/document checks and a per-user quota; HTML placeholders and promotion fragments are escaped. Employee onboarding rejects initial-password input and sends a one-hour single-use setup invitation; reset atomically consumes the token and revokes old sessions. Owner reported live Steps 1A–1D, 2A–2F, 3A–3J and 4A PASSED: Admin read-only regressions; anonymous email 401, forbidden email payloads 400, missing synthetic application 404; controlled test invitation without plaintext password, secure password creation, token replay rejection, successful test login, test-account deactivation and existing-session access block. Synthetic test account is blocked but retained for audit. **Residual separate release risk:** old `email_queue` contents/backups may contain plaintext passwords, OTPs or reset URLs; review and rotate affected credentials under an approved maintenance/retention process. New setup links are plaintext in the outbound queue until consumed/expired. **No production clearance.** [Remediation](#sec-015-remediation-and-verification) · [PR #48](https://github.com/Kondapaneni/HRMS/pull/48)
- [x] **SEC-016** — Google Maps/geocoding API key exposure (**MEDIUM**) · **CLOSED for verified development security-remediation scope (2026-11-15)** — Code merged in [PR #51](https://github.com/Kondapaneni/HRMS/pull/51); server Geocoding/legacy keys removed from attendance/geofence JSON; authenticated runtime browser-config supplies a separate Maps JavaScript key, with unauthenticated access returning 401 and `Cache-Control: no-store`. Owner confirmed Admin Attendance location API 200 without key fields, Employee geofences 200 without key fields, working Admin/Employee Web and Android 14 maps, including after legacy `GOOGLE_MAPS_API_KEY` removal from Render DEV and subsequent deletion of old unrestricted Google Cloud key. Browser key is website- and Maps-JavaScript-API-restricted; Geocoding backend key is Geocoding-API- and Render outbound CIDR-restricted (the ranges are shared, not exclusive). One approved synthetic request triggered backend Geocoding using the new credential: Google Cloud reported `2xx` and `grpc_status_code=0`; the request was denied as an attendance punch (400), with no attendance mutation. Geocoding v3 daily quota was set to 1,000 requests. **Evidence boundary:** Google service success is verified by owner-reported metrics, but the parsed/stored formatted address was not independently verified; this is a documented functional follow-up, not a basis for claiming production clearance. No independent production security assessment. [Remediation](#sec-016-remediation-and-verification)
- [x] **SEC-017** — Direct client storage uploads lacking backend validation (**MEDIUM**) · **CLOSED for verified development security-remediation scope (2026-11-16)** — [PR #54](https://github.com/Kondapaneni/HRMS/pull/54) replaced browser-supplied Storage object names with backend-minted 128-bit random suffixes, propagated the returned stored paths to upload consumers and added signature-validated AVIF support; [PR #55](https://github.com/Kondapaneni/HRMS/pull/55) requires the upstream Storage DELETE response to confirm the exact requested object, returning failure when confirmation is absent. SEC-017 focused PHP/source/isolated HTTP/frontend CI and related regression CI passed for both PRs. Render HRMS development deployment was independently checked **Live** at commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`. Owner reported passing read-only Admin/Employee/Recruitment/training UI regression, synthetic Admin/Employee/Candidate uploads with server-created names, authorized access and delete checks, forbidden folder 403, fake AVIF 415, path traversal 400 and final browser marker cleanup. Initial Admin delete HTTP 200 / image GET 404 did **not** demonstrate Storage removal; read-only SQL found one remaining synthetic PNG, subsequently removed individually through the Storage dashboard with owner confirmation, motivating PR #55. After PR #55, an authorized Admin synthetic delete returned HTTP 200 and an independent read-only Supabase query verified **0** remaining `sec017-admin-*`, `%/sec017-employee-*` and `%/sec017-candidate-*` objects. **Evidence boundary:** owner-reported browser/API tests plus independently observed GitHub CI, Render deployment and read-only Storage metadata; upstream deletion failure cases were covered in isolated tests, not induced live. No historical objects were deleted; three previously unmatched avatars remain retained pending dependency/retention review. **Not production clearance.** [SEC-017 hardening and historical audit](#sec-017-remediation-and-verification)
- [x] **SEC-018** — Emulated SQL prepares, error echoes, runtime DDL and refresh replay hardening (**HIGH**) · **CLOSED — Verified security-remediation scope; backup/restore recovery risk explicitly ACCEPTED by owner (2026-11-17).** PRs [#58](https://github.com/Kondapaneni/HRMS/pull/58), [#59](https://github.com/Kondapaneni/HRMS/pull/59), [#60](https://github.com/Kondapaneni/HRMS/pull/60) deployed restricted DB role/signed audit, scoped query authorization, native PDO prepared statements on the session pooler, and sanitized error handling. [PR #61](https://github.com/Kondapaneni/HRMS/pull/61) removed the 30-second consumed-refresh-token replay grace with immediate affected-refresh-family revocation; isolated PostgreSQL 16/17, HTTP and web/Android CI passed. Owner-confirmed development Admin Dashboard/Settings, Employee/Candidate role/API checks, cross-branch loan-list and foreign-document denial, Employee B natural refresh without re-login after token expiry, and Android 14 UI regression passed. Live direct foreign-loan **mutations were intentionally not attempted**; synthetic two-branch CI covered denied object writes/deletes, and there is no independent live penetration test. **RECOVERY EXCEPTION (accepted, not verified):** operator created and validated a 262 KB AES-256-encrypted local app-schema dump, but an independent/off-device copy was not confirmed; the local disposable restore rehearsal failed on CLI handling and was not completed. Owner expressly requested NO FURTHER database backup or restore work and authorized SEC-018 issue closure despite this limitation. Do not represent the encrypted archive as a tested recovery capability or HRMS as production-ready. Restore-script corrections remain unmerged in draft [PR #62](https://github.com/Kondapaneni/HRMS/pull/62); no database changes or new backup actions are authorized. [R01 deployment and owner acceptance evidence](https://github.com/Kondapaneni/HRMS/pull/61).
- [x] **SEC-019** — Weak employee IDs, DB isolation and integrity constraints (**MEDIUM**) · **CLOSED — owner-verified live 2026-11-17**, after PRs #66, #67, #70, nine green workflows, Render deployment and scoped database integrity/postcondition checks. The separately authorized DEV data reset and retired HTTP-410 cleanup-function record are documented in [SEC-019 detail](#sec-019-remediation-and-verification). Legacy loan-document aliases remain a future investigation; closure is scoped, not whole-product clearance.
- [x] **SEC-020** — Hardcoded maintenance bypass credential (**CRITICAL**) · **CLOSED — Source fixes merged, CI passed, deployed and owner-confirmed live verification (2026-11-14)** — [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) removed the hardcoded developer password, hidden unlock and browser bypass, and added DB-verified active-Admin-only PHP middleware returning 503 to non-admin protected API calls during maintenance. First live testing found missing business-module notices and a Refresh/login redirect; [PR #37](https://github.com/Kondapaneni/HRMS/pull/37) fixed both with a shared application-level maintenance notice and status recheck without browser reload. Focused source/production-bundle/isolated PostgreSQL CI, frontend route matrix and earlier cross-issue security regressions passed. Owner confirmed: normal mode works; Loan/Sales/Branch Operations notices appear when ON; Refresh stays on notice without logout; development employee protected Profile API returns HTTP 503; active Admin Dashboard/Settings work and can turn maintenance OFF; employee session recovers without login; setting the obsolete browser bypass localStorage flag to `true` still shows the notice; and the test flag was removed. **Last confirmed live setting: Maintenance Mode OFF.** Evidence is owner-reported rather than independently reproduced live; a second simultaneous 503 request with the legacy flag set was not reported, but backend bypass independence is covered in code and CI. **Limits:** PHP `/api/*` gate is not a lock on direct Supabase access; historical embedded password still exists in old Git/audit and should be rotated anywhere reused. [Remediation](#sec-020-remediation-and-verification) · [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) · [PR #37](https://github.com/Kondapaneni/HRMS/pull/37)
- [ ] **SEC-021** — Browser localStorage JWT/PII and console logging (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-022** — Maps InfoWindow and HTML XSS sinks (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-023** — Vulnerable frontend npm dependencies (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **SEC-024** — Production debug stack traces and diagnostic leaks (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.

#### Performance — PERF-001 to PERF-008

- [ ] **PERF-001** — Large frontend bundle and logo (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-002** — Large APK tracked and bundled into website (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-003** — React Query refetching and localStorage persistence (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-004** — Login delay, frequent admin polling and service worker duplication (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-005** — Unbounded Android wakelock and frequent GPS polling (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-006** — Wildcard SQL queries and runtime overhead (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-007** — Sparse indexes and inefficient UUID casts (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **PERF-008** — Single-container PHP/database pooling limitations (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.

#### Quality — QUAL-001 to QUAL-007

- [ ] **QUAL-001** — ESLint failures and hook/runtime defects (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-002** — Insufficient automated test coverage and CI gates (**HIGH**) · **Partial** — Focused security regression tests and GitHub Actions checks exist; comprehensive frontend, backend and integration test coverage not established. [Workflows](https://github.com/Kondapaneni/HRMS/tree/main/.github/workflows)
- [ ] **QUAL-003** — Large procedural backend route files (**HIGH**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-004** — Hardcoded dashboard trend metrics (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-005** — Global Date modification and duplicate service worker setup (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-006** — Debug/DDL scripts and fragmented migrations (**MEDIUM**) · **Pending / not verified** — No completed remediation plus verification established in this review.
- [ ] **QUAL-007** — UI-only PII masking and placeholder Android app ID (**LOW**) · **Pending / not verified** — No completed remediation plus verification established in this review.

#### Closure evidence and remaining release risks

- **SEC-001–SEC-006 (all CLOSED):** On 2026-11-14, the project owner explicitly confirmed that every issue SEC-001 through SEC-006 was **fixed, tested and deployed live**. GitHub contains the code changes, remediation notes and focused CI evidence. Record the user's explicit live-test confirmation as the basis of closure; do **not** imply this session independently inspected all live Supabase migrations, Edge settings or external API telemetry.
- **SEC-005 historical risks:** The [SEC-005 remediation document](#sec-005-remediation-and-verification) records accepted development-only residual risks. Review historical Git/Docker exposures, determine whether real PII or valid secrets were exposed, and rotate affected credentials before real production data or users. Closure here does not mean historical exposures are erased.
- **SEC-006 upgrade scope:** Android 14 and signed APK tracking/security behavior were tested. Migration of a plaintext token from a legacy APK was not tested. The owner has chosen new signed APK installations during development; legacy-upgrade testing is needed if that rollout assumption changes.
- **Original critical findings:** All seven are now closed, including SEC-020 after owner-confirmed safe live tests. **HRMS is still not cleared for production** because outstanding high/medium findings, historic credential rotation and other original release prerequisites remain.
- **SEC-007:** Closed on 2026-11-14 after source/CI and owner-confirmed live checks for headers, untrusted CORS origins, admin pages, Google Maps, native tracking, and available document downloads. The stricter script/resource CSP remains *Report-Only*, not enforced; plan a separately tested CSP hardening follow-up, and do not treat SEC-022 XSS risks as fixed.
- **SEC-008:** Closed 2026-11-14 after verified source/CI plus owner-reported five-step live employee MFA enrollment and login testing, including the original email OTP bypass path. Admin-account bypass was covered by synthetic CI, not by a separately reported live admin test; do not infer more than tested.
- **SEC-009:** Closed on 2026-11-14 following merged role/feature route restrictions, successful synthetic HTTP/role CI, and six owner-confirmed live HRMS verification steps spanning candidate denial, employee feature restrictions, and working admin functionality. This is owner-confirmed rather than an independent production penetration test; record-level security remains separately tracked in SEC-011/013.
- **SEC-010:** Closed on 2026-11-14 after PR #29 merged, synthetic PostgreSQL fail-closed and other security CI passed, and the owner confirmed four live permission regression steps, including immediate rejection of a revoked permission in the preexisting authenticated employee session. The tests were owner-reported rather than independently repeated; SQL outage scenarios were tested only on isolated CI.
- **SEC-011:** Closed 2026-11-14 after PR #32 merged, two-branch synthetic HTTP/SQL authorization CI passed, and the owner reported eight successful live substeps (Steps 1–4, 5A–5C and 6). The short-lived 403 during 5C resolved after granting Branch Operations to the correct account. The final admin regression covered Admin Dashboard and Admin → Feature Access only, consistent with the intended Admin role. Live negative verification was read-only or used an empty-document request; unauthorized writes/reassignment were exercised only in synthetic CI.
- **SEC-012:** Closed for verified development scope on 2026-11-14, following PRs #39/#40, synthetic CI, read-only Supabase checks, and owner-confirmed web Steps 1–8B and 10A plus Android 14 Steps 9A–9I. Live scope included login/OTP/MFA, revocation on logout and credential changes, web/native rotation, expired JWT rejection, private-file negative access tests, background punches across native refresh and post-checkout silence. A new debug APK was installed after an Android signing conflict; the older website-hosted download was *not* validated as an updated signed release. Candidate authentication, cross-device revocation, complete document-type coverage, 14-day absolute expiry and destructive misuse cases were covered only in CI or not independently retested live. Historical SEC-015 queued-email credential exposure and SEC-021 web localStorage access-JWT risk remain separate release concerns; this issue closure does not authorize production release.
- **SEC-013:** Closed 2026-11-15 after [PR #43](https://github.com/Kondapaneni/HRMS/pull/43) salary/assignment/timer fixes and [PR #44](https://github.com/Kondapaneni/HRMS/pull/44) Asia/Kolkata assessment calendar correction were merged, focused synthetic CI passed, and Render development deployment was confirmed. Owner reported SEC-013 live Steps 1–9C PASSED including admin/delegated salary visibility and same-session revocation, fake-ID compensation write denial, unassigned and cross-employee assessment denial, authorized assessment completion, and 1-minute timer expiry save/submit/resume denial. Steps 10A–10C confirmed archiving temporary assessments, preserving attempts as evidence, restoring temporary Payroll/Employees/Assets settings, and successful employee/Admin regression checks. This is a scoped **owner-confirmed development** closure; isolated CI, not live destructive testing, covers database postconditions and other abuse cases. Remaining independently tracked issues and production release gates are unaffected.
- **SEC-020:** Closed on 2026-11-14 after PRs #35 and #37 merged with passing focused CI and owner-confirmed live maintenance retest: protected employee API 503, Loan/Sales/Branch Operations notice, no refresh/login bounce, active Admin recovery, OFF/session restoration, and old localStorage flag failing to hide maintenance. Live testing was owner-reported and scoped to the tested routes/account, not a full independent penetration test. PHP middleware does not constrain direct Supabase traffic; historical secret reuse requires review.
- **SEC-014:** Closed 2026-11-15 after [PR #46](https://github.com/Kondapaneni/HRMS/pull/46) merged, final isolated SEC-014 HTTP/PostgreSQL CI and related Android/security checks passed, Render development deployment was confirmed live, and the owner reported successful live Steps 1–4B, including missing/outside-GPS 403 denial without writes, legitimate check-in/interval/checkout 200, read-only rate-limit status 200, and regression/cleanup. Live roaming/offsite interval behavior and brute-force/XFF rotation were covered in synthetic CI only, not on live users. Geofence location provenance, per-branch assignment, and wider production security gates remain outside this closure.
- **SEC-015:** Closed for owner-verified development-remediation scope on 2026-11-15 after [PR #48](https://github.com/Kondapaneni/HRMS/pull/48), green synthetic HTTP/PostgreSQL/frontend plus related security CI, confirmed Render live deploy, and owner-reported Steps 1A–1D, 2A–2F, 3A–3J, 4A. Unauthenticated and arbitrary/forged email submissions denied; controlled new-employee invitation carried no initial password; single-use reset worked and replay was rejected; test employee could log in, then was blocked after deactivation. Synthetic account remains disabled for audit. Live promotion HTML injection and actual recruitment status notification were not sent to real people; synthetic CI covers those controls. **Residual risks requiring separate approved remediation before production:** prior queued plaintext credentials/OTPs/reset URLs and backups may remain, affected historical credentials need rotation, and one-time links reside plaintext in queue/DB until used or expired. Owner explicitly accepted limited-scope closure; no production signoff.
- **SEC-017:** Closed for verified development-remediation scope on 2026-11-16. [PR #54](https://github.com/Kondapaneni/HRMS/pull/54) and [PR #55](https://github.com/Kondapaneni/HRMS/pull/55) merged with passing CI; the final Render deployment at `9e2ef81e1185` is live. Owner-reported tests covered uploads, content validation, read authorization, deletion and app regression. The initial misleading Admin HTTP 200/404 deletion result was reconciled by read-only Storage metadata, a narrowly scoped dashboard cleanup of the synthetic file, and PR #55 response-validation fix; new synthetic deletion passed and independent read-only SQL confirmed zero remaining test objects. No historical files were deleted. Preserve historical unmatched avatars pending file-specific dependency/retention review. Scoped development closure is **not** production penetration-test certification.
- **QUAL-002:** Remains PARTIAL; focused CI does not establish comprehensive coverage.

#### Evidence

- [SEC-001 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43388981505)
- [SEC-002 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43399397060)
- [SEC-003 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43404100799)
- [SEC-004 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43423452540)
- [SEC-005 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43427290070)
- [SEC-006 CI + signed APK publish](https://github.com/Kondapaneni/HRMS/actions/runs/43494506110)
- [SEC-013 remediation / synthetic HTTP and PostgreSQL CI (PR #43)](https://github.com/Kondapaneni/HRMS/pull/43)
- [Assessment IST date and midnight CI (PR #44)](https://github.com/Kondapaneni/HRMS/pull/44)
- [SEC-012 auth/migration/frontend CI (PR #39)](https://github.com/Kondapaneni/HRMS/actions/runs/43611896100)
- [SEC-012 Android debug-build CI (PR #39)](https://github.com/Kondapaneni/HRMS/actions/runs/43611896172)
- [SEC-012 navigation regression CI (PR #40)](https://github.com/Kondapaneni/HRMS/actions/runs/43613698624)
- [SEC-014 server geofence / trusted rate-limit PR #46](https://github.com/Kondapaneni/HRMS/pull/46)
- [SEC-014 final focused HTTP/PostgreSQL / frontend CI](https://github.com/Kondapaneni/HRMS/actions/runs/43682349266)
- [SEC-017 server-minted Storage names and AVIF validation PR #54](https://github.com/Kondapaneni/HRMS/pull/54) · [focused CI](https://github.com/Kondapaneni/HRMS/actions/runs/43746726389)
- [SEC-017 exact-object deletion response verification PR #55](https://github.com/Kondapaneni/HRMS/pull/55) · [focused CI](https://github.com/Kondapaneni/HRMS/actions/runs/43798893278)


---

## Historical audit baseline — 2026-11-11

> The following is preserved from the original static audit. Its “Confirmed” and “NOT PRODUCTION READY” statements are historical baseline findings; use the current status above for later remediation and verification. Local `file:///D:/...` source links in the original report reflect the historical audit environment.

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

---

## Detailed security remediation and verification archive

The following sections incorporate the prior separate issue Markdown documents, preserving their technical notes and verification evidence. Earlier intermediate steps may be superseded by later closure notes in the same issue; use the top status table for the final tracked outcome.


## SEC-001 remediation and verification

*Consolidated from former `docs/SEC-001-remediation.md`; historical links to that file should now use this section.*

### SEC-001 — Supabase access control fix

Issue verified against the existing audit report, the current PHP/React repository and live \`pg_policies\`. Existing broad authenticated \`sub IS NOT NULL\` public-table policies and public Storage mutation policies remain in Supabase until migration.

#### This branch
- Client Storage mutations go through JWT-protected PHP API endpoints, with bucket allowlist, role/path authorization, upload size and file signature validation, and no overwrites.
- Candidate resumes and employee expense files use user-scoped paths.
- Video upload uses the actual \`training_videos\` bucket and the authenticated endpoint.
- Supabase browser credentials are removed, including Vite build-time Supabase key arguments.
- SQL migration drops permissive policies and revokes direct public Data API access.

#### Deployment and verification sequence
1. Add SUPABASE_URL and SUPABASE_SECRET_KEY (server-only sb_secret_... key) to your PHP/Render environment; never expose the secret using VITE_. Ensure php-curl is installed.
2. Deploy the backend and frontend together. Test candidate resume/document uploads, avatars, attendance photos, expense receipts, holiday/job/offer files, training videos, and loan document/signature flows. Existing loan applications must have matching ownership or employee branch permissions.
3. Only after confirming those flows, apply \`supabase/migrations/20261113_sec_001_lock_down_rls.sql\` in a maintenance window. This commit DOES NOT modify Supabase production policies.
4. Test unauthenticated Data API reads/writes and Storage uploads/deletes using only public key (must fail); test authenticated, unauthorized role, wrong owner path, invalid mime and oversized upload scenarios. Validate authorized upload/delete and portal regressions.
5. Review public GET document proxies separately under SEC-003. SEC-002 and SEC-011 remain independent issues.

##### Operational notes
- Existing public-bucket reads are not revoked in this fix.
- Storage mutations are rejected if SUPABASE_SECRET_KEY is absent.
- The migration intentionally removes anonymous direct Data API reads; publicly visible jobs should be served by the PHP API.
- No new external dependencies are added beyond the PHP curl extension.

## SEC-002 remediation and verification

The source repository has no separate SEC-002 remediation file. Its original finding is in [SEC-002 baseline](#issue-id-sec-002); the [tracker above](#current-progress-tracker-and-closure-evidence) documents the source/CI remediation and owner-confirmed deployment verification on 2026-11-14. No additional independent live test is claimed here.

## SEC-003 remediation and verification

*Consolidated from former `docs/SEC-003-remediation.md`; historical links to that file should now use this section.*

### SEC-003 — Protected HRMS file downloads

SEC-003 is not complete merely by protecting the PHP \`/Bills/\`, \`/Resume/\`,
and similar routes: Supabase Storage buckets must also be switched to **private**
or direct \`/storage/v1/object/public/...\` access remains possible.

#### Deployment order

1. Deploy the PHP access guards and the opaque offer-letter filenames from
   GitHub \`main\`. Existing file URLs are stored unchanged; browser and native
   HRMS webviews receive a 30-minute, \`Secure\`, \`HttpOnly\`, \`SameSite=Lax\`
   file-view cookie after an already authenticated \`/api/*\` request.
2. Confirm anonymous \`GET /Bills/test.jpg\` and other sensitive proxies return
   **401**. Confirm authorized profile image, attendance image, employee bill,
   admin bill, candidate document, resume, offer letter and loan document views.
   Confirm a different employee or candidate receives **403** for a file they do
   not own. Admin can view files in their authorized HRMS duties. Video
   range requests should continue working.
3. Apply \`supabase/migrations/20261113_sec_003_make_sensitive_buckets_private.sql\`
   through Supabase, after confirming a working backend secret key and backups.
4. Verify all **nine** sensitive buckets show \`public = false\`. Check a direct
   Supabase Storage \`/storage/v1/object/public/<private-bucket>/<filename>\`
   request fails without credentials; do not fetch or reveal private content.
5. Retest all authorized HRMS views **after** privatization. If private downloads
   fail, repair server-side authentication rather than re-exposing the bucket.
   Don't consider the issue closed until both access-denial and functional tests
   have passed.

Only \`holidays\`, \`job_descriptions\` and the separate \`app_builds\` bucket
remain intentionally public. Opaque \`offer-<uuid>.pdf\` filenames replace
personal-name/timestamp filenames for new offers; old filenames are retained for
existing stored files. Previously emailed offer links require signing into HRMS.

**Security note:** The HRMS JWT is still stored in the application browser as
part of the pre-existing login system. Moving the existing valid JWT into an
HttpOnly, short-lived cookie specifically for GET file views doesn't remediate
SEC-012 or SEC-021. Those are separate findings.

## SEC-004 remediation and verification

*Consolidated from former `docs/SEC-004-remediation.md`; historical links to that file should now use this section.*

### SEC-004 — Gemini TLS verification and personal-data isolation

#### Security issue

Previous employee/admin chatbot integrations disabled cURL TLS peer
verification and forwarded raw HRMS employee data, salaries, PAN, emails,
phone numbers, loan applicants and full chat history to a third-party model.

#### Implemented mitigation

- Both authenticated chatbot endpoints use the shared
  `backend/public/sec004_gemini_security.php` client.
- The only outbound prompts are **predefined, static, general HR FAQs**
  from an exact-match allowlist. Raw questions, chat history, company data,
  payroll, PAN, employee records and applicant records are never forwarded.
- All other requests use the existing authenticated PHP local rule engines,
  preserving personal/admin answers without disclosing them externally.
- If Gemini is unavailable, exact public FAQ questions use a **static, private-data-free local response** before the personal-data keyword engine. For example, `What is paid leave?` explains the term instead of showing an employee's leave balance.
- cURL requires TLS certificate validation (`CURLOPT_SSL_VERIFYPEER=true`)
  and hostname validation (`CURLOPT_SSL_VERIFYHOST=2`). Redirects are
  disabled and all transport errors fall back to the local rule engines.
- The Gemini key is passed only as a secret HTTP header over HTTPS,
  never in URL query parameters or browser responses.
- The backend container installs the CA certificates bundle.

#### Configuration

Only `GEMINI_API_KEY` enables the optional general FAQ feature in the
server environment. `APP_CHAT_KEY` is **not** automatically treated as
a Gemini credential. Without a configured key the local HRMS chatbots
still work. Never expose a Gemini key in the frontend or Git.

#### Testing

Run:

```bash
php -l backend/public/sec004_gemini_security.php
php -l backend/public/employee_chatbot_routes.php
php -l backend/public/admin_chatbot_routes.php
php tests/sec004_gemini_security_test.php
```

Negative cases include PAN numbers, salaries, employee names, email,
loan/customer details and appended PII in an otherwise allowlisted FAQ.
Generic FAQ payloads are built only from fixed template strings, never
from the original message.

On a live server, verify:
1. An employee can ask "What is my salary?" and get the local, private
   answer even when Gemini is configured.
2. An admin can ask "Show salaries overview" and receive the local
   authorized answer without exposing workforce records to Gemini.
3. "What is paid leave?" must give a **general definition**, whether Gemini is configured or not. It must **not** display `Your Leave Summary` or any employee balances.
   "How many paid leaves do I have?" must still return the employee-specific local answer.
4. Without a trusted TLS certificate, an outbound request fails closed
   and uses the local fallback; do not disable verification to fix TLS.

#### Limitations

The Gemini integration is intentionally restricted to generic FAQ prompts.
Expanded external-AI use requires a separate reviewed design for
explicit consent, data classification, and hard data-loss prevention.
This remediation does not address unrelated data-handling findings.

## SEC-005 remediation and verification

*Consolidated from former `docs/SEC-005-remediation.md`; historical links to that file should now use this section.*

### SEC-005 — Git artifact hygiene and Docker build secret exclusion

**Development closure decision (13 November 2026): CLOSED — fixed for development, with residual risk accepted by the project owner.**

The project owner confirmed that the currently configured credentials are temporary development keys and committed to rotating credentials before real users are onboarded. The code/build mitigations were deployed on Render in commit `d01c506`, and the focused CI checks passed.

**Residual risk accepted only for the development phase:** the previously committed SQL backup may remain in older Git history, clones and caches; old Docker images may remain; the distributable APK has not been independently inspected for embedded secrets. Temporary-key status is reported by the owner, not independently verified. This is **not a declaration that historical records are erased or that real personal data, if any, was never exposed**.

**Mandatory pre-production gate (before real users or real employee/candidate data):**
- Rotate development credentials that could have been exposed, including database, Supabase secret/API, SMTP, Google/API, and JWT signing secrets as applicable; update backend/mobile integrations and test authentication after rotation.
- Review historical backups and old Docker images for any real PII/secrets. If real data or still-valid secrets were exposed, escalate and remediate immediately rather than defer to launch; arrange history cleanup/copy handling as necessary.
- Review the publicly distributed Android APK for embedded keys and migrate release artifacts out of Git when practical.
- Re-run Docker-secret exclusion checks and verify deployment after key rotation. Do not release until these checks pass.

**Status scope:** SEC-005 audit issue is **closed in development by owner risk acceptance**; its historical-exposure review and key rotation remain tracked here as pre-launch obligations, not as completed security work.

**Finding:** HIGH — Git-tracked SQL/chat backups and locally generated artifacts, combined with a missing root `.dockerignore`, can expose HRMS records and environment credentials in Git history or Docker image layers.

#### Changes in this remediation

1. Add root `.dockerignore` filtering `.git`, every nested `.env*`, private keys, SQL/database dumps, logs, scratch files, vendored binaries, dependencies and unused repository files from **both stages** of the Docker build. This applies to `COPY backend/ /backend/` in the Node builder and `COPY backend/ .` in the PHP runtime.
2. Update `.gitignore` to prevent accidental tracking of local backups, logs, private keys and scratch queries while retaining legitimate `supabase/migrations/*.sql` files.
3. Delete `chat_backup/chat_backup_2026_08_06_151001.sql` from **current branch HEAD**, with no application source dependency on it.
4. Add CI that injects dummy `.env`/SQL/log/private-key files into a checkout, asserts they do not enter a Docker build context, and builds the actual production Docker image to confirm `/var/www/html/.env` is absent **before entrypoint execution**.
5. Keep `frontend/public/downloads/Acme HRMS.apk` in the frontend build. `EmployeeMobileProfile.jsx` links directly to this APK, so removing it without separately hosting a release would break the user's existing mobile download feature. Review the APK separately for embedded credentials and move release distribution out of Git.

The current `main` inventory already did **not** contain `scratch_queries.txt` or `server.log`, despite the older audit describing them as tracked.

#### Critical: historical exposure remains

Deleting a file in a new commit **does not erase that file from previous commits**, existing clones, forks, pull-request diffs, GitHub caches or Docker images already built before this change.

Do **not** mark SEC-005 fully closed until:

- Historical exposure review: with repository owner approval, inspect the potentially sensitive backup/log/scratch files from prior commits **without printing data into logs**; determine whether their contents include live accounts, secrets, employee/candidate data or personal identifiers.
- Rotate **only the credentials actually exposed**, using coordinated updates to their consuming services. Potential categories include DB credentials, `JWT_SECRET` (invalidation impact), Supabase secret keys, SMTP credentials, and Google API keys. Never commit new credentials. Consider deletion/notification obligations for real PII.
- Coordinate full history rewrite if exposure persists in Git. Make a private mirror or authorized backup first, notify collaborators, and use a trusted local `git-filter-repo` workflow to remove all affected historical paths. Force-pushing rewritten history invalidates commit IDs and requires all collaborator clones/branches and CI references to be re-cloned/reconciled. Obtain explicit approval for this disruptive step; **not performed here**.
- Review stale images/registries for `.env` in image layers; revoke access/remove affected images where present. A new clean image does not remove older layers from registries.
- Validate secret exclusion on the actual deployment and review any tracked distributable APK for embedded credentials.

#### Verification

Run the automated workflow `.github/workflows/sec005.yml`. It:

- Verifies sensitive paths are not tracked in the current Git tree and are ignored by default.
- Proves synthetic private files do **not** appear after `COPY .` in a disposable Docker build.
- Builds the real multi-stage Dockerfile with synthetic secrets present on the runner and inspects the **unstarted image** using an entrypoint override, ensuring `/var/www/html/.env` is absent.
- Confirms the frontend, vendor dependencies and existing mobile APK download remain available.

The runtime `docker-entrypoint.sh` still creates a permission-restricted `/var/www/html/.env` from Render environment variables **when the container starts**. This is expected and different from baking it into an image layer.

#### Safety and scope

The GitHub history was **not** rewritten, no credentials were read or rotated, no database or Supabase Storage settings were changed, and the mobile APK asset remains deployed until a release-hosted replacement is designed.

**Implementation status after CI/deployment:** current-tree and Docker build exposure mitigated. **Audit tracking status:** Closed for development under owner-accepted residual risk, as recorded above. Historical data/credential and prior-image reviews remain pre-production obligations.

## SEC-006 remediation and verification

*Consolidated from former `docs/SEC-006-remediation.md`.*

### SEC-006 — Android native backup, TLS, token storage, and logging

**Audit severity:** High. **Status:** Code fix staged; must pass CI and actual Android-device verification before closing. This change is specific to the native Android APK, not the web application.

#### Threats remediated

- `AndroidManifest.xml` now sets `android:allowBackup="false"` and `android:usesCleartextTraffic="false"`. Android 12+ `dataExtractionRules` explicitly exclude app data from cloud backup and device-to-device transfer.
- Capacitor `server.cleartext` is false and the packaged app loads `https://hrms-qwv3.onrender.com`.
- Foreground tracking accepts only the HTTPS `hrms-qwv3.onrender.com/api/employee/attendance/punch` endpoint (no query/user info/redirects). This deliberate host allowlist must be updated when the app moves to a custom domain.
- The service no longer writes a plaintext `auth_token` preference. `TrackerTokenStore` uses Android Keystore non-exportable AES-GCM credentials with a random 96-bit IV and authentication tag. First use migrates an existing plaintext preference; on cryptographic error it fails closed and requires a new session. Stop tracking deletes encrypted and old plaintext preferences.
- Native GPS coordinate and raw HTTP response Logcat lines are removed. Other diagnostic Log calls are gated on `BuildConfig.DEBUG`, with `buildFeatures.buildConfig` explicitly enabled (AGP 8+).
- Release build uses R8 optimization (`minifyEnabled true`, `shrinkResources true`) and retains the reflection-discovered Capacitor plugin.
- The new `tests/sec006_android_security_test.mjs` checks policy and token/logging safeguards. `.github/workflows/sec006.yml` synchronizes Capacitor, compiles debug and release APKs, and verifies release minification mapping.

#### Android-only login regression (13 Nov 2026)

On a freshly installed SEC-006 debug APK, the user confirmed that the HRMS
website login works in Chrome on the **same Android phone**, but the APK's login
failed with:

`Failed to execute 'setRequestHeader' on 'XMLHttpRequest': The object's state must be OPENED.`

The native Capacitor config had `plugins.CapacitorHttp.enabled=true`, which
overrides WebView `XMLHttpRequest` and `fetch` in Capacitor. The HRMS login
uses Axios XHR, so the unnecessary native override was disabled by setting
`CapacitorHttp.enabled=false`; standard WebView HTTPS XHR remains enabled.
The secure `server.url`, `server.cleartext=false`, Android TLS restrictions,
AndroidKeyStore token encryption and native location tracking are unchanged.
A regression assertion checks both the source config and the config generated
by `npx cap sync android`.

**Device validation is still required.** The user must run
`npm.cmd run cap:sync` from `frontend/`, then
`.\\gradlew.bat assembleDebug` from `frontend/android/`, install/update
`app-debug.apk` on the test phone and verify password login works. Do not
claim a successful native login until that test passes. Do not use the previous
APK; its Capacitor configuration is packaged and will remain unchanged by a
backend-only deployment.

#### Android 14 tracker interval regression (13 Nov 2026)

A real Android 14 device continued submitting location punches even after
HRMS was removed from recent apps and its notification was swiped away.
However, with the test interval set to two minutes, a punch at **10:47**
was followed by a punch at **10:50** after the user reopened HRMS at
**10:48**. The next punch would ordinarily have been due at about **10:49**.

Cause: after the WebView remounted, `BackgroundLocationTracker.jsx` sent
another `NativeLocationTracker.startTracking()` call. The Android service
unconditionally cancelled its existing `punchTickRunnable` and scheduled
a full interval from that second call, even though the interval was
unchanged.

Fix: in `LocationTrackerService.onStartCommand`, compare the newly
requested interval with the interval already running. If unchanged,
preserve the pending Handler tick and AlarmManager watchdog, and do not
repost a notification merely because the UI reopened. If the admin
actually changes the interval, update the notification and reschedule.

**Device retest required:** install a rebuilt debug APK, set a two-minute
interval, check in, observe a recorded punch, reopen the app between
scheduled punches, and confirm the following punch remains close to the
original due time. Android OS scheduling, GPS availability, and server
response time can still produce small timing variation. Confirm tracker
entries using the authorized Admin Attendance location view. Then check
out and ensure no further punches are recorded.

#### How to verify on an Android test device

1. Rebuild and **install a new APK from the patched source**. The APK currently committed at `frontend/public/downloads/Acme HRMS.apk` is an older binary and is **not automatically updated** by these source changes.
2. Sign in with a development employee test account, check in, and permit foreground/background location as required. Confirm the tracking notification appears and the backend receives expected telemetry at the configured interval.
3. Force close/restart the UI without stopping the foreground service; confirm tracking resumes correctly after Android restarts the service. Reinstall an updated APK over a pre-SEC-006 installation and confirm any old plain token migrates and is no longer present in `hrms_tracker_prefs.xml`.
4. Check out or stop the tracker; confirm background tracking stops and both token preferences are cleared.
5. With a **release** APK, inspect `adb logcat` while tracking: no GPS coordinates, HTTP response bodies or JWTs should appear from the tracker. Debug logs are not a substitute for production verification.
6. Inspect the rebuilt release manifest and APK using Android Studio / `apkanalyzer` / MobSF. Confirm backup is disabled, no cleartext allowed, and DEX code is R8-minified. Check for cleartext or embedded secrets in third-party plugins.
7. Check that the rest of the mobile app's login, attendance, downloads, and camera functions continue to work.

#### Limitations and rollout requirements

- This work protects the **native location service's persisted token**. The React WebView still uses `localStorage` for HRMS JWT, which is tracked separately as **SEC-021**. Full app token protection requires that separate change.
- Some third-party Capacitor plugins might require extra R8 keep rules; compilation alone does not guarantee runtime reflection works.
- Credential migration after Android Keystore loss intentionally fails closed. The user must authenticate again rather than restore an unreadable token.
- The mobile APK hosted in the web app has **not** been rebuilt, re-signed or replaced. Do not distribute it as if SEC-006 were fixed. Publish a new signed APK after device tests; update the existing link or release distribution process without breaking compatibility.
- If the production API host changes, update both the Capacitor URL and the native HTTPS host allowlist and rebuild the APK.
- No production database, Supabase buckets, or Render configuration is modified by this native fix.

**Closure gate:** CI green + rebuilt APK installed and tested on Android (including resumed service, Logcat, and cleartext/backup checks) + publication of updated APK before actual users.

## SEC-007 remediation and verification

*Consolidated from former `docs/SEC-007-remediation.md`.*

### SEC-007 — HTTP security headers and CORS allowlist

**Severity:** Medium. **Implementation:** [PR #17](https://github.com/Kondapaneni/HRMS/pull/17) merged into `main`, post-merge CI passed. **Audit status: CLOSED on 2026-11-14**, based on source/CI evidence and the project owner's completed live validation. **Residual:** The stricter script/resource CSP is still Report-Only, not enforced; it remains a separate hardening follow-up.

#### Scope and fixes

1. The production Apache `backend/public/.htaccess` now adds security headers to the SPA, static files, PHP responses and HTTP error responses:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(self), camera=(self)`
   - `Strict-Transport-Security: max-age=31536000`
   - Enforced `Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'`
2. The more restrictive JavaScript/resource CSP is initially issued under `Content-Security-Policy-Report-Only`. The SPA has inline bootstrap scripts and Google Maps; enabling `script-src` enforcement before identifying and resolving violations can break login, maps or other HRMS features. This stage is intentional and should **not** be described as a complete strict-script CSP rollout.
3. Removed wildcard `Access-Control-Allow-Origin: *` from static JSON responses, `/version.json`, and the public file streaming helper.
4. Replaced broad dynamic origin reflection (including arbitrary localhost ports and `capacitor://` schemes) with exact comparison to an explicit, validated allowlist. Unknown and `null` origins receive no CORS credential or authorization headers.
5. Added `Vary: Origin` on PHP responses to avoid mixing cached origin-specific responses.

#### Configuration

- `FRONTEND_URL` can specify the trusted frontend **origin**, e.g. `https://hrms-qwv3.onrender.com`. Do not include a path. With HRMS frontend and API hosted on the same site, no CORS authorization is needed for normal same-origin requests.
- `CORS_ALLOWED_ORIGINS` is optional, a comma-separated list of *additional*, explicitly trusted browser origins, e.g. `http://localhost:5173,capacitor://localhost` for authorized development work. It defaults to empty; **do not enable localhost or arbitrary capacitor origins on a public production API unless required and explicitly approved**. Never use `*`.
- Docker entrypoint now carries `CORS_ALLOWED_ORIGINS` into the PHP environment when it is configured in Render.
- Render terminates HTTPS at its edge and serves this container over internal HTTP. Apache includes HSTS on every response. Browsers ignore HSTS received over ordinary HTTP, so local HTTP development remains unaffected; real HTTPS clients enforce it.

#### Automated verification

GitHub Actions `.github/workflows/sec007.yml`:
- Lints the PHP middleware/helper and runs 15 exact-origin allow/deny cases.
- Starts the real Slim application with synthetic CORS environment settings and asserts allowed, denied, no-Origin and preflight response behavior.
- Boots the real `php:8.2-apache` server with the production `.htaccess` and verifies seven security headers on HTML and static JSON; confirms no static wildcard CORS.

#### Verified live results — 14 November 2026

The project owner completed these checks on the live HRMS site and Android 14 phone (results are owner-reported, not independently reproduced on their device by this session):

1. **Step 1 — headers:** Seven security headers present on both `/` and `/manifest.json` over HTTPS.
2. **Step 2 — CORS:** The untrusted origin received no CORS access on `/version.json`, `/manifest.json`, and the `/api/login` OPTIONS preflight.
3. **Step 3 — desktop HRMS:** Admin login, Dashboard, Employees and Attendance all worked after deployment.
4. **Step 4 — Google Maps:** An initial Chrome `ERR_QUIC_PROTOCOL_ERROR` on a Google Maps resource disappeared after reload; Google Maps and existing location markers rendered correctly.
5. **Step 5 — Android 14:** Employee login/check-in, native background location punch, check-out and tracking notification shutdown worked.
6. **Step 6 — documents:** All available test document previews and downloads worked, including checks initiated from the admin experience.

**Closure decision:** The original SEC-007 audit finding (missing browser security response headers and permissive wildcard JSON CORS) is remediated and the live functionality tested above has passed. The currently enforced CSP covers `frame-ancestors` and `base-uri`; a more restrictive `script-src` / resource policy remains Report-Only because HRMS has inline bootstrap scripts and third-party maps. Do not mistake the SEC-007 closure for confirmation that every XSS exploit has been mitigated. Audit SEC-022 and further CSP tightening separately before production sign-off.

#### Live verification after merge/deploy (reference procedure)

Run on the deployed HTTPS website (no login/JWT is required for these checks):

```powershell
$site = "https://hrms-qwv3.onrender.com"
curl.exe -sS -I "$site/"
curl.exe -sS -I "$site/manifest.json"
curl.exe -sS -D - -o NUL -H "Origin: https://attacker.example" "$site/version.json"
```

Verify the HTML and JSON responses include `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and both CSP header variants. The untrusted-origin response must **not** include `Access-Control-Allow-Origin` or `Access-Control-Allow-Credentials`. Note that a same-origin request does not need `Access-Control-Allow-Origin`.

After deployment, perform real-user regression testing on:
- Admin/employee/candidate login, dashboard and report navigation.
- Google Maps, employee geolocation check-in/check-out and native Android tracker.
- Documents, download links, images, training videos and browser embedded previews.
- Vite/local development only if specifically allowed in Render's CORS origin configuration.

Review browser console `Content-Security-Policy-Report-Only` violations before incrementally replacing the inline scripts with CSP nonces/hashes and enabling enforced `script-src`. Do not prematurely switch to enforcing restrictive scripts.

#### Independent findings

SEC-007 does **not** fix the original MFA/RBAC/IDOR findings or the frontend XSS sources. In particular, SEC-022 and SEC-024 remain independent issues. The presence of HTTP response headers alone does not prove full application security.

## SEC-008 remediation and verification

*Consolidated from former `docs/SEC-008-remediation.md`.*

### SEC-008 — Email OTP cannot bypass authenticator MFA

**Original severity:** Critical. **Status: CLOSED (2026-11-14)**, following merged PRs #20 and #22, passing GitHub CI and five owner-reported live HRMS employee verification steps. The live tests were reported by the project owner; this session did not independently execute browser tests against Render.

#### Original vulnerability

`POST /api/login` correctly challenged users who had both `users."mfaEnabled"` enabled and a confirmed `mfa_secrets` record, but `POST /api/auth/otp/verify` ignored that setup and returned a full administrator/employee JWT after email verification alone. That entirely bypassed the Authenticator second factor.

#### Fix

1. **Single MFA decision:** `sec008MfaRequired(PDO $conn, array $user)` is shared between password login and email OTP login. Both challenge accounts with enabled AND confirmed MFA, preserving first-time enrollment for users who have been authorized but have not yet confirmed TOTP.
2. **First-factor-only email OTP:** A correct, unexpired email OTP is invalidated before any session is issued. Confirmed MFA accounts receive only a 5-minute JWT with `type=mfa_pending`, an ID and email, no `role`, and a `mfaRequired` response. `/api/auth/mfa/verify` requires a TOTP or approved unused backup code before issuing a full session.
3. **No token confused with a session:** `AuthMiddleware` rejects MFA-pending JWTs on protected routes, even `new AuthMiddleware()` routes without explicit role restrictions. Existing normal JWTs remain valid for compatibility; `SEC-009` separately tracks missing role policies.
4. **Frontend compatibility:** `AuthContext.signInWithOtp` never stores a pending MFA token in `localStorage`. `Login.jsx` displays the existing Authenticator/backup-code form after the email OTP step. Non-MFA OTP logins continue to work.
5. **No production database changes:** The fix does not require a schema migration and will deploy with the usual Render frontend/backend build.

#### Verification

GitHub Actions `.github/workflows/sec008.yml` performs:
- PHP syntax checks and shared MFA policy tests for enabled/disabled/unconfirmed users.
- Scoped pre-auth token expiry/claims tests and a real `AuthMiddleware` rejection check.
- Real Slim API integration on an isolated, synthetic PostgreSQL database with invented admin and employee test users:
  - Incorrect email OTP rejected.
  - Correct admin email OTP returns `mfaRequired` and NO privileged JWT.
  - Pending token rejected on a protected endpoint.
  - Used email OTP cannot be replayed.
  - Incorrect Authenticator code rejected.
  - Correct Authenticator code returns authorized admin JWT.
  - Password login still requires MFA.
  - Non-MFA employee email OTP still returns an ordinary session.
- Confirmed admin-granted-but-not-configured employee login succeeds without MFA, with setup available; employee without a grant cannot access MFA setup.
- Production frontend build plus static regression assertions.

#### Owner-confirmed live validation — 2026-11-14

All five staged checks were reported as passed on the deployed HRMS application using employee test accounts:

1. **No admin grant:** Employee login succeeds without MFA; the MFA setup feature is hidden.
2. **Admin grant, no completed setup:** Employee login still succeeds without an MFA prompt; setup becomes available.
3. **Setup confirmed:** Once the employee enters the initial valid Authenticator code and completes setup, later logins require an additional MFA challenge.
4. **MFA challenge enforcement:** An invalid Authenticator code is rejected; a current valid code permits login.
5. **Original SEC-008 bypass:** After successful email OTP verification, the employee must complete Authenticator MFA before the Employee Dashboard opens; a valid Authenticator code then completes sign-in.

This is project-owner testimony of live behavior, supported by synthetic GitHub Actions integration tests. It is **not** an independent live security assessment and does not claim a separately repeated live test for an administrator account. The source-level requirement remains: the MFA feature must be granted AND setup must be confirmed before employee login is challenged.

#### Live verification after deploying (reference procedure)

Use **development/test accounts only**; do not share email OTPs, TOTP codes, backup codes, passwords or JWTs in chat.

1. **MFA-enabled test admin, email OTP method:** Sign out, choose "Sign in with Email OTP", receive an email OTP, enter it. HRMS MUST display a second-step **Authenticator code** prompt and MUST NOT open Admin Dashboard yet.
2. **Invalid TOTP:** Enter an incorrect Authenticator code. It must reject the code, with no dashboard access.
3. **Valid TOTP:** Enter a current code from the test admin's Authenticator app. Admin Dashboard should open normally.
4. **Password login with MFA:** Sign out, log in with password. It must still require Authenticator MFA.
5. **Non-MFA test employee:** Sign out, log in with email OTP using a test account that does not have confirmed MFA. It should sign in successfully without the second-step prompt.
6. **Android APK:** If mobile login is used, verify that a fresh Android WebView login follows these same rules (backend endpoints are identical; old native APK loads the hosted site).

**Never disable MFA on an existing privileged real account merely to test a bypass.**

#### Login Back-button follow-up — live verified 2026-11-14

The owner reported a separate login UX/privacy defect after SEC-008 closure: the MFA **Back to login** button restored the previous account's credentials; in the email OTP path the previous OTP and email entry remained populated when navigating back. [PR #24](https://github.com/Kondapaneni/HRMS/pull/24) resets email, password, OTP state, pending MFA token and backup-code state, and guards against the scripted autofill effect immediately refilling a deliberately cleared form.

Focused React-state reset regressions, frontend build and security CI passed. The owner explicitly confirmed **both** live Render tests passed after deployment:

1. **Password → MFA → Back:** Email and password fields are empty.
2. **Email OTP → MFA → Back → Email OTP method:** Email, OTP, and password fields are empty; the earlier verification screen does not reappear.

This is owner-reported browser validation, not an independently repeated live test. The correction was a login UI privacy/regression follow-up, not a change to the MFA authorization policy.

#### Residual independent audit issues

- **SEC-012:** This patch does NOT hash email `otp_code` values stored in the database, replace the 10-year `session_timeout='never'` option, or implement session revocation. OTP storage hardening and JWT lifecycle are tracked there and require a coordinated database migration, so they were intentionally not mixed into an emergency MFA-bypass fix.
- **SEC-015:** The email queue contains OTP message content and other emailed credentials, independently tracked.
- **SEC-009:** Full RBAC/feature enforcement remains separate from this pre-auth token safeguard.

**Closure decision:** Source changes and automated checks have passed, and the owner confirmed the deployed live employee flows, including the original email-OTP bypass path. A separate live admin-account bypass test was not reported; the privileged-account behavior is covered by synthetic API CI. Keep independent SEC-009/012/015 findings open.

## SEC-009 remediation and verification

*Consolidated from former `docs/SEC-009-remediation.md`.*

### SEC-009 — Explicit backend role and feature authorization

**Severity:** CRITICAL. **Status: CLOSED (2026-11-14) — PR #26 merged, CI passed, and the project owner confirmed six live HRMS authorization and feature-access verification steps.**

#### Audit finding and threat

An externally registered candidate receives a valid HRMS JWT. Previous usage of `new AuthMiddleware()` made any valid role immediately pass access control; even `new AuthMiddleware([], 'employeeAssessments')` bypassed the supplied feature because empty required roles were treated as unrestricted. Thus candidate accounts and non-granted employees could reach salary report exports, performance reviews, employee assessments, loan applications/member PII, sales activities and branch operations APIs.

#### Implementation

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

#### CI and security coverage

`.github/workflows/sec009.yml` uses a **disposable, synthetic PostgreSQL database**:

1. Scans all protected route declarations in `backend/public` to forbid missing/empty `AuthMiddleware` role lists and verifies the intended route policy mapping.
2. Exercises actual PHP `AuthMiddleware` against synthetic admin, candidate, employee, HR and manager claims with allowed/denied feature flags; verifies candidate denial **even if every module feature is set**.
3. Exercises actual Slim HTTP routes to assert `403` for candidate and ungranted staff across reports, performance, assessments, leads, members, sales, loans, activities, branch operations and selected POST/PUT/DELETE routes.
4. Confirms explicit candidate portal role allowance and internal staff feature grants remain usable.

#### Merged code / CI evidence — 2026-11-14

- [PR #26](https://github.com/Kondapaneni/HRMS/pull/26) merged into `main` at commit `fc60dc7d4ba39f42323ab52dc1087e5673f4942e`.
- Isolated PostgreSQL tests passed, exercising the actual `AuthMiddleware` decisions for admin, candidate, ungranted employee, feature-granted employee, HR and manager. Inactive users were denied and explicitly authorized candidate portal access remained possible.
- Real Slim HTTP checks returned `403 Forbidden` for synthetic candidate tokens at admin reports, performance, assessments, loans, members, sales, origination activities, and branch operations reads/mutations. Synthetic employees without module permission were also denied.
- SEC-004, SEC-007 and SEC-008 regression workflows were green in PR checks. **No claim of live Render verification has been made yet.**

#### Owner-confirmed live validation — 2026-11-14

The project owner reported these six tests as **passed** on deployed HRMS using test accounts:

1. **Candidate functionality:** Candidate login, dashboard, applications and documents continued to work.
2. **Admin report isolation:** The logged-in candidate received `403 Forbidden` from `GET /api/admin/reports/employees`.
3. **Broader candidate isolation:** The candidate received `403 Forbidden` for all five tested routes: `/api/admin/reports/payroll`, `/api/admin/performance`, `/api/employee/assessments`, `/api/loans/applications`, `/api/branch-operations/applications`.
4. **Ungranted employee isolation:** An employee without loan, sales or branch-operation feature grants received `403 Forbidden` from `/api/leads/list`, `/api/loans/applications`, `/api/sales/leads/list` and `/api/branch-operations/applications`.
5. **Single-module grant isolation:** An employee with `canLoanOrigination` only was allowed to call the loan API, while Sales Origination and Branch Operations APIs returned `403 Forbidden`. This proves an allowed role/feature decision, not a complete loan lifecycle test.
6. **Admin regression:** Admin Reports, Performance, Payroll and Dashboard worked after the fix.

**Evidence boundary:** These are owner-reported live results, backed by isolated CI tests; they were not independently rerun by the assistant against production. Coarse route-level access control closure does not claim that record-level ownership, cross-branch authorization, assessment assignment or dynamic SQL feature validation are resolved.

#### Live verification (development accounts only) (reference procedure)

**Do not share tokens, passwords or personal employee/customer data. Do not register unapproved accounts on production.** Use pre-existing authorized test accounts.

1. Sign in to live HRMS as an existing **candidate test account**. Confirm candidate portal login and documents/applications still work.
2. With the candidate signed in, verify protected admin reports and loan/customer endpoints **deny access**, including when entered directly by URL or a controlled API request.
3. Sign in as an internal **employee without loan/sales/branch grants**. Confirm employee dashboard and self-service still work, and those restricted APIs deny access.
4. Grant **canLoanOrigination** to a development employee via Admin → Feature Access; confirm loan module works while sales and branch operations remain denied.
5. Grant **canSalesOrigination** and **canBranchOperations** separately as needed and confirm only each permitted module works.
6. Confirm admin Reports (including payroll), Performance and loan/sales/branch dashboards remain functional under a test admin account.
7. Confirm employee assessment list/start/submit works for an assigned development employee, and candidate access is denied. **Ownership/assignment data checks remain tracked in SEC-013/011.**

##### Residual independent findings

- **SEC-010**: Static allowlisting of dynamically derived SQL feature identifiers, fail-closed database-error propagation and general feature-check hardening must be assessed separately. The SEC-009 fix does not claim these are all solved.
- **SEC-011**: Staff who have a module grant may still need ownership and branch scoping on individual records, separate from route/module authorization.
- **SEC-012**: Existing JWT role changes/session revocation and long expiry remain open.
- **SEC-013**: Per-employee assessment assignments, timers and salary data authorization beyond this coarse admin-only reporting gate remain open.

**Closure decision:** All planned code/CI checks and the owner's six staged live checks were confirmed on 2026-11-14. SEC-009 is closed at the route-level authorization scope. SEC-010, SEC-011, SEC-012 and SEC-013 remain open and must be remediated independently.

## SEC-010 remediation and verification

*Consolidated from former `docs/SEC-010-remediation.md`.*

### SEC-010 — Feature permission SQL allowlist and fail-closed authorization

**Original severity: CRITICAL. Status: CLOSED (2026-11-14) — PR #29 merged, dedicated synthetic and cross-issue SEC-008/009 CI passed, and four live permission tests passed according to the project owner.**

#### Root cause and source review

The original audit reported a feature-key SQL identifier interpolation risk and possible fail-open behavior when the database was unavailable. SEC-009 previously removed the empty-role bypass, so **a missing/failed employee feature query already tended to deny the employee**. However, the current code still constructed a SQL identifier from any feature key, and its *active-account lookup* was inside a broad catch that merely logged failures and continued to the protected handler. An already role-authorized account (e.g. admin) could therefore pass the middleware despite inability to verify whether it still existed and was active.

Relevant files: `backend/src/Middleware/AuthMiddleware.php` and connection-error output in `backend/src/Config/Database.php`.

#### Fix

1. **Exact feature allowlist:** `AuthMiddleware::FEATURE_COLUMNS` maps only the eleven columns already declared by `user_feature_access` and Admin → Feature Access. Both the existing short route keys (e.g. `loanOrigination`) and direct aliases (e.g. `canLoanOrigination`) are mapped to fixed, audited column identifiers. No untrusted feature text is interpolated into SQL.
2. **Invalid policy fails closed:** Unknown or malformed keys (including nested arrays, empty lists and malicious SQL-like strings) return `403`, **including for admin**, before a query or handler runs. The prior SEC-009 requirement for explicit role lists remains enforced.
3. **Connection/query failures return 503:** Null DB connections or exceptions during the delegated-feature lookup or active-user lookup return sanitized JSON `503 Authorization service temporarily unavailable`. No protected handler is called. Failure to find a user is `401`; a deactivated user is `403`.
4. **Correct PostgreSQL bool evaluation:** Only true/`1`/`'1'`/`'t'`/`'true'` count as granted. A string `'f'`, `'false'` or `'0'` never becomes a permission via PHP's string truthiness.
5. **Audit context remains best effort:** The non-authorization `set_config` auditing step happens only *after* permission and active-account checks succeed. Its failure is logged but does not recast a failed authorization check as success.
6. **No DB credentials in HTTP error body:** A connection exception is logged server-side rather than echoed directly by `Database::getConnection()`. The user receives only generic sanitized 503 JSON.
7. **No schema migration or frontend changes:** Existing admin grants and HR/manager/employee delegated feature checks stay intact.

#### Automated tests / CI

`.github/workflows/sec010.yml` uses an isolated synthetic PostgreSQL instance named `sec010_test`; all destructive test scripts reject other DB names and synthetic-only JWT secrets.

- Static check compares eleven valid columns with `admin_feature_access_routes.php` and verifies SQL identifiers are selected only through the explicit mapping.
- Exercises both short and direct feature keys across the full eleven-column schema with successful and absent grants, plus candidate denial, HR/manager access, missing feature row, inactive employee and missing user.
- Denies malformed/unknown/injection-shaped keys for both admin and employees.
- Explicitly tests PostgreSQL false values (`'f'`, `'false'`, `'0'`).
- Drops a synthetic feature column and later the synthetic `users` table to force real PostgreSQL query errors: verifies neither employee nor admin is admitted and returns sanitized `503`.
- Tries a closed localhost port to emulate DB outage, verifying both admin and delegated employee fail with `503` and no DB error body leakage.
- Existing SEC-009/008/007 regression suites also run when middleware changes.

#### Merged source and automated verification — 2026-11-14

- [PR #29](https://github.com/Kondapaneni/HRMS/pull/29) was squash-merged to `main` at commit `da9d73ac5657ac7904d2f9a38becc6e23b479817`.
- Dedicated SEC-010 workflow passed on the PR, including the full eleven-column feature allowlist, 403 responses for malformed SQL-shaped feature keys (even for admin), correct boolean conversion, inactive/missing accounts, deliberate missing-column/user-table failures, and disconnected-DB fail-closed 503/no-leak behavior.
- SEC-008 MFA and SEC-009 API-role regression workflows also passed in PR checks.
- **Source/CI evidence:** GitHub CI checked database outage and missing-column failure cases only against synthetic Postgres; no live database outage tests were attempted. Live functional/authorization checks were independently performed and reported by the project owner, not rerun by the assistant.

#### Owner-confirmed live verification — 2026-11-14

The project owner reported **all four live checks as passed** against deployed HRMS, using development accounts:

1. **Admin regression (PASS):** Admin Dashboard and Admin → Feature Access load correctly after deployment.
2. **Ungranted employee denial (PASS):** Test employee without `canLoanOrigination` receives `403 Forbidden` from the loan origination endpoint; Employee Dashboard continues to work.
3. **Granted employee access (PASS):** Admin enables `canLoanOrigination` for the development employee. The employee receives `200 OK` on the Loan Origination API, and its page works.
4. **Immediate revocation (PASS):** Admin revokes `canLoanOrigination` while the same employee session remains logged in. The subsequent API request from that **existing session** immediately returns `403 Forbidden`.

**Evidence boundary:** These are owner-reported live checks, not independently repeated production penetration tests. Live database connectivity was **not** intentionally disrupted; fail-closed `503` error scenarios and malformed feature-name inputs were covered in isolated synthetic CI.

#### Live verification — reference procedure (development accounts only)

**Never intentionally disconnect the production database or drop live columns.** Those failure modes are covered solely by isolated CI.

1. After Render deployment, sign in as test **admin**. Verify Admin Dashboard, Feature Access and other normal admin areas work.
2. With an existing test employee who has no Loan Origination grant, verify the loan origination endpoint rejects access `403` while ordinary employee areas function.
3. Grant **canLoanOrigination** only to that development employee via Admin → Feature Access, then sign in as that employee and verify loan origination access works without unlocking Sales or Branch Operations.
4. Revoke **canLoanOrigination** for the development employee and verify the same loan endpoint returns `403` again; the employee's standard workspace should still function.

**Closure decision (2026-11-14):** Fix merged, synthetic CI green, owner confirmed post-deploy admin and employee permission checks, including immediate access denial following feature revocation on an already authenticated session. SEC-010 is closed at the feature-permission and fail-closed authorization scope. Independent SEC-011 (record ownership), SEC-012 (JWT lifecycle) and SEC-018 (other DB/SQL errors) findings remain open.

## SEC-011 remediation and verification

*Consolidated from former `docs/SEC-011-remediation.md`.*

### SEC-011 — Server-side loan ownership, activity reassignment and branch isolation

**Severity:** CRITICAL. **Current state:** CLOSED (2026-11-14) — PR #32 merged, isolated real HTTP/SQL and SEC-009 regression CI passed, and owner-confirmed deployed development-account authorization checks passed. Closure covers SEC-011 record-level authorization scope, not an independently executed production penetration test.

#### Scope and root cause

[Original SEC-011 finding](#historical-audit-baseline-2026-11-11) reported ID-only mutation endpoints in three operational modules: `origination_loans_application_routes.php`, `origination_activities_routes.php`, and `branch_operations_application_routes.php`. SEC-009/010 guard module/role/feature access, but **not which record a permitted employee may edit**. In the previous code, a loan origination employee could overwrite another creator's draft or change documents/status/delete a known application ID; a branch officer could edit a loan from another branch by ID; and a branch-authorized employee could reassign any activity ID.

#### Implementation

- `backend/src/Security/OriginationAccess.php` centralizes server-derived identity/branch and parameter-bound SQL ownership scopes. For a non-admin loan-originator, mutations and lists require **both** `created_by = current JWT user ID` and `branch = current server-side employee branch`. Explicit authenticated admins retain global access. No owner, role or branch value from request JSON is trusted as authorization proof.
- `POST /api/loans/applications`: validates linked leads belong to the caller/branch, scopes draft lookups by creator and branch, refuses a supplied existing foreign/non-editable draft ID, and repeats the ownership predicate inside `UPDATE`. New records derive `created_by` and `branch` from the backend.
- `GET /api/loans/applications`: lists only owned current-branch loans for delegated staff (admin remains global).
- `POST /api/loans/applications/{id}/documents`, `DELETE /api/loans/applications/{id}/documents/{docKey}`, `PATCH /api/loans/applications/{id}/status` and `DELETE /api/loans/applications/{id}`: all resolve the application with a scoped server-side query. Status and DELETE SQL also recheck ownership in the mutation predicate. Deletes resolve **one exact row** first rather than bulk-delete all loans sharing a lead alias. Unauthorized/missing records return uniform `404`.
- Prevent legacy lead-ID document alias collisions: a loan document keyed by a lead ID is retrieved/deleted only when **exactly one** application across all branches refers to that lead. Batched listing uses one grouped duplicate-key query to avoid N+1 lookups.
- Loan originators may save `Draft` or `Created`, but may not grant themselves an `Approved`/other privileged status. Non-admin `PATCH` status transfer is only `Created → Under Review` with a `Branch Operations` timeline event. Staff cannot forge stage/timeline/creator/branch metadata via the initial draft form payload. Admin exception is deliberate.
- `PUT /api/branch-operations/applications/{id}`: requires a real employee profile **and current branch** for delegated staff (no fake `Branch Officer` fallback), filters both lookup and `UPDATE` by current branch, and rejects records that have not reached the Branch Operations stage or remain drafts. Admin role retains explicit global access and uses its real account identity in audits. Audit records are written only **after** a successful scoped update to avoid logging rejected writes.
- Origination activities: teammate creation, branch rosters, colleague completion and reassignment now check the `canBranchOperations` grant. Reassignment requires the current activity assignee and new target to be active employees in the caller's current branch; the `UPDATE` also repeats the branch predicate. Other loan/sales employees can still create and complete personal activities but cannot manipulate colleagues' branch activities. Admin retains explicit global reassignment/management privileges.

#### Automated evidence

`.github/workflows/sec011.yml` runs against a **disposable isolated `sec011_test` PostgreSQL database**, never production. The test suite creates synthetic users, branch A/B employees, admins, loan drafts/transfers, overlapping lead identifiers, documents and activities. It tests:

- Same-branch and cross-branch unauthorized draft overwrites, lead linking, document writes/deletes, status changes, deletion and loan listing.
- Legitimate owner actions and admin read/status update.
- Missing employee branch profile, foreign-branch Branch Operations edit, same-branch authorized branch edit and premature/draft-stage rejection.
- Authorized versus denied activity reassignment, unauthorized new assignees in another branch, personal/branch activity reads, same-branch status updates and admin override.
- Database after-state assertions that forbidden requests did not alter another user's records, documents or audit trail.

Passing CI and merged code are **not proof that the deployed database has no legacy exceptions**. Existing rows missing creator/branch metadata may need controlled, audited data repair before employees can edit them. Do not relax the ownership predicate to accommodate bad data.

#### Merge and automated evidence — 2026-11-14

- [PR #32](https://github.com/Kondapaneni/HRMS/pull/32) merged to `main` at `6d7e5b4c793e2ad6a67ddb60aa972d8076221be8`.
- Latest dedicated SEC-011 branch CI <https://github.com/Kondapaneni/HRMS/actions/runs/43579120888> passed: real Slim HTTP requests with synthetic JWTs against a disposable two-branch PostgreSQL fixture, plus source policy assertions and post-mutation database integrity assertions.
- Owner-reported live checks passed on 2026-11-14 (details below). Avoid accessing real customer loan records just to test access. No customer data or tokens were requested for the security verification.

#### Owner-confirmed deployed verification — 2026-11-14

The project owner used development employee accounts and synthetic development applications and confirmed:

| Live step | Outcome |
| --- | --- |
| 1 — Own applications | Development employee dashboard, own Loan Origination list and own application details load normally |
| 2 — Same-branch non-owner | Employee B does not see Employee A's synthetic application in their Loan Origination list |
| 3 — Foreign document endpoint | Employee B receives `404 Not Found` when making an empty-document POST to Employee A's synthetic application, without uploading data |
| 4 — Different-branch loan isolation | Branch B employee cannot see Branch A's synthetic application; their own branch's development applications remain accessible |
| 5A — Branch activity permission denied | Without Branch Operations grant: personal activities `200`, branch activities `403` |
| 5B — Granted branch activity | With Branch Operations grant: branch activities `200`, authorized branch activities available |
| 5C — Branch Operations list isolation | First `403` for both branch activities and branch application list due to an ungranted feature on the Branch B testing account; after Admin granted Branch Operations for that account both returned `200`, and Branch A's synthetic application was not listed for Branch B |
| 6 — Admin permission management regression | Admin Dashboard and Admin → Feature Access function correctly. **Admin manages employee features; Admin is not expected to use employee-specific module pages** |

**Verification limitations:** These are owner-reported post-deployment results. The live application checks were primarily read-only, with an empty document-list request to test denied lookup. The destructive and cross-user/cross-branch mutation attempts, activity reassignment rules, records' after-state and audit logs were tested in isolated two-branch synthetic PostgreSQL CI. A passing list filter alone does not independently prove every endpoint secure; the combined scoped backend code and synthetic HTTP/SQL tests underpin the closure. Do not attempt mutation attacks against real loan data.

#### Safe live rollout and validation (development records only) — retained test procedure

**Do not run destructive mutation attempts against real customers or use IDs from real applications.** Use separate named development employee accounts in two configured branches and synthetic non-customer loan records. Keep the account/record IDs out of chat.

1. After Render deployment, sign into an employee with Loan Origination access and a valid employee branch. Confirm their **own** development loan drafts/applications load and standard dashboard works.
2. With two loan-enabled development employees in the **same** branch, test a second employee cannot see the first employee's synthetic loan via `GET /api/loans/applications`, while both see their own.
3. Using only an explicitly disposable synthetic development loan and an agreed test account, test a denied foreign application **GET/list and non-mutating lookup**; for mutation checks, use CI (or isolated staging database), not live customer records. Where negative mutation tests are performed in a dedicated staging environment, verify the synthetic owner record remains unchanged.
4. Confirm a Branch Operations development employee can open/edit **their own branch's synthetic transferred application** and cannot access the other branch's synthetic applications.
5. Confirm branch activity creation/reassignment stays within the authorized development branch and only a permitted branch operator can reassign colleagues' synthetic activities.
6. Verify Admin normal functionality and no unexpected 403/500 regressions in loan, branch and activity pages.

**Closure decision (2026-11-14):** PR merged and CI passed; the owner reported all eight planned live substeps passed after the correct Branch Operations permission was granted to the Branch B development employee. Object-level authorization SEC-011 is closed, with destructive/unauthorized mutation behavior verified only against a disposable synthetic CI database. Do not infer resolution of JWT lifetime/revocation (SEC-012), assessment/payroll record permission issues (SEC-013), file validation (SEC-017), other SQL errors (SEC-018) or the maintenance bypass (SEC-020).

## SEC-012 remediation and verification

*Consolidated from former `docs/SEC-012-remediation.md`.*

### SEC-012 — Session revocation, password verification and JWT lifetime

**Severity:** HIGH. **Status:** CLOSED for the verified development scope on **2026-11-14** after deployed web and Android 14 owner-confirmed tests, read-only Supabase checks and passing CI. **Implementation:** [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) (session hardening) and [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) (Admin/Employee password-navigation regression). **Production release:** not approved by this closure.

#### Scope of original finding

[AUDIT_REPORT.md](#issue-id-sec-012) identifies (1) ten-year JWTs under `session_timeout=never`, (2) logout that did not revoke tokens, (3) password changes without proof of the current password, and (4) plaintext email OTP verifier codes in `users.otp_code`.

#### Stage 1 changes in PR #39

- Connected schema inspection confirmed `public.users.token_version` already exists with integer default `0`. The Acme HRMS **development** Supabase project now has the SEC-012 refresh-session table. No users, passwords, or attendance records were modified by this migration.
- All password, email-OTP, MFA-completed and candidate sign-in paths include signed `tv` (token_version). Live `AuthMiddleware` compares `tv` with the current user record on **every** protected request and confirms current role/active state. Direct private-file proxy auth and the Admin maintenance exception apply the same revocation check.
- Stage 1 accepts a legacy JWT without `tv` only when database version is 0; **Stage 2 additionally rejects all signed JWTs whose `exp - iat` exceeds 8 hours**. This includes existing ten-year tokens, requiring re-login immediately after rollout and a signed updated Android APK first.
- `POST /api/logout` now requires a real session and **atomically bumps** `users.token_version`; this revokes that account's sessions **on all devices**, not just the current browser. If the DB cannot perform revocation, it returns failure, not a misleading success. The browser clears its local state even if revocation fails; an administrator must be able to force reauthentication in that case.
- `PUT /api/change-password` now requires `currentPassword`, checks it under a row lock, rejects reuse of the old password, hashes the replacement, clears mandatory-change flag and bumps the version in the same transaction. The UI requires current-password entry and sends the user to Login after server-side revocation. This also affects mandatory first-login password changes and must be tested with a synthetic development employee.
- `POST /api/reset-password` bumps `token_version` alongside credential replacement, invalidating tokens issued before password recovery.
- Newly issued email codes are stored as **HMAC-SHA256 keyed by the server secret**, protecting a six-digit code from simple offline database enumeration. The pre-deployment plaintext verifier may still be accepted **during its existing ten-minute expiry**, then is cleared. The outbound `email_queue` subject and body still contain the delivered code; that separate at-rest exposure must be addressed in SEC-015.

#### Stage 1 tests and rollout decisions

- Isolated `sec012_test` PostgreSQL schema (synthetic IDs and credentials only), HTTP login/logout/replay, current-password denial and credential-change revocation, password reset token burn, candidate logout, and OTP send/verify/digest tests. No test reads real employee records or changes live passwords.
- Prior SEC-008/009/010/011/020 security tests run on dedicated synthetic databases; fixtures include the existing production `token_version` column.
- **Accepted development behavior:** logging out from one device revokes sessions on *every device*, including Android background tracking sessions, because the server increments the account-wide token version. Reauthentication is necessary on affected devices. Cross-device behavior was covered in source/synthetic checks; not separately demonstrated with two simultaneously logged-in physical devices during this closure.
- **Historical pre-merge gate satisfied (2026-11-14):** PR #39 was merged and deployed to the development site after the database migration and green CI. Owner subsequently confirmed web login/revocation and Android refresh/attendance tests. No production rollout is implied.

#### Stage 2 code added to PR #39 — access caps and refresh rotation

- `AccessToken.php` replaces ten-year JWTs with 15-minute to 8-hour access tokens, interpreting the live `session_timeout=never` setting as **one-hour access**. Normal API authorization, private files, Admin maintenance authorization and file-view cookie minting reject overlong signed JWTs.
- `supabase/migrations/20261114_sec012_refresh_sessions.sql` creates a **server-only** refresh table containing SHA-256 digests of 256-bit random secrets, per-session identifiers, live token versions, a 14-day absolute expiry, UUID user foreign keys, row-level security and revoked Data API grants. **Migration was applied to the connected development Acme HRMS Supabase project on 2026-11-14.** Read-only post-migration checks confirmed UUID columns, RLS enabled and forced, and no `SELECT` grants for `anon` or `authenticated`. The table initially had zero rows.
- `RefreshSessions.php` rotates a refresh secret inside a database row lock; replay of a previously used secret revokes that refresh session. Logout and password changes invalidate all refresh sessions for the account via existing `token_version`.
- Web logins store the refresh credential in a `Secure; HttpOnly; SameSite=Strict` cookie scoped to `/api/auth/refresh`. The browser has single-flight 401 recovery and a required custom anti-CSRF header; refresh also checks Origin. Refresh tokens are never put in web localStorage, although web **access** JWT storage remains an independent SEC-021 risk.
- Android login responses can carry a native refresh credential; the Capacitor bridge immediately stores the access/refresh pair in **AndroidKeystore-backed AES-GCM** preferences. Synchronized native Java refresh serves both WebView and `LocationTrackerService`, including when the UI is closed. Before attendance punches, expired tokens are refreshed; only rejected HTTP 401 punches may be retried once, without resetting the tracking interval. A transient refresh outage does not automatically stop the schedule.
- `X-HRMS-Client: android` is a client-format hint, **not device attestation**. All original login/MFA requirements and API authorization still apply.
- Isolated CI tests cover login/logout/replay, reset/password-change, MFA and candidate flows, bounded JWTs, cookie flags, refresh rotation/replay, expiry and CSRF. SEC-006 additionally builds Android code. These tests cannot establish real Android 14/Doze behavior without owner device verification.

#### Development closure evidence (2026-11-14)

**Status of the finding: CLOSED in the audit tracker for the deployed development environment.** The owner approved the development-only rollout and reported each live result; the CI and SQL evidence listed below was independently inspected. There were no real employee shifts or real end users during the tests. Passing these checks does **not** constitute an independent production penetration test.

##### Source, build, and database evidence

- [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) merged (commit `435b3209d479eafe90250b3c4a650d74f6d7810e`), [SEC-012 isolated PostgreSQL auth/RLS/frontend CI](https://github.com/Kondapaneni/HRMS/actions/runs/43611896100) passed, and [Android debug APK build](https://github.com/Kondapaneni/HRMS/actions/runs/43611896172) passed.
- [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) merged (commit `3362c84f4d44dec996007ea7d30a4d155f063963`), providing Admin Settings and Employee desktop/mobile Profile navigation to Change Password; [navigation and frontend regression CI](https://github.com/Kondapaneni/HRMS/actions/runs/43613698624) passed.
- The `20261114_sec012_refresh_sessions.sql` migration was applied to connected **development** Supabase. Read-only checks confirmed required columns, forced RLS, no `anon`/`authenticated` Data API table access, HMAC-formatted pending OTPs rather than six-digit plaintext, and a fresh native refresh-session rotation matching the user's current `token_version`.
- Owner reported that the development Render website served the updated backend/frontend; live API behavior and Android native refresh corroborated effective deployment. No new schema or authentication code was changed as part of documentation closure.

##### Owner-confirmed live web verification

- **Steps 1–3:** Development Admin Dashboard, logout revocation, saved old-JWT replay `/api/me` **401**; missing current password **400**, wrong current password **403**, authenticated session retained.
- **Steps 4A–4D:** Admin Settings and Employee Profile expose Change Password. Correct password change logged out, rejected old password, accepted new password, and denied replay of pre-change JWT with **401**.
- **Steps 5A–5C:** Web session recovered automatically after a rejected access token; two sequential secure browser refreshes returned **200**; `hrms_refresh` cookie is `HttpOnly; Secure; SameSite=Strict` scoped to `/api/auth/refresh`, with no refresh secret in JSON. Missing required `X-HRMS-Refresh` header returned **403**; normal authenticated `/api/me` worked.
- **Steps 6A–6E:** Read-only SQL showed one pending `hmac-sha256:` OTP and zero plaintext six-digit records; successful email OTP required Authenticator MFA before Dashboard, invalid MFA was rejected and valid MFA accepted, and reused email OTP returned **400**. Database check after consumption showed zero stored/active OTPs.
- **Steps 7A–7D:** The owner preserved the old JWT before requesting password recovery; reset succeeded, replayed pre-reset JWT returned **401**, old password failed, and new password plus MFA opened Employee Dashboard.
- **Steps 8A–8B:** Live access JWT had `session` type, integer token-version claim and bounded 15–480-minute lifetime; an actually expired JWT returned **401** (not a modified/invalidly signed token). The CI suite separately proves signed ten-year legacy JWTs are denied.
- **Step 10A:** With an authenticated development Employee, `/api/me` returned **200**, anonymous access to a private Resume proxy returned **401**, and access to a nonexistent/unowned synthetic Resume path returned **403**. This is negative authorization evidence, **not** a complete live matrix for all file types or positive owned-file downloads.

##### Owner-confirmed Android 14 verification

- **Steps 9A–9C:** The owner downloaded and installed the GitHub Actions **debug APK** containing SEC-012 after uninstalling an older APK with a signing-certificate conflict; password login + MFA, Employee Dashboard/Profile, and session persistence after force stop/reopen worked.
- **Steps 9D–9F:** Admin temporarily configured **15-minute access JWTs** with **2-minute** location-punch intervals. After a fresh Android login/MFA, the phone stayed in the background with screen OFF for 20 minutes; Admin Attendance showed punches before and after the access-token expiry without reopening HRMS. Read-only Supabase inspection corroborated a **current-session native refresh rotation** during the test.
- **Steps 9G–9H:** Android checkout succeeded; the tracking notification disappeared and **zero** new location punches were observed over six minutes after checkout.
- **Step 9I (restored settings, independently reconfirmed by read-only SQL):** `session_timeout = never` means **1-hour access JWT plus 14-day secure refresh**; `tracking_interval_minutes = 2`; `maintenance_mode = false`. Newly minted JWTs use the restored lifetime.

##### Evidence limits and remaining release risks

- **Development scope only:** Candidate logout, chain-replay revocation, absolute 14-day expiry, signed 10-year token rejection, certain cross-device cases, and account-role/denial cases were exercised in synthetic CI/source checks rather than every scenario being repeated on live Android and browser clients. There was no exhaustive independent penetration test.
- **APK distribution outstanding:** The GitHub Actions debug APK was validated on Android 14. The existing Employee Profile/website-hosted APK was **not** confirmed updated and signed with the permanent release certificate; future in-place distribution requires an appropriately signed build, with package/version/signature compatibility verified. Installation of the debug APK required uninstalling an older signed app. The previous SEC-006 security scope remains closed independently.
- **SEC-015 remains OPEN:** Email queue records still contain delivered OTP/reset material; this closure only establishes secure storage of OTP *verifiers* in `users.otp_code`. **SEC-021 remains OPEN:** Browser access JWTs and other data still use WebView/browser `localStorage` and require their own hardening. Other open security, performance, and quality findings remain unchanged.
- **Cross-device revocation behavior:** Logout/password changes/reset revoke existing session versions account-wide, including other active attendance devices. This is an intentional change, and other devices must sign in again after revocation. Refresh expiry is an absolute 14 days and then a new sign-in is required.
- **Production status:** HRMS is **not production-cleared** by closing SEC-012; complete outstanding issues, release signing/distribution requirements and broader readiness gates before real-user use.

#### Verified development database state (2026-11-14)

- Supabase project: Acme HRMS (development environment); migration `sec012_refresh_sessions` reported success.
- Post-migration inspection: `public.hrms_refresh_sessions` exists, with `relrowsecurity=true`, `relforcerowsecurity=true`, and `anon`/`authenticated` have no `SELECT` privilege.
- Initial refresh rows: 0. Existing user session-version values were all present and non-negative. No synthetic fixture was inserted in the connected database.
- [PR #39](https://github.com/Kondapaneni/HRMS/pull/39) supplied session/backend/native changes, and [PR #40](https://github.com/Kondapaneni/HRMS/pull/40) supplied password-navigation updates. Corresponding isolated auth/RLS/frontend CI and Android build passed; owner-confirmed live Android 14 and web checks were subsequently recorded above. CI coverage and owner reports are not a substitute for an independent penetration test.
- The Supabase advisor flags `rls_enabled_no_policy` on this private table; that is intentional because it is server-only with revoked Data API grants. Other advisor notices are tracked independently.

## SEC-013 remediation and verification

*Consolidated from former `docs/SEC-013-remediation.md`.*

### SEC-013 — Salary boundaries and assessment assignment / timer enforcement

**Severity:** HIGH. **Status:** CLOSED 2026-11-15 — SOURCE MERGED / FOCUSED SYNTHETIC CI PASSED / OWNER-CONFIRMED DEVELOPMENT LIVE TESTS AND CLEANUP. **Implementation:** [PR #43](https://github.com/Kondapaneni/HRMS/pull/43), [PR #44](https://github.com/Kondapaneni/HRMS/pull/44). **Scope:** Scoping of the reported development test results, not an independent production penetration test or production clearance.

#### Original audit finding

[AUDIT_REPORT.md](#issue-id-sec-013) identifies sensitive salary disclosure in `GET /api/admin/employees` when the caller has a delegated non-payroll feature, and employee assessment routes that did not consistently verify `assigned_employee_ids` or the assessment deadline on the server.

The new source review also found related compensation disclosures in `GET /api/admin/employees/{id}`, its recent payslips and historical salary timeline entries, plus salary mutation paths through employee edits, creation, conversion and promotion. These are protected in the same remediation.

#### Changes in PR #43

##### Compensation data and writes

- `App\Security\CompensationAccess` checks the authenticated principal's live `user_feature_access.canPayroll` for delegated employee, HR or manager roles; the globally privileged `admin` role retains compensation access. The grant check is fail-closed on missing/malformed grants. It does not trust client-claimed permissions.
- `GET /api/admin/employees` selects `NULL::numeric AS salary` for non-payroll delegated readers, rather than fetching salaries and hiding them only in JavaScript.
- `GET /api/admin/employees/{id}` returns `salary: null`, no `recentPayslips`, and removes salary/pay/rupee-related timeline events for non-payroll delegates.
- `PUT /api/admin/employees/{id}`, `POST /api/admin/employees/{id}/promote`, `POST /api/admin/employees/convert`, and `POST /api/employees` deny unauthorized compensation changes with **403**. Legitimate non-salary directory changes are not blocked.
- Admin Employee Directory, Edit and View components represent missing salary as **Restricted**, not ₹0, and avoid submitting a redacted salary from a normal non-payroll editing flow. Client-side controls are usability measures, not the security boundary.

##### Assessment assignment, ownership and deadlines

- `GET /api/employee/assessments/{id}` and `POST /api/employee/assessments/{id}/start` filter in PostgreSQL to **active and explicitly assigned** assessments. The existing list already filters by assignment.
- `PUT /api/employee/assessments/attempts/{attemptId}/save` and `POST .../submit` require all of: attempt belongs to authenticated user, `in_progress`, assessment `Active`, current employee still in `assigned_employee_ids`, and the PostgreSQL clock within `start_time + duration_minutes + 30 seconds`. The extra 30 seconds is a narrowly bounded grace for the final browser autosave and submit over the network. Both routes lock the attempt row to prevent competing writes/submissions.
- Expired `/start` resumptions deny further question access. `GET /attempts/{attemptId}/result` now checks current assignment as well as attempt ownership. Unassigned or revoked students cannot retrieve a previous result via a known ID.
- Assessments configured with non-positive `duration_minutes` retain existing untimed behavior. This is a configuration choice, not something the browser can change for an existing assessment.
- No schema migration is required; read-only Supabase inspection confirmed `assessments.assigned_employee_ids` is `jsonb` and `assessment_attempts.start_time` is `timestamptz`.

#### Isolated CI (no live mutation)

`.github/workflows/sec013.yml` runs a dedicated `sec013_test` PostgreSQL instance with synthetic, fixed UUIDs. `tests/sec013_seed.php` **refuses to run against any other database**; the test JWT secret is synthetic and is not deployable. Real HTTP tests cover:

- Assets-only employee, employees-directory-only employee, payroll-authorized HR and Admin roles, including directory and detail salary redaction, payslips, historical timeline, promotion/salary edit and permitted non-salary edit.
- Assigned vs unassigned assessment detail/start, unauthorized attempts by known UUID, post-assignment-revocation save/submit/result denial, expired resume/save/submit denial, and successful fresh save/submit/result.
- Isolated PostgreSQL postconditions confirm salary unchanged, expired/revoked attempts untouched, and exactly one normal graded attempt.
- PHP lint, JS checks and Vite production build. Existing SEC-009 role regressions and Android CI run when paths overlap.

#### Assessment calendar follow-up — PR #44

During owner-led SEC-013 Step 7A, the employee Assessment Portal displayed **2026-11-14** shortly after **01:04 IST on 2026-11-15**. The frontend had used `new Date().toISOString().split('T')[0]` (UTC day) while PHP enforces `date('Y-m-d')` in `Asia/Kolkata`. [PR #44](https://github.com/Kondapaneni/HRMS/pull/44) replaced the assessment list and employee navigation's differing date calculations with a shared `Asia/Kolkata` calendar-day hook, refreshed on interval/tab resume and in day-keyed assessment queries. GitHub Action `.github/workflows/assessment-date.yml` passed regression cases around IST midnight (including 01:04 IST), different browser time zones, calendar rollovers and Vite production build. Render was confirmed live at commit `29bf21796b1bd0c71a0d1ed444107a5dedb944ac`; owner confirmed Step 7A-1 displayed **2026-11-15** after refresh.

#### Completed development live verification — owner-reported, 2026-11-15

The test operator explicitly reported the following scoped checks as **PASSED** after PR #43 deployment, PR #44 deployment for the calendar correction, and the final cleanup. These are *owner-reported application observations*, not direct independent reproduction of all live requests:

| Test | Confirmed scoped result |
| --- | --- |
| SEC-013 Step 1 | Admin Dashboard/Employees directory and employee detail accessible; Admin salary visible. |
| Steps 2–3 | Assets-only (no Payroll) and Employees-without-Payroll delegated employee directory returned 200 with `salary: null`; detail 200 with `salary: null`, empty payslips and redacted salary history; Employee Dashboard worked. |
| Step 4 | Salary edit `PUT` and promotion `POST` directed only to a random **fake employee UUID** were rejected with 403; no actual employee compensation data changed. |
| Steps 5A–5B | Turning Payroll ON exposed salary to a permitted development delegate with 200, then turning Payroll OFF immediately returned null salaries on **the same logged-in session**, while Employees remained ON. |
| Steps 6A–6B | Unassigned development employee's assessment list 200 did not expose the test assessment; detail 404; unauthorized start 403. |
| Steps 7A-1–7A-3 | Date correction confirmed `2026-11-15` at 01:04 IST; assigned active development assessment appeared with Start available; authorized user opened instructions, started attempt, loaded questions and observed timer decrease. |
| Step 7B | Assigned development employee submitted a synthetic assessment successfully, with completion confirmation and no authorization error. |
| Step 8 | Different employee requested the completed assessment result by known attempt ID and received 404. |
| Step 9A | Dedicated **SEC-013 Timer Security Test** created, active for Nov 15 IST, one synthetic question, 1-minute duration, one test employee, one attempt. |
| Step 9B | Dedicated 1-minute test started with 200; after 105 seconds, expired save 403 and expired submission 403; both operations blocked. |
| Step 9C | Expired resume returned 403; original attempt ID and attempts-used state remained unchanged. |
| Steps 10A–10C | Dedicated timer test changed to **Archived**, disappeared from employee list, expired attempt retained; completed and other development test assessments preserved or archived as appropriate; temporary Payroll/Employees/Assets test grants restored to original settings; Admin Assessments, Feature Access and Employee Dashboard passed final checks. Real employee assessment records were reported unchanged. |

##### Closure gates and evidence limits

1. **Source/CI/deployment:** PR #43 merged (commit `c427a19e578342e2163331be70836f101b7432e1`); SEC-013 synthetic authenticated HTTP/PostgreSQL, SEC-009 cross-authorization and Android security regression CI finished successfully on the PR. PR #44 merged (commit `29bf21796b1bd0c71a0d1ed444107a5dedb944ac`); assessment-midnight, SEC-020 and Android CI finished successfully. Render's HRMS development service deployment for PR #44 was independently confirmed `live`.
2. **Salary feature boundary:** Both positive and negative delegated payroll cases verified by operator, including immediate same-session revocation and unrelated employee directory/dashboard regression.
3. **Assessment boundary and deadline:** Unassigned access, result ownership, normal authorized start/submission and expired save/submit/resume verified with approved synthetic development fixtures; no real test-taker's attempts modified to simulate expiry.
4. **Restored environment:** Operator confirmed temporary permissions restored, synthetic test assessments archived/retained as appropriate, and UI regressions passing. Archived expired attempt intentionally retained as evidence rather than destructively removed.
5. **Evidence boundary:** Live testing was **owner-reported**, not an independent penetration test. The live write-denial test used random nonexistent employee IDs, so denial for a real owned record was not separately asserted live; synthetic SQL/HTTP CI covers unauthorized salary writes and zero-mutation postconditions. The 30-second grace and other revocation/race cases were modeled with synthetic PostgreSQL CI; the live expiry test checked the state after 105 seconds, not the exact grace transition. Tests were scoped to development users/assessments, not production datasets.

**Closure decision:** SEC-013 is **CLOSED for the verified development remediation scope** on 2026-11-15. This closure is not a general assertion that all HRMS privacy or authorization problems are resolved. Other tracked security and production release requirements remain open.

**Residual risks:** Other compensation or assessment endpoints beyond those enumerated here may warrant separate review. Non-positive duration remains untimed by design; ensure staff have correct configuration privileges. SEC-014, SEC-015, SEC-018, SEC-021 and other independently tracked findings remain open. This change does not clear HRMS for real-user production use.

## SEC-014 remediation and verification

*Consolidated from former `docs/SEC-014-remediation.md`.*

### SEC-014 — Server-side attendance geofence and non-spoofable rate-limit identity

**Severity:** MEDIUM. **Status:** CLOSED — PR #46 MERGED / FOCUSED SYNTHETIC CI PASSED / RENDER DEVELOPMENT DEPLOYED / OWNER-REPORTED LIVE VERIFICATION AND CLEANUP PASSED (2026-11-15). **Scope:** Development security remediation; not production penetration testing.

#### Finding and policy

[AUDIT_REPORT.md](#issue-id-sec-014) found that `POST /api/employee/attendance/punch` accepted client-computed geofence decisions without independent server distance checks, and `RateLimiter::getClientIp()` used attacker-supplied `X-Forwarded-For`/Client-IP headers for login, OTP, reset and map quotas. This could enable offsite attendance and header-rotated rate-limit bypasses.

The app's **existing product policy** is: employee `geoFenceEnabled` controls **check-in/check-out**, while Android's **interval background punches** are allowed outside a worksite to follow approved travel/field operations. SEC-014 preserves that distinction. For geofence-enabled staff, server evaluates the latitude/longitude *supplied with a request* (never a client-provided `insideGeofence` flag) against the current admin-managed `geofences` table with a Haversine calculation in meters. Requests with missing/malformed/non-finite/out-of-bounds coordinates, without a configured valid office geofence, or outside all office radii are rejected before geocoding or writing attendance. Disabled geofence staff retain explicitly permitted remote check-in/out. Missing employee profile or DB verification error fails closed.

**Important limits:** The current `geofences` table is a shared company-wide list, not a branch-to-geofence assignment table. This implements the **existing shared-office policy**, not strict per-branch enforcement. A malicious client can still claim plausible coordinates: Haversine verification ensures an alleged point is within a permitted area but **does not prove device GPS provenance or physical presence**. Stronger device location integrity/attestation and per-branch assignment require separate design and validation.

#### Rate-limit changes

`RateLimiter::getClientIp()` uses only validated `REMOTE_ADDR` (the direct TCP peer) and ignores all unverified forwarding HTTP headers. No application-assumed trust in Render headers. Credential routes `/api/login`, `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/forgot-password` enforce an **account-wide keyed limit** using normalized lowercased/trimmed email hashed in `rate_limits.ip_address`, independently of an elevated **trusted-peer spray threshold** (`max(30, 10 × per-account max)`). A successful password/OTP login clears only that account's attempts, not the shared peer's failure history. Different employees behind one office NAT are not locked out together after the default five account failures. New rate keys contain no cleartext login emails.

The authenticated map endpoints `GET /api/employee/geofences` and `GET /api/employee/maps-rate-limit-status` now use the same hashed **authenticated user ID** key; the latter requires an employee token. Rotating forwarding headers cannot reset the map quota. DB-backed shared counters work across application processes/instances, assuming a shared PostgreSQL database. Existing `rate_limits` schema is reused; no migration required.

#### Isolated CI validation and rollout safeguards

`.github/workflows/sec014.yml` provisions a disposable PostgreSQL `sec014_test`, runs policy tests (Haversine, missing fences/coordinates, employee controls, remote interval behavior, spoofed XFF), then real authenticated HTTP exercises:
- 5 invalid password logins for a synthetic non-existent account + rotated XFF, then 429 on sixth; another account is not blocked behind same peer.
- 5 invalid synthetic OTP send requests then 429; 6 invalid OTP verification attempts then 429; 3 synthetic password-reset requests then 429. No real account or outbound email is used.
- Geofence-enabled check-in far from office 403, no-GPS 403, malformed location 400; valid office check-in 200; outside checkout 403; remote interval background `punch` 200; valid office checkout 200. Geofence-OFF staff can check in/out remotely.
- Map status unauthorized 401 and per-user map loads throttle after 5 views despite rotated XFF; other employee unaffected.
- Postconditions assert no unauthorized attendance rows or offsite check-in/out coordinates, expected legitimate records and interval punch, no queued emails, and no attacker-controlled XFF or cleartext emails in rate-limit keys.
- PHP lint, JS syntax, Vite production build. Seed/postcondition scripts strictly refuse any database other than `sec014_test`.

Do not run brute force tests against a real HRMS account, trigger real OTP/reset email deliveries, delete genuine rate-limit rows, or alter real employee attendance in connected development/production. To verify live without making employee punches, first check Admin attendance/geofence configuration with a dedicated dev employee account (preferably with no attendance active), then use benign invalid synthetic-coordinate **check-in** requests that must be denied before writes. For allowed check-in/out or roaming background behavior, obtain explicit approval for a designated development-only day/employee and then perform each action safely. A failed/denied response is not proof of physical location validation if the employee's `geoFenceEnabled` flag is disabled; inspect it before interpreting results.

**CI evidence:** [SEC-014 final focused real HTTP/PostgreSQL and frontend build — PASSED](https://github.com/Kondapaneni/HRMS/actions/runs/43682349266). The first iterations exposed missing test-schema columns and an unbound authenticated user ID in the map-status route; both were corrected before the final green run. The final run confirmed PHP lint, policy/Haversine tests, rotated-forwarded-header authentication abuse checks, authorized/denied attendance and map status, no unauthorized data mutations, and the frontend production build.

#### Closure gates

1. CI green, PR merged and current Render development commit confirmed live.
2. Owner-reported Admin geofence configuration and employee geofence-enabled status verified; safe out-of-range/no-coordinate **denial** on synthetic employee confirmed with no attendance changes.
3. Owner-reported legitimate inside-radius check-in/out and configured remote/Android interval behavior on approved synthetic test account *only if safe*, otherwise rely on isolated CI and record live limitation.
4. Rate-limit abuse tests are covered in isolated CI, not live login/OTP flooding. One read-only admin config/status check suffices for live connectivity.
5. Temporary dev config/attendance fixture cleaned or restored, and Admin/Employee Dashboard regression checked. Close SEC-014 only when owner reports scoped live results and environment restoration.

**Independent open findings:** SEC-015, SEC-018, SEC-021, SEC-022 and other audit items remain separately scoped. Closing SEC-014 does not clear HRMS for real-user production.

#### Live development verification and scoped closure — 2026-11-15

- **Delivery:** [PR #46](https://github.com/Kondapaneni/HRMS/pull/46) merged into `main` as commit `944dce1da8f59906a5e036a93d052f929720c739`. Render development deployed this change successfully; subsequent development deployments remained live. Final focused [SEC-014 CI](https://github.com/Kondapaneni/HRMS/actions/runs/43682349266) and related SEC-006/007/008/009/012/020 security/Android regressions reported success.
- **Step 1, 2A:** Owner confirmed Admin Dashboard, Attendance Configuration, Employee Security, and Employee Dashboard were functional without attendance changes; development employee's `Geo-fence radius validation` was **ON**, with at least one valid saved office geofence.
- **Step 2B, 2C (negative tests):** Owner confirmed one direct check-in without GPS and one check-in with synthetic coordinates outside all office geofences each returned **HTTP 403**; attendance history remained unchanged in both cases. No repeated failed requests or real-user mutations.
- **Step 3A–3C (permitted tests):** Owner confirmed approved development-only testing conditions, and reported genuine GPS inside an approved office radius. The normal Employee Dashboard check-in returned **HTTP 200** and created the expected Admin-visible attendance. A single authenticated interval `punch` returned **HTTP 200**, preserving original check-in and leaving checkout empty, and appeared in Admin Attendance Location.
- **Step 3D (roaming policy):** The owner **skipped a live offsite interval punch intentionally** to avoid unsafe travel or a stranded checked-in attendance session. The offsite interval-punch policy passed *isolated synthetic HTTP/PostgreSQL CI* and was not separately validated live on the development account.
- **Step 3E (controlled checkout):** Owner confirmed genuine inside-radius checkout returned **HTTP 200** with successful completion; check-in time and interval punch were preserved; Employee Dashboard and Admin Attendance/Attendance Location displayed the completed single-day attendance record and expected location markers. No automatic tracking remained.
- **Step 4A (rate-limit connectivity):** Owner confirmed three Admin rate-limit settings sections displayed valid positive thresholds/windows without changes, and the employee read-only map-rate-limit-status endpoint returned **HTTP 200** with a valid lock-status field. Rotated-header account, OTP/reset and map abuse checks ran **only in isolated CI**, never against live credentials or real email queues.
- **Step 4B (regression and cleanup):** Owner confirmed Admin Dashboard, Attendance, Attendance Location and Settings; Employee Dashboard and history; geofence **ON**, original office geofences and rate-limit values; checked-out test employee and inactive tracking. Approved handling of test records and no alteration of genuine employee attendance were owner-reported.

**Closure decision:** All scoped SEC-014 closure gates met for development based on merged source, CI, confirmed Render deployment and **owner-reported** live verification. These statements do **not** independently verify physical GPS provenance or constitute live production penetration testing. Shared company-wide geofences (no per-branch assignment), lack of device-location attestation, and other open audit items remain limitations; SEC-014 closure is not authorization for production release.

## SEC-015 remediation and verification

*Consolidated from former `docs/SEC-015-remediation.md`.*

### SEC-015 — Restrict recruiter email delivery, remove onboarding passwords and escape promotion letters

**Severity:** HIGH. **Status:** CLOSED for verified development-remediation scope (2026-11-15): PR #48 merged, focused and related CI passed, Render development deployment live, owner-confirmed scoped live verification. **Not production clearance.** Historical queued credentials and backups require separately approved review and rotation.

#### Original finding and exact code

The [SEC-015 audit](#issue-id-sec-015) identified three related issues:
1. Authenticated recruitment endpoint POST /api/admin/send-email accepted a fully caller-supplied `to`, `subject` and raw HTML `body`, allowing a compromised recruiter session to turn official mail into a phishing relay.
2. POST /api/employees created a chosen/generate-in-browser initial password and inserted it into the welcome template, persisting a usable plaintext password in `email_queue.body` and its backups.
3. POST /api/admin/employees/{id}/promote embedded dynamic employee designation and effective-date values into intentionally formatted HTML fragments without escaping them.

#### Implementation

- `App\Security\EmailSecurity` accepts **only server-owned templates**, an application UUID, and one of `shortlisted`, `rejected`, `interview`, `offer`, `status`, `documents_verified`. Recipient email, candidate name and job title are retrieved from `applications` joined to `users` and `jobs`. The notification type must match the latest application status. Document verification mails require all ten mandatory `candidate_documents` types verified in the database. Interview details are taken from existing server-side `application_timeline` and limited to escaped text. No caller-specified links, subject, recipient or raw HTML are accepted.
- `EmailSecurity::render` escapes all data placeholders with `htmlspecialchars(..., ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')`; the controlled template may contain intended formatting but the applicant's name, job title, status and interview notes cannot become HTML. Promotion fragments pre-escape the dynamic position and effective date before insertion into controlled `<strong>` markup. Email subjects strip line-break/control characters.
- Every successful recruitment email consumes a database-backed per-authenticated-user notification quota: 20 per 60 minutes. This limits a compromised recruiter from repeatedly spamming known candidates; it does not replace operational deliverability anti-abuse controls.
- New employee creation no longer accepts an initial password from the admin browser. A high-entropy random password is hashed and is not disclosed or emailed. A 32-byte random one-time setup token is stored in existing `users.reset_token` and expires in one hour via database `CURRENT_TIMESTAMP`. An approved welcome template sends the link to the stored employee email. The existing `POST /api/reset-password` was hardened to atomically consume a valid, unexpired token within the same conditional `UPDATE ... RETURNING role` that installs the employee-selected password, clears the mandatory-change flag and revokes prior sessions via token version. A concurrent or replayed token cannot authorize a second credential write.
- AdminAddEmployee no longer generates/displays initial passwords. AdminRecruitment and AdminVerifyDocuments send `{applicationId,type}` only; HTML is rendered by PHP, not React. The generic/legacy API contract is explicitly rejected with 400 and no queue write.
- New static status template covers statuses without their own letter. The offer template previously instructed candidates to view their offer in the portal; the generic email relay no longer accepts client-provided offer URLs, avoiding an arbitrary redirect. Separate offer-letter storage entitlements and client uploads remain governed by SEC-003 and SEC-017.

#### Verification

`.github/workflows/sec015.yml` uses disposable PostgreSQL `sec015_test` and a local PHP HTTP listener, never the connected HRMS database. Tests include anonymous/candidate denial, arbitrary `to/subject/body` rejection, forged recipients, bad UUID/type, missing applications, notification/status mismatches, verified/unverified document checks, recruitment quota, HTML-injected candidate/job/interview data, rejected legacy employee password, successful new employee invitation, escaped promotion fields, and SQL postconditions. A one-use setup token is exercised through the actual reset API, including replay failure and account version bump. A Vite production build checks UI compatibility. **No actual emails are delivered by CI**; `email_queue` is a test-only table.

#### Owner-confirmed live development verification (2026-11-15)

- **Deployment and regression:** SEC-015 [PR #48](https://github.com/Kondapaneni/HRMS/pull/48) was merged and the exact fix deployed live on Render development. SEC-015 focused synthetic HTTP/PostgreSQL + frontend CI passed; related security/build regression workflows passed. Owner reported Steps 1A–1D PASSED: Admin Dashboard, Recruitment, Employee Directory and password-free Add Employee form loaded without changing real records.
- **Recruitment email API, owner-reported Steps 2A–2F:** Unauthenticated legacy request denied with 401; authenticated arbitrary recipient/subject/HTML denied with 400; forged `to` denied with 400; unauthorized notification type denied with 400; malformed application identifier denied with 400; valid-format but nonexistent synthetic UUID denied with 404. These requests targeted synthetic inputs; no real applicant email was intentionally sent. Server-side controlled recruitment templates, HTML escaping, status/document validation and rate limiting were covered by isolated CI, not a live mail to a real candidate.
- **Onboarding, owner-reported Steps 3A–3J:** Safe dedicated mailbox and test-employee preflight; secure Add Employee form without initial-password field; approved synthetic employee created and secure one-hour invitation received (no plaintext password); original invitation opened HRMS reset form, successfully set test password, then replayed reset was rejected as invalid/expired; test account successfully logged in; Admin disabled Workspace account access, and an existing test employee session was blocked on refresh. Test record retained as audit evidence, disabled but not deleted. No real employee attendance or payroll activity was performed.
- **Risk acknowledgement, owner-reported Step 4A:** Owner accepted development-only closure with separate follow-up required for historical queued plaintext passwords, prior mail/backups, and credential rotation. This document records owner-reported live outcomes, not an independent production penetration test. CI covered promotion HTML escaping and sensitive paths without changing real salary or role data.

#### Rollout and limitations

1. Merge only when focused CI and previously passing auth/feature regression tests are green. Confirm the exact Render deployment is live.
2. Owner should first confirm Admin Dashboard, Recruitment, Employee Directory and Settings load with no changes. Do not send emails to actual candidates or employees.
3. Check rejection of legacy arbitrary HTML and forged-recipient payloads against an authenticated *development admin* using only invalid request shapes (expected 400 **before** queue write).
4. Test actual recruitment status notification and employee onboarding setup **only with a dedicated synthetic test candidate and approved test mailbox/window**; otherwise use isolated CI for outbound flows. Never expose reset/setup tokens, real addresses, or credential hashes in chat. Check mailbox and recipient identity only on approved test data.
5. Inspect promotion email escaping only via synthetic CI or test-only employee; do not change a real employee's salary or position. Restore any temporary test fixtures, verify no real accounts were touched.
6. Development-scope SEC-015 remediation is closed after scoped owner-confirmed live verification and test-account deactivation; retain the synthetic test record for audit until authorized removal. Historical credential/queue remediation is separately tracked as a release risk.

**Residual risks and non-goals:** Historical queued plaintext passwords, old queue/backups, queued OTP codes and password-reset tokens are not automatically purged. Previously exposed initial passwords must be reset/revoked for affected accounts and legacy queue data reviewed under a separate approved maintenance/data-retention process. Newly generated one-time setup URLs are still sensitive until consumed; the mail delivery queue necessarily holds the link in plaintext. The current password-reset token itself is also stored plaintext in `users.reset_token` (one-hour expiry); storing a hash is a desirable follow-up with migration/compatibility assessment. The existing template mail sender/Edge authorization from SEC-002 remains unchanged. Security of other independent email templates and public file uploads is not asserted by this finding closure. Remaining SEC-017/018/021/024 and others continue to block production clearance.

## SEC-016 remediation and verification

*Consolidated from former `docs/SEC-016-remediation.md`.*

### SEC-016 — Separate Google Maps browser and server Geocoding API keys

**Severity:** MEDIUM. **Status:** CLOSED for owner-verified development security-remediation scope (2026-11-15). **No production clearance.**

#### Original exposure and owner-verified baseline

The owner confirmed in development that Admin Attendance Location loaded correctly (Step 1A), and an authenticated `GET /api/admin/attendance/location/{id}` returned a nonempty `googleMapsApiKey` field (Step 1B), without copying its value. Source code also exposed `GOOGLE_GEOCODING_API_KEY` in `GET /api/employee/geofences`. An existing mixed-use Maps Platform API key was configured with **no application restrictions** and access to five Google APIs. The owner created distinct restricted DEV keys (browser key subsequently staged in Render development; backend key not yet activated):
- **Browser:** `https://hrms-qwv3.onrender.com` website referrers; Maps JavaScript API only.
- **Backend:** Render shared outbound CIDR ranges; Geocoding API only. Render IP ranges are shared with other services; protect the key and configure quotas.

#### Prepared code remediation

- Attendance and geofence JSON no longer carry any Google API key. The backend continues address reverse geocoding using `GOOGLE_GEOCODING_API_KEY` and must never emit it in payloads.
- A dedicated authenticated `GET /api/maps/browser-config` exposes only `mapsJavaScriptApiKey` from the **new** `GOOGLE_MAPS_BROWSER_API_KEY`. Browser Maps JavaScript keys are necessarily public and must be tightly restricted in Google Cloud. This intentionally visible browser value is **not** a server credential. No attendance coordinates or other business records appear in the config response.
- `MapsConfig::browserKey` fails closed (503) when the browser key is missing or equals `GOOGLE_GEOCODING_API_KEY` or the legacy `GOOGLE_MAPS_API_KEY`; no server/mixed-use fallback. All configuration requests require an active Admin, Employee, HR, or Manager session. Candidate sessions are denied. The HR/Manager roles are required for existing employee attendance map access; the frontend route permits both roles.
- Both `AdminAttendanceLocation` and `EmployeeMobileMap` use the same runtime browser-config hook. Capacitor Android loads the remote `https://hrms-qwv3.onrender.com` site from `server.url`. A new APK is not required solely for the web map change, but Android regression testing is mandatory.
- Render entrypoint and blueprint accept `GOOGLE_MAPS_BROWSER_API_KEY` as a runtime backend environment variable. This is deliberately **not** a Vite build-time variable.
- Focused CI tests exercise fail-closed key policy, authenticated runtime config, absence of Geocoding/mixed-use keys in geofence responses, source-level Admin response and both frontend map consumers, plus the production Vite build. Only disposable PostgreSQL and synthetic test values are used.

#### Rollout sequence — do not reorder

1. Browser-only and server-only DEV keys with appropriate Google Cloud restrictions created; old key remains unchanged while old application serves maps.
2. **Before merging**, set only `GOOGLE_MAPS_BROWSER_API_KEY` in the Render development service to the newly created **browser-only** key. Preserve current `GOOGLE_MAPS_API_KEY` and `GOOGLE_GEOCODING_API_KEY`; check map regression after Render redeploy, if it happens.
3. After focused CI passes and owner reviews, merge and confirm the new Render deploy. Verify browser-config returns **only** the dedicated browser key (never print it), both attendance responses omit key fields, and the Admin and Employee web/Android maps load/mark correctly. No real attendance mutation without approved test window.
4. **Only after** map smoke tests, update `GOOGLE_GEOCODING_API_KEY` to the new restricted server key. Validate server reverse geocoding through owner-approved synthetic test action.
5. Confirm Google Cloud referrer restrictions, Render CIDRs, API restrictions and quotas. Only once no clients depend on it, rotate or revoke the old unrestricted/mixed-use key. Shared outbound IP restrictions reduce exposure but do not make the key exclusive to this Render service.
6. Finish owner-confirmed scoped live verification and cleanup before closing issue in the tracker. Never claim production approval from this development test.

**Rollback:** Restore the previous working app release together with its matching old key setup if deployment fails. Never introduce a new-code fallback to the Geocoding key or old mixed-use key.

#### Development closure evidence — 2026-11-15

- **Code/deployment:** [PR #51](https://github.com/Kondapaneni/HRMS/pull/51) merged. Owner confirmed Render DEV deployed with independent `GOOGLE_MAPS_BROWSER_API_KEY` and updated `GOOGLE_GEOCODING_API_KEY`; subsequently removed `GOOGLE_MAPS_API_KEY` from Render DEV and deleted the legacy unrestricted Google Cloud `Maps Platform API Key` after finding no post-removal traffic. The new dedicated browser and backend keys were retained.
- **No server credential exposure:** Owner verified `GET /api/admin/attendance/location/{id}` returned 200 with record/employee/punches and no Google key fields, and `GET /api/employee/geofences` returned 200 with the geofences array and `geoFenceEnabled` but no Maps or Geocoding keys. Anonymous `GET /api/maps/browser-config` returned 401; authenticated Admin received 200 with only a nonempty `mapsJavaScriptApiKey` and `Cache-Control: no-store`.
- **Map regression:** Owner verified Admin Attendance Location, Employee Web location map and Android 14 remote WebView map, including current-location markers/geofence circles where applicable, and repeated all three regression checks after removing the legacy Render key and after deleting the original Google Cloud legacy key. No Maps authorization errors or employee attendance mutations were observed.
- **Key restrictions:** Owner verified new Maps JavaScript browser key is limited to the DEV HRMS website and Maps JavaScript API; backend Geocoding key limited to Geocoding API and `74.220.52.0/24` plus `74.220.60.0/24`, matching Render service outbound ranges. These Render CIDR ranges are shared with other services. Google Cloud Geocoding API is enabled.
- **Controlled Geocoding runtime test:** During an owner-confirmed no-check-in/no-tracking DEV window, a single synthetic `POST /api/employee/attendance/punch` request with public coordinates, `action=punch`, and no provided address received 400 (`Cannot punch without checking in first.`). The owner verified the attendance history was unchanged. Current server source attempts Geocoding before that attendance-state denial. Google Cloud metrics for the **new restricted backend credential** showed a `2xx` Geocoding request at the test time and `grpc_status_code=0` (OK), confirming Google API acceptance from the deployed backend. Avoid repeating the synthetic request against actual attendance records.
- **Usage limit:** Owner set Geocoding v3 daily quota to **1,000 requests/day** (previously unlimited). Evaluate this limit before scale-up; it is a project/API quota, not per-key isolation.
- **Residual boundary:** HTTP/gRPC success and safe attendance rejection do **not** directly prove that the PHP application parsed a returned `formatted_address` or persisted it for a successful attendance action. That functional check remains a documented, separate owner-approved test and is **not** represented as passed. No independent production security clearance, production rollout approval or blanket Maps billing-safety guarantee is claimed. This closes only the scoped **secret exposure and key separation** finding.

## SEC-017 remediation and verification

*Consolidated from former `docs/SEC-017-hardening-and-historical-audit.md`.*

### SEC-017 — Backend-minted Storage names and historical object review

**Status:** **CLOSED for the verified HRMS development security-remediation scope (2026-11-16).** [PR #54](https://github.com/Kondapaneni/HRMS/pull/54) and [PR #55](https://github.com/Kondapaneni/HRMS/pull/55) are merged; Render HRMS development is live on commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`. Focused and regression CI passed, owner-confirmed live tests passed, and independent read-only Supabase SQL confirmed no remaining matching SEC-017 synthetic objects. Historical objects were retained. **This is not production clearance or a full penetration test.**

#### Completed live security verification (before filename change)

- Admin, Employee and Candidate upload authorization and negative-path checks passed.
- Synthetic Admin, Employee and Candidate uploads and exact-path deletes passed; SQL verified zero remaining synthetic test objects.
- Direct publishable-key upload attempt was blocked by Storage RLS.
- Invalid file data returned 415; path traversal returned 400; unauthorized paths returned 403; anonymous upload returned 401.
- Existing overwrites did not replace the original image, and normal file-consuming application pages loaded.

#### Implemented hardening

- PHP Storage upload mints a new object name containing a 128-bit server-side CSPRNG suffix with `random_bytes(16)`, preserving the already-validated ownership prefix, directory and extension.
- All frontend upload consumers must persist the `path` returned by HTTP 201; clients' requested paths are *not* actual stored paths.
- Backend validates supported AVIF images by detected `image/avif` MIME. SVG/script content masquerading as AVIF remains rejected.
- Existing historical object names and URLs were not migrated; deletion uses the exact persisted object path.
- [PR #55](https://github.com/Kondapaneni/HRMS/pull/55) validates the Supabase bulk DELETE response body: HRMS accepts upstream success only when it contains the requested exact object path (and matching bucket when provided). Empty, malformed, wrong-path or wrong-bucket responses return an error instead of falsely signaling deletion. Failure cases were tested in isolated PHP CI; they were not intentionally triggered in the live development environment.
- The coordinated backend/frontend release was merged and deployed through [PR #54](https://github.com/Kondapaneni/HRMS/pull/54), followed by the deletion-response follow-up in PR #55.

#### Historical audit (read-only, November 15, 2026)

11 buckets, 229 Storage records including eight 0-byte `.emptyfolderplaceholder` objects; 221 non-placeholder file objects passed MIME metadata and size-limit checks. This only verifies Storage metadata, not every underlying file's bytes.

Five AVIF image objects had `image/avif` metadata and sizes around 1.83 MB each: four in avatars, one in holidays. One avatar and the holiday had matching references in the checked application tables; the other three avatars had no matches in the six checked image columns. **Unmatched is not proof of unused.**

**No historical objects were deleted, overwritten or converted.** Keep read compatibility. Before any orphan cleanup, inspect all application, exported document, mobile-cache, external URL and retention dependencies; capture approved backup/reference inventory; obtain explicit file-specific deletion approval; perform one scoped deletion at a time and verify restoration readiness.

#### Post-deployment live verification and corrective follow-up (November 15–16, 2026)

1. **Existing UI regression:** Owner confirmed Admin Dashboard, Holidays and existing images, Recruitment jobs/applications and a Job Description download, Training Videos playback, Employee Expenses/receipt preview, and Employee Profile/avatar worked without unexpected errors or modified business records. Existing AVIF content was not separately identified and byte-verified during this round.
2. **Admin synthetic upload:** Upload returned HTTP 201 and a backend-generated 32-hex-character suffix; exact PNG GET returned HTTP 200 with matching bytes. Initial backend DELETE HTTP 200 followed by image-proxy HTTP 404 appeared successful, **but Storage metadata later showed one remaining Admin synthetic PNG**. The owner deleted **only that exact synthetic file** through the Supabase Storage dashboard and verified the count returned to zero. This was the trigger for PR #55; an image-proxy 404 alone does not prove Storage-object deletion.
3. **Employee synthetic upload:** HTTP 201 returned an unpredictable owner-scoped path. A GET of the unlinked receipt returned HTTP 403 as designed, because there was no authorized expense record. Exact-path DELETE returned HTTP 200; browser test marker was cleared.
4. **Candidate synthetic upload:** HTTP 201 generated a candidate-owned object path; authorized read returned 200 and exact matching bytes; DELETE returned 200, post-deletion read returned 404, and browser marker was cleared.
5. **Denial regressions:** Employee upload to a forbidden path returned **403**; fake AVIF/SVG content returned **415**; traversal-style path returned **400**. Prior baseline also covered anonymous 401, no-overwrite behavior and direct publishable-key RLS denial.
6. **PR #55 focused post-deployment checks:** With commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd` live, owner confirmed Admin Dashboard/Holidays regression; a new single synthetic Admin PNG upload HTTP 201 with stored marker; exact-path DELETE HTTP 200 with matching returned path; and final browser marker cleanup. The backend now validates the upstream deletion response; live tests confirmed the successful case, while empty/wrong/malformed response branches were covered in isolated PHP CI.
7. **Independent Storage cleanup:** Read-only SQL against Supabase `storage.objects` after the PR #55 test returned **admin_remaining = 0, employee_remaining = 0, candidate_remaining = 0** for the SEC-017 synthetic test prefixes. This verifies Storage metadata counts, not a comprehensive byte-for-byte audit of every historical object.

#### GitHub, deployment and CI evidence

- [PR #54: Server-generated Storage names, persisted upload paths and validated AVIF](https://github.com/Kondapaneni/HRMS/pull/54) — merged as commit `4abb99d5fcfe5bc74a0385f1b25818d0043ba830`. [SEC-017 focused CI](https://github.com/Kondapaneni/HRMS/actions/runs/43746726389) and related SEC-006/009/013/015 regression workflows completed successfully.
- [PR #55: Fail-closed exact-object deletion confirmation](https://github.com/Kondapaneni/HRMS/pull/55) — merged as commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`. [SEC-017 focused CI](https://github.com/Kondapaneni/HRMS/actions/runs/43798893278) and SEC-009 regression workflow completed successfully.
- Render HRMS development service was independently confirmed **Live** on commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`, deploy `dep-dbt7p06q1p3s73fjl5cg`. No follow-up deployments are required to record closure in documentation.
- Live browser/API observations and dashboard deletion actions were **owner-reported**; GitHub CI, Render deployment metadata, and final read-only Supabase metadata counts were independently checked during the project review.

#### Scope limits and historical retention

- Historical Supabase avatars, holiday images and other pre-existing objects were **not deleted, overwritten or migrated** by this remediation or its synthetic test cleanup. Three avatar objects without matches in six checked application columns remain retained; unmatched does **not** establish unused. Their dependencies and retention obligations require separate review before any file-specific cleanup.
- The 2026-11-15 metadata inventory was **not** a full inspection of file bytes or every reference. No production security assessment was performed. This scoped development closure does **not** resolve other open HRMS audit findings, credential rotation, residual historical exposure or broader production readiness.
- Keep destructive testing and production-designated Storage cleanup under a separately approved safe window; avoid automatic deletion of historical files.

## SEC-018 remediation and verification

*Consolidated from former `docs/SEC-018-remediation.md`.*

### SEC-018 remediation — review and release gates

Status (2026-11-17): SEC-018 deployed and DEV smoke-verified, but OPEN.
PR #58 was merged to main and the confirmed Acme HRMS DEV Supabase database
now has the restricted login and signed-audit verifier/key enabled. Render is
using the restricted role with the shared transaction pooler; the original
database credentials remain available as a functional rollback. One existing
Admin login was preserved and verified, 28 live test cases passed at their
documented scope, and independent audit INSERT/UPDATE attribution passed.
The prior Step 1I and rollout notes below describe HISTORICAL checkpoints,
not the current deployment state. Remaining native-prepares, authorization
and independent backup gates are in docs/SEC-018-final-hardening.md and
DRAFT PR #59. No production release or SEC-018 closure is approved.

#### Security policy

The runtime role receives explicit DML on 38 public application tables, no
ownership or role membership, and no BYPASSRLS. Role-specific policies preserve
backend compatibility; they do **not** implement independent user/branch RLS.
PHP authorization remains the user/branch boundary. SQL injection under this
role can still read/modify records permitted by its table grants.

Prepared statements retain their creating PDO connection. With signed audit
enabled, each operation (including SELECT function calls) receives a signed,
transaction-local identity inside the same transaction. Explicit transactions
are reused; autocommit operations use a short transaction. The verifier must
be available before the operation. Proofs bind to the full PostgreSQL transaction
ID and expire after 60 seconds. Keep a distinct random 256-bit audit key per
database/environment; never reuse JWT_SECRET. PHP verifies authentication and
live session version before assigning an actor. The trigger deliberately does
not recheck the *post-update* token version: logout/password changes increment
it themselves. A compromised application/signing key remains inside this trust
boundary. Legacy app.* session settings no longer establish audit identities.
Public/pre-auth operations are recorded without an actor. Existing audit logs
are retained. Restricted connections require signed audit to be enabled.

Refresh secrets remain hashed. All consumed hashes are retained for the session
lifetime. Unknown secrets are denied without revocation. A consumed secret within
30 seconds of consumption is denied without replacement or revocation. Retries
never extend that interval. A consumed secret after 30 seconds revokes the family.
This deliberately bounds the ambiguity between benign duplicate delivery and
credential theft; a thief using a stolen token within the interval is not detected
by that duplicate alone. Single use is preserved: only one concurrent request
wins; the other receives 401 and must not overwrite a newer cookie. Lost responses
require fresh sign-in because replacement secrets are not stored recoverably.
A retry after 30 seconds can revoke the session even if benign: this is the
explicit security tradeoff. Clients must serialize refreshes and stop retrying
an invalid credential. Expiry, active account, version and client type checks
remain. Expired session rows and their hash histories need operator-owned
retention cleanup; the runtime role has no session DELETE privilege.

#### Isolated evidence

`sec018.yml` provisions disposable PostgreSQL 16, applies both actual proposed
SQL files and runs the PHP classes directly and through PgBouncer transaction
pooling with a single backend connection. No production secrets or data are used.
`sec018_adversarial_ci.php` tests connection ownership, signed replay rejection,
commit/rollback, legacy context spoofing, missing verifier, independent-process
refresh races, unknown credentials, lost responses, delayed replay, Data API
roles and prohibited SQL. Existing SEC-008 onward workflows provide additional
HTTP and source regressions. The 38-table fixture has simplified columns and
cannot by itself certify every feature's schema compatibility.

#### Controlled deployment (operator only; explicit approval required)

1. Keep deployment blocked until the PR's required suites pass, the complete
   schema/function/trigger/worker inventory has been reviewed and functional
   checks cover the restricted role. Do not run all migrations automatically:
   these review-only scripts must be explicitly selected.
2. In an approved maintenance window stop HTTP writes and background workers.
   Record the deployed application SHA and take a verified schema/ACL/function
   backup and a recoverable database backup. Capture existing policies, grants,
   function owners/bodies and role membership for exact rollback.
3. On a matching isolated restored schema, run `psql -X -v ON_ERROR_STOP=1`
   with `-f supabase/review-only/20261116_sec018_runtime_role_review_only.sql`,
   then `-f supabase/review-only/20261116_sec018_signed_audit_review_only.sql`.
   The first script refuses inventory or policy drift. Review errors, never
   bypass guards. Only after approval repeat on the target with the approved
   migration owner. Do not put a production connection string on the command line.
4. Generate a unique audit key through the approved secrets manager. Provision
   its hex representation as the `v1` row in `sec018_internal.audit_keys` using
   bound parameters and as `SEC018_AUDIT_HMAC_KEY` for the backend. Set
   `SEC018_AUDIT_CONTEXT_ENABLED=true`, keep `DB_PDO_PREPARE_MODE=pooler`, and
   provision a fresh runtime password outside Git. Enable LOGIN on
   `hrms_runtime_restricted` only after checking its attributes/memberships and
   use it for DB_USERNAME. These credential/environment changes require separate
   approval; none are performed by this PR or its tests.
5. Deploy the approved application SHA with coordinated schema/settings changes.
   Retain the separately reviewed existing worker identities. Verify the checks below
   before reopening writes. Never resume using a privileged fallback silently.

#### Rollback

Stop HTTP and worker writes first. Restore the previous application SHA and
previous connection configuration only under the approved incident procedure.
Restore exact saved policies, ACLs, trigger function bodies and owners from the
pre-change schema backup; do not use blanket GRANT ALL. Revoke LOGIN from the
new role and terminate its sessions. Retain audit logs and refresh hash history
for investigation; additive history columns can stay during rollback. Rotate
and remove the newly introduced credentials/key after all dependent sessions
are stopped. Reverting to privileged access reopens SEC-018 and must be tracked
as an unresolved incident, not a successful security rollout. Validate rollback
on the isolated restored schema before approving production deployment.

#### Read-only inventory (2026-11-16)

Catalog inspection confirmed all 38 public tables have RLS enabled and the
refresh table has FORCE RLS. The real audit key is audit_id (UUID), with a
timestamp column. Seven table audit triggers call process_audit_log; the asset
updated-at trigger is invoker code. The email_queue insert webhook uses
supabase_functions.http_request. The email Edge Function uses its existing
service_role access to claim/update delivery status; those explicit grants are
preserved. The active daily_attendance_master_job runs as postgres, whose
function ownership/execute permissions remain unchanged. These workers are
separate privileged components, not evidence of least privilege for all
infrastructure. No live records, grants, roles, settings or jobs were changed.

#### Essential live verification after an approved rollout

Read-only: confirm current_user, role flags/memberships, object ownership,
38-table RLS, refresh FORCE RLS, private key ACL and security-definer ownership.
Using designated synthetic accounts only: verify an audited authorized operation,
a denied cross-user/branch operation with no record change, refresh rotation and
logout, and the email worker. Confirm API failures are sanitized and audit rows
show the expected verified actor. Inspect errors for pooler SQLSTATE 26000.
No destructive live tests or real employee modifications are required.

#### Step 1H — explicit deployment hold and outstanding release gates (2026-11-16)

**Decision: NO-GO.** PR #58 must remain **DRAFT, OPEN and UNMERGED**.
SEC-018 must remain **OPEN**. Do not run either review-only SQL migration,
enable a new DB role, provision credentials, change Render settings, or deploy.
The current approved scope is GitHub/documentation and disposable CI only.
There is no authorization to access live Supabase, including read-only schema
queries or generating a new schema export.

##### Evidence established by isolated tests (not release approval)

- [x] Proposed backend error-sanitization, no request-time MFA DDL, pooled
  database connectivity, signed audit, restricted-privilege and refresh-replay
  behavior are represented in the draft and tested in disposable CI.
- [x] PostgreSQL 16 + 17 isolated functional/permission coverage includes
  the 38-table synthetic application fixture, 407 pre-migration columns and
  408 post-migration columns, 78 constraints, and nine non-internal triggers.
  The two missing real function bodies are represented by **ACL-only stubs**.
- [x] Five incompatible schema conditions refuse migration with no partial
  restricted role, policy, or refresh-column changes.
- [x] Custom-format backup, both proposed migrations, synthetic post-change
  activity, and full pre-change fixture restore passed on PostgreSQL 16 and 17.
  The restored pre-change schema/ACL/ownership dumps matched exactly; three
  introduced CI roles were cleaned up. This is **not** a rehearsal on an
  authentic restored HRMS database.
- [x] All 13 PR security workflows passed for isolated commit
  `3e5ddb2d61c01b73ce0ad377309f01907243ac48`. Evidence:
  [Step 1F](https://github.com/Kondapaneni/HRMS/actions/runs/43837861858),
  [Step 1G-2](https://github.com/Kondapaneni/HRMS/actions/runs/43840077826),
  [Step 1G-3](https://github.com/Kondapaneni/HRMS/actions/runs/43841566133).
  Any later application/security code change requires its own green CI run.

##### Outstanding blockers — all MUST pass before rollout approval

- [ ] **B1 — Trustworthy schema source.** Obtain an owner-approved, sanitized
  *schema-only* snapshot from an authorized channel, including real table,
  column, constraint, index, view, trigger/event-trigger, function, extension,
  cron, schema-default-privilege, role, grant and policy metadata. No real
  employee data, OTPs, tokens, secrets, webhook authorization headers or
  credentials in Git/issues/test artifacts. No existing offline backup is
  available; live extraction remains prohibited without new explicit approval.
- [ ] **B2 — Real routine and worker compatibility.** Review actual definitions,
  owners, grants, dependencies and trigger registrations of
  `public.rls_auto_enable()`,
  `public.enforce_direct_chat_two_participants()`, and the privileged
  attendance/email/audit paths. The isolated versions of the first two are
  ACL-only stubs: do not claim they verify actual behavior or event hooks.
  Confirm that the proposed broad function EXECUTE revocations do not break
  any legitimate existing RPCs/background workers.
- [ ] **B3 — Genuine restored-schema rehearsal.** Recreate a sufficiently
  faithful complete HRMS schema in an isolated environment; validate both
  exact review-only migrations with the full structure and representative
  synthetic HRMS workflows. Fix any grant, ownership, dependency or
  application compatibility regressions and rerun all required CI.
- [ ] **B4 — Recoverable pre-change backup and real-schema rollback.** Verify
  database and schema/ACL/function backups, capture current deployed app
  revision and role/worker state, and rehearse restoration from a matching
  authentic schema. The GitHub synthetic backup/restore is not sufficient.
  Obtain an owner-approved downtime/writer-quiescence and rollback procedure.
- [ ] **B5 — Explicit risk and configuration decision.** Owner reviews that
  role-scoped RLS `USING (true)` is a compatibility boundary, **not**
  database-enforced employee/branch row isolation; PHP authorization remains
  critical. Owner reviews the 30-second refresh-token duplicate policy and
  potential re-login after lost refresh responses. Decide whether these risks
  are acceptable or require additional remediation.
- [ ] **B6 — Separate, explicit DEV change authorization.** Only after B1–B5,
  request owner approval for the exact target environment, maintenance window,
  app revision, SQL order, restricted role provisioning, audit signing key,
  feature setting, transaction-pooler setting, worker coordination, backups
  and rollback trigger. No implicit fallback to privileged credentials.
  **Approval to run tests does not authorize deployment.**
- [ ] **B7 — Approved DEV verification and cleanup.** Under a separate approved
  rollout, use designated synthetic accounts to check Admin/Employee login,
  session refresh/revocation, Employee Directory/Settings, Recruitment and email,
  Attendance/background tracking and daily scheduler, branch/loan/sales access,
  Payroll, audit identity, rejected cross-user/branch actions, and safe API
  error messages. Verify old and new roles, application logs, workers, and
  the expected denied operations; then remove/restore test state safely.
- [ ] **B8 — Owner's release decision.** Confirm no outstanding security or
  functionality regressions, obtain explicit merge/release approval, and only
  then consider marking SEC-018 closed in the issue tracker.

##### Stop conditions

A missing real routine definition, unknown dependency/worker privilege, stale
or incomplete schema snapshot, unexpected migration output, failed restore,
unverified backup, employee attendance disruption, privileged runtime fallback,
or failed security CI means **STOP / DO NOT DEPLOY**. Keep PR #58 draft and
SEC-018 open. Log the reason and continue isolated investigation only.

**Latest checkpoint:** Earlier Step 1D included authorized read-only
catalog/worker metadata queries; it did not inspect employee records or mutate
the live database. Steps 1E–1H used GitHub/offline sources and disposable CI.
No live SQL mutation, role/grant change, credential change, Render setting,
deployment, data migration or merge was performed in this remediation review.
The next actionable gate is **B1**, but it is blocked until the owner explicitly
authorizes a safe method of obtaining the missing trusted schema source.

#### Step 1I — proposed schema-only evidence collection plan (approval required; NOT executed)

**Status: PLAN ONLY / NOT AUTHORIZED TO COLLECT.** Owner requested this plan
without connecting to live Supabase, changing Render, or deploying. No export,
catalog query, SQL execution, credential request, migration, role activation,
merge, or delivery of function bodies is authorized by drafting or approving
this document. PR #58 stays DRAFT; SEC-018 stays OPEN; the Step 1H NO-GO
release hold applies.

##### Purpose and evidence gap

The successful PostgreSQL 16/17 CI uses a *synthetic* representation of
38 public tables, 407 pre-migration columns, 78 constraints, and nine
application triggers. Its `public.rls_auto_enable()` and
`public.enforce_direct_chat_two_participants()` are ACL-only no-ops, not
verified real implementations. No existing sanitized schema-only offline
backup was available at Step 1G-1. A trustworthy structural source is
needed for B1–B4; the recent synthetic restore does not satisfy those gates.

##### Explicit authorization boundary — request independently later

Before any live access, owner must explicitly approve **all** of:
- The exact target **development** project/database and operator; never infer
  a target from a saved identifier, login, or environment setting.
- Which allowed **read-only metadata** to collect, how, under which
  appropriately authorized account, and the agreed safe time. The preferred
  first phase is small, bounded catalog queries, not a full database dump.
- Approved private output destination, retention/deletion period, secret
  screening by a trusted operator, and who may see sanitized artifacts.
- Whether a *second, separate* permission will authorize reading full
  function definitions or a schema-only export after metadata assessment.

Approval of this **plan** is not approval to run queries or to view/copy
unsanitized secrets. Any operational request requires a new, unambiguous
approval. No production access, employee-row queries, secret extraction,
write operations, permissions changes, or backup restoration is in scope.

##### Stage A — low-exposure metadata inventory (future; NOT executed)

After separate read-only approval, an authorized operator would collect only
structure and permission metadata, ideally from PostgreSQL catalogs, with
small row/size limits and a read-only transaction where supported:

1. Public application object names, kinds, owner identifiers, column
   names/types/nullability/default **classification**, index and constraint
   metadata, 38-table RLS/FORCE status, existing RLS policy names/role
   applicability, and relevant schema-level grants. Compare observed
   counts to the dated 38/407/78/9 inventory; treat drift as **STOP**, not
   permission to update the migration automatically. Do not retrieve rows
   from employee, payroll, authentication, audit or other business tables.
2. Function *signatures* and catalog properties for all existing public and
   worker functions: namespace, identity/return type, language, owner,
   definer/invoker mode, function-specific settings, EXECUTE grants and
   dependent trigger/event-trigger registrations. In particular identify
   `rls_auto_enable()` and
   `enforce_direct_chat_two_participants()`, plus the audit, attendance,
   asset timestamp and email worker paths. Treat unknown return types,
   event hooks, privilege changes or dependencies as unresolved.
3. Scheduler/email worker *identity and permission metadata* only: role
   ownership, schedule existence and purpose, object access and relevant
   dependency mapping. **Never copy raw webhook trigger arguments, URLs
   with query tokens, HTTP headers, cron commands, credential-bearing
   settings or function bodies into a PR/comment/public artifact.**
4. Relevant database/extension/schema/grant/default-grant inventories needed
   to validate the reviewed migrations' assumptions. Do not download or
   expose configuration values or key material.

**Stage A deliverable:** a small, *sanitized* evidence inventory with
collection date, approved source, object names/roles, count comparisons,
expected-versus-actual differences and explicit unknowns. A trusted person
must review for secrets, personal information and unexpected endpoint URLs
*before* uploading even a supposedly metadata-only report.

##### Stage B — carefully screened function provenance (separate approval)

If Stage A identifies missing dependencies, explicitly request another
authorization to examine the two actual function definitions and their
trigger/event-trigger bindings. **Definitions, comments, trigger arguments,
scheduled commands and defaults can contain hardcoded credentials, URLs,
employee details or other sensitive literals even when no table rows are
exported.** Keep raw evidence private in the authorized controlled
environment. Have a trusted operator remove or replace sensitive values
without hiding control flow, authorization rules or relevant dependencies.
If sanitization makes the behavior impossible to review, record the
limitation and **do not treat it as verified**. Avoid publishing raw source
to GitHub, CI logs, chat or a shared attachment. Never request secrets.

An entire schema-only dump, if ultimately necessary, needs **another**
specifically approved method, source, destination and local sanitization.
A generic schema-only flag is not proof that exported definitions are safe.

##### Stage C — only after trustworthy sanitized evidence exists

Review the metadata and actual function dependencies against the two
review-only SEC-018 migrations. Update the isolated schema fixture where
faithful, test true function and worker behavior with fake records,
and perform a matching restored-schema and rollback rehearsal.
Repeat PostgreSQL 16/17 and all required security regressions. If
dependencies cannot safely be represented, leave B2–B4 **BLOCKED** rather
than substituting permission-only stubs for a release decision.

##### Stop/go and completion rules

- **STOP immediately** for wrong target, unapproved source/operator, unexpected
  data rows, secret-bearing source/worker arguments, metadata drift, unclear
  DDL/worker privilege, unverified function behavior or inaccessible private
  output path. Do not publish potentially sensitive outputs.
- **Step 1I can be marked PLAN PREPARED** after its documentation review,
  but **B1 is NOT completed** until an authorized, screened, trustworthy
  source is received. **B2–B4 stay blocked** until actual function review
  and a realistic isolated restore. **B5–B8 stay pending**.
- No Supabase connection or query, Render change, role/credential change,
  migration, PR merge or deployment is authorized or performed in Step 1I.

**Next owner decision:** approve/revise this **written plan only**.
Then request separate authorization for a narrowly scoped Stage A read-only
metadata collection. Do not assume that acknowledgment of Step 1I
constitutes operational permission.

#### SEC-018 authorized DEV rollout evidence (2026-11-16)

**Scope:** The owner gave broad authority to complete SEC-018 for the
development HRMS only, with no real employee users and an explicit requirement
to preserve the Admin login. Do not interpret this as permission to change
any other Supabase project or Render service.

**Source provenance:** On the confirmed Acme HRMS DEV project, catalog
inventory matches the 38 public tables / 407 columns / 78 constraints /
nine application triggers and all table RLS flags. Actual
`rls_auto_enable()` and `enforce_direct_chat_two_participants()` function
bodies were screened for sensitive constants. The active `ensure_rls`
DDL event hook is linked to the first; the direct-chat function currently has
no observed persistent table-trigger binding. The actual bodies and event
behavior were exercised in new isolated PostgreSQL 16 and 17 regressions,
with no secrets copied into the fixture.

**App deployment fix:** Docker entrypoint now forwards the previously missing
signed-audit environment variables. The PHP database factory supports
`SEC018_DB_USE_RESTRICTED=true` with separate
`SEC018_DB_USERNAME`/`SEC018_DB_PASSWORD`; it fails closed on a missing
password, wrong actual PostgreSQL role, or unsigned restricted session.
The existing `DB_USERNAME`/`DB_PASSWORD` remain unchanged for an explicit
`SEC018_DB_USE_RESTRICTED=false` functional fallback. Both paths are
verified in synthetic CI. Do not enable this setting before provisioning
the restricted role and signed audit key.

**Actual-schema dry-run:** Both proposed SQL files were exercised against the
real DEV catalog inside a transaction with explicit ROLLBACK. The
post-rollback inventory confirmed zero new roles, policies, or session-history
columns. A successful rehearsal is NOT a substitute for recoverable backup.

**Private local recovery snapshot:** A private `sec018_recovery` schema was
created only on the confirmed DEV project. It contains one backup of the existing
Admin account row (including sensitive authentication hashes, **never
exported**), the original audit function definition, and six categories of
pre-change catalog/ACL metadata. Usage was revoked from PUBLIC, anon,
authenticated and service_role; controls were checked. This is an
**in-database recovery point, not an independent/offsite backup**. The
Supabase organization is on a Free plan with no database branch or managed
backup established. Keep the snapshot private and retain it until the
rollout and any rollback are fully verified.

**First DEV migration applied and verified:** The runtime-role SQL was applied
as `sec018_phasea_runtime_restricted_dev_20261116` through Supabase's
migration mechanism. Post-change read-only checks verified:
- one `hrms_runtime_restricted` NOLOGIN/non-superuser/no-BYPASSRLS role;
- 121 restricted policies and one added NOT NULL JSONB refresh history column;
- all 38 public tables and the one existing Admin login row still present;
- one preserved Admin backup in the private recovery schema;
- service_role can still update email_queue; the attendance cron job still
  runs as postgres; the original audit function still belongs to postgres.

**Next controlled action:** Merge and deploy the tested backend code while
the restricted switch/audit feature remain OFF, then check service health;
apply the second signed-audit migration only after this code version is
running and the old connection remains recoverable. Provision the random
audit key and limited role password securely outside Git, activate the
restricted login via the *separate* opt-in variables, check the effective
role and real HRMS functionality, and retain the functional fallback until
owner-confirmed testing is complete. Avoid an unattended DB credential
replacement or silent privileged fallback.

**Stop conditions:** Any Admin login failure, 5xx on core HRMS routes,
missing audit actor, broken Attendance/email worker, unexpected restricted
table grant, or inability to return to the old DB connection means STOP,
keep the Admin recovery snapshot and immediately disable the restricted
switch before further changes. Do not close SEC-018 until tested end-to-end.

### Further SEC-018 historical and hardening detail

*Consolidated from former `docs/SEC-018-final-hardening.md`.*

### SEC-018 follow-up: native prepares, scoped data access, and independent recovery

**Status (2026-11-17): REVIEW / DRAFT PR #59 — DO NOT DEPLOY OR CLOSE SEC-018.**

The Acme HRMS development deployment on Render is working and retains its
original database fallback credentials. The live Admin login was user-verified,
and 28/28 manually enumerated DEV checks passed at the scope of each check.
One of those checked that an Employee B from a different branch could not see
Employee A's exclusive loan in the loan **list**. This does **not** establish
all detail/document/member/branch authorization invariants.

#### 1. Native prepared statement compatibility

Supabase recommends **session pooling** (shared pooler port **5432**) or
direct Postgres for persistent backends needing native prepared statements.
Shared transaction-pooler port **6543** does NOT support server-side prepares.
See: https://supabase.com/docs/guides/database/connecting-to-postgres .

The existing deployed Render connection still uses the shared **transaction**
pooler and `DB_PDO_PREPARE_MODE=pooler` (PDO emulated prepares with bound
parameters). **Do not turn on `DB_PDO_PREPARE_MODE=native` on port 6543.**

This PR:
- Refuses native PDO mode when `DB_PORT=6543`; it does not silently fall back.
- Rehearses actual PHP sign-in, protected read routes and signed audit INSERT /
  UPDATE in a **disposable** PgBouncer **session** pool with native PDO prepares
  on PostgreSQL 16 and 17. The existing transaction-pool CI is retained.
- Corrects repeated named placeholders in the reviewed member/lead/branch
  queries. PostgreSQL native prepares generally cannot reuse a named PDO
  placeholder in one SQL statement.
- Preserves existing `DB_USERNAME`/`DB_PASSWORD` and restricted-role
  opt-in for an explicit rollback.

**Later, only after an independently recoverable backup and an owner-approved
DEV test window**, switch only the correct Render HRMS service to the
**verified** Supabase session-pooler connection settings copied from Dashboard
Connect (same pooler host, port 5432, custom-role username
`hrms_runtime_restricted.<project-ref>` and existing restricted password),
then `DB_PDO_PREPARE_MODE=native`.
Do not change the Admin password, reissue role credentials, or log secrets.
Use a separate temporary runtime-connection canary if available.
After deployment, verify Render live commit, Admin/Employee/candidate sign-in,
Settings, feature access, Member/loan/branch queries with search and filters,
attendance, audit signatures, loan documents, logout, and concurrent refresh.
If any fail, immediately return to **known-working port 6543 and
`DB_PDO_PREPARE_MODE=pooler`** on the same host, redeploy, and confirm Admin
login. Do not change roles/audit keys to perform this rollback.

#### 2. Server-authorized user and branch scopes

The restricted PostgreSQL runtime role still has broad role-level RLS for
application tables. It is NOT an independent per-user/branch RLS authority.
PHP route authorization remains security-critical.

Code review identified `/api/members/{phone}`: it checked ownership of lead
rows but could load `loan_applications` by `lead_id` without independently
checking `created_by` and `branch`. This could expose linked applications
from a different employee or branch when legacy lead aliases overlap. The
member list, member detail and linked application SELECT now use server-derived
`OriginationAccess::loanScope()`; no user/branch query parameter is trusted.
Loan/sales lead list, creation and update paths likewise enforce current
employee branch rather than a caller-supplied branch and repeat the scope on
writes. Branch dashboards' union/search statements use unique native
placeholders.

Synthetic SEC-011 regression now includes multiple employees, different
branches, a **shared phone** and a **shared lead ID**. It must verify that
Member details do not return another user's linked application and that the
explicit Admin path still works. The later genuine DEV check should use only
existing disposable records and never try to access actual confidential data.

**Remaining architectural risk:** Until separate signed per-user RLS policies
and exhaustive endpoint coverage are independently reviewed, SQL injection or
any missed PHP route check could read/modify data allowed to the shared
`hrms_runtime_restricted` role. Do not claim this is solved just by code CI.

#### 3. Independent encrypted application backup — manual workstation action

Supabase Free does **not** provide automatic downloadable backups. Supabase
recommends locally generated `db dump` / `pg_dump` backups stored offsite:
https://supabase.com/docs/guides/platform/backups .

The prior `sec018_recovery` schema preserves one Admin row and some ACL
metadata but is INSIDE the SAME Supabase database: it cannot recover from
database loss.

Two **manual-only** guarded scripts are supplied:
- `scripts/sec018_backup_dev.sh` creates a **local encrypted GPG archive**
  of `public`, `sec018_internal` and `sec018_recovery` (all table data
  included). Nothing plaintext is staged on disk. It checks for 38 public
  tables and exactly 1 existing Admin before starting. GPG and the target
  operator prompt for confirmation. The encrypted file contains **Admin
  password hashes and the audit signing key**; keep it private and **never
  upload it to GitHub, Render logs, chat, email or CI artifacts**.
- `scripts/sec018_restore_rehearsal.sh` decrypts in memory and restores
  ONLY to an empty, disposable **local** PostgreSQL database named
  `sec018_restore_*`. It refuses a Supabase/remote hostname or an existing
  populated app database and checks restored Admin presence. It does NOT
  drop existing databases.

##### Running locally (Git Bash/WSL/Linux with PostgreSQL client + GPG)

1. On your **private workstation**, install compatible PostgreSQL 17 client
   (`psql`, `pg_dump`, `pg_restore`), GPG and Bash; use a current client.
   Copy connection **host, port 5432, database, username** from your Acme HRMS
   Supabase Dashboard's **Session pooler** or approved direct connection.
   **Do not paste any credentials into chat or Git.** Set standard
   `PGHOST`, `PGPORT=5432`, `PGDATABASE=postgres`, and `PGUSER`
   locally. Store password in a private local `PGPASSFILE` (mode 0600;
   never check it in). Do not put passwords in URL/CLI arguments.
2. Create an existing, private local directory outside the repository and
   set `SEC018_BACKUP_DIR` to its **absolute path**. Then run
   `bash scripts/sec018_backup_dev.sh` and confirm the target by typing
   `ACME-HRMS-DEV`. GPG prompts for a separate **strong backup passphrase**.
3. Back up the encrypted `*.pgdump.gpg` file to a second independent,
   access-controlled, encrypted storage location; retain the GPG passphrase
   separately. Record file size, date, and access controls without publishing
   the file or key. `pg_restore --list` checking only means the archive is
   readable; **this is NOT a successful restore**.
4. Provision an **empty local disposable** PostgreSQL 17 database named
   `sec018_restore_...` in a compatible environment with needed Supabase
   extensions installed. Set the local **PGHOST=127.0.0.1**, `PGPORT`,
   `PGDATABASE`, `PGUSER=postgres`, `PGPASSFILE`, and
   `SEC018_RESTORE_ARCHIVE` to the encrypted file, then run
   `bash scripts/sec018_restore_rehearsal.sh`. Never set this destination
   to the real Supabase host or the HRMS Render database.
5. Restore must pass (38 application tables, **1 Admin record**,
   **1 recovery Admin row**, **1 audit key**) before calling it a data
   recovery rehearsal. Do not share row contents/hashes/secrets.
   Validate extensions, function owners, RLS, ACLs and external object
   dependencies separately; `--no-owner --no-acl` deliberately does not
   prove full security-role/privilege reconstruction or application login.
   Supabase Auth/Storage files and platform-managed objects are **not**
   guaranteed by this scoped application backup. If restore fails, do NOT
   continue to live native migration.

**Never let ChatGPT, GitHub Actions, or a public service ingest an unencrypted
copy of this database or the GPG passphrase.**

#### 4. Residual risk and closeout gates

- **Native prepare cutover:** CI native session test PASS and manually verify
  every critical authenticated HRMS flow after a controlled config change.
- **Authorization:** Synthetic and appropriate DEV live checks for Member,
  loan, sales, document, branch mutation and shared-lead/cross-branch cases.
- **Backup:** Operator confirms independently stored encrypted backup and
  an actual compatible local restore, including preserved Admin login
  material and audit key; also an explicit privilege/function recreation
  plan.
- **Session replay:** Owners still need to accept or further reduce the
  bounded 30-second refresh-token grace period. Do not remove it blindly;
  simultaneous browser refresh and lost-response behavior were tested.
- **Merge/release:** PR #59 remains DRAFT until all checks pass; retain the
  original Render settings and Admin credentials. Keep SEC-018 OPEN. No
  production release is authorized by this document.

## SEC-019 remediation and verification

*Consolidated from former `docs/SEC-019-remediation.md`.*

### SEC-019 — Employee IDs and database integrity (CLOSED — live verified 2026-11-17)

#### Verified 2026-11-17: baseline
- GitHub main inspected at 071fbe445eab1d160d383d559a586d8e1bc564ea.
- The Admin creation route used `uniqid()` for public employee codes.
- Employee codes have a UNIQUE rule; the existing column supports 50 characters.
- Connected Supabase project: **Acme HRMS**, ref `jtgqkkhqyzfbupiqwkgf`.
- Existing `payslips.employeeId`, `attendance.employeeId` and `leaves.employeeId`
  reference `public.users` with ON DELETE CASCADE.
- The loan application audit table has no FKs despite valid existing application
  and editor references. The generic `audit_logs` table keeps varchar actor
  and entity IDs; it is not safe to cast those arbitrarily.
- 15 existing `loan_documents.application_id` values do not match
  `loan_applications.application_id`; an unconditional FK would break the
  current document paths. **Do not add one without investigating all writers.**
- This is confirmed schema state, not proof of employee cross-access or data loss.

#### Implemented remediation and historical change notes
- Initial SEC-019 remediation introduced server-generated `EMP-` + 128-bit
  random hex display codes; the owner subsequently requested exactly eight
  numeric digits. PR #67 deployed `random_int(10000000, 99999999)` with
  bounded retries and database-enforced uniqueness for **future** employee and
  candidate-conversion IDs. Display codes are **never authorization secrets**.
  Internal UUIDs and access checks remain authoritative.
- Existing IDs were retained by the deployed change. The owner separately
  authorized a one-record DEV test display-code update; no bulk conversion
  or user UUID edits were required.
- Change only three verified history cascades to RESTRICT.
- Add loan application audit references (application UUID, business code and
  editor UUID) that protect audit relationships and prevent accidental parent
  deletion. A composite reference keeps the business code and UUID tied to
  the same application. Drafts can retain the UUID fallback used by existing
  API responses. Generic varchar audit actor fields remain separate.
- Automated tests use **disposable local PostgreSQL**; no live accounts,
  invitations or data are touched by CI.

#### Separate owner-requested DEV reset — deliberately NOT a migration
The owner stated Acme HRMS is development-only and asked to remove all
application data and storage files. This resets historical test records,
including the Admin account, invalidates active sessions and can stop further
HRMS login until a new Admin is bootstrapped. It must be scheduled as a
separate verified operation, not embedded in a migration or app startup.

Before clearing any data, confirm the project ref and Render backend target,
stop writers/jobs/tracking/email delivery and prepare a reviewed Admin
bootstrap flow. Inventory every public table, auth user and storage object.
Clear **Storage objects via the Supabase Storage API or Storage Dashboard first**,
not by `DELETE FROM storage.objects`; SQL metadata deletion leaves physical
objects orphaned. Keep storage buckets, their privacy policies and migration
history intact, unless the owner explicitly asks to remove that infrastructure.
Then clear application rows in a reviewed transaction without
`CASCADE` schema drops; keep database structures, extensions, roles,
security policies, migration history, and internal SEC-018 schemas.
Verify object counts and each application-table count afterward.

Two **review-only** reset helpers are staged:
- `frontend/scripts/sec019_purge_storage.mjs` uses the official Supabase
  Storage `emptyBucket` API for the exact, reviewed 12 DEV buckets. It has a
  no-delete inventory mode by default, verifies exact project URL and bucket
  names, and requires an explicit independent environment confirmation for
  `--execute`. Its service key is read **only from local environment**,
  never a browser/Vite variable. Run it only from an owner-controlled terminal
  with Node dependencies installed. Empty requests may be queued; verify actual
  object counts before advancing.
- `scripts/sec019_dev_public_reset_review_only.sql` lists exactly 38
  reviewed public application tables, has a session-bound approval latch,
  checks that Storage is empty, checks table-inventory drift and private
  dependencies, and performs one transactional TRUNCATE **without CASCADE**
  while preserving sequence positions.
  It is **not** applied by deployment, CI, or migrations.

A third reviewed helper, `scripts/sec019_bootstrap_admin.php`, provides
a local CLI-only Admin bootstrap AFTER the reset. It refuses to run if users,
employees or Storage objects remain; it requires an exact DEV confirmation
and a private Admin email in local environment variables. The new Admin
gets a 192-bit random temporary password printed **only locally** once,
with mandatory password change on first login. DB credentials and password
are never written into the repository. An Admin insertion will produce a
new signed-audit-compatible historical row with unknown actor unless an
approved actor context is provided; no previous audit history is restored.

**Important:** A total data wipe removes the only Admin account. The app
is unusable until the bootstrap has completed successfully. The operator
must have access to the reviewed DB setup credentials and be able to run
this CLI helper before starting the destructive reset. Pause all live DEV writers and confirm that plan
before either reset helper is executed. The connected Supabase SQL connector
does **not** provide an object-delete API or service-role credentials.
The reset was an independent owner-authorized operation, not part of this PR's code or CI.

#### Owner-approved DEV reset and live checks (2026-11-17)
- Confirmed all 12 approved Supabase Storage buckets still exist, with **zero**
  object records (previously 232 across 11 nonempty buckets). Storage cleanup
  was performed separately using the supported Supabase Storage API/UI.
- Confirmed all 38 public HRMS tables exist and test-business data has been
  reset: 33 tables had zero rows at inspection; remaining rows were newly
  created admin, settings, audit, refresh-session and rate-limit records.
- New Admin account bootstrapped separately; owner confirmed that the Admin
  login, Dashboard and Settings work after the reset.
- Confirmed live SEC-019 history FKs are ON DELETE RESTRICT; four loan audit
  foreign keys, an application identity UNIQUE rule and related indexes exist.
- Supabase had the DDL applied before migration history was registered. The
  migration was made safe to replay and PG 16/17 CI now tests application twice.
- Supabase migration `20261117192545_sec019_reconcile_integrity_after_dev_reset`
  was applied successfully through the migration API; its file name now matches
  the recorded version. Post-apply constraints were independently verified.
- Supabase security advisor reported zero active lints at time of inspection.
- Temporary `sec019-dev-storage-purge-once` Edge Function has been replaced
  with a nonfunctional HTTP 410 response and JWT verification enabled. It is
  not a cleanup endpoint anymore; its function record awaits later deletion.
- All prior audit risk notes concerning legacy loan-document aliases remain
  in scope for future investigation, not silently cast to a stronger FK.

#### Closure decision — 2026-11-17: VERIFIED / CLOSED

All agreed SEC-019 live verification steps have now passed:

| Verification | Evidence |
| --- | --- |
| 4A — Admin employee creation | Owner passed; record confirmed directly in Supabase |
| 4B — New eight-digit ID | Owner PASSED live UI test |
| 4C — Anonymous admin API denial | Owner PASSED (401) |
| 4D — Candidate conversion | Owner PASSED; independently confirmed below in live DB |
| 4E — Loan audit functional check | Owner PASSED |
| 4F — Admin regression | Owner PASSED |

##### Candidate conversion postconditions independently queried in Supabase

- Exactly **one** converted application, with status `Converted to Employee`.
- The associated user has role `employee` and is active; its
  `token_version` was incremented to **1** during conversion.
- Exactly **one** employee row links to that candidate's existing UUID.
- The server-generated employee display ID is **40213258** (eight decimal
  digits); the employee and user email fields match.
- Exactly **one** `Converted to Employee` application-timeline event exists.
- The live employee directory contained two records; both IDs were numeric,
  eight-digit, distinct, and covered by the existing UNIQUE constraint.
- This conversion was performed by the owner through the Admin Recruitment UI;
  all verification queries were read-only. No candidate was converted by CI.

##### Source, CI, deployment and database

- PR #66: reviewed SEC-019 security implementation and integrity migration.
- PR #67: owner-requested eight-digit numeric employee labels.
- PR #68: PDF-only candidate resume UI and secure activation/resend workflow.
- PR #70: completed authorized atomic conversion (PR #69 was superseded/closed).
- All **nine required workflows** passed for PR #70 before its single squash
  merge commit `bc83f89fb08bd93d31c1bf49972ee4a5049ccf3e` on `main`.
- Render service `HRMS` deployed that exact SHA and is **LIVE**. Deployment
  health returned HTTP 200; no error-level logs appeared in the checked window.
- Migration `20261117192545_sec019_reconcile_integrity_after_dev_reset`
  exists in Supabase migration history; the scoped SEC-019 foreign keys and
  loan application audit constraints were verified in prior live checks.
- Supabase security advisor returned **zero active security findings** on
  the closure check.

##### Non-blocking follow-up / accepted limits

- `sec019-dev-storage-purge-once` still exists as a Supabase Edge Function
  record. Its deployed v2 code was **independently inspected**: it only returns
  HTTP **410 Gone**, with `verify_jwt=true` and no deletion logic. Remove
  this abandoned function entry during routine DEV housekeeping if a supported
  deletion pathway is available; do not silently grant it any powers.
- Legacy `loan_documents.application_id` values were previously observed in
  multiple identifier formats. No unsafe unconditional FK was introduced.
  Investigating and normalizing those aliases is **separate future work**, not
  an assertion that those records already have a new FK.
- The one-use activation and conversion tests were exercised in isolated CI;
  the live completion decision is based on the owner's authorized UI tests
  and independent database postconditions, not on unperformed destructive tests.

**SEC-019 security remediation: CLOSED.** All listed closure gates were
satisfied. The two tracked limits above are not concealed or described as
completed fixes.

## SEC-020 remediation and verification

*Consolidated from former `docs/SEC-020-remediation.md`.*

### SEC-020 — Remove hardcoded maintenance bypass and enforce server-side maintenance

**Severity:** CRITICAL. **Status:** CLOSED — fixed, deployed and owner-confirmed in live tests on 2026-11-14. [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) introduced backend maintenance enforcement and removed the embedded developer bypass, and [PR #37](https://github.com/Kondapaneni/HRMS/pull/37) corrected cross-workspace maintenance presentation and non-reloading refresh. Focused and cross-issue CI passed. Closure is based on source/CI evidence and **owner-reported** live test results, not an independent production penetration test.

#### Original audit finding

[`AUDIT_REPORT.md` SEC-020](#issue-id-sec-020) identified a static developer password inside `MaintenanceOverlay.jsx` and a persistent `localStorage` bypass flag trusted by the Employee and Candidate layouts. Anyone with browser DevTools or the public JavaScript bundle could activate the maintenance bypass. There was no server-side maintenance check in front of protected PHP API endpoints. The historical audit contains the previously exposed password; it is **not a usable secret** and must never be reused for any other service.

#### Remediation

1. `frontend/src/components/MaintenanceOverlay.jsx`: removed the static developer password, hidden click trigger, developer authentication form and `onBypassSuccess` callback. The notice now displays only maintenance text and a **Check again** button that checks status without a page reload.
2. `frontend/src/components/EmployeeLayout.jsx`, `CandidateLayout.jsx`, `UpdateOverlay.jsx`: removed the persistent browser bypass flag, unlock callbacks and badge. PR #37 further moved the informational maintenance notice to a root-level `MaintenanceGate` in `frontend/src/App.jsx`, covering employee, candidate, loan, sales, branch operations and delegated feature routes. The gate checks public `/api/news`, avoids browser reloads and restores existing employee profile access once maintenance is OFF. A `localStorage` entry cannot authorize protected APIs.
3. `backend/src/Middleware/MaintenanceMiddleware.php`: a central, **server-side** PHP maintenance check reads `global_settings.maintenance_mode` on **each** protected `/api/*` request (no stale settings cache). When maintenance is ON, a non-admin, missing, forged, disabled, demoted, expired, or MFA-pending session receives sanitized **503 Service Unavailable**, with `Cache-Control: no-store` and `Retry-After: 30`. No browser local storage state is consulted.
4. Authenticated **admins** can still use protected API routes only when the JWT has a valid signature, indicates a completed session (legacy untyped completed JWTs supported), and the currently active database user retains `role = admin`. The route's existing `AuthMiddleware` continues to enforce normal permissions.
5. `POST /api/login`, email-OTP send/verify, MFA completion, forgot/reset password, and logout remain available to permit admin recovery. `GET /api/news` and CORS preflight remain available so the UI can explain maintenance, and `/version.json` remains unchanged. Other non-admin API operations, including candidate creation and location punches, are blocked during maintenance.
6. `backend/public/index.php` installs the middleware within the existing CORS response wrapper and correctly converts native/PostgreSQL boolean flag values for `/api/news`. Maintenance **OFF** leaves existing API route behavior unchanged.

#### CI evidence

`.github/workflows/sec020.yml` runs synthetic two-job checks:

- **Frontend production build:** compile with `npm ci && npm run build`, verify no hardcoded developer password, old bypass `localStorage` key, or developer unlock UI remains in the built `frontend/dist/assets/*.js`. Existing MFA/frontend login reset security tests also run.
- **Isolated PostgreSQL authorization:** a destructive fixture is guarded to accept **only** `sec020_test` with synthetic-only signing secrets. It verifies maintenance toggles without restart, normal OFF mode, non-admin 503 for reads and writes, administrative role + active account verification, forged/admin-claim/demoted/disabled/MFA-pending token rejection, recovery routes during maintenance, safe 503 JSON, and database-error fail-closed behavior. It does not touch a live Render or production database.

#### GitHub merge and automated evidence — 2026-11-14

- [PR #35](https://github.com/Kondapaneni/HRMS/pull/35) merged to `main` as commit `f7da70caa752a4b074d4b0abc0b3b59a25a79b54`.
- Seven PR checks passed: dedicated SEC-020 synthetic DB middleware tests and full frontend build/bundle-secret scan; SEC-007 security headers and CORS; SEC-008 MFA and frontend regression; SEC-009 real HTTP authorization. The synthetic SEC-008 and SEC-009 fixture schemas were updated to model the already existing live `maintenance_mode` column, preserving fail-closed behavior rather than bypassing it.
- At the time PR #35 merged, this was **source/CI evidence only**; live validation was subsequently performed and confirmed by the owner as documented below.
- [PR #37](https://github.com/Kondapaneni/HRMS/pull/37) merged as commit `683e2763e19b5a9d6ff12168e03515f6b657bb7` after correcting the initial live-test UX defects. Both its focused SEC-020 PR checks passed, including synthetic backend authorization and frontend production build/policy checks. The owner confirmed deployment on Render before the successful retest.

#### Critical scope and operational caveats

- **Enabling maintenance in the live Admin Settings intentionally interrupts employee/candidate APIs, including attendance punch/location tracking.** Test on disposable staging where possible. Do not switch live maintenance ON while employees are actively working without an approved maintenance window and communication to users.
- The PHP maintenance middleware gates **PHP `/api/*` endpoints**. It does not claim to block direct **Supabase** SDK/storage network requests or already-open browser screens, nor is it a database-wide write lock. Supabase storage/RLS, other input validations and session lifecycle remain governed by separately tracked issues. A UI overlay is informational, not an authorization barrier.
- Historical repository commits and the audit report still contain the exposed former password. Removing the secret from current frontend source and compiled JavaScript does **not** delete Git history. Rotate the former password **anywhere else it might have been reused**.
- Existing normal Admin authentication and MFA must remain functional both before and during maintenance; no new developer password or hidden admin override is introduced.

#### SEC-020 first live test — UI regression observed (2026-11-14)

The owner confirmed **Step 1 PASS** after Render deployment with Maintenance OFF: Admin Dashboard, Admin → Settings, Admin → Feature Access, and Employee Dashboard all functioned. During the approved maintenance ON window (Step 2A), Admin remained signed in and could save Maintenance ON. In Step 2B, an already logged-in employee encountered two frontend UX problems:

- Loan/Sales/Branch Operations and delegated Admin Features pages did **not** show the maintenance overlay because they use separate route layouts that do not inherit EmployeeLayout.
- Clicking the original maintenance "Refresh" performed a full page reload; the employee's `/api/me` then correctly returned 503 under the server maintenance policy, but the frontend lost its in-memory profile and redirected to the login page. Regular employee access during maintenance being denied is **expected**; losing the maintenance notice or seeming to sign out on status check is not.

**Follow-up UI remediation** (this change): `MaintenanceGate` is mounted once above all routes and related UI components in `App.jsx`, using publicly readable `/api/news` status instead of any client bypass flag. A protected route with an existing session is held until the maintenance status check completes, so a 503 during `/api/me` no longer races with the route's login redirect. The shared maintenance overlay covers all employee business modules, delegated Admin Features, candidate pages, and standalone screens. Its Refresh action rechecks the public status **without a full browser reload** and rehydrates `/api/me` after the maintenance toggle returns to OFF before restoring protected routes. Public login/recovery pages remain accessible so an authorized Admin can sign in; they show an informative maintenance banner. Admin remains exempt from the frontend overlay only with a server-fetched Admin profile; PHP enforces the actual authorization.

These changes have additional coverage in `tests/sec020_maintenance_ui_test.mjs` (business/role route matrix, missing profile during maintenance, Admin recovery and OFF-state behavior) and the frontend bundle build CI. **The initial Step 2B failed; the corrected owner-led retest passed all steps listed below.** The owner approved each live maintenance window and confirmed the setting returned to OFF.

#### Completed owner-led live verification and closure — 2026-11-14

The owner confirmed PR #35 and PR #37 were deployed to Render before the applicable tests. This is **reported live verification**, not independently rerun privileged testing or a complete security assessment of direct Supabase calls.

- **Normal mode / first deployment:** With maintenance OFF, Admin Dashboard, Admin Settings, Feature Access and Employee Dashboard functioned. Initial maintenance ON exposed the UI defects recorded above; the owner restored maintenance OFF and the employee could log in and access the dashboard. PR #37 corrected those defects, passed its focused CI and was confirmed deployed.
- **Corrected retest, Step 2B-1:** Existing development employee at Loan Origination → Applications showed Scheduled maintenance notice after Admin enabled maintenance in an explicitly approved, no-active-tracking window.
- **Step 2B-2:** Clicking **Check again / Refresh** left the notice visible with **no full reload or redirect to Login**.
- **Step 2B-3:** Read-only development employee `GET /api/employee/profile` returned **HTTP 503** while maintenance was ON.
- **Step 2B-4:** Sales Origination and Branch Operations both showed the maintenance notice.
- **Step 2B-5:** Admin Dashboard and Settings remained accessible while ON; Admin disabled maintenance successfully.
- **Step 2B-6:** The existing employee session resumed without login once maintenance was OFF.
- **Step 3A:** With maintenance OFF, the owner set the **old, now-obsolete browser localStorage bypass flag** to `true` in the development employee browser solely for a negative test.
- **Step 3B–3C:** After explicitly reconfirming a safe maintenance window, Admin switched maintenance ON. The maintenance notice **still appeared** despite the old bypass flag being `true`; no frontend bypass was observed. Server-side 503 was independently established in Step 2B-3 and synthetic CI, but a second 503 request with the legacy flag set was **not separately reported**.
- **Step 3D:** Admin switched maintenance OFF and confirmed Dashboard and Settings still worked.
- **Step 3E:** Employee session and business application resumed **without login**; the temporary old localStorage flag was removed.

**Closure decision:** SEC-020 **CLOSED** based on merged remediation, green CI, owner-confirmed deployment, safe live employee 503 enforcement, cross-module maintenance display, refresh/session recovery, Admin access and successful legacy-flag negative UI test. Maintenance **OFF** was the last owner-confirmed setting. Do not assume future maintenance windows are safe without new approval.

**Residual limitations:** The server middleware gates PHP `/api/*` routes, not direct Supabase SDK/storage requests or a database-wide write lock. A separate live candidate authorization test, administrator MFA completion during maintenance, and a paired second 503 with the old flag were **not reported**; corresponding protection was covered by synthetic CI/source review as applicable. The formerly exposed hardcoded credential still exists in historical audit/Git revisions and needs rotation anywhere reused. Outstanding findings, including SEC-012, SEC-017, SEC-021 and SEC-022, remain independently tracked. Whole-HRMS release clearance is **not** implied.

#### Safe live verification plan — one step at a time

1. After the new Render deployment, with maintenance **OFF**, test normal Admin Dashboard, Admin → Settings, Admin → Feature Access, and employee dashboard. Confirm the maintenance notice is absent. **Do not activate live maintenance in Step 1.**
2. Use an approved staging environment or an explicitly agreed short, low-traffic maintenance window. Admin enables maintenance via Admin → Settings; a test employee sees the maintenance notice and receives `503` for a protected API request. Do not run attendance punches or edit live records.
3. In the same approved test window, verify setting the old browser bypass flag no longer hides the notice and does not change the protected API `503` response; no secret/password should be entered or shared.
4. Verify active authenticated Admin can access Admin Dashboard / Admin → Settings while maintenance is active, and MFA completion still works if applicable. Admin then disables maintenance immediately.
5. Verify employee API and normal dashboard access recover after maintenance OFF, with no unexpected `401`, `403` or `503`; confirm the notice disappears. Keep the total live maintenance interval minimal.

**Closure gate — MET on 2026-11-14:** Merged source and cross-issue CI, owner-confirmed deployment, maintenance OFF/ON behavior, active Admin access and OFF recovery, employee protected API 503, and legacy bypass-flag resistance. Any future revalidation of candidate flows or additional operating environments should use an explicitly authorized low-traffic window. Do not treat this closure as complete HRMS production security clearance.

## SEC-021 remediation and verification

**OPEN / not yet verified closed (HIGH).** The original audit finding is [SEC-021](#issue-id-sec-021); see the [security tracker](#security--sec-001-to-sec-024) for status. No new remediation, deployment, or owner live verification is claimed in this consolidated document.

## SEC-022 remediation and verification

**OPEN / not yet verified closed (MEDIUM).** The original audit finding is [SEC-022](#issue-id-sec-022); see the [security tracker](#security--sec-001-to-sec-024) for status. No new remediation, deployment, or owner live verification is claimed in this consolidated document.

## SEC-023 remediation and verification

**OPEN / not yet verified closed (MEDIUM).** The original audit finding is [SEC-023](#issue-id-sec-023); see the [security tracker](#security--sec-001-to-sec-024) for status. No new remediation, deployment, or owner live verification is claimed in this consolidated document.

## SEC-024 remediation and verification

**OPEN / not yet verified closed (HIGH).** The original audit finding is [SEC-024](#issue-id-sec-024); see the [security tracker](#security--sec-001-to-sec-024) for status. No new remediation, deployment, or owner live verification is claimed in this consolidated document.

---

## Historical SEC-016–018 combined batch record

> **Historical intermediate state only:** This older combined batch note contains early warnings and “pending” language from 2026-11-15. The later per-issue SEC-016, SEC-017 and SEC-018 closure records above take precedence. This record is retained for traceability, not treated as a current open-status declaration.

### SEC-016, SEC-017, SEC-018 — combined security batch

**Status:** Original PR #51 merged to Render DEV on 2026-11-15. SEC-018 native prepares caused an observed PostgreSQL transaction-pooler SQLSTATE 26000 regression. Emergency compatibility hotfix pending validation; SEC-018 remains OPEN.

#### SEC-016 — Maps key isolation
Separate the browser Maps JavaScript key from server Geocoding and legacy keys. No server keys in attendance/geofence API payloads. Admin/Employee/HR/Manager can fetch a restricted browser key; anonymous/Candidate sessions denied. Browser key staged in Render DEV; server keys unchanged. After deploy, verify all web/Android remote maps and JSON outputs, then plan an owner-approved server key switch and retire old unrestricted key only when safe.

#### SEC-017 — Storage upload authorization
SEC-001 previously introduced authenticated backend Storage adapter, role/record access policy, path and size limits, file-signature validation, and no overwrite. This batch ensures invalid MIME is rejected before checking remote Storage configuration; source and synthetic HTTP tests check anonymous/foreign paths, spoofed files and unavailable Storage. Real Storage is deliberately not contacted during CI. Live DEV test-account upload and cleanup remain required; server-generated CSPRNG object naming and historical objects should be assessed separately.

#### SEC-018 — PostgreSQL pooler compatibility, no request DDL, generic 5xx errors
A live Render DEV regression showed transaction-pooler SQLSTATE 26000 when native prepares were forced on PHP PDO. Until a verified session/direct connection is separately approved, `DB_PDO_PREPARE_MODE` defaults to `pooler`, using PDO bound-parameter emulation. Setting it to `native` is opt-in for isolated direct PostgreSQL CI only; DO NOT set it in Render with the current transaction pool. The hierarchy placeholders are distinct, the request-time MFA ALTER TABLE is removed, and a one-time optional schema migration remains owner-controlled. API 5xx response bodies are sanitized, keeping 4xx diagnostics intact. Synthetic PostgreSQL tests verify a non-superuser runtime role can read/update but cannot ALTER/CREATE and that API 500 does not expose SQLSTATE.

**SEC-018 live closure gate:** Confirm the pooler compatibility hotfix restores maintenance, AuthMiddleware, dashboard and attendance without SQLSTATE 26000. Native-prepares adoption on a verified session/direct pooler remains a separate owner-approved task.  In an approved DEV maintenance window, a DB owner must confirm MFA column availability and apply the one-time migration if required. Provision a separate non-superuser, no-DDL LOGIN with only required DML/schema/sequence permissions; check PostgreSQL RLS compatibility and all HRMS module SQL before switching Render runtime DB credentials. Keep rollback plan. Never commit secrets. Synthetic role tests are not proof that the actual Render login is least-privileged. No migrations or Render credential changes are performed by this PR automatically.

#### CI and Android rules
Run GitHub Actions after the combined three-fix commit, not each change; keep the $1 Actions budget. Validate SEC-016, SEC-017, SEC-018 plus pre-existing SEC-024 with synthetic PostgreSQL HTTP/source checks and Vite frontend production build. SEC-006 Android workflow still runs static tests but only builds APK when the owner explicitly authorizes final-release workflow_dispatch with build_final_apk=true. No APK for this batch.

#### Development live verification after PR review/merge
1. Admin Attendance Location, Employee map, HR/Manager map and existing Android remote WebView load; attendance/geofence responses have no server Google API keys.
2. Only authorized test-account uploads succeed, spoofed types/unauthorized actions deny, no overwrite, all disposable test files cleaned; CI negative tests do not touch real Storage.
3. Admin Dashboard, Employee Directory and settings/MFA on an expressly disposable employee still work, no SQL internals in 500 error bodies. Confirm actual DEV DB runtime role non-superuser and no DDL privilege before closing SEC-018.
4. Restore temporary permissions/settings and regression-check recruitment, payroll/employee attendance and mobile maps.

**No production security clearance or final Android APK from CI alone.**

## SEC-019 employee display ID specification

*Consolidated from former `docs/EMPLOYEE-NUMERIC-ID-FORMAT.md`; this is part of the SEC-019 remediation record.*

### Eight-digit numeric employee IDs (owner-requested format)

#### Display code
New employees receive **exactly eight decimal digits** such as `48392017`.
There is no `EMP-` prefix, no letters, and no leading zero. The server
generates the code using PHP's cryptographically secure `random_int()` across
the inclusive range `10000000` to `99999999`.

#### Identity and authorization remain unchanged
`public.employee."employeeId"` remains `varchar(50) NOT NULL UNIQUE`.
It is a **human-facing label only**, not a password, access token,
authorization key, or substitute for the `employee.id` / `users.id` UUID.
Never authorize a request solely by knowing the eight-digit display number.

The eight-digit space has **90 million** possibilities (about 26.4 bits,
far less than the previous 128-bit code). Codes can be guessed or collide:
the existing database unique constraint enforces uniqueness. Both Admin
employee creation and candidate conversion use
`ON CONFLICT ("employeeId") DO NOTHING RETURNING id`
and retry at most 12 times. Unrelated database errors fail the entire
transaction rather than silently producing a duplicate account, partial
conversion or invitation.

#### Backward compatibility
Existing historical IDs are unchanged, including any 36-character
`EMP-...` record created under SEC-019. They remain searchable/displayable;
only **new** employee IDs use eight digits. No schema migration or data reset
is necessary. Numeric codes must remain strings in APIs and exports.

#### Validation
- PHP source and generator format/collision/exhaustion tests
- PostgreSQL 16/17 isolated unique-constraint collision tests
- Existing SEC-019 integrity and previous security regression workflows
- Post-deployment read-only DB check and one controlled Admin creation test

This owner-preference change is separate from the already merged SEC-019
squash commit. It does not expand any authorization permissions.

## Security change-control and historical mapping

*Consolidated from former `docs/SECURITY_COMMIT_HISTORY_POLICY.md`. This policy remains applicable to future issue-scoped PRs; it does not authorize changes to published main history.*

### HRMS security issue commit policy and historical mapping

**Recorded:** 2026-11-17  
**Repository:** `Kondapaneni/HRMS`  
**Scope:** GitHub change-control and audit traceability only. No application runtime, database, credential, or deployment changes.

#### Decision

For **future** security work, use **one SEC-### issue per pull request** and integrate the completed change-set into `main` with **Squash and merge**. The squash commit subject should be `fix(SEC-019): <specific change>` (or `test/docs/chore(SEC-###): ...` as appropriate). Tests and remediation notes for the *same issue* belong in the same PR. Do not combine SEC issues in one fix PR, as happened with historical PR #51.

* A working PR branch can contain multiple iterative commits; the squash merge creates **one new commit on main for the PR**. This is different from asserting that each issue can have only one commit over its entire lifetime.
* Complete the issue's code, tests, CI and review **before** merging whenever safe. If a later regression requires an emergency correction, create a separately identifiable follow-up squash commit (e.g. `fix(SEC-018-R01): ...` in the message, with `SEC-018` scope in the PR title). Do not amend deployed history.
* Use dedicated PRs for cross-cutting release, Android artifact publishing, or tracker housekeeping; link to affected issue IDs in the PR body rather than mixing security fixes in one release commit. Check PR scope manually as well as running the `Security PR issue scope` workflow.
* Main branch settings to be completed by a repository administrator: **enable Squash merging; disable Merge commits and Rebase merging**. Require PR review/CI via branch rules; discourage direct pushes to `main`. The workflow in this PR is advisory until its check is required by a branch rule.
* The workflow only validates *declared* SEC-### issue scope in PR title and commit subjects. It cannot prove that source changes semantically belong to the stated issue or guarantee the merge method.
* Never force-push, rebase, reset, or delete published `main` history merely to make an audit chart look tidy. Published commit SHAs link existing PR evidence, deployed versions, security reviews, and rollback documentation.

#### Historical cross-reference (not a rewritten history)

The following is a **representative PR-to-issue index** based on repository PR titles and the issue tracker as of the date above. Some PRs are documentation-only, some contain multiple commits, and some issue IDs have additional direct follow-up commits. It is **not** an exhaustive one-to-one list of every Git object.

| Security finding | Primary historical PR(s) and exceptions |
| --- | --- |
| SEC-001–SEC-003 | Early combined PR [#3](https://github.com/Kondapaneni/HRMS/pull/3); see issue tracker for follow-up remediation evidence |
| SEC-004 | [#4](https://github.com/Kondapaneni/HRMS/pull/4), [#5](https://github.com/Kondapaneni/HRMS/pull/5) |
| SEC-005 | [#6](https://github.com/Kondapaneni/HRMS/pull/6) |
| SEC-006 | [#7](https://github.com/Kondapaneni/HRMS/pull/7), [#8](https://github.com/Kondapaneni/HRMS/pull/8), [#9](https://github.com/Kondapaneni/HRMS/pull/9); separate APK publication PRs |
| SEC-007 | [#17](https://github.com/Kondapaneni/HRMS/pull/17)–[#19](https://github.com/Kondapaneni/HRMS/pull/19) |
| SEC-008 | [#20](https://github.com/Kondapaneni/HRMS/pull/20)–[#25](https://github.com/Kondapaneni/HRMS/pull/25) |
| SEC-009 | [#26](https://github.com/Kondapaneni/HRMS/pull/26)–[#28](https://github.com/Kondapaneni/HRMS/pull/28) |
| SEC-010 | [#29](https://github.com/Kondapaneni/HRMS/pull/29)–[#31](https://github.com/Kondapaneni/HRMS/pull/31) |
| SEC-011 | [#32](https://github.com/Kondapaneni/HRMS/pull/32)–[#34](https://github.com/Kondapaneni/HRMS/pull/34) |
| SEC-012 | [#39](https://github.com/Kondapaneni/HRMS/pull/39)–[#41](https://github.com/Kondapaneni/HRMS/pull/41); substantial intermediate commit history |
| SEC-013 | [#43](https://github.com/Kondapaneni/HRMS/pull/43)–[#45](https://github.com/Kondapaneni/HRMS/pull/45) |
| SEC-014 | [#46](https://github.com/Kondapaneni/HRMS/pull/46), [#47](https://github.com/Kondapaneni/HRMS/pull/47) |
| SEC-015 | [#48](https://github.com/Kondapaneni/HRMS/pull/48), [#49](https://github.com/Kondapaneni/HRMS/pull/49) |
| SEC-016 | [#50](https://github.com/Kondapaneni/HRMS/pull/50), mixed [#51](https://github.com/Kondapaneni/HRMS/pull/51), [#53](https://github.com/Kondapaneni/HRMS/pull/53) |
| SEC-017 | Mixed [#51](https://github.com/Kondapaneni/HRMS/pull/51), then [#54](https://github.com/Kondapaneni/HRMS/pull/54)–[#56](https://github.com/Kondapaneni/HRMS/pull/56) |
| SEC-018 | Mixed [#51](https://github.com/Kondapaneni/HRMS/pull/51), then [#52](https://github.com/Kondapaneni/HRMS/pull/52), [#58](https://github.com/Kondapaneni/HRMS/pull/58)–[#61](https://github.com/Kondapaneni/HRMS/pull/61), rename compatibility [#63](https://github.com/Kondapaneni/HRMS/pull/63). Review [#57](https://github.com/Kondapaneni/HRMS/pull/57)/[#62](https://github.com/Kondapaneni/HRMS/pull/62) separately before any merge; prior accepted unverified backup/restore risk remains unchanged |
| SEC-020 | [#35](https://github.com/Kondapaneni/HRMS/pull/35)–[#38](https://github.com/Kondapaneni/HRMS/pull/38) |

SEC-019 and SEC-021–SEC-024 remain tracked separately; do not mark them fixed from this history cleanup. Historical SEC-016/017/018 changes were deliberately combined in PR #51; this is a policy exception to document, not something a documentation commit can undo.

#### Safe adoption checklist

1. Review and merge this policy PR using **Squash and merge**, not a merge commit or rebase merge.
2. In **Settings → General → Pull Requests**, allow **Squash merging** and disable **Merge commits** and **Rebase merging**. This configuration is not changed by the PR.
3. Protect `main` via a branch protection rule/ruleset; require the `Security PR issue scope` status check and the existing build/security CI. This configuration is not changed by the PR.
4. From SEC-019 onward, name the PR `fix(SEC-019): ...`, keep its actual security fix and tests in that PR, and squash merge only after verification. Keep cross-issue references in the PR body, not in its commit subject.

---

## Android APK distribution and signing guide

*Consolidated from former `docs/ANDROID_GITHUB_APK_DOWNLOAD.md`; full original guide retained so release-signing and employee APK distribution instructions are not lost.*

### HRMS Android APK download through GitHub + existing Employee Profile

The mobile browser's HRMS Employee Profile provides the **Download Mobile App
(APK)** button only when `/downloads/android-release.json` confirms that
GitHub Actions published a verified signed release. The corresponding APK
lives at `/downloads/Acme%20HRMS.apk` (from
`frontend/public/downloads/Acme HRMS.apk` in the deploy). This prevents
the browser profile from presenting a stale, bundled APK as current while
signing is skipped or blocked. Employees never need GitHub access.

#### How the workflow works

1. GitHub Actions uses Java 17 to run the SEC-006 tests and builds the Android
   debug APK and optimized unsigned release APK.
2. GitHub Actions artifacts store the debug APK (7 days, for testers) and
   unsigned release APK (2 days, for the signing job).
3. On a successful `main` run, if the permanent signing secrets are configured,
   the release job signs the optimized release APK, verifies the package,
   signing certificate and increasing version code.
4. On a successful signed release (certificate and increasing version code
   validated), the workflow commits the APK **and**
   `frontend/public/downloads/android-release.json` together. The JSON records
   Android version, SHA-256, build source commit, and publication time; it
   never contains keys or secrets. If secrets are missing or the certificate
   conflicts, **neither file is changed**. The HRMS website must redeploy the
   commit before the new APK becomes available.
5. The Employee Mobile Profile fetches this JSON with `cache: no-store`.
   If it is missing or invalid, it displays a signing-pending notice instead
   of offering the older APK. When present, the button includes the release
   version code in its URL to bypass a cached APK.
6. On Android Chrome, an employee opens HRMS → Employee Profile →
   Download Mobile App (APK), then confirms installation with Android.
7. The Android build triggers when relevant native **or frontend** source
   changes land on `main`, but excludes the generated APK and JSON to avoid
   recursive builds.

#### Minimum required one-time setup: 2 secrets, not 5

You must create a **permanent** Android keystore and back it up privately.
You cannot make Android accept changing signatures for existing installed apps.
GitHub runners' random debug keys are not suitable for ongoing app updates.

The workflow uses a fixed signing alias `hrms-release` and uses the same
password for keystore and key (compatible with PKCS#12). Add these secrets
under GitHub repository → Settings → Secrets and variables → Actions:

- `HRMS_ANDROID_RELEASE_KEYSTORE_BASE64` — Base64 of your permanent PKCS#12
  `hrms-release.p12` keystore.
- `HRMS_ANDROID_RELEASE_STORE_PASSWORD` — password for that keystore.

Generate the keystore **locally on your trusted computer** using:
```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -alias hrms-release -keyalg RSA -keysize 3072 -validity 10000 -storetype PKCS12 -keystore "$env:USERPROFILE\Documents\hrms-release.p12" -dname "CN=Acme HRMS, OU=IT, O=Acme"
```
Keytool will prompt for a password; use a strong unique password. Store
a secure, offline backup of the keystore and password.

To add the Base64 secret without printing it in your terminal:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\Documents\hrms-release.p12")) | Set-Clipboard
```
Paste the clipboard into the first GitHub secret and clear the clipboard
afterward. Enter the password in the second GitHub secret. Never share the
keystore, Base64 contents or password in chat, code, source control or logs.

#### One-time migration for existing Android installations

**Already distributed older HRMS APKs may have a different signing key.**
The current `frontend/public/downloads/Acme HRMS.apk` certificate differs
from the local `C:\Users\HP\.android\debug.keystore` certificate.
The newly installed GitHub debug build is also not necessarily signed with
the permanent key. A new permanent signing key will not support an in-place
upgrade over those installations.

To *retain* in-place update compatibility, you must use the original matching
signing keystore. Otherwise, the first permanent-key release is a **migration**:
employees must check out, back up any unsynced data, uninstall their existing
app, install the newly signed APK and log in again. Do not start migration
before communicating this interruption.

For safety, a mismatched certificate is **never** automatically published.
When a migration is explicitly approved, open GitHub Actions →
SEC-006 Android native security regression → Run workflow on `main` and check
`allow_signer_migration`. This is the only path that intentionally replaces
the website APK with a different signer. All later automatic builds use the
same permanent signing secrets and should update in place.

#### Rollout checks

- Review and merge the workflow PR to main.
- Set the two secrets in the repository, or note the publish job will safely
  skip and the existing web APK will remain unchanged.
- For first new-signer release, coordinate with employees and explicitly run
  the migration workflow.
- Inspect GitHub Actions logs for successful signing, compatibility verification
  and Git commit of both the APK and `android-release.json`; verify the
  website redeployed **both**. If the release job reports missing secrets or
  a certificate mismatch, the profile must show the signing-pending notice.
  Do not manually point the button at a debug, unsigned or old APK.
- On an Android test phone download from the browser's Employee Profile,
  install, sign in, confirm the two-minute SEC-006 background location tracker
  continues across app closes/reopens, and check out.
- Run a subsequent release to confirm *in-place updates* without an uninstall.

**Caution:** The APK is ~70MB; versioning it in Git increases Git history
size significantly. This simple GitHub-only approach is practical for
occasional updates, but for frequent APK releases use an artifact storage
service. Website deployments may have size/runtime limits.

---

## Candidate offer letter — secure portal download

*Consolidated from former `docs/CANDIDATE_OFFER_PORTAL_DOWNLOAD.md`, originally introduced in the main-branch candidate portal fix commit `abfaedf4862e4bc415b2642bd3cc862288c075f9` (2026-11-17). Historical deployment gates and future-tense wording below are preserved as written; they are **not** independent confirmation of completed production or DEV live testing.*

### Candidate Offer Letter — Secure Portal Download

#### Scope and reason
The Admin Recruitment offer studio generated a PDF in the private
`offer_letters` Storage bucket and queued an offer notification, but the
application did not record which PDF belonged to which candidate. The
Candidate Portal had no **Download Offer Letter** action. The owner specifically
requested **the portal button, not an email-template button**.

#### Fix
- Admin offer generation now requests a path in the exact application's
  `<application-uuid>/` prefix. The backend Storage uploader mints the actual
  randomized PDF name; no arbitrary URL or filename from a candidate is used.
- The approved `Hired` status transition persists the verified Storage
  object path in `applications.offer_letter_path`, recording it alongside
  the timeline transaction.
- A nullable database column with a scoped CHECK rule retains all existing
  application records. Old offers cannot be safely auto-linked by guessing
  from a global Storage bucket; only **newly generated / correctly reissued**
  letters appear automatically.
- Candidate Applications desktop and mobile show **Download Offer Letter**
  only for application records with a linked PDF.
- The existing `/Offer-Letter/<path>` proxy requires a valid HRMS session
  (Bearer or the short-lived HttpOnly file-auth cookie), verifies the
  application's `candidate_id` owns the exact stored path, then streams
  from private Supabase Storage with `Cache-Control: private, no-store`.
  Another candidate cannot guess or download someone else's letter.
- The offer email template and security-controlled recipient/subject are
  unchanged, as the owner requested the action in the portal only.

#### Regression and deployment gates
- Synthetic SEC-015 database and HTTP tests cover rejected anonymous and
  candidate requests, invalid/cross-application paths, absence of a Storage
  object, valid Admin association, candidate listing, and single timeline
  update.
- Private-file ownership tests cover owning candidate, unrelated candidate,
  employee, Admin, and a nonexistent filename.
- Existing SEC-003 and SEC-015 security regressions and full Vite build
  must pass before **one squash merge**.
- Apply the reviewed additive migration to the correct DEV Supabase project
  via the supported migrations API and confirm its recorded version before
  deploying code that requires the new column.
- Verify Render is LIVE at the merged squash SHA and provide the owner a
  safe portal retest with a newly generated test offer.

#### Git history policy
The earlier published SEC-019 commits on `main` are immutable for this fix:
`727cd0d` (original remediation), `d49ad30` (numeric labels),
`bc83f89` (conversion), `54eb2e5` (closure documentation), and the
intervening candidate activation fix. Combining historical commits would
rewrite published SHAs and break deployment/audit traceability. Do **not**
force-push or rebase the protected `main` history. This portal fix and
its tests and documentation will be integrated in **one new squash commit**.
