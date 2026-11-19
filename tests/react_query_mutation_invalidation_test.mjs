import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = name => readFileSync('frontend/src/pages/' + name + '.jsx', 'utf8');
const component = name => readFileSync('frontend/src/components/' + name + '.jsx', 'utf8');
const occurrences = (source, text) => source.split(text).length - 1;
const requireKey = (source, key, context) => {
  assert(source.includes("queryClient.invalidateQueries({ queryKey: " + key + " });"),
    context + ' must invalidate ' + key + ' after a successful write');
};

for (const name of ['EmployeeLeaves', 'EmployeeMobileLeaves', 'ApplyMobileLeave']) {
  const source = page(name);
  requireKey(source, "['employee', 'leaves']", name);
  requireKey(source, "['employee', 'dashboard']", name);
}
for (const name of ['EmployeeExpenses', 'EmployeeMobileExpenses']) {
  const source = page(name);
  requireKey(source, "['employee', 'expenses']", name);
  requireKey(source, "['employee', 'dashboard']", name);
}
for (const name of ['EditProfile', 'EditMobileProfile', 'EmployeeMobileProfile']) {
  const source = page(name);
  requireKey(source, "['employee', 'profile']", name);
  requireKey(source, "['employee', 'dashboard']", name);
}
for (const name of ['EmployeeDashboard', 'EmployeeAttendance']) {
  const source = page(name);
  requireKey(source, "['employee', 'attendance']", name);
  requireKey(source, "['employee', 'dashboard']", name);
}
for (const [name, resource] of [
  ['AdminPayroll', "['admin', 'payroll']"],
  ['AdminExpenses', "['admin', 'expenses']"],
  ['AdminLeaves', "['admin', 'leaves']"],
  ['AdminAttendanceRegularize', "['admin', 'attendance']"],
]) {
  const source = page(name);
  requireKey(source, resource, name);
  requireKey(source, "['admin', 'dashboard']", name);
}
for (const name of ['AdminEmployeeEdit', 'AdminEmployeeView', 'AdminRecruitment']) {
  const source = page(name);
  requireKey(source, "['admin', 'employees']", name);
  requireKey(source, "['admin', 'employees-dropdown']", name);
}
for (const name of ['AdminTrainingVideos']) {
  const source = page(name);
  requireKey(source, "['admin', 'trainingVideos']", name);
  requireKey(source, "['employee', 'trainingVideos']", name);
}
assert(occurrences(page('AdminHolidays'), "queryClient.invalidateQueries({ queryKey: ['employee', 'holidays'] });") >= 2,
  'Creating and deleting holidays must both invalidate employee holiday caches');
assert(occurrences(page('AdminAssets'), "queryClient.invalidateQueries({ queryKey: ['employee', 'profile'] });") >= 3,
  'Asset writes must refresh employee profile assignment details');
assert(occurrences(page('AdminAttendanceConfig'), "queryClient.invalidateQueries({ queryKey: ['employee', 'geofences'] });") >= 3,
  'Geofence mutations must expire cached geofence configuration');
assert(page('CandidateProfile').includes('candidateQueryKeys.sidebarBase'),
  'Candidate profile updates must invalidate sidebar and full-profile views');
assert(component('LeadDetailsSidebar').includes("queryClient.invalidateQueries({ queryKey: ['leadsDashboard'] });"),
  'Loan lead status changes must invalidate related origination dashboard');
assert(component('AddLeadSidebar').includes("queryClient.invalidateQueries({ queryKey: ['salesDashboard'] });"),
  'Sales lead additions must invalidate sales dashboard');

console.log('React Query Phase 3 targeted mutation invalidations PASS');
