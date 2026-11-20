# HRMS UI — one full-page skeleton for all page loading

## Standard
The only supported visible **page-loading** placeholder is
`frontend/src/components/PageLoader.jsx`. It is the existing card/table
skeleton originally used by most Admin/Employee/Candidate pages.
A single theme-aware component, accessibility labels, and large min-height
replace differing spinner pages and custom grey/pulsing placeholder layouts.

Every `AppShell` nested lazy route renders the same `PageLoader` through
`Suspense`. The top-level `App.jsx` Suspense remains `fallback={null}`
to preserve the auth splash and persistent navigation; it must not add
a competing full-screen loader. `RouteSkeleton.jsx` is an adapter for
existing route tests and renders `PageLoader`, not a second skeleton design. ProtectedRoute and Login's existing-session verification
also render this shared loader without revealing previous account data.

## Data-loading coverage
Current inventory: **115 page modules**. **93 modules** render the shared
PageLoader for their initial data/loading states. The remaining **22 modules**
are immediate-render forms, action-only screens, or presentational children
whose parent already guards the fetch; they must not flash a fake skeleton
when nothing is loading. The CI policy inventories all 115 modules explicitly.

When an HRMS page makes its initial authorized `useRemoteData` request,
render `<PageLoader message="Loading …" />` while it waits. This applies
to Admin, Employee, Candidate, Loan Origination, Sales Origination and
Branch Operations dashboards, data lists, applications, activities and
member details (desktop and mobile). Never render data from a previous user
or place a spinner in a table cell as the initial page's loading UI.

The standardized loader is also used in the candidate account activation,
camera-initialization overlay and GPS-acquisition viewport. For camera,
the video element remains mounted behind the skeleton so metadata events
can finish initialization rather than deadlocking the camera.

Shared DataTable loading rows, member-detail sidebar partial shimmer blocks,
assessment-specific skeleton cards, and deferred chart-specific placeholders
have been removed. Deferred chart code retains its KPI-first performance
behavior (no second skeleton type). The prior AppShell route skeleton now
delegates to PageLoader.

A **non-loading** static page (e.g., login form, not-found, coming-soon) must
render its real content normally. Those pages still use the same shared
route-loading boundary whenever a lazy chunk is loading. Do not insert
artificial delays just to force skeletons to appear.

Button-level upload/submit, geolocation rate-limit countdowns, MFA
verification and background tracking are **task/action progress**, not
page-initialization skeletons. Retain necessary action states so users can
see that a payment, login, GPS check, or file upload is still active. Do not
disable or change existing maintenance, auth, location or API behavior.

## Regression guards
`node tests/unified_full_page_skeleton_policy_test.mjs` covers all page modules
and verifies that data-fetching pages use PageLoader, root and nested route
Suspense use the same component, sensitive route gating is preserved, and
the removed custom skeleton families do not regress. The performance and
secure memory-only workflows run it with the existing React Query, route
preload and security regression tests.

This is a source/build consistency check, not a claim that all live loading
flows have been visual-regression-tested with production identities.
