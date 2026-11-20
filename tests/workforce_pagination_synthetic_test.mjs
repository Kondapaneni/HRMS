import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildOrganizationTree } from '../frontend/src/utils/organizationTree.js';

const read = path => readFileSync(path, 'utf8');
const samples = [0, 1, 49, 50, 51, 100, 500, 1000, 2002, 5001];
const makeEmployees = count => Array.from({ length: count }, (_, n) => ({
  id: 'db-' + n, userId: 'login-' + n, employeeId: 'EMP-' + String(n).padStart(5,'0'),
  firstName: n === count - 1 ? 'Final' : 'Employee',
  lastName: String(n), department: n % 3 ? 'Engineering' : 'Finance',
  managerId: n === 0 ? null : 'db-' + Math.floor((n - 1) / 20),
}));
const page = (list, number, size = 50) => {
  const p = Math.max(1, number);
  return { employees: list.slice((p-1)*size, p*size), pagination: {
    page:p, limit:size, total:list.length, totalPages:Math.ceil(list.length/size),
    hasNextPage:p*size<list.length, hasPreviousPage:p>1
  }};
};
function collectAll(list, size = 50) {
  const first = page(list,1,size);
  const all = first.employees.slice();
  for(let n=2;n<=first.pagination.totalPages;n++) all.push(...page(list,n,size).employees);
  return all;
}
function countTree(roots) {
  const visited = new Set();
  const stack = roots.slice();
  while(stack.length) {
    const item = stack.pop();
    assert(!visited.has(item.id),'duplicate organization member: '+item.id);
    visited.add(item.id);
    stack.push(...item.children);
  }
  return visited.size;
}
for(const count of samples) {
  test('synthetic ' + count + '-employee pagination, search and complete hierarchy', () => {
    const population = makeEmployees(count);
    const all = collectAll(population);
    assert.equal(all.length,count);
    assert.equal(new Set(all.map(x=>x.id)).size,count);
    assert.equal(countTree(buildOrganizationTree(all)),count);
    const target = population.at(-1);
    if(target) {
      const needle=target.employeeId;
      const matches=population.filter(x=>x.employeeId.includes(needle));
      assert.equal(matches.length,1,'Full-roster search must reach the final page');
      assert.equal(matches[0].id,target.id);
      assert.equal(page(population,Math.ceil(count/50)).pagination.total,count);
    }
  });
}
test('organization hierarchy rejects cycles and self-parent without dropped nodes', () => {
  const list = [
    {id:'a',employeeId:'EA',managerId:'c'},
    {id:'b',employeeId:'EB',managerId:'a'},
    {id:'c',employeeId:'EC',managerId:'b'},
    {id:'d',employeeId:'ED',managerId:'d'},
    {id:'e',employeeId:'EE',managerId:'missing'},
  ];
  assert.equal(countTree(buildOrganizationTree(list)),list.length);
});
test('bounded API pages keep auth/compensation policy, exact totals and parameterized search', () => {
  const employees = read('backend/public/admin_employees_routes.php');
  assert.match(employees,/min\(100, max\(1,/);
  assert.match(employees,/PDO::PARAM_INT/);
  assert.match(employees,/SELECT COUNT\(\*\) FROM employee/);
  assert.match(employees,/CompensationAccess::allowed/);
  assert.match(employees,/NULL::numeric AS salary/);
  assert.match(employees,/new AuthMiddleware\(\['admin'\]/);
  for (const key of ['hasNextPage','hasPreviousPage','totalPages','page','limit'])
    assert(employees.includes("'"+key+"' =>"));
  const roles = read('frontend/src/pages/AdminFeatureAccess.jsx');
  assert.match(roles,/new Map\(\)/);
  assert.match(roles,/const changes = \[\.\.\.tempSelection\]/);
  assert.doesNotMatch(roles,/new Set\(users\.map/);
  const feature = read('backend/public/admin_feature_access_routes.php');
  assert.match(feature,/featureCounts/);
  assert.match(feature,/delegatedManagers/);
  assert.match(feature,/new AuthMiddleware\(\['admin'\]\)/);
});
test('selectors do not truncate at 200, 500, 1000 or silently select a whole organization', () => {
  const select = read('frontend/src/components/EmployeeSelect.jsx');
  assert.match(select,/page, limit/);
  assert.match(select,/selectedEmployee/);
  const filenames=['AdminPayroll','AdminAttendanceRegularize','AdminAssets','AdminEmployeeEdit','AdminTrainingVideos','AssessmentCreate'];
  for (const file of filenames) {
    const s=read('frontend/src/pages/'+file+'.jsx');
    assert.doesNotMatch(s,/\/admin\/employees\?limit=(?:200|500|1000)\b/,file+' must search full roster');
  }
  const training=read('frontend/src/pages/AdminTrainingVideos.jsx');
  assert.match(training,/Select visible page/);
  const assessment=read('frontend/src/pages/AssessmentCreate.jsx');
  assert.match(assessment,/Select visible page/);
});
test('report aggregates, assessments and recruitment have pagination, not loaded-page totals', () => {
  const reports=read('backend/public/admin_reports_routes.php');
  assert.match(reports,/api\/admin\/reports\/analytics/);
  assert.match(reports,/SELECT COUNT\(\*\) FROM employee/);
  assert.match(read('frontend/src/pages/AdminReports.jsx'),/\/admin\/reports\/analytics/);
  for (const file of ['admin_assessments_routes.php','admin_recruitment_routes.php']) {
    const s=read('backend/public/'+file);
    assert.match(s,/totalPages/);
    assert.match(s,/hasNextPage/);
  }
  const source=read('frontend/src/pages/AdminRecruitment.jsx');
  assert.match(source,/appResponse\?\.stats\?\.totalApplicants/);
  assert.doesNotMatch(source,/const totalApplicants = applications\.length/);
});
console.log('Synthetic workforce pagination and security-source regressions PASS');
