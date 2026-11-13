# SEC-005 — Git artifact hygiene and Docker build secret exclusion

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

**Status after CI/deployment:** current-tree and Docker secret exposure mitigated; overall SEC-005 **partially fixed**, pending coordinated historical data/credential and old-image handling.
