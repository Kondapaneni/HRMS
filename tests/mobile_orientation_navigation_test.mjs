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
