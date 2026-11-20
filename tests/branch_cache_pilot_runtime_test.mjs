import assert from 'node:assert/strict';
import { test } from 'node:test';
import { branchesKey, discardPrivateQueries, memoryQueryClient } from '../frontend/src/query/memoryClient.js';

const alice = { id: 'account-a', role: 'admin', organizationId: 'org-1', branchId: 'branch-1' };
const bob = { id: 'account-b', role: 'admin', organizationId: 'org-1', branchId: 'branch-1' };

test('branch list is reused only within the same verified user scope', async () => {
  discardPrivateQueries();
  assert.notDeepEqual(branchesKey(alice), branchesKey(bob));
  let requests = 0;
  const aliceOptions = {
    queryKey: branchesKey(alice),
    queryFn: async () => { requests++; return [{ id: 'branch-1', name: 'Branch One' }]; },
    staleTime: 300_000,
    gcTime: 300_000,
  };
  const first = await memoryQueryClient.fetchQuery(aliceOptions);
  const revisit = await memoryQueryClient.fetchQuery(aliceOptions);
  assert.equal(requests, 1, 'In-memory repeat navigation uses one authorized fetch');
  assert.deepEqual(revisit, first);
  assert.equal(memoryQueryClient.getQueryData(branchesKey(bob)), undefined);
  await memoryQueryClient.fetchQuery({
    queryKey: branchesKey(bob),
    queryFn: async () => [{ id: 'branch-2', name: 'Different Branch' }],
    staleTime: 300_000,
    gcTime: 300_000,
  });
  assert.equal(memoryQueryClient.getQueryData(branchesKey(alice))?.[0].name, 'Branch One');
  assert.equal(memoryQueryClient.getQueryData(branchesKey(bob))?.[0].name, 'Different Branch');
  discardPrivateQueries();
  assert.equal(memoryQueryClient.getQueryData(branchesKey(alice)), undefined);
  assert.equal(memoryQueryClient.getQueryData(branchesKey(bob)), undefined);
});

test('targeted invalidation requires the branch directory to be fetched again', async () => {
  discardPrivateQueries();
  let calls = 0;
  const options = {
    queryKey: branchesKey(alice),
    queryFn: async () => [{ id: String(++calls), name: 'Updated' }],
    staleTime: 300_000,
    gcTime: 300_000,
  };
  await memoryQueryClient.fetchQuery(options);
  await memoryQueryClient.invalidateQueries({ queryKey: branchesKey(alice), refetchType: 'none' });
  await memoryQueryClient.fetchQuery(options);
  assert.equal(calls, 2, 'Invalidated branch cache never substitutes old data');
  discardPrivateQueries();
});

test('the memory query cache starts empty and retains nothing after account reset', () => {
  assert.equal(memoryQueryClient.getQueryCache().getAll().length, 0);
  assert.equal(memoryQueryClient.getDefaultOptions().queries.gcTime, 0,
    'Future protected endpoints must opt in to retention individually');
});
