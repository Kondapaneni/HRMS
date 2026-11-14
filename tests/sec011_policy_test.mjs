import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib=readFileSync('backend/src/Security/OriginationAccess.php','utf8');
const loans=readFileSync('backend/public/origination_loans_application_routes.php','utf8');
const branch=readFileSync('backend/public/branch_operations_application_routes.php','utf8');
const activities=readFileSync('backend/public/origination_activities_routes.php','utf8');

assert(lib.includes('created_by = ? AND') && lib.includes('branch = ?'),
  'loan staff scope must bind BOTH creator and branch');
assert(lib.includes('return [\x27\x27, []];'), 'administrator has explicitly declared global scope');
assert(lib.includes('isAdmin('), 'admin global exception must come from JWT role');
assert(lib.includes('duplicateLeadDocumentKeys'), 'duplicated legacy lead document aliases are excluded');
assert(lib.includes('uniqueLeadDocumentKey'), 'ambiguous legacy lead document deletes are excluded');
assert(!lib.includes('$_GET'), 'scope may never trust query-string caller identity');

for (const method of ['post','get','delete','patch']) {
  assert(loans.includes("$app->"+method+"('/api/loans/applications"),
    'expected live loan route: '+method);
}
const sections=loans.split(/\/\*\*[\s\S]*?\*\//).join('\n');
assert((loans.match(/OriginationAccess::findLoan\(/g)||[]).length >= 4,
  'loan drafts, documents and status must find rows in the scoped query');
assert((loans.match(/OriginationAccess::loanScope\(/g)||[]).length >= 4,
  'loan queries and writes must bind current creator/branch in SQL');
assert(loans.includes('DELETE FROM public.loan_applications') &&
  loans.includes('$deleteScope'), 'loan DELETE must use scoped SQL');
assert(loans.includes('if ($updateStmt->rowCount() === 0)'),
  'status update must detect denied or stale rows');

assert(branch.includes('A valid branch employee profile is required'),
  'branch editor must have an employee profile and valid branch');
assert(branch.includes('OriginationAccess::branchScope('),
  'branch lookup and mutation must be row-scoped');
assert(branch.includes('WHERE id = ?\x27 . $branchWhere'),
  'branch UPDATE must repeat scope predicate to prevent races');
assert(!branch.includes("$editorName = 'Branch Officer';"),
  'default fake branch officer identity must not be used on edits');
assert(branch.indexOf('if (!$updatedRecord)') <
  branch.indexOf('// If changes were detected, save ONLY'),
  'audit must be written only after scoped update succeeds');

assert(activities.includes('OriginationAccess::targetEmployeeInBranch('),
  'activity targets must belong to validated current branch');
assert(activities.includes('OriginationAccess::activityBranchPredicate()'),
  'activity reassign must be scoped by current assignee branch');
assert(activities.includes('OriginationAccess::hasBranchGrant('),
  'team reassignment requires Branch Operations feature grant');
assert(activities.includes("return $response->withHeader('Content-Type', 'application/json')->withStatus(403);"),
  'out-of-scope activity action must not proceed');
assert(activities.includes('if ($scope === \x27branch\x27 && (!$canManageTeam || !$userBranch))'),
  'loan/sales staff must not read a branch-wide activity roster');

console.log('SEC-011 row-scope and branch-authorization static regression PASSED');
