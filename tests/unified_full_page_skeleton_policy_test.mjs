import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const pages = readdirSync('frontend/src/pages').filter(name => name.endsWith('.jsx'));
assert(pages.length >= 115, 'All HRMS page modules must remain available');

const loader = read('frontend/src/components/PageLoader.jsx');
const shell = read('frontend/src/components/AppShell.jsx');
const auth = read('frontend/src/components/ProtectedRoute.jsx');
const root = read('frontend/src/App.jsx');
const table = read('frontend/src/components/ui/DataTable.jsx');
const member = read('frontend/src/components/MemberDetailsSidebar.jsx');

// All existing PageLoader usages stay mounted behind the same private-data
// authorization/loading conditions, but now produce no visible DOM or animation.
assert.match(loader, /export const PageLoader/);
assert.match(loader, /className="sr-only"/,
  'Keep a screen-reader-only status with no visible loader');
assert.match(loader, /role="status"/);
assert.match(loader, /aria-busy="true"/);
assert.doesNotMatch(loader, /animate-|motion-safe|animate-pulse|animate-spin|shimmer|bg-\[|rounded-|h-\d|grid|space-y-|min-h-/,
  'The shared loader may not contain any visual skeleton blocks or animation');
assert.doesNotMatch(loader, /<div\b|<p\b|<svg\b|<img\b|<canvas\b/,
  'The shared loader has no visual surface');
assert(!existsSync('frontend/src/components/RouteSkeleton.jsx'),
  'Do not restore a separate route skeleton component');
assert(!existsSync('frontend/src/components/ui/Skeleton.jsx'),
  'Do not restore reusable shimmer blocks');
assert.doesNotMatch(read('frontend/src/components/ui/index.js'), /export \{ Skeleton \}/);
assert.doesNotMatch(read('frontend/src/index.css'), /@keyframes shimmer/,
  'Unused shimmer animation must be removed');

assert.match(shell, /<Suspense fallback=\{<PageLoader message="Opening page\.\.\." \/>\}>/,
  'Code-split navigation can wait silently, without a rendered skeleton');
assert.match(root, /<Suspense fallback=\{null\}>/,
  'Keep the existing root splash and access boundaries');
assert.match(auth, /<PageLoader message="Verifying your session\.\.\."/);
assert.match(auth, /<PageLoader message="Verifying your permissions\.\.\."/);
assert.match(table, /if \(isLoading\) return <PageLoader/,
  'Do not render unauthorized or incomplete table data during loading');
assert.match(member, /if \(isLoadingApps && !appsResponse\)/,
  'Member details must remain protected until their fresh request completes');

const uses = pages.filter(name => /<PageLoader\b/.test(read('frontend/src/pages/' + name)));
assert(uses.length >= 90,
  'Existing first-load guards across data-heavy pages must remain in place');
for (const name of uses) {
  const code = read('frontend/src/pages/' + name);
  assert.doesNotMatch(code, /<Skeleton\b|animate-shimmer/,
    'Do not reintroduce visual skeletons: ' + name);
}
assert.match(read('frontend/src/pages/EmployeeMobileCamera.jsx'), /onLoadedMetadata=\{handleVideoLoaded\}/,
  'Camera must remain mounted to receive metadata while loading is invisible');

// Private data and session security are independent of display placeholders.
const remote = read('frontend/src/state/remote.js');
const context = read('frontend/src/contexts/AuthContext.jsx');
assert.match(remote, /gcTime: retention\?\.gcTime \?\? 0/);
assert.match(context, /discardPrivateQueries\(\)/);
console.log('Skeleton-free HRMS page-loading policy PASS:', {
  pageModules: pages.length, protectedPageLoadingBranches: uses.length,
  noVisibleSkeletonUI: true,
});
