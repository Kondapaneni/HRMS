# SEC-003 — Protected HRMS file downloads

SEC-003 is not complete merely by protecting the PHP \`/Bills/\`, \`/Resume/\`,
and similar routes: Supabase Storage buckets must also be switched to **private**
or direct \`/storage/v1/object/public/...\` access remains possible.

## Deployment order

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
