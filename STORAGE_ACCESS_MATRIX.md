# Supabase Storage Access Matrix

This document records the intended storage access model for Acme HRMS. The browser uses the custom HRMS JWT, not Supabase Auth, so sensitive file ownership is enforced by authenticated PHP endpoints. The Supabase service-role key must remain in the backend runtime only.

## Bucket access

| Bucket | Visibility | Browser access | Upload / delete path |
|---|---|---|---|
| `avatars` | Public | Read only | Authenticated PHP avatar endpoints |
| `holidays` | Public | Read only | Admin PHP holiday-image endpoint |
| `job_descriptions` | Public | Read only | Recruitment-admin PHP upload endpoint |
| `training_videos` | Private | No direct object access | Admin obtains a short-lived signed upload URL; backend signs playback URLs for authorized employees/admins |
| `attendance` | Private | No direct object access | Authenticated PHP upload and record-owner/admin preview endpoints |
| `candidate_documents` | Private | No direct object access | Candidate-owner and recruitment-admin PHP endpoints |
| `resumes` | Private | No direct object access | Candidate-owner and application-review-authorized PHP endpoints; short-lived signed previews |
| `expenses` | Private | No direct object access | Employee-owner and expense-admin PHP endpoints |
| `offer_letters` | Private | No direct object access | Recruitment-admin upload and candidate/application-authorized signed preview endpoints |
| `loan_documents` | Private | No direct object access | Authenticated loan application/branch authorization endpoints |
| `loan_signatures` | Private | No direct object access | Authenticated transfer-to-branch workflow |
| `app_builds` | Private | No direct object access | No active upload/download workflow exists in the application; keep locked until one is implemented |

## Security rules

- Do not upload, replace, or delete objects directly from the browser's Supabase anon or authenticated client.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` through any `VITE_*` variable or frontend bundle.
- Only avatars, holidays, and job descriptions are publicly readable. No anonymous or authenticated browser client receives direct write access to any bucket; uploads and deletes use authenticated PHP endpoints or one-time signed training-video upload URLs.
- Private-bucket previews must be issued only after checking the relevant employee, candidate, application, expense, or branch ownership/permission.
- Use random object names and validate actual file MIME/content and size on the backend.
- Do not use `owner_id = auth.uid()` policies for this application: the browser does not authenticate with Supabase Auth.

## Migration order

Apply all migrations in timestamp order before deploying the matching PHP backend:

1. `20261107110000_security_sessions_otp_and_indexes.sql`
2. `20261107130000_private_attendance_storage.sql`
3. `20261107150000_private_candidate_documents.sql`
4. `20261107170000_private_resumes_storage.sql`
5. `20261107180000_private_expense_receipts.sql`
6. `20261107190000_private_offer_letters.sql`
7. `20261107200000_private_loan_documents_and_signatures.sql`
8. `20261107210000_secure_avatar_uploads.sql`
9. `20261107220000_configure_public_asset_storage.sql`
10. `20261107230000_lock_unused_app_builds_bucket.sql`
11. `20261107240000_enforce_storage_policy_allowlist.sql`

The migrations are committed to the audit branch but must not be assumed applied to the connected Supabase project until the migration history confirms it.

After applying the final storage-policy migration, run `supabase/tests/storage_policy_allowlist.test.sql` against the target database to assert that only the public-read allowlist remains and no direct browser write policy survives.

## Backend configuration

Set these on the Render backend only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Keep the service-role key out of frontend build arguments, client environment variables, source files, logs, and error responses. Configure the email Edge Function webhook secret separately as described in the PR deployment checklist.
