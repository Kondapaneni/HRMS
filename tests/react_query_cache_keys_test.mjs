import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminEmployeeKeys } from '../frontend/src/queries/adminEmployeeKeys.js';

const read = path => readFileSync(path, 'utf8');
const rosterKey = adminEmployeeKeys.list({ search: '', limit: 50 });
const performanceKey = adminEmployeeKeys.list({ search: '', limit: 100 });

assert.deepEqual(rosterKey, adminEmployeeKeys.list(), 'Default admin roster is the backend 50-row list');
assert.notDeepEqual(rosterKey, performanceKey,
  'Different API limits must not share an employee-list cache entry');
assert.notDeepEqual(rosterKey, adminEmployeeKeys.list({ search: 'Alice', limit: 50 }),
  'Different searches must not share employee-list cache entries');
assert.deepEqual(rosterKey.slice(0, 2), adminEmployeeKeys.all,
  'Employee mutation invalidations must still match every list variant');
assert.deepEqual(performanceKey.slice(0, 2), adminEmployeeKeys.all,
  'Performance employee list must remain under the employee invalidation prefix');

const roster = read('frontend/src/pages/AdminEmployees.jsx');
const performance = read('frontend/src/pages/AdminPerformance.jsx');
const warmup = read('frontend/src/performance/routeWarmup.js');

assert.match(roster, /queryKey:\s*adminEmployeeKeys\.list\(\{ search: debouncedSearch, limit: 50 \}\)/,
  'Roster page must use the 50-row cache key');
assert.match(roster, /\/admin\/employees\?search=\$\{encodeURIComponent\(debouncedSearch\)\}/,
  'Roster continues to use the backend 50-row default request');
assert.match(performance, /queryKey:\s*adminEmployeeKeys\.list\(\{ search: debouncedSearch, limit: 100 \}\)/,
  'Performance page must use a separate 100-row cache key');
assert.match(performance, /\/admin\/employees\?search=\$\{encodeURIComponent\(debouncedSearch\)\}&limit=100/,
  'Performance must continue to fetch 100 employees');
assert.match(performance, /queryFn:\s*async \(\{ signal \}\)/,
  'Performance employee-list request should support React Query cancellation');
assert.match(performance, /&limit=100`, \{ signal \}\)/,
  'The performance employee-list AbortSignal must reach Axios');
assert.match(warmup, /queryKey:\s*adminEmployeeKeys\.list\(\{ search: '', limit: 50 \}\)/,
  'Admin hover-prefetch must populate the exact roster cache entry');
assert.match(warmup, /\/admin\/employees\?search=/,
  'Hover-prefetch must retain the corresponding API parameters');
assert.match(roster, /invalidateQueries\(\{ queryKey: adminEmployeeKeys\.all \}\)/,
  'Employee creation must invalidate all admin employee list variants');
console.log('React Query admin employee cache-key correctness and warmup regression PASS');
