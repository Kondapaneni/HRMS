import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// All protected backend routes must declare a role policy, never the old
// new AuthMiddleware() or new AuthMiddleware([], 'feature') fail-open pattern.
const dir = 'backend/public';
const phpFiles = fs.readdirSync(dir).filter(name => name.endsWith('.php'));
let count=0;
for(const file of phpFiles) {
  const src=fs.readFileSync(path.join(dir,file),'utf8');
  for(const m of src.matchAll(/new\s+(?:\\App\\Middleware\\)?AuthMiddleware\s*\(([^)]*)\)/g)){
    const args=m[1].trim();
    assert(!/^\s*(?:\)|$)/.test(args), file+' bare middleware is forbidden');
    assert(!/^\[\s*\]/.test(args), file+' empty roles are forbidden');
    count++;
  }
}
assert(count>50,'all protected PHP route policies should be scanned');

const expected = [
  ['admin_reports_routes.php', "new AuthMiddleware(['admin'])", 4],
  ['admin_performance_routes.php', "new AuthMiddleware(['admin'])", 1],
  ['admin_chatbot_routes.php', "new AuthMiddleware(['admin'])", 1],
  ['employee_assessments_routes.php', "new AuthMiddleware(['employee', 'hr', 'manager'])", 6],
  ['employee_training_routes.php', "new AuthMiddleware(['employee', 'hr', 'manager'])", 3],
  ['employee_performance_routes.php', "new AuthMiddleware(['employee', 'hr', 'manager'])", 1],
  ['employee_chatbot_routes.php', "new AuthMiddleware(['employee', 'hr', 'manager'])", 1],
  ['index.php', "new AuthMiddleware(['admin', 'employee', 'hr', 'manager', 'candidate'])", 4],
  ['mfa_routes.php', "new AuthMiddleware(['admin', 'employee', 'hr', 'manager'])", 5],
  ['origination_loans_dashboard_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], 'loanOrigination')", 1],
  ['origination_loans_leads_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], 'loanOrigination')", 3],
  ['origination_loans_application_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], 'loanOrigination')", 6],
  ['origination_loans_member_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], ['loanOrigination', 'salesOrigination'])", 2],
  ['origination_sales_dashboard_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], 'salesOrigination')", 1],
  ['origination_sales_leads_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], 'salesOrigination')", 1],
  ['origination_activities_routes.php', "new \\App\\Middleware\\AuthMiddleware(['admin'], ['loanOrigination', 'salesOrigination', 'branchOperations'])", 1],
  ['branch_operations_dashboard_routes.php', "new AuthMiddleware(['admin'], 'branchOperations')", 2],
  ['branch_operations_application_routes.php', "new AuthMiddleware(['admin'], 'branchOperations')", 3],
];
for(const [file,signature,number] of expected){
  const src=fs.readFileSync(path.join(dir,file),'utf8');
  assert.equal(src.split(signature).length-1,number, file+' must have '+number+' explicit policies');
}
const middleware=fs.readFileSync('backend/src/Middleware/AuthMiddleware.php','utf8');
assert(middleware.includes("empty($this->requiredRoles)"), 'empty role list must be explicitly rejected');
assert(middleware.includes("in_array($decoded->role, $this->requiredRoles, true)"), 'role match must be strict');
assert(middleware.includes("in_array($decoded->role, ['employee', 'hr', 'manager'], true)"), 'only staff roles may use delegated feature grants');
assert(!middleware.includes('empty($this->requiredRoles) || in_array'), 'old fail-open role clause must be gone');
console.log('SEC-009 '+count+' protected role-policy declarations validated across '+phpFiles.length+' PHP files');
console.log('SEC-009 route policy regression tests PASSED');
