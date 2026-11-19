import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const path = file => 'frontend/src/pages/' + file + '.jsx';
const options = read('frontend/src/queries/employeeQueries.js');
const dashboard = read('frontend/src/performance/dashboardBoot.js');
const candidateKeys = read('frontend/src/queries/candidateQueryKeys.js');

assert.match(options, /import \{ queryOptions \} from '@tanstack\/react-query'/,
  'Shared queries must use TanStack Query v5 queryOptions');
assert.match(options, /requireList\([\s\S]*?throw new Error/,
  'Malformed API list responses must not be cached as successful empty data');
assert.match(options, /signal \}\)\)/,
  'Shared query functions must forward cancellation signals to Axios');

for (const [desktop, mobile, resource] of [
  ['EmployeeAttendance', 'EmployeeMobileAttendance', 'attendance(selectedMonth)'],
  ['EmployeeLeaves', 'EmployeeMobileLeaves', 'leaves()'],
  ['EmployeePayroll', 'EmployeeMobilePayroll', 'payroll()'],
  ['EmployeeExpenses', 'EmployeeMobileExpenses', 'expenses()'],
  ['EmployeeProfile', 'EmployeeMobileProfile', 'profile()'],
  ['EmployeePerformance', 'EmployeeMobilePerformance', 'performance()'],
  ['EmployeeTrainingVideos', 'EmployeeMobileTrainingVideos', 'trainingVideos()'],
]) {
  for (const page of [desktop, mobile]) {
    assert(read(path(page)).includes('employeeQueryOptions.' + resource),
      page + ' must share the canonical ' + resource + ' query and freshness policy');
  }
}
assert(read(path('EmployeeHolidays')).includes('employeeQueryOptions.holidays(monthStr)'),
  'Monthly desktop holiday requests must keep their month-scoped cache');
assert(read(path('EmployeeMobileHolidays')).includes('employeeQueryOptions.holidays()'),
  'Unfiltered mobile holidays must use a distinct cache entry');
assert(options.includes("holidays: month => month ? ['employee', 'holidays', month] : ['employee', 'holidays']"),
  'Different holiday API parameters must not share a cache key');

for (const page of ['EmployeeAssessments', 'EmployeeLayout']) {
  const source = page === 'EmployeeLayout'
    ? read('frontend/src/components/EmployeeLayout.jsx') : read(path(page));
  assert(source.includes('employeeQueryOptions.assessments(todayStr)'),
    page + ' must reuse one day-scoped assessment query');
  assert.doesNotMatch(source, /employeeAssessmentsList|employeeTrainingVideosList/,
    page + ': obsolete alternate list keys should not duplicate requests');
}
assert(read('frontend/src/components/EmployeeLayout.jsx').includes('employeeQueryOptions.trainingVideos()'),
  'Sidebar training navigation must share the training-page cache');
assert(read(path('EmployeeMobileBirthdays')).includes('employeeQueryOptions.birthdays()'),
  'Mobile birthdays must share the dashboard cache');
assert(read(path('EmployeeMobileDashboard')).includes('employeeQueryOptions.mapsRateLimit()'),
  'Mobile maps rate-limiting must share its canonical API query');

assert(candidateKeys.includes("['candidate', 'sidebarProfile', candidateId]"));
assert(candidateKeys.includes("['candidate', 'profile', candidateId]"));
assert(read('frontend/src/components/CandidateLayout.jsx').includes('candidateQueryKeys.sidebar(profile?.id)'));
assert(read(path('CandidateProfile')).includes('candidateQueryKeys.profile(profile?.id)'),
  'Partial sidebar Supabase rows must never overwrite full API candidate profiles');
assert(read('frontend/src/components/CandidateLayout.jsx').includes('if (error) throw error'),
  'Supabase sidebar failures must not be cached as valid null profiles');

const candidateOptions = read('frontend/src/queries/candidateQueries.js');
assert(candidateKeys.includes("['candidate', 'applications', candidateId]"),
  'Candidate applications must be keyed to verified account ID');
assert(candidateKeys.includes("['candidate', 'jobs', candidateId]"),
  'Candidate jobs cache must not mix account-scoped results');
for (const resource of ['profile', 'applications', 'jobs']) {
  assert(candidateOptions.includes(resource + ': candidateId => queryOptions('),
    'Shared candidate query must define ' + resource);
  assert(read(path('CandidateDashboard')).includes('candidateQueryOptions.' + resource + '(profile?.id)'),
    'Candidate dashboard must reuse ' + resource + ' query');
}
assert(read(path('CandidateJobs')).includes('candidateQueryOptions.profile(profile?.id)'),
  'Candidate jobs must reuse canonical full profile');
assert(read(path('CandidateJobs')).includes('client.fetchQuery(candidateQueryOptions.jobs(profile?.id))'),
  'Candidate jobs page must reuse cached jobs rather than reissuing GET');
assert(read(path('CandidateApplications')).includes('select: selectCandidateApplicationCards'),
  'Applications page must transform only its observer without replacing raw cached records');
assert(candidateOptions.includes('[...app.application_timeline].sort('),
  'Candidate application mapping must not mutate cached timeline arrays');
assert.doesNotMatch(read(path('CandidateDashboard')), /\.catch\(\(\) => \(\{ data:/,
  'Candidate dashboard must not silently translate API errors into empty data');
assert(read(path('CandidateDashboard')).includes('dashboardError'),
  'Candidate dashboard must display critical failed queries');

assert.match(dashboard, /Promise\.allSettled/,
  'Independent optional dashboard panels must not block essential data');
assert.match(dashboard, /client\.fetchQuery\(options\)/,
  'Landing dashboard must reuse fresh canonical resource cache entries');
for (const resource of ['attendanceAll', 'leaves', 'performance', 'profile', 'payroll',
  'mapsRateLimit', 'holidays', 'expenses', 'birthdays']) {
  assert(dashboard.includes('employeeQueryOptions.' + resource + '('),
    'Dashboard must share ' + resource + ' with the rest of the employee application');
}
assert.doesNotMatch(dashboard, /\.catch\(\(\) => \(\{\s*data:/,
  'Dashboard must not turn 401/403/5xx into successful empty data');
assert(dashboard.includes("['attendance', 'leaves', 'profile'].includes(name)"),
  'Essential attendance, leave and profile errors must fail the dashboard query');
assert(dashboard.includes('resourceErrors.push(name)'),
  'Optional failures must be recorded as unavailable instead of empty success');
for (const page of ['EmployeeDashboard', 'EmployeeMobileDashboard']) {
  const src = read(path(page));
  assert(src.includes('dashboardData?.resourceErrors?.length > 0'),
    page + ': optional dashboard errors must be visible');
  assert(src.includes('retryDashboard()'),
    page + ': failed core dashboard fetch must offer retry');
}
assert.match(read('frontend/src/performance/dashboardBoot.js'), /MIN_SPLASH_MS = 3000/,
  'Three-second secure splash must remain unchanged');
assert.match(read('frontend/src/contexts/AuthContext.jsx'), /queryClient\.clear\(\)/,
  'Account/logout must clear the private in-memory query cache');
console.log('React Query Phase 2/4 shared cache, failure handling and security guards PASS');
