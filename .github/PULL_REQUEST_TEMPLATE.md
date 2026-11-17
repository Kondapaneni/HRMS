## Scope

**Primary issue:** `SEC-###` / `PERF-###` / `QUAL-###` / `CHORE-###`

Explain the single issue this PR resolves. For security fixes, use a title such as `fix(SEC-019): replace predictable employee IDs`. Do not bundle multiple SEC findings into one PR; put related regression references in the description.

## Change summary

- What changes?
- Why is the change necessary?
- Does the PR alter authentication, authorization, PII, database schema, secrets, or deployment configuration?

## Verification

- [ ] Focused CI and relevant regressions pass
- [ ] Safe live verification plan documented, if needed
- [ ] Existing Admin login and employee sessions preserved, if applicable
- [ ] No real user records, credentials, or audit history exposed in logs/commits

## Release decision

- [ ] This PR is ready for review; don't merge until required checks pass
- [ ] Final integration into `main` will use **Squash and merge**
- [ ] No force-push or history rewrite of published `main`
- [ ] Any remaining risk/rollback requirements are recorded
