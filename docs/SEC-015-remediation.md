# SEC-015 — Restrict recruiter email delivery, remove onboarding passwords and escape promotion letters

**Severity:** HIGH. **Status:** IMPLEMENTED ON DEVELOPMENT BRANCH; CI + MERGE + RENDER DEPLOY + OWNER LIVE VERIFICATION PENDING. **Scope:** Security remediation for HRMS outgoing templates; not production clearance.

## Original finding and exact code

The [SEC-015 audit](../AUDIT_REPORT.md#issue-id-sec-015) identified three related issues:
1. Authenticated recruitment endpoint POST /api/admin/send-email accepted a fully caller-supplied `to`, `subject` and raw HTML `body`, allowing a compromised recruiter session to turn official mail into a phishing relay.
2. POST /api/employees created a chosen/generate-in-browser initial password and inserted it into the welcome template, persisting a usable plaintext password in `email_queue.body` and its backups.
3. POST /api/admin/employees/{id}/promote embedded dynamic employee designation and effective-date values into intentionally formatted HTML fragments without escaping them.

## Implementation

- `App\Security\EmailSecurity` accepts **only server-owned templates**, an application UUID, and one of `shortlisted`, `rejected`, `interview`, `offer`, `status`, `documents_verified`. Recipient email, candidate name and job title are retrieved from `applications` joined to `users` and `jobs`. The notification type must match the latest application status. Document verification mails require all ten mandatory `candidate_documents` types verified in the database. Interview details are taken from existing server-side `application_timeline` and limited to escaped text. No caller-specified links, subject, recipient or raw HTML are accepted.
- `EmailSecurity::render` escapes all data placeholders with `htmlspecialchars(..., ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')`; the controlled template may contain intended formatting but the applicant's name, job title, status and interview notes cannot become HTML. Promotion fragments pre-escape the dynamic position and effective date before insertion into controlled `<strong>` markup. Email subjects strip line-break/control characters.
- Every successful recruitment email consumes a database-backed per-authenticated-user notification quota: 20 per 60 minutes. This limits a compromised recruiter from repeatedly spamming known candidates; it does not replace operational deliverability anti-abuse controls.
- New employee creation no longer accepts an initial password from the admin browser. A high-entropy random password is hashed and is not disclosed or emailed. A 32-byte random one-time setup token is stored in existing `users.reset_token` and expires in one hour via database `CURRENT_TIMESTAMP`. An approved welcome template sends the link to the stored employee email. The existing `POST /api/reset-password` checks expiry, clears the token, installs the employee-selected password, clears the mandatory-change flag and revokes prior sessions via token version.
- AdminAddEmployee no longer generates/displays initial passwords. AdminRecruitment and AdminVerifyDocuments send `{applicationId,type}` only; HTML is rendered by PHP, not React. The generic/legacy API contract is explicitly rejected with 400 and no queue write.
- New static status template covers statuses without their own letter. The offer template previously instructed candidates to view their offer in the portal; the generic email relay no longer accepts client-provided offer URLs, avoiding an arbitrary redirect. Separate offer-letter storage entitlements and client uploads remain governed by SEC-003 and SEC-017.

## Verification

`.github/workflows/sec015.yml` uses disposable PostgreSQL `sec015_test` and a local PHP HTTP listener, never the connected HRMS database. Tests include anonymous/candidate denial, arbitrary `to/subject/body` rejection, forged recipients, bad UUID/type, missing applications, notification/status mismatches, verified/unverified document checks, recruitment quota, HTML-injected candidate/job/interview data, rejected legacy employee password, successful new employee invitation, escaped promotion fields, and SQL postconditions. A one-use setup token is exercised through the actual reset API, including replay failure and account version bump. A Vite production build checks UI compatibility. **No actual emails are delivered by CI**; `email_queue` is a test-only table.

## Rollout and limitations

1. Merge only when focused CI and previously passing auth/feature regression tests are green. Confirm the exact Render deployment is live.
2. Owner should first confirm Admin Dashboard, Recruitment, Employee Directory and Settings load with no changes. Do not send emails to actual candidates or employees.
3. Check rejection of legacy arbitrary HTML and forged-recipient payloads against an authenticated *development admin* using only invalid request shapes (expected 400 **before** queue write).
4. Test actual recruitment status notification and employee onboarding setup **only with a dedicated synthetic test candidate and approved test mailbox/window**; otherwise use isolated CI for outbound flows. Never expose reset/setup tokens, real addresses, or credential hashes in chat. Check mailbox and recipient identity only on approved test data.
5. Inspect promotion email escaping only via synthetic CI or test-only employee; do not change a real employee's salary or position. Restore any temporary test fixtures, verify no real accounts were touched.
6. Close SEC-015 only after scoped live verification, cleanup and owner confirmation.

**Residual risks and non-goals:** Historical queued plaintext passwords, old queue/backups, queued OTP codes and password-reset tokens are not automatically purged. Previously exposed initial passwords must be reset/revoked for affected accounts and legacy queue data reviewed under a separate approved maintenance/data-retention process. Newly generated one-time setup URLs are still sensitive until consumed; the mail delivery queue necessarily holds the link in plaintext. The current password-reset token itself is also stored plaintext in `users.reset_token` (one-hour expiry); storing a hash is a desirable follow-up with migration/compatibility assessment. The existing template mail sender/Edge authorization from SEC-002 remains unchanged. Security of other independent email templates and public file uploads is not asserted by this finding closure. Remaining SEC-017/018/021/024 and others continue to block production clearance.
