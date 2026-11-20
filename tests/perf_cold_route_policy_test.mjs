import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const read = p => readFileSync(p, 'utf8');
const shell = read('frontend/src/components/AppShell.jsx');
const layout = read('frontend/src/components/AdminLayout.jsx');
const routeWarmup = read('frontend/src/performance/routeWarmup.js');
const app = read('frontend/src/App.jsx');
const dashboard = read('frontend/src/pages/AdminDashboard.jsx');
const charts = read('frontend/src/components/AdminDashboardCharts.jsx');
const recruitment = read('frontend/src/pages/AdminRecruitment.jsx');
const employeeLayout = read('frontend/src/components/EmployeeLayout.jsx');

assert.match(shell, /<Suspense fallback=\{<PageLoader message="Opening page\.\.\." \/>\}>/,
  'First-time route chunks must suspend silently inside AppShell, retaining navigation');
assert.match(shell, /onPointerEnter=\{\(\) => onRouteIntent/,
  'Predictive preload begins from actual navigation intent');
assert.match(shell, /onFocus=\{\(\) => onRouteIntent/,
  'Keyboard navigation can preload routes as well');
assert.match(layout, /refreshControl\.getState\(\['admin', 'dashboard'\]\)\?\.status !== 'success'/,
  'Do not load other route chunks until dashboard data arrives');
assert.match(layout, /profile\?\.role !== 'admin'/,
  'Admin route preloading must require authenticated admin role');
assert.match(routeWarmup, /return preloadRouteModule\(path\)/,
  'Only route code is prefetched; not private API responses');
assert.doesNotMatch(routeWarmup, /api\.get|fetchQuery|prefetchQuery|localStorage|sessionStorage/,
  'Route warmup may not cache or persist private API records');
assert.doesNotMatch(app, /QueryClientProvider/, 'Root must not retain cross-route responses');

for (const p of [
  'frontend/src/pages/AdminPayroll.jsx',
  'frontend/src/pages/EmployeePayroll.jsx',
  'frontend/src/pages/EmployeeMobilePayroll.jsx',
  'frontend/src/pages/AdminEmployeeView.jsx'
]) {
  const src = read(p);
  assert.doesNotMatch(src, /^import .*['"]@react-pdf\/renderer['"];?/m,
    'PDF engine must not be imported at page mount: ' + p);
  assert.doesNotMatch(src, /^import PayslipPDF from/m,
    'Payslip renderer must be deferred until download: ' + p);
  assert.match(src, /import\('@react-pdf\/renderer'\)/,
    'PDF engine must dynamically import on demand: ' + p);
  assert.match(src, /import\('\.\.\/components\/PayslipPDF'\)/,
    'Payslip renderer must dynamically import on demand: ' + p);
}
assert.doesNotMatch(recruitment, /^import .*from ['"]@react-pdf\/renderer['"];?/m,
  'Recruitment must not eagerly import large PDF engine');
assert.match(recruitment, /const OfferLetterPreview = lazy\(/,
  'Recruitment preview must be lazy-loaded only when the studio is opened');
assert.match(recruitment, /import\('@react-pdf\/renderer'\)/,
  'Offer generation still works with the deferred PDF module');
assert.match(employeeLayout, /const EmployeeChatbot = lazy\(/,
  'Employee workspace does not eagerly render all chatbot code');
assert.doesNotMatch(dashboard, /from ['"]recharts['"]/,
  'Admin Dashboard initial page must not require chart engine');
assert.match(dashboard, /lazy\(\(\) => import\('\.\.\/components\/AdminDashboardCharts'\)\)/,
  'Dashboard charts load after KPI shell');
assert.match(charts, /from 'recharts'/,
  'Deferred charts must still support original bar/pie visualization');

if (process.argv.includes('--built')) {
  const js = readdirSync('frontend/dist/assets').filter(p => p.endsWith('.js'));
  const byPrefix = prefix => js.find(p => p.startsWith(prefix + '-'));
  const index = byPrefix('index');
  const pdf = js.find(p => /react-pdf\.browser/.test(p));
  const chart = byPrefix('AdminDashboardCharts');
  assert(index && pdf && chart, 'Production must separate entry, PDF, and dashboard charts');
  const size = p => statSync('frontend/dist/assets/' + p).size;
  assert(size(index) < 600_000, 'Initial JS entry exceeds safe budget');
  assert(size(pdf) > 500_000, 'PDF engine should remain in a deferred large chunk');
  console.log('Cold-route build assets (bytes):', {
    entry: size(index), pdfDeferred: size(pdf), chartDeferred: size(chart),
    jsChunks: js.length,
  });
}
console.log('Cold-route prefetch, deferred PDF/charting and SEC-021 policy PASS');
