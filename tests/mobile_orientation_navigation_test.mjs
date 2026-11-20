// Regression against a real user-verified, working orientation baseline:
// commit 8136ba4b842a3bea378db9537fe6249430cf3cd8.
// The overlay uses CSS media queries, not JS-driven mounting/unmounting.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');

test('restore the known-good CSS-only rotation visibility without state listeners', () => {
  const overlay = read('frontend/src/components/LandscapeOverlay.jsx');
  assert.match(overlay, /export default function LandscapeOverlay\(\)/);
  assert.match(overlay, /\.orientation-warning\s*\{\s*display:\s*none;/,
    'Portrait default must display:none, removing the full-screen overlay from hit testing');
  assert.match(overlay, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-width:\s*1024px\)/,
    'Only small landscape viewports show the notice');
  assert.match(overlay, /\.orientation-warning\s*\{\s*display:\s*flex;/,
    'Landscape shows the same informational notice');
  assert.match(overlay, /orientation-warning fixed inset-0 z-\[99999\]/,
    'Preserve the working notice design, without mounting a second overlay');
  assert.doesNotMatch(overlay, /useSyncExternalStore|useEffect|useState|subscribeLandscapeWarning|matchMedia\(|window\.addEventListener/,
    'JavaScript orientation event/mount lifecycles are not used in the working version');
  assert.doesNotMatch(overlay, /aria-modal="true"/,
    'The informational notice must not claim a persistent modal dialog');
  assert.doesNotMatch(overlay, /pointer-events-auto/,
    'No persistent pointer-active element should be introduced');
});

test('CSS portrait/landscape rules occur inside the same component stylesheet', () => {
  const src = read('frontend/src/components/LandscapeOverlay.jsx');
  const css = src.match(/<style>\{\`([\s\S]*?)\`\}<\/style>/)?.[1];
  assert(css, 'Working reference used a colocated orientation style element');
  assert.match(css, /\.orientation-warning\s*\{\s*display:\s*none;\s*\}/);
  assert.match(css, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-width:\s*1024px\)\s*\{\s*\.orientation-warning\s*\{\s*display:\s*flex;\s*\}\s*\}/);
  assert(!/opacity:\s*0|visibility:\s*hidden/.test(css),
    'Hiding by display:none is important: opacity-only layers can still block taps');
});

test('do not regress working root scrolling/layout and application access', () => {
  const css = read('frontend/src/index.css');
  const rootRule = css.match(/\/\* ---------- Root and body ---------- \*\/\s*html,\s*body\s*\{([^}]+)\}/)?.[1];
  assert(rootRule, 'Global root CSS must be present');
  assert.match(rootRule, /overflow:\s*hidden/,
    'Keep page scroll inside AppShell, not the browser document');
  const shell = read('frontend/src/components/AppShell.jsx');
  assert.match(shell, /h-\[100dvh\]/, 'Keep dynamic viewport sizing and navigation shell');
  assert.match(shell, /<Suspense fallback=\{<PageLoader message="Opening page\.\.\." \/>\}>/,
    'Do not regress secure silent navigation policy');
});

test('loading captions remain hidden and dashboard data stays progressive', () => {
  const loader = read('frontend/src/components/PageLoader.jsx');
  assert.match(loader, /role="status"/);
  assert.match(loader, /className="sr-only">\{message\}<\/span>/);
  assert.doesNotMatch(loader, /<p[^>]*>\{message\}<\/p>/);
  for (const [name, guard] of [
    ['OriginationLoanDashboard', /if \(isLoading && data === undefined\) return <PageLoader/],
    ['OriginationSaleDashboard', /if \(isLoading && data === undefined\) return <PageLoader/],
    ['OriginationMobileLoanDashboard', /if \(isDashboardLoading && dashboardData === undefined\)/],
    ['OriginationMobileSaleDashboard', /if \(isDashboardLoading && dashboardData === undefined\)/],
  ]) {
    const page = read('frontend/src/pages/' + name + '.jsx');
    assert.match(page, guard, 'Only primary dashboard data gates the skeleton: ' + name);
    assert.doesNotMatch(page, /is(?:Dashboard)?Loading\s*\|\|\s*leadsLoading/);
    assert.doesNotMatch(page, /Loading recent leads\.\.\./);
  }
});

test('no employee or customer records were moved into a shared cache', () => {
  const remote = read('frontend/src/state/remote.js');
  assert.match(remote, /gcTime: retention\?\.gcTime \?\? 0/);
  assert.match(read('frontend/src/query/memoryClient.js'), /memoryQueryClient\.clear\(\)/);
});
