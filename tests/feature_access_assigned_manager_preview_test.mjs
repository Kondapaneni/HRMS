import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const backend = readFileSync('backend/public/admin_feature_access_routes.php', 'utf8');
const frontend = readFileSync('frontend/src/pages/AdminFeatureAccess.jsx', 'utf8');

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
  assert.match(frontend, /featureResponse\?\.featurePreviews\?\.\[feature\.key\]/);
  assert.match(frontend, /assignedUsers\.map\(u =>/);
  assert.match(frontend, /<Avatar name=/);
  assert.match(frontend, /No managers assigned/);
  assert.match(frontend, /assignedCount > assignedUsers\.length/);
  assert.match(frontend, /Manage \(\{assignedCount\}\)/);
  assert.match(frontend, /whitespace-nowrap truncate max-w-/);
  assert.doesNotMatch(frontend, /const assignedUsers = users\.filter/,
    'Showing staff from the first page only would regress the 2002-person fix');
});

test('permission drawer labels fit as single-line controls', () => {
  const start = frontend.indexOf('explicit unsaved change(s)');
  const end = frontend.indexOf('{/* User Checklist */}', start);
  const toolbar = frontend.slice(start, end);
  assert(start > 0 && end > start);
  assert.match(toolbar, /whitespace-nowrap/);
  assert.match(toolbar, /flex-nowrap/);
  assert.match(toolbar, /Select visible page/);
  assert.match(toolbar, /Deselect visible page/);
  assert.match(toolbar, /shrink-0 whitespace-nowrap/g);
  assert.match(toolbar, /disabled=\{isFetching \|\| Boolean\(directoryError\) \|\| saving\}/);
});

console.log('Feature Access manager previews and non-wrapping drawer controls PASS');
