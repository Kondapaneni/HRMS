# SEC-001 — Supabase access control fix

Issue verified against the existing audit report, the current PHP/React repository and live \`pg_policies\`. Existing broad authenticated \`sub IS NOT NULL\` public-table policies and public Storage mutation policies remain in Supabase until migration.

## This branch
- Client Storage mutations go through JWT-protected PHP API endpoints, with bucket allowlist, role/path authorization, upload size and file signature validation, and no overwrites.
- Candidate resumes and employee expense files use user-scoped paths.
- Video upload uses the actual \`training_videos\` bucket and the authenticated endpoint.
- Supabase browser credentials are removed, including Vite build-time Supabase key arguments.
- SQL migration drops permissive policies and revokes direct public Data API access.

## Deployment and verification sequence
1. Add SUPABASE_URL and SUPABASE_SECRET_KEY (server-only sb_secret_... key) to your PHP/Render environment; never expose the secret using VITE_. Ensure php-curl is installed.
2. Deploy the backend and frontend together. Test candidate resume/document uploads, avatars, attendance photos, expense receipts, holiday/job/offer files, training videos, and loan document/signature flows. Existing loan applications must have matching ownership or employee branch permissions.
3. Only after confirming those flows, apply \`supabase/migrations/20261113_sec_001_lock_down_rls.sql\` in a maintenance window. This commit DOES NOT modify Supabase production policies.
4. Test unauthenticated Data API reads/writes and Storage uploads/deletes using only public key (must fail); test authenticated, unauthorized role, wrong owner path, invalid mime and oversized upload scenarios. Validate authorized upload/delete and portal regressions.
5. Review public GET document proxies separately under SEC-003. SEC-002 and SEC-011 remain independent issues.

### Operational notes
- Existing public-bucket reads are not revoked in this fix.
- Storage mutations are rejected if SUPABASE_SECRET_KEY is absent.
- The migration intentionally removes anonymous direct Data API reads; publicly visible jobs should be served by the PHP API.
- No new external dependencies are added beyond the PHP curl extension.
