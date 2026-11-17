# Candidate Offer Letter — Secure Portal Download

## Scope and reason
The Admin Recruitment offer studio generated a PDF in the private
`offer_letters` Storage bucket and queued an offer notification, but the
application did not record which PDF belonged to which candidate. The
Candidate Portal had no **Download Offer Letter** action. The owner specifically
requested **the portal button, not an email-template button**.

## Fix
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

## Regression and deployment gates
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

## Git history policy
The earlier published SEC-019 commits on `main` are immutable for this fix:
`727cd0d` (original remediation), `d49ad30` (numeric labels),
`bc83f89` (conversion), `54eb2e5` (closure documentation), and the
intervening candidate activation fix. Combining historical commits would
rewrite published SHAs and break deployment/audit traceability. Do **not**
force-push or rebase the protected `main` history. This portal fix and
its tests and documentation will be integrated in **one new squash commit**.
