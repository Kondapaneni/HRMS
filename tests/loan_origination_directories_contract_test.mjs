import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { loanLeadListPath } from '../frontend/src/services/loanLeadListPath.js';

const read = p => readFileSync(p, 'utf8');

test('loan lead list and converted members use the full authorized list', () => {
  const prefix = ['origination', 'leads', 'list'];
  assert.equal(loanLeadListPath([...prefix, '']), '/leads/list');
  assert.equal(loanLeadListPath([...prefix, '   ']), '/leads/list');
  assert.equal(loanLeadListPath(undefined), '/leads/list');
  assert.equal(loanLeadListPath(['origination', 'leads', 'recent']), '/leads/list');
  assert.equal(
    loanLeadListPath(['origination', 'leads', 'member-details', '9900123456']),
    '/leads/list',
    'A member phone number must not accidentally become a server search filter',
  );
});

test('directory search uses the current scope safely', () => {
  assert.equal(
    loanLeadListPath(['origination', 'leads', 'list', '  Vijay & Sons / 25%  ']),
    '/leads/list?search=Vijay%20%26%20Sons%20%2F%2025%25',
  );
  assert.equal(
    loanLeadListPath(['origination', 'leads', 'list', 'Raj']),
    '/leads/list?search=Raj',
  );
  assert.equal(
    loanLeadListPath(['unrelated', 'leads', 'list', 'private-value']),
    '/leads/list',
  );
});

test('the shared network service uses the current hook contract and aborts abandoned reads', () => {
  const src = read('frontend/src/services/loanServices.js');
  assert.match(src, /getLeads = async \(\{ scope = \[\], signal \} = \{\}\)/);
  assert.match(src, /api\.get\(loanLeadListPath\(scope\), \{ signal \}\)/);
  const section = src.slice(src.indexOf('export const getLeads ='), src.indexOf('export const updateLeadStatus'));
  assert.doesNotMatch(section, /queryKey/, 'The old queryKey contract must never return');
  assert.match(read('frontend/src/state/remote.js'), /latestOptions\.current\.load\(\{/);
  assert.match(read('frontend/src/state/remote.js'), /signal, scope: latestOptions\.current\.scope/);
  assert.match(read('frontend/src/state/remote.js'), /signal\.aborted/,
    'TanStack Query abort signals must reject abandoned reads');
});

test('both desktop screens and mobile companions load through the repaired service', () => {
  const pages = [
    'OriginationLoanLeadsList',
    'OriginationLoanMembersList',
    'OriginationMobileLoanLeadsList',
    'OriginationMobileLoanMemberList',
    'OriginationLoanDashboard',
    'OriginationMobileLoanDashboard',
  ];
  for (const page of pages) {
    const contents = read('frontend/src/pages/' + page + '.jsx');
    assert.match(contents, /load: getLeads/, page + ' must use the repaired shared service');
  }
  const members = read('frontend/src/pages/OriginationLoanMembersList.jsx');
  assert.match(members, /lead\.status === 'Converted'/, 'Only converted leads appear as members');
});
