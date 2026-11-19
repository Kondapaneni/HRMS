import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

// Synthetic network-free measurement of TanStack's cache semantics.
// Not a claim about real HRMS latency, database throughput or production
// request counts. This tests the policies used by the application.
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 60_000, gcTime: 5 * 60_000 },
  },
});
let requests = 0;
const query = (search, limit = 50) => ({
  queryKey: ['admin', 'employees', { search, limit }],
  staleTime: 60_000,
  queryFn: async () => {
    requests += 1;
    await Promise.resolve();
    return [{ id: String(requests), search, limit }];
  },
});

try {
  // Two components request identical data simultaneously.
  const [one, two] = await Promise.all([
    client.fetchQuery(query('', 50)),
    client.fetchQuery(query('', 50)),
  ]);
  assert.deepEqual(one, two, 'Concurrent identical queries must share the request');
  assert.equal(requests, 1, 'Concurrent deduplication: two consumers, one fetch');

  // Warm navigation within freshness policy is a cache hit.
  await client.fetchQuery(query('', 50));
  assert.equal(requests, 1, 'Warm navigation must not refetch a fresh resource');

  // Different request parameters have separate keys/cache data.
  await client.fetchQuery(query('', 100));
  assert.equal(requests, 2, 'Different row limits require separate cached data');
  const beforeInvalidation = client.getQueryData(['admin', 'employees', { search: '', limit: 100 }]);
  assert.equal(beforeInvalidation[0].limit, 100);

  // Targeted mutation invalidation causes only the matching 50-row key to refetch.
  await client.invalidateQueries({ queryKey: ['admin', 'employees', { search: '', limit: 50 }], exact: true });
  await client.fetchQuery(query('', 50));
  assert.equal(requests, 3, 'Invalidated query should fetch fresh data');
  await client.fetchQuery(query('', 100));
  assert.equal(requests, 3, 'Unrelated 100-row cache should remain fresh');

  // A failed request must retain the error state, not a successful empty list.
  await assert.rejects(() => client.fetchQuery({
    queryKey: ['employee', 'payroll', 'synthetic-error'],
    retry: false,
    queryFn: () => Promise.reject(Object.assign(new Error('Synthetic 403'), { status: 403 })),
  }));
  assert.equal(client.getQueryState(['employee', 'payroll', 'synthetic-error'])?.status, 'error');

  // Account changes/logout purge private cache.
  client.clear();
  assert.equal(client.getQueryData(['admin', 'employees', { search: '', limit: 50 }]), undefined);

  console.log(JSON.stringify({
    test: 'Synthetic React Query v5 cache measurement',
    identicalConsumers: 2,
    concurrentRequests: 1,
    warmNavigations: 1,
    warmAdditionalRequests: 0,
    parameterizedListRequests: 2,
    targetedInvalidationTotalRequests: 3,
    privateCacheCleared: true,
    realBrowserPerformanceMeasured: false,
    outcome: 'PASS',
  }));
} finally {
  client.clear();
}
