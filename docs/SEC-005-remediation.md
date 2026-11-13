# SEC-005 — Git artifact hygiene and Docker build secret exclusion

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

## Changes in this remediation

1. Add root `.dockerignore` filtering `.git`, every nested `.env*`, private keys, SQL/database dumps, logs, scratch files, vendored binaries, dependencies and unused repository files from **both stages** of the Docker build. This applies to `COPY backend/ /backend/` in the Node builder and `COPY backend/ .` in the PHP runtime.
2. Update `.gitignore` to prevent accidental tracking of local backups, logs, private keys and scratch queries while retaining legitimate `supabase/migrations/*.sql` files.
3. Delete `chat_backup/chat_backup_2026_08_06_151001.sql` from **current branch HEAD**, with no application source dependency on it.
4. Add CI that injects dummy `.env`/SQL/log/private-key files into a checkout, asserts they do not enter a Docker build context, and builds the actual production Docker image to confirm `/var/www/html/.env` is absent **before entrypoint execution**.
5. Keep `frontend/public/downloads/Acme HRMS.apk` in the frontend build. `EmployeeMobileProfile.jsx` links directly to this APK, so removing it without separately hosting a release would break the user's existing mobile download feature. Review the APK separately for embedded credentials and move release distribution out of Git.

The current `main` inventory already did **not** contain `scratch_queries.txt` or `server.log`, despite the older audit describing them as tracked.

## Critical: historical exposure remains

Deleting a file in a new commit **does not erase that file from previous commits**, existing clones, forks, pull-request diffs, GitHub caches or Docker images already built before this change.

Do **not** mark SEC-005 fully closed until:

- Historical exposure review: with repository owner approval, inspect the potentially sensitive backup/log/scratch files from prior commits **without printing data into logs**; determine whether their contents include live accounts, secrets, employee/candidate data or personal identifiers.
- Rotate **only the credentials actually exposed**, using coordinated updates to their consuming services. Potential categories include DB credentials, `JWT_SECRET` (invalidation impact), Supabase secret keys, SMTP credentials, and Google API keys. Never commit new credentials. Consider deletion/notification obligations for real PII.
- Coordinate full history rewrite if exposure persists in Git. Make a private mirror or authorized backup first, notify collaborators, and use a trusted local `git-filter-repo` workflow to remove all affected historical paths. Force-pushing rewritten history invalidates commit IDs and requires all collaborator clones/branches and CI references to be re-cloned/reconciled. Obtain explicit approval for this disruptive step; **not performed here**.
- Review stale images/registries for `.env` in image layers; revoke access/remove affected images where present. A new clean image does not remove older layers from registries.
- Validate secret exclusion on the actual deployment and review any tracked distributable APK for embedded credentials.

## Verification

Run the automated workflow `.github/workflows/sec005.yml`. It:

- Verifies sensitive paths are not tracked in the current Git tree and are ignored by default.
- Proves synthetic private files do **not** appear after `COPY .` in a disposable Docker build.
- Builds the real multi-stage Dockerfile with synthetic secrets present on the runner and inspects the **unstarted image** using an entrypoint override, ensuring `/var/www/html/.env` is absent.
- Confirms the frontend, vendor dependencies and existing mobile APK download remain available.

The runtime `docker-entrypoint.sh` still creates a permission-restricted `/var/www/html/.env` from Render environment variables **when the container starts**. This is expected and different from baking it into an image layer.

## Safety and scope

The GitHub history was **not** rewritten, no credentials were read or rotated, no database or Supabase Storage settings were changed, and the mobile APK asset remains deployed until a release-hosted replacement is designed.

**Implementation status after CI/deployment:** current-tree and Docker build exposure mitigated. **Audit tracking status:** Closed for development under owner-accepted residual risk, as recorded above. Historical data/credential and prior-image reviews remain pre-production obligations.
