import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  isLandscapeWarningActive, subscribeLandscapeWarning, LANDSCAPE_WARNING_QUERY,
} from '../frontend/src/performance/orientationWarning.js';

const read = path => readFileSync(path, 'utf8');
const emitter = () => {
  const events = new Map();
  return {
    addEventListener(event, fn) {
      const handlers = events.get(event) || new Set();
      handlers.add(fn);
      events.set(event, handlers);
    },
    removeEventListener(event, fn) { events.get(event)?.delete(fn); },
    emit(event) { for (const handler of events.get(event) || []) handler(); },
  };
};

test('portrait always removes the overlay even if a WebView media query is stale', () => {
  const media = { matches: true };
  const view = {
    screen: { orientation: { type: 'portrait-primary' } },
    matchMedia: query => { assert.equal(query, LANDSCAPE_WARNING_QUERY); return media; },
    innerWidth: 480,
    innerHeight: 820,
  };
  assert.equal(isLandscapeWarningActive(view), false,
    'Known portrait orientation cannot leave a touch-blocking overlay mounted');
  view.screen.orientation.type = 'landscape-primary';
  assert.equal(isLandscapeWarningActive(view), false,
    'A portrait-shaped viewport also vetoes an outdated landscape event');
  view.innerWidth = 900;
  view.innerHeight = 400;
  assert.equal(isLandscapeWarningActive(view), true,
    'Short-width landscape should show the rotation warning');
  media.matches = false;
  assert.equal(isLandscapeWarningActive(view), false);
});

test('fallback without matchMedia respects portrait and tablets', () => {
  assert.equal(isLandscapeWarningActive(null), false);
  assert.equal(isLandscapeWarningActive({ innerWidth: 400, innerHeight: 900 }), false);
  assert.equal(isLandscapeWarningActive({ innerWidth: 900, innerHeight: 400 }), true);
  assert.equal(isLandscapeWarningActive({ innerWidth: 1400, innerHeight: 750 }), false);
});

test('orientation change, media change and resize notify; cleanup removes all handlers', () => {
  const media = { ...emitter(), matches: true };
  const orientation = { ...emitter(), type: 'landscape-primary' };
  const viewport = emitter();
  const view = {
    ...emitter(),
    screen: { orientation },
    visualViewport: viewport,
    matchMedia: query => { assert.equal(query, LANDSCAPE_WARNING_QUERY); return media; },
    setTimeout(fn) { this.lastDelayed = fn; return 1; },
    clearTimeout() { this.lastDelayed = null; },
  };
  const previous = globalThis.window;
  globalThis.window = view;
  try {
    let updates = 0;
    const remove = subscribeLandscapeWarning(() => { updates += 1; });
    assert.equal(isLandscapeWarningActive(), true);
    orientation.type = 'portrait-primary';
    media.matches = false;
    view.emit('orientationchange');
    assert.equal(isLandscapeWarningActive(), false);
    assert.equal(updates, 1, 'Orientation transition must trigger a React snapshot update');
    view.lastDelayed();
    assert.equal(updates, 2, 'Delayed resnapshot must handle late Android viewport changes');
    media.emit('change');
    view.emit('resize');
    viewport.emit('resize');
    orientation.emit('change');
    assert.equal(updates, 6, 'All viewport/orientation sources should update visibility');
    remove();
    assert.equal(view.lastDelayed, null, 'Unmount must cancel pending resnapshot');
    media.emit('change');
    view.emit('resize');
    orientation.emit('change');
    assert.equal(updates, 6, 'No post-unmount event handlers may remain');
  } finally {
    globalThis.window = previous;
  }
});

test('portrait overlay physically unmounts and loading captions are screen-reader only', () => {
  const overlay = read('frontend/src/components/LandscapeOverlay.jsx');
  const loader = read('frontend/src/components/PageLoader.jsx');
  assert.match(overlay, /useSyncExternalStore\(/);
  assert.match(overlay, /if \(!shouldShow\) return null;/);
  assert.doesNotMatch(overlay, /@media \(orientation:\s*landscape\)/,
    'Do not leave a CSS-hidden fixed layer above active touch controls');
  assert.match(overlay, /z-\[99999\]/);
  assert.match(loader, /className="sr-only">\{message\}<\/span>/);
  assert.doesNotMatch(loader, /<p[^>]*>\{message\}<\/p>/,
    'No visible Loading page caption below the page heading');
});

test('ready dashboard data renders without waiting for the secondary leads API', () => {
  const cases = [
    ['OriginationLoanDashboard', /if \(isLoading && data === undefined\) return <PageLoader/],
    ['OriginationSaleDashboard', /if \(isLoading && data === undefined\) return <PageLoader/],
    ['OriginationMobileLoanDashboard', /if \(isDashboardLoading && dashboardData === undefined\)/],
    ['OriginationMobileSaleDashboard', /if \(isDashboardLoading && dashboardData === undefined\)/],
  ];
  for (const [name, guard] of cases) {
    const src = read('frontend/src/pages/' + name + '.jsx');
    assert.match(src, guard, 'Primary data must own the full-page loading gate: ' + name);
    assert.doesNotMatch(src, /is(?:Dashboard)?Loading\s*\|\|\s*leadsLoading/,
      'Secondary recent leads must not block already-available primary data: ' + name);
    assert.doesNotMatch(src, /Loading recent leads\.\.\./,
      'Do not show partial loading text in a populated dashboard: ' + name);
  }
  const remote = read('frontend/src/state/remote.js');
  assert.match(remote, /gcTime: retention\?\.gcTime \?\? 0/,
    'Protected data must remain fresh and never be reused across unmounts');
  assert.match(read('frontend/src/query/memoryClient.js'), /memoryQueryClient\.clear\(\)/);
});

test('iOS standalone and Android WebView root stays in layout flow after rotation', () => {
  const css = read('frontend/src/index.css');
  const roots = css.match(/\/\* ---------- Root and body ---------- \*\/\s*html,\s*body\s*\{([^}]+)\}/)?.[1];
  assert(roots, 'Global root CSS must be present');
  assert.doesNotMatch(roots, /position:\s*fixed/,
    'A fixed html/body root can strand a stale touch hit-test layer after rotation');
  assert.match(roots, /overflow:\s*hidden/,
    'Keep document scrolling contained; workspace owns the scrollable viewport');
  const root = css.match(/#root\s*\{([^}]+)\}/)?.[1];
  assert.match(root || '', /height:\s*100%/,
    'Keep the React app anchored to the viewport');
  const shell = read('frontend/src/components/AppShell.jsx');
  assert.match(shell, /h-\[100dvh\]/,
    'Workspace must continue to size itself to the dynamic viewport');
});

test('non-interactive orientation hint never intercepts any tap, even when stale', () => {
  const overlay = read('frontend/src/components/LandscapeOverlay.jsx');
  assert.match(overlay, /orientation-warning pointer-events-none fixed inset-0/,
    'The informational overlay must not intercept touches while orientation updates lag');
  assert.match(overlay, /role="status"/,
    'An informational notice cannot claim modal focus/touch authority');
  assert.doesNotMatch(overlay, /aria-modal="true"/);
  assert.doesNotMatch(overlay, /pointer-events-auto/,
    'An overlay descendant must not explicitly reactivate pointer handling');
  assert.match(overlay, /if \(!shouldShow\) return null;/,
    'The notice must unmount completely when portrait is recognized');
});

test('mobile navigation drawer closes on rotation and portrait viewport restoration', () => {
  const shell = read('frontend/src/components/AppShell.jsx');
  assert.match(shell, /window\.addEventListener\('orientationchange', closeOnRotation\)/);
  assert.match(shell, /window\.addEventListener\('resize', onViewportResize\)/);
  assert.match(shell, /window\.visualViewport\?\.addEventListener\('resize', onViewportResize\)/);
  assert.match(shell, /portraitQuery\?\.addEventListener\?\.\('change', closeOnRotation\)/);
  assert.match(shell, /if \(portrait !== lastPortrait\) closeOnRotation\(\)/);
  assert.match(shell, /setIsMobileMenuOpen\(false\)/);
  assert.match(shell, /window\.removeEventListener\('orientationchange', closeOnRotation\)/);
  assert.match(shell, /window\.removeEventListener\('resize', onViewportResize\)/);
  assert.match(shell, /window\.visualViewport\?\.removeEventListener\('resize', onViewportResize\)/);
  assert.match(shell, /portraitQuery\?\.removeEventListener\?\.\('change', closeOnRotation\)/);
});
