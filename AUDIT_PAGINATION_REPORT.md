# HRMS complete employee lists and pagination — audit and implementation tracker

**Base:** `main` at `bb09dc07286515f09e041b62f9a655d3dc2b2792`. **Change branch:** `fix/full-directory-pagination-20261120`. **PR:** #113 (DRAFT). **Production DB count:** not independently verified. The 2,002-employee figure is a test hypothesis, not a known fact.

## Root cause
Many backend routes paginate by default (`limit=50` or `100`), while older React screens read only the first array and label its `.length` as the full population. Several employee pickers ask for `limit=200/500/1000`, silently lose later employees, and some bulk actions interpreted a partial list as a global selection. Reports' SQL returns 100 detailed rows while charts reduce that partial array.

## Module remediation

| Module | Original defect | Work on branch |
| --- | --- | --- |
| Admin Employees | Only first 50 displayed, `employees.length` mislabeled total | Bounded pageable API, broader server search and filters, actual counts and UI pagination |
| Organization directory | `limit=1000`, missing hierarchy members, cycles | Fetch bounded pages, deduplicate and construct cycle-safe reporting tree; verify exact row count |
| Admin Performance | First 100 selectable, selected person resets when search changes | Server-side pageable employee roster, actual total, preserve selection |
| Feature Access | 50-user first page, incomplete role counts, dangerous Select All | Searchable 50-user pages; global SQL role counts; only explicitly toggled employee permissions are submitted |
| Assets assignment | `limit=200` | Server-side search and page controls inside assignment modal |
| Payroll and Attendance Regularization | `limit=500` picker | Shared server-side searchable EmployeeSelect with selected-record resolution |
| Manager selection | `limit=500` | Searchable paged directory, existing manager preserved during typing, self-reference hidden; DB cycle validation remains separate |
| Training videos | Video first 50; assignment roster first 1000 | Bounded video pages/search, SQL aggregate stats; assignment pages and explicit page-only bulk toggles |
| Assessment creation | Employee list default 50; question list default 50 | Searchable employee and question paging; preserve selections across pages |
| Assessments and question bank | First 50 and page-length statistics | Server-side search/paging, backend aggregate counts for all matching records |
| Assessment results | First 50 attempts, page-length statistics | Search and filters in backend, global SQL statistics, paged results; pageable assessment filter choices |
| Recruitment | Job, application, candidate, profile and document first 50; partial pipeline counts | Bounded list metadata; global application stats and server filters; per-page candidate details fetched with application rows; paged jobs and applicants |
| Admin Reports | Charts and workforce KPI from first 100 detailed records | Full authorized SQL aggregates from new endpoint; CSV exports unchanged |
| Employee and mobile screens | May have additional fixed caps | Further evidence-based audit is required; employee APIs remain self/branch scoped |

## Verification and residual risks
- Synthetic test suite enumerates 0, 1, 49, 50, 51, 100, 500, 1000, 2002 and 5001, verifies lossless page traversal, final-page search, no duplicate organization nodes, and cycle handling.
- No actual Supabase/Render employee records are created or edited to test counts.
- Authenticated, read-only owner verification must check exact count from `/api/admin/employees?page=1&limit=50` response `pagination.total`, both search and page 41, cross-page selectors, organization hierarchy, report aggregate accuracy, role isolation, and employee/mobile views.
- SQL search is parameterized; backend access checks and restricted salary projections stay in place.
- Rollback: revert the merged PR if later authorized; do not run destructive schema or data migrations.
- **DRAFT: no merge, deployment, maintenance mode, APK or data changes** without explicit approval.
