# SEC-017 — Backend-minted Storage names and historical object review

**Status:** **CLOSED for the verified HRMS development security-remediation scope (2026-11-16).** [PR #54](https://github.com/Kondapaneni/HRMS/pull/54) and [PR #55](https://github.com/Kondapaneni/HRMS/pull/55) are merged; Render HRMS development is live on commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`. Focused and regression CI passed, owner-confirmed live tests passed, and independent read-only Supabase SQL confirmed no remaining matching SEC-017 synthetic objects. Historical objects were retained. **This is not production clearance or a full penetration test.**

## Completed live security verification (before filename change)

- Admin, Employee and Candidate upload authorization and negative-path checks passed.
- Synthetic Admin, Employee and Candidate uploads and exact-path deletes passed; SQL verified zero remaining synthetic test objects.
- Direct publishable-key upload attempt was blocked by Storage RLS.
- Invalid file data returned 415; path traversal returned 400; unauthorized paths returned 403; anonymous upload returned 401.
- Existing overwrites did not replace the original image, and normal file-consuming application pages loaded.

## Implemented hardening

- PHP Storage upload mints a new object name containing a 128-bit server-side CSPRNG suffix with `random_bytes(16)`, preserving the already-validated ownership prefix, directory and extension.
- All frontend upload consumers must persist the `path` returned by HTTP 201; clients' requested paths are *not* actual stored paths.
- Backend validates supported AVIF images by detected `image/avif` MIME. SVG/script content masquerading as AVIF remains rejected.
- Existing historical object names and URLs were not migrated; deletion uses the exact persisted object path.
- [PR #55](https://github.com/Kondapaneni/HRMS/pull/55) validates the Supabase bulk DELETE response body: HRMS accepts upstream success only when it contains the requested exact object path (and matching bucket when provided). Empty, malformed, wrong-path or wrong-bucket responses return an error instead of falsely signaling deletion. Failure cases were tested in isolated PHP CI; they were not intentionally triggered in the live development environment.
- The coordinated backend/frontend release was merged and deployed through [PR #54](https://github.com/Kondapaneni/HRMS/pull/54), followed by the deletion-response follow-up in PR #55.

## Historical audit (read-only, November 15, 2026)

11 buckets, 229 Storage records including eight 0-byte `.emptyfolderplaceholder` objects; 221 non-placeholder file objects passed MIME metadata and size-limit checks. This only verifies Storage metadata, not every underlying file's bytes.

Five AVIF image objects had `image/avif` metadata and sizes around 1.83 MB each: four in avatars, one in holidays. One avatar and the holiday had matching references in the checked application tables; the other three avatars had no matches in the six checked image columns. **Unmatched is not proof of unused.**

**No historical objects were deleted, overwritten or converted.** Keep read compatibility. Before any orphan cleanup, inspect all application, exported document, mobile-cache, external URL and retention dependencies; capture approved backup/reference inventory; obtain explicit file-specific deletion approval; perform one scoped deletion at a time and verify restoration readiness.

## Post-deployment live verification and corrective follow-up (November 15–16, 2026)

1. **Existing UI regression:** Owner confirmed Admin Dashboard, Holidays and existing images, Recruitment jobs/applications and a Job Description download, Training Videos playback, Employee Expenses/receipt preview, and Employee Profile/avatar worked without unexpected errors or modified business records. Existing AVIF content was not separately identified and byte-verified during this round.
2. **Admin synthetic upload:** Upload returned HTTP 201 and a backend-generated 32-hex-character suffix; exact PNG GET returned HTTP 200 with matching bytes. Initial backend DELETE HTTP 200 followed by image-proxy HTTP 404 appeared successful, **but Storage metadata later showed one remaining Admin synthetic PNG**. The owner deleted **only that exact synthetic file** through the Supabase Storage dashboard and verified the count returned to zero. This was the trigger for PR #55; an image-proxy 404 alone does not prove Storage-object deletion.
3. **Employee synthetic upload:** HTTP 201 returned an unpredictable owner-scoped path. A GET of the unlinked receipt returned HTTP 403 as designed, because there was no authorized expense record. Exact-path DELETE returned HTTP 200; browser test marker was cleared.
4. **Candidate synthetic upload:** HTTP 201 generated a candidate-owned object path; authorized read returned 200 and exact matching bytes; DELETE returned 200, post-deletion read returned 404, and browser marker was cleared.
5. **Denial regressions:** Employee upload to a forbidden path returned **403**; fake AVIF/SVG content returned **415**; traversal-style path returned **400**. Prior baseline also covered anonymous 401, no-overwrite behavior and direct publishable-key RLS denial.
6. **PR #55 focused post-deployment checks:** With commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd` live, owner confirmed Admin Dashboard/Holidays regression; a new single synthetic Admin PNG upload HTTP 201 with stored marker; exact-path DELETE HTTP 200 with matching returned path; and final browser marker cleanup. The backend now validates the upstream deletion response; live tests confirmed the successful case, while empty/wrong/malformed response branches were covered in isolated PHP CI.
7. **Independent Storage cleanup:** Read-only SQL against Supabase `storage.objects` after the PR #55 test returned **admin_remaining = 0, employee_remaining = 0, candidate_remaining = 0** for the SEC-017 synthetic test prefixes. This verifies Storage metadata counts, not a comprehensive byte-for-byte audit of every historical object.

## GitHub, deployment and CI evidence

- [PR #54: Server-generated Storage names, persisted upload paths and validated AVIF](https://github.com/Kondapaneni/HRMS/pull/54) — merged as commit `4abb99d5fcfe5bc74a0385f1b25818d0043ba830`. [SEC-017 focused CI](https://github.com/Kondapaneni/HRMS/actions/runs/43746726389) and related SEC-006/009/013/015 regression workflows completed successfully.
- [PR #55: Fail-closed exact-object deletion confirmation](https://github.com/Kondapaneni/HRMS/pull/55) — merged as commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`. [SEC-017 focused CI](https://github.com/Kondapaneni/HRMS/actions/runs/43798893278) and SEC-009 regression workflow completed successfully.
- Render HRMS development service was independently confirmed **Live** on commit `9e2ef81e1185f3ec8fec0ccb305f57a2538245bd`, deploy `dep-dbt7p06q1p3s73fjl5cg`. No follow-up deployments are required to record closure in documentation.
- Live browser/API observations and dashboard deletion actions were **owner-reported**; GitHub CI, Render deployment metadata, and final read-only Supabase metadata counts were independently checked during the project review.

## Scope limits and historical retention

- Historical Supabase avatars, holiday images and other pre-existing objects were **not deleted, overwritten or migrated** by this remediation or its synthetic test cleanup. Three avatar objects without matches in six checked application columns remain retained; unmatched does **not** establish unused. Their dependencies and retention obligations require separate review before any file-specific cleanup.
- The 2026-11-15 metadata inventory was **not** a full inspection of file bytes or every reference. No production security assessment was performed. This scoped development closure does **not** resolve other open HRMS audit findings, credential rotation, residual historical exposure or broader production readiness.
- Keep destructive testing and production-designated Storage cleanup under a separately approved safe window; avoid automatic deletion of historical files.
