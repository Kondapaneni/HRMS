# SEC-010 — Feature permission SQL allowlist and fail-closed authorization

**Original severity: CRITICAL. Status: PARTIAL — code merged into main by PR #29, dedicated synthetic CI and cross-issue SEC-008/009 regressions passed; owner-led live Render verification still pending.**

## Root cause and source review

The original audit reported a feature-key SQL identifier interpolation risk and possible fail-open behavior when the database was unavailable. SEC-009 previously removed the empty-role bypass, so **a missing/failed employee feature query already tended to deny the employee**. However, the current code still constructed a SQL identifier from any feature key, and its *active-account lookup* was inside a broad catch that merely logged failures and continued to the protected handler. An already role-authorized account (e.g. admin) could therefore pass the middleware despite inability to verify whether it still existed and was active.

Relevant files: `backend/src/Middleware/AuthMiddleware.php` and connection-error output in `backend/src/Config/Database.php`.

## Fix

1. **Exact feature allowlist:** `AuthMiddleware::FEATURE_COLUMNS` maps only the eleven columns already declared by `user_feature_access` and Admin → Feature Access. Both the existing short route keys (e.g. `loanOrigination`) and direct aliases (e.g. `canLoanOrigination`) are mapped to fixed, audited column identifiers. No untrusted feature text is interpolated into SQL.
2. **Invalid policy fails closed:** Unknown or malformed keys (including nested arrays, empty lists and malicious SQL-like strings) return `403`, **including for admin**, before a query or handler runs. The prior SEC-009 requirement for explicit role lists remains enforced.
3. **Connection/query failures return 503:** Null DB connections or exceptions during the delegated-feature lookup or active-user lookup return sanitized JSON `503 Authorization service temporarily unavailable`. No protected handler is called. Failure to find a user is `401`; a deactivated user is `403`.
4. **Correct PostgreSQL bool evaluation:** Only true/`1`/`'1'`/`'t'`/`'true'` count as granted. A string `'f'`, `'false'` or `'0'` never becomes a permission via PHP's string truthiness.
5. **Audit context remains best effort:** The non-authorization `set_config` auditing step happens only *after* permission and active-account checks succeed. Its failure is logged but does not recast a failed authorization check as success.
6. **No DB credentials in HTTP error body:** A connection exception is logged server-side rather than echoed directly by `Database::getConnection()`. The user receives only generic sanitized 503 JSON.
7. **No schema migration or frontend changes:** Existing admin grants and HR/manager/employee delegated feature checks stay intact.

## Automated tests / CI

`.github/workflows/sec010.yml` uses an isolated synthetic PostgreSQL instance named `sec010_test`; all destructive test scripts reject other DB names and synthetic-only JWT secrets.

- Static check compares eleven valid columns with `admin_feature_access_routes.php` and verifies SQL identifiers are selected only through the explicit mapping.
- Exercises both short and direct feature keys across the full eleven-column schema with successful and absent grants, plus candidate denial, HR/manager access, missing feature row, inactive employee and missing user.
- Denies malformed/unknown/injection-shaped keys for both admin and employees.
- Explicitly tests PostgreSQL false values (`'f'`, `'false'`, `'0'`).
- Drops a synthetic feature column and later the synthetic `users` table to force real PostgreSQL query errors: verifies neither employee nor admin is admitted and returns sanitized `503`.
- Tries a closed localhost port to emulate DB outage, verifying both admin and delegated employee fail with `503` and no DB error body leakage.
- Existing SEC-009/008/007 regression suites also run when middleware changes.

## Merged source and automated verification — 2026-11-14

- [PR #29](https://github.com/Kondapaneni/HRMS/pull/29) was squash-merged to `main` at commit `da9d73ac5657ac7904d2f9a38becc6e23b479817`.
- Dedicated SEC-010 workflow passed on the PR, including the full eleven-column feature allowlist, 403 responses for malformed SQL-shaped feature keys (even for admin), correct boolean conversion, inactive/missing accounts, deliberate missing-column/user-table failures, and disconnected-DB fail-closed 503/no-leak behavior.
- SEC-008 MFA and SEC-009 API-role regression workflows also passed in PR checks.
- **This is source/CI evidence, not an independently confirmed Render deployment or production permission test.** Leave SEC-010 unchecked until the live test cases below pass.

## Live verification — development accounts only

**Never intentionally disconnect the production database or drop live columns.** Those failure modes are covered solely by isolated CI.

1. After Render deployment, sign in as test **admin**. Verify Admin Dashboard, Feature Access and other normal admin areas work.
2. With an existing test employee who has no Loan Origination grant, verify the loan origination endpoint rejects access `403` while ordinary employee areas function.
3. Grant **canLoanOrigination** only to that development employee via Admin → Feature Access, then sign in as that employee and verify loan origination access works without unlocking Sales or Branch Operations.
4. Revoke **canLoanOrigination** for the development employee and verify the same loan endpoint returns `403` again; the employee's standard workspace should still function.

**Closure gate:** PR merged, CI green, Render deployment, owner-confirmed live permission regression checks. This does not close the independent SEC-011 (record ownership), SEC-012 (JWT lifecycle) or SEC-018 (other DB/SQL errors) findings.
