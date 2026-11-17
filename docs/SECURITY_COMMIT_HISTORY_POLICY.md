# HRMS security issue commit policy and historical mapping

**Recorded:** 2026-11-17  
**Repository:** `Kondapaneni/HRMS`  
**Scope:** GitHub change-control and audit traceability only. No application runtime, database, credential, or deployment changes.

## Decision

For **future** security work, use **one SEC-### issue per pull request** and integrate the completed change-set into `main` with **Squash and merge**. The squash commit subject should be `fix(SEC-019): <specific change>` (or `test/docs/chore(SEC-###): ...` as appropriate). Tests and remediation notes for the *same issue* belong in the same PR. Do not combine SEC issues in one fix PR, as happened with historical PR #51.

* A working PR branch can contain multiple iterative commits; the squash merge creates **one new commit on main for the PR**. This is different from asserting that each issue can have only one commit over its entire lifetime.
* Complete the issue's code, tests, CI and review **before** merging whenever safe. If a later regression requires an emergency correction, create a separately identifiable follow-up squash commit (e.g. `fix(SEC-018-R01): ...` in the message, with `SEC-018` scope in the PR title). Do not amend deployed history.
* Use dedicated PRs for cross-cutting release, Android artifact publishing, or tracker housekeeping; link to affected issue IDs in the PR body rather than mixing security fixes in one release commit. Check PR scope manually as well as running the `Security PR issue scope` workflow.
* Main branch settings to be completed by a repository administrator: **enable Squash merging; disable Merge commits and Rebase merging**. Require PR review/CI via branch rules; discourage direct pushes to `main`. The workflow in this PR is advisory until its check is required by a branch rule.
* The workflow only validates *declared* SEC-### issue scope in PR title and commit subjects. It cannot prove that source changes semantically belong to the stated issue or guarantee the merge method.
* Never force-push, rebase, reset, or delete published `main` history merely to make an audit chart look tidy. Published commit SHAs link existing PR evidence, deployed versions, security reviews, and rollback documentation.

## Historical cross-reference (not a rewritten history)

The following is a **representative PR-to-issue index** based on repository PR titles and the issue tracker as of the date above. Some PRs are documentation-only, some contain multiple commits, and some issue IDs have additional direct follow-up commits. It is **not** an exhaustive one-to-one list of every Git object.

| Security finding | Primary historical PR(s) and exceptions |
| --- | --- |
| SEC-001–SEC-003 | Early combined PR [#3](https://github.com/Kondapaneni/HRMS/pull/3); see issue tracker for follow-up remediation evidence |
| SEC-004 | [#4](https://github.com/Kondapaneni/HRMS/pull/4), [#5](https://github.com/Kondapaneni/HRMS/pull/5) |
| SEC-005 | [#6](https://github.com/Kondapaneni/HRMS/pull/6) |
| SEC-006 | [#7](https://github.com/Kondapaneni/HRMS/pull/7), [#8](https://github.com/Kondapaneni/HRMS/pull/8), [#9](https://github.com/Kondapaneni/HRMS/pull/9); separate APK publication PRs |
| SEC-007 | [#17](https://github.com/Kondapaneni/HRMS/pull/17)–[#19](https://github.com/Kondapaneni/HRMS/pull/19) |
| SEC-008 | [#20](https://github.com/Kondapaneni/HRMS/pull/20)–[#25](https://github.com/Kondapaneni/HRMS/pull/25) |
| SEC-009 | [#26](https://github.com/Kondapaneni/HRMS/pull/26)–[#28](https://github.com/Kondapaneni/HRMS/pull/28) |
| SEC-010 | [#29](https://github.com/Kondapaneni/HRMS/pull/29)–[#31](https://github.com/Kondapaneni/HRMS/pull/31) |
| SEC-011 | [#32](https://github.com/Kondapaneni/HRMS/pull/32)–[#34](https://github.com/Kondapaneni/HRMS/pull/34) |
| SEC-012 | [#39](https://github.com/Kondapaneni/HRMS/pull/39)–[#41](https://github.com/Kondapaneni/HRMS/pull/41); substantial intermediate commit history |
| SEC-013 | [#43](https://github.com/Kondapaneni/HRMS/pull/43)–[#45](https://github.com/Kondapaneni/HRMS/pull/45) |
| SEC-014 | [#46](https://github.com/Kondapaneni/HRMS/pull/46), [#47](https://github.com/Kondapaneni/HRMS/pull/47) |
| SEC-015 | [#48](https://github.com/Kondapaneni/HRMS/pull/48), [#49](https://github.com/Kondapaneni/HRMS/pull/49) |
| SEC-016 | [#50](https://github.com/Kondapaneni/HRMS/pull/50), mixed [#51](https://github.com/Kondapaneni/HRMS/pull/51), [#53](https://github.com/Kondapaneni/HRMS/pull/53) |
| SEC-017 | Mixed [#51](https://github.com/Kondapaneni/HRMS/pull/51), then [#54](https://github.com/Kondapaneni/HRMS/pull/54)–[#56](https://github.com/Kondapaneni/HRMS/pull/56) |
| SEC-018 | Mixed [#51](https://github.com/Kondapaneni/HRMS/pull/51), then [#52](https://github.com/Kondapaneni/HRMS/pull/52), [#58](https://github.com/Kondapaneni/HRMS/pull/58)–[#61](https://github.com/Kondapaneni/HRMS/pull/61), rename compatibility [#63](https://github.com/Kondapaneni/HRMS/pull/63). Review [#57](https://github.com/Kondapaneni/HRMS/pull/57)/[#62](https://github.com/Kondapaneni/HRMS/pull/62) separately before any merge; prior accepted unverified backup/restore risk remains unchanged |
| SEC-020 | [#35](https://github.com/Kondapaneni/HRMS/pull/35)–[#38](https://github.com/Kondapaneni/HRMS/pull/38) |

SEC-019 and SEC-021–SEC-024 remain tracked separately; do not mark them fixed from this history cleanup. Historical SEC-016/017/018 changes were deliberately combined in PR #51; this is a policy exception to document, not something a documentation commit can undo.

## Safe adoption checklist

1. Review and merge this policy PR using **Squash and merge**, not a merge commit or rebase merge.
2. In **Settings → General → Pull Requests**, allow **Squash merging** and disable **Merge commits** and **Rebase merging**. This configuration is not changed by the PR.
3. Protect `main` via a branch protection rule/ruleset; require the `Security PR issue scope` status check and the existing build/security CI. This configuration is not changed by the PR.
4. From SEC-019 onward, name the PR `fix(SEC-019): ...`, keep its actual security fix and tests in that PR, and squash merge only after verification. Keep cross-issue references in the PR body, not in its commit subject.
