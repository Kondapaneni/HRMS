# SEC-012 / PERF-008: interrupted browser refresh incident review

Date: 2026-11-18. Owner observed sporadic Incognito logout with
`POST /api/auth/refresh` returning `401 Refresh session invalid or revoked.`

## Evidence (read-only)

The production refresh table showed multiple web sessions revoked within
three seconds of their last rotation while matching the current account
session version. This is consistent with reused/consumed refresh
credentials, but does not establish whether the trigger was navigation,
browser cookie persistence, overlapping tabs or network interruption.
No token values, user identities or session IDs were accessed or logged.

## Narrow mitigation

`/api/auth/refresh` previously committed a one-use credential rotation,
then fetched `global_settings.session_timeout` in another database
round trip before constructing the replacement HttpOnly cookie. With
Singapore web service and Mumbai PostgreSQL, this extends the period
during which an interrupted response strands the browser with a spent
cookie. It also makes subsequent settings query failure irrecoverable.

Move the settings read and signing-key validation **before** the single-use
rotation. No database transaction, replay detection, password policy,
Android credential handling or cookie flags are altered. The response
does not disclose why a credential failed.

## Limits and follow-up

This reduces one avoidable post-commit request and a failure point, but
cannot eliminate an interrupted `Set-Cookie` response or two requests
that race across a page navigation where browser Web Locks are released.
SEC-018 requires immediate revocation of *known used* secrets, so this
fix must not introduce a replay grace window. The same browser flow
requires an approved live test before declaring the problem resolved.

Keep this PR unmerged until security review and a controlled
deployment window are approved. A 401 from a newly opened Incognito
session without an existing cookie remains expected behavior.
