import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const backend = readFileSync('backend/public/admin_feature_access_routes.php', 'utf8');
const frontend = readFileSync('frontend/src/pages/AdminFeatureAccess.jsx', 'utf8');
const pagination = readFileSync('frontend/src/components/ui/PaginationControls.jsx', 'utf8');

test('global manager previews do not depend on the first 50 roster rows', () => {
  assert.match(backend, /featurePreviews/);
  assert.match(backend, /ROW_NUMBER\(\) OVER\s*\(\s*PARTITION BY permissions\.feature/);
  assert.match(backend, /CROSS JOIN LATERAL \(VALUES/);
  assert.match(backend, /WHERE ranked\.position <= 3/);
  assert.match(backend, /WHERE u\.role != \\'admin\\' AND permissions\.granted IS TRUE/);
  assert.match(backend, /array_fill_keys\(\$featureColumns, \[\]\)/);
  assert.match(backend, /'featurePreviews' => \$featurePreviews/);
  const section = backend.slice(backend.indexOf('$previewSql ='), backend.indexOf('// Map nulls to false'));
  assert.doesNotMatch(section, /\$limit|\$offset|\$search|\$params\[/,
    'Global preview must never be limited or filtered by a roster page');
  assert.doesNotMatch(section, /email|salary|phone|address/,
    'Preview response must expose only the minimal identity required for display');
});

test('feature table restores compact avatar and name chips plus true full-directory count', () => {
  assert.match(frontend, /summaryResponse\?\.featurePreviews\?\.\[feature\.key\]/);
  assert.match(frontend, /assignedUsers\.map\(u =>/);
  assert.match(frontend, /<Avatar name=/);
  assert.match(frontend, /No managers assigned/);
  assert.match(frontend, /assignedCount > assignedUsers\.length/);
  assert.match(frontend, /Manage \(\{assignedCount\}\)/);
  assert.match(frontend, /whitespace-nowrap truncate max-w-/);
  assert.doesNotMatch(frontend, /const assignedUsers = users\.filter/,
    'Showing staff from the first page only would regress the 2002-person fix');
});

test('permission drawer keeps individual assignment and Save without bulk controls', () => {
  const start = frontend.indexOf('{/* Search and Toggles */}');
  const end = frontend.indexOf('{/* User Checklist */}', start);
  const searchSection = frontend.slice(start, end);
  assert(start >= 0 && end > start);
  assert.match(searchSection, /<SearchBar/);
  assert.doesNotMatch(searchSection, /explicit unsaved change\(s\)|Select visible page|Deselect visible page/);
  assert.doesNotMatch(frontend, /setVisiblePageSelection/);
  assert.match(frontend, /onClick=\{\(\) => handleToggleUser\(u\)\}/);
  assert.match(frontend, /onClick=\{handleSaveModal\}/);
});

test('summary remains stable while searching or paging the assignment drawer', () => {
  assert.match(frontend, /scope: \['admin', 'feature-access', 'summary'\]/);
  assert.match(frontend, /params: \{ view: 'summary' \}/);
  assert.match(frontend, /scope: \['admin', 'feature-access', 'directory', selectedFeature\?\.key/);
  assert.match(frontend, /view: 'directory', page, limit, search: debouncedModalSearch/);
  assert.match(frontend, /const featureCounts = summaryResponse\?\.featureCounts \|\| \{\}/);
  assert.match(frontend, /const delegatedManagers = Number\(summaryResponse\?\.delegatedManagers/);
  assert.match(backend, /\$view = \(string\)\(\$params\['view'\] \?\? 'all'\)/);
  assert.match(backend, /if \(\$view !== 'summary'\)/);
  assert.match(backend, /if \(\$view !== 'directory'\)/);
  assert.doesNotMatch(frontend, /featureResponse\?\.featureCounts/);
});

test('returning from another browser tab does not restart the feature directory', () => {
  assert.equal((frontend.match(/reloadOnFocus: false/g) || []).length, 2);
  assert.doesNotMatch(frontend, /Updating directory/);
  assert.match(frontend, /directoryLoading \? \(/);
  assert.match(frontend, /directoryError \? \(/);
});

test('the drawer keeps pagination anchored and restores top-of-list on page change', () => {
  assert.match(frontend, /staffScrollRef\.current\.scrollTop = 0/);
  assert.match(frontend, /\[selectedFeature\?\.key, page, debouncedModalSearch\]/);
  assert.match(frontend, /max-w-md h-full min-h-0/);
  assert.match(frontend, /ref=\{staffScrollRef\} className="p-4 min-h-0 overflow-y-auto flex-1/);
  assert.match(frontend, /className="shrink-0">\s*<PaginationControls/);
});

test('only allowlisted manager columns sort assigned staff before LIMIT/OFFSET', () => {
  assert.match(backend, /\$sortFeature = \(string\)\(\$params\['assignedFirstFeature'\] \?\? ''\)/);
  assert.match(backend, /!in_array\(\$sortFeature, \$featureColumns, true\)/);
  assert.match(backend, /'CASE WHEN fa\."' \. \$sortFeature \. '" IS TRUE THEN 0 ELSE 1 END ASC, '/);
  const order = backend.indexOf('ORDER BY {$assignmentOrder}');
  const limit = backend.indexOf('LIMIT ? OFFSET ?', order);
  assert(order > 0 && limit > order, 'Assigned-first sort must precede server pagination');
  assert.match(backend, /u\.id ASC/);
  assert.match(frontend, /assignedFirstFeature: selectedFeature\.key/);
});

test('drawer pagination is a single row regardless of page-label length', () => {
  assert.match(frontend, /onPageChange=\{setPage\} compact/);
  assert.match(pagination, /isFetching = false, compact = false/);
  const compactSection = pagination.slice(pagination.indexOf('className={compact'), pagination.indexOf('aria-label="Directory pagination"'));
  assert.match(compactSection, /flex flex-nowrap/);
  assert.match(compactSection, /overflow-x-auto whitespace-nowrap/);
  assert.doesNotMatch(compactSection.split(':')[0], /flex-wrap(?!\s*-)/);
  assert.match(pagination, /flex shrink-0 items-center/);
  assert.match(pagination, /Showing \$\{start\}–\$\{end\} \/ \$\{safeTotal.toLocaleString/);
  assert.match(pagination, /disabled=\{page <= 1 \|\| isFetching\}/);
  assert.match(pagination, /disabled=\{page >= totalPages \|\| isFetching\}/);
});

test('compact pagination buttons use pointer hover and press feedback like drawer actions', () => {
  const previous = pagination.slice(pagination.indexOf('Previous') - 500, pagination.indexOf('Previous'));
  const next = pagination.slice(pagination.indexOf('Next') - 500, pagination.indexOf('Next'));
  for (const button of [previous, next]) {
    assert.match(button, /cursor-pointer/);
    assert.match(button, /transition-all duration-150/);
    assert.match(button, /hover:bg-\[var\(--surface-alt\)\]/);
    assert.match(button, /active:scale-95/);
    assert.match(button, /disabled:cursor-not-allowed/);
    assert.match(button, /disabled:active:scale-100/);
  }
  assert.match(previous, /disabled=\{page <= 1 \|\| isFetching\}/);
  assert.match(next, /disabled=\{page >= totalPages \|\| isFetching\}/);
  assert.match(previous, /onClick=\{\(\) => onPageChange\(Math.max\(1, page - 1\)\)\}/);
  assert.match(next, /onClick=\{\(\) => onPageChange\(Math.min\(totalPages, page \+ 1\)\)\}/);
});

console.log('Feature Access summary, assigned ordering and single-row drawer pagination PASS');
