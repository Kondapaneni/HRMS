# PR #119 — Isolated staging readiness and verification gates

Status: **staging provisioning blocked pending a separate, isolated database environment and explicit approval of any recurring cost.** No credentials, employee records, or production configuration are copied.

## Current environment check (2026-11-20)

- Render: one HRMS production web service on `main`. No HRMS preview or staging service. Production auto-deploys from `main`.
- Supabase: Free organization with two existing active projects. Both have live-like HRMS tables and records. **Neither is an approved disposable staging environment.**
- Free plan allows two active projects, so a third free staging project is not available without changing the account/project arrangement.
- Supabase CLI/branching is not activated for the Free plan. Cost quote for a database branch returned **USD 0.01344 per hour**; paid Supabase Pro is required to use branching. Do not create a paid branch or upgrade on the strength of a generic "continue" request.
- Keep draft PR #119 unmerged until isolated staging and manual tests pass. CI alone does not validate authenticated production-like browser behavior.

## Provisioning safety gate

Provision staging only after the database owner selects and approves an available, entirely isolated database/project and confirms any cost. Do not repurpose, reset, truncate, pause, or clone the data of either existing Supabase project without a separate explicit authorization.

Set up:
1. A separate staging database with the currently required schema, functions, restricted runtime role, RLS policies, and **synthetic** admin/employee/branch accounts. No real identities, salaries, documents, GPS, loans, or session tokens.
2. Staging-only JWT/OTP secrets, database/pooler credentials, authorization/RLS configuration, staging URL, and isolated object storage. Never copy production env values or credentials. Verify staging database identity and host match the approved staging project **before** starting the app.
3. Suppress external onboarding/OTP emails, SMS, push notifications and third-party writes in staging until safely redirected to mock destinations. Do not enable GPS/background tracking or operational integrations.
4. An HRMS staging Render service connected to `feat/fresh-react-query-branch-pilot-20261120`, initially with automatic deployment **off** and staging-only configuration. Never use `main` or point `VITE_API_URL`, `FRONTEND_URL` or database vars at the production service/database.
5. A staging-only admin and employee session. Document the staging URL and branch commit; restrict test access. Confirm `GET /api/branches` returns **only synthetic branch identifiers and names** and HTTP cache policy stays `no-store`.

## Manual authenticated browser checklist

Perform with browser DevTools Network panel open; filter to `/api/branches`. Each scenario must produce the stated result.

1. **Initial Add Employee:** Log in as staging Admin, open Add Employee. The Branch selector loads test branches. The form cannot submit until a branch is valid; never create a real employee.
2. **Repeat navigation:** Visit Employee Edit, then Recruitment, then Add Employee again **within 5 minutes**. Only the first permitted request should be necessary for unchanged branch reference data within one verified session; confirm the visible selected branch is correct.
3. **Search/selection and create action:** If the branch response fails, the form disables invalid employee creation and candidate conversion, displays an error and allows safe recovery. Verify no candidate is converted on failure.
4. **Account isolation:** Log out, verify private data disappears, sign in with a different synthetic account, and verify no stale first-account branches or records are visible.
5. **Cross-tab logout:** Open two authenticated staging tabs, log out in one, and confirm the other cannot access previously cached protected content.
6. **403 behavior:** Revoke or deny branch-list authorization for the synthetic account in staging, then force a stale refetch. The branch list must disappear and remain blocked without a repeated-request loop. The server must be authoritative on subsequent protected APIs.
7. **Permission revocation:** Revoke a synthetic role's permission mid-session and verify the existing unrelated security-sensitive modules remain blocked immediately by the backend, independent of caching.
8. **Maintenance Mode:** Turn staging maintenance on and verify no cached screen bypasses the server gate. Turn it back off using the staging Admin.
9. **Freshness:** Change a synthetic branch name only in staging, then explicitly invalidate the branch query or wait for stale revalidation and confirm correct updated options. Do not assume a five-minute TTL guarantees immediate changes.
10. **Failure recovery:** Simulate a denied request, network interruption, and stale-response completion after logout. No private content may reappear, and no production backend should receive a request.

## Release gate

- All configured GitHub CI workflows must pass at the exact reviewed head SHA.
- Staging service must be healthy, have no production credentials, and pass the above manual browser checks.
- Record before/after request count and navigation timings on controlled identical staging datasets.
- Obtain separate approval to mark the PR ready, merge to `main` and allow Render production deployment.
- If any isolation test fails, keep the PR in draft and do not deploy.

This file is a deployment *plan*, not evidence that staging exists or that browser tests ran.
