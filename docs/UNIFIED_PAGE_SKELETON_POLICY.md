# HRMS page-loading policy — no visual skeletons

**Updated:** November 21, 2026

The previous unified page skeleton is removed from **all HRMS pages**, including dashboards, member details, tables, forms, and code-split routes. No shimmer blocks, fake cards/rows, or animated full-page loading placeholders are rendered.

The existing `PageLoader` import remains as a compatibility and accessibility boundary for previously protected loading branches. Its implementation renders only a visually hidden status for assistive technology. It does **not** paint or occupy layout space. The standalone `RouteSkeleton` and `ui/Skeleton` components and shimmer keyframes have been deleted.

The nested AppShell `Suspense` fallback uses the silent `PageLoader` while a route module is loading, and navigation stays mounted. The root Auth splash and all server-backed data loading/authorization checks remain in place.

**Security remains unchanged:** First-load sensitive remote data must still be fetched for the authorized session. A component must not render previous payroll, loan, member, employee, or attendance records while access is unresolved. Keep in-memory query eviction (`gcTime: 0` by default), session reset, maintenance rules, and locked attendance controls.

Inline operational indicators that convey an actual **user-initiated action** (such as saving a form, camera permission, GPS acquisition, background tracking, or uploading media) are not fake skeleton screens and should remain if necessary for correctness.

CI: `tests/unified_full_page_skeleton_policy_test.mjs` checks that every page can preserve its loading branch without visual skeletons, and `tests/perf_navigation_spinner_policy_test.mjs` checks progressive and secure loading.
