import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const paths = [
  'frontend/src/components/MaintenanceOverlay.jsx',
  'frontend/src/components/EmployeeLayout.jsx',
  'frontend/src/components/CandidateLayout.jsx',
  'frontend/src/components/UpdateOverlay.jsx',
];
const contents = paths.map(p => readFileSync(p, 'utf8'));
const legacyFlag = ['dev', 'bypass', 'maintenance', 'session'].join('_');
const exposedPasswordPrefix = ['Acme', 'Dev'].join('');
const exposedPasswordSuffix = '@' + '2026';

for (let i = 0; i < paths.length; i++) {
  assert(!contents[i].includes(legacyFlag),
    paths[i] + ' must never depend on the old localStorage bypass flag');
  assert(!contents[i].includes(exposedPasswordPrefix),
    paths[i] + ' must not ship the exposed hardcoded credential');
  assert(!/onBypassSuccess|isDevBypassed|handleExitBypass|showBypassBtn|handleBypassSubmit/.test(contents[i]),
    paths[i] + ' must not contain developer unlock state or callbacks');
}
assert(!/password|Developer authentication|Developer bypass|setItem/.test(contents[0]),
  'maintenance dialog must contain refresh only, not a password or secret click sequence');
assert(contents[1].includes('const showMaintenanceOverlay = isMaintenanceMode;'),
  'employee cannot dismiss maintenance via a browser bypass flag');
assert(contents[2].includes('const showMaintenanceOverlay = isMaintenanceMode;'),
  'candidate cannot dismiss maintenance via a browser bypass flag');
assert(contents[3].includes('updateAvailable && !isMaintenanceMode && !isAssessmentActive'),
  'version overlay cannot be enabled through the removed developer flag');

const middleware = readFileSync('backend/src/Middleware/MaintenanceMiddleware.php', 'utf8');
const bootstrap = readFileSync('backend/public/index.php', 'utf8');
const settingsRoutes = readFileSync('backend/public/admin_settings_routes.php', 'utf8');
assert(bootstrap.includes('$app->add(new \\App\\Middleware\\MaintenanceMiddleware());'),
  'global maintenance middleware is installed by the PHP API router');
assert(middleware.includes('SELECT maintenance_mode FROM public.global_settings'),
  'maintenance status is loaded from live server database');
assert(middleware.includes('SELECT role, "isActive" FROM public.users'),
  'admin bypass requires live, active, database-verified role');
assert(middleware.includes("($claims->role ?? null) !== 'admin'"),
  'admin session claim must match admin role');
assert(middleware.includes("isset($claims->type) && $claims->type !== 'session'"),
  'pending MFA or other token types cannot override maintenance');
assert(middleware.includes('new Key($secret, \'HS256\')'),
  'admin session signature must be validated');
assert(middleware.includes('->withStatus(503)'),
  'non-admin protected APIs must return service unavailable during maintenance');
assert(middleware.includes('Cache-Control'),
  'maintenance failure response must disable caching');
assert(settingsRoutes.includes("new AuthMiddleware(['admin'])"),
  'Admin Settings routes remain protected by normal role middleware');
assert(bootstrap.includes('MaintenanceMiddleware::enabled('),
  'public status flag uses safe PostgreSQL boolean interpretation');
assert(!bootstrap.includes('dev_bypass_maintenance_session'),
  'backend never reads browser bypass flag');

if (process.argv.includes('--built')) {
  const assetJs = readdirSync('frontend/dist/assets')
    .filter(path => path.endsWith('.js'))
    .map(path => readFileSync('frontend/dist/assets/' + path, 'utf8'))
    .join('\n');
  assert(!assetJs.includes(exposedPasswordPrefix),
    'production JS bundle must not contain legacy developer password prefix');
  assert(!assetJs.includes(exposedPasswordSuffix),
    'production JS bundle must not contain legacy developer credential suffix');
  assert(!assetJs.includes(legacyFlag),
    'production JS bundle must never contain the old maintenance bypass storage key');
  assert(!assetJs.includes('Developer bypass'),
    'production JS bundle must not include developer bypass UI');
}
console.log('SEC-020 backend policy, frontend bypass removal and optional built-bundle checks PASSED');
