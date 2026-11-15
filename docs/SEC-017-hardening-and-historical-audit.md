# SEC-017 — Backend-minted Storage names and historical object review

**Status:** Remediation prepared in draft PR #54; do not mark closed or deploy until CI, release approval and post-deployment verification. Production-designated Supabase objects and records remain unchanged.

## Completed live security verification (before filename change)

- Admin, Employee and Candidate upload authorization and negative-path checks passed.
- Synthetic Admin, Employee and Candidate uploads and exact-path deletes passed; SQL verified zero remaining synthetic test objects.
- Direct publishable-key upload attempt was blocked by Storage RLS.
- Invalid file data returned 415; path traversal returned 400; unauthorized paths returned 403; anonymous upload returned 401.
- Existing overwrites did not replace the original image, and normal file-consuming application pages loaded.

## Proposed hardening

- PHP Storage upload mints a new object name containing a 128-bit server-side CSPRNG suffix with `random_bytes(16)`, preserving the already-validated ownership prefix, directory and extension.
- All frontend upload consumers must persist the `path` returned by HTTP 201; clients' requested paths are *not* actual stored paths.
- Backend validates supported AVIF images by detected `image/avif` MIME. SVG/script content masquerading as AVIF remains rejected.
- Existing object names and URLs are unchanged; deletion still uses exact persisted object paths.
- The backend and frontend changes **must be deployed together**.

## Historical audit (read-only, November 15, 2026)

11 buckets, 229 Storage records including eight 0-byte `.emptyfolderplaceholder` objects; 221 non-placeholder file objects passed MIME metadata and size-limit checks. This only verifies Storage metadata, not every underlying file's bytes.

Five AVIF image objects had `image/avif` metadata and sizes around 1.83 MB each: four in avatars, one in holidays. One avatar and the holiday had matching references in the checked application tables; the other three avatars had no matches in the six checked image columns. **Unmatched is not proof of unused.**

**No historical objects were deleted, overwritten or converted.** Keep read compatibility. Before any orphan cleanup, inspect all application, exported document, mobile-cache, external URL and retention dependencies; capture approved backup/reference inventory; obtain explicit file-specific deletion approval; perform one scoped deletion at a time and verify restoration readiness.

## Post-deployment release gate (new live checks)

1. Read-only admin and employee/candidate UI regression; verify existing AVIF links still render where referenced.
2. One authorized synthetic Admin upload: response path contains an unpredictable suffix; GET exact returned path; delete exact path.
3. One authorized synthetic Employee upload/delete, preserving employee ownership path and reference behavior.
4. One authorized synthetic Candidate upload/delete, preserving Candidate ownership path and reference behavior.
5. Verify forbidden paths and malformed content still return 403/415, with no Storage writes.
6. SQL verify zero synthetic objects; clear browser test markers. Review CI and audit tracker before SEC-017 closure.

Keep all tests within an approved no-work window if business workflows are affected. Do not perform historical deletion based on unmatched counts alone.
