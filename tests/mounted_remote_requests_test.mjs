// Synthetic browser lifecycle regression. No live HRMS APIs or databases.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>', {
  url: 'https://synthetic.invalid/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator, configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const { createRoot } = require('react-dom/client');
const { QueryClientProvider, memoryQueryClient, discardPrivateQueries } =
  await import('../frontend/src/query/memoryClient.js');
const { act, createElement } = React;
const { useRemoteData, useRemoteTask, useRefreshControl } =
  await import('../frontend/src/state/remote.js');

const next = () => new Promise(resolve => setTimeout(resolve, 0));
const waitFor = async (predicate, label) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (predicate()) return;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  assert.fail('Timed out waiting for ' + label);
};
const withQuery = child => createElement(QueryClientProvider,
  { client: memoryQueryClient }, child);

test('mounted views load fresh data each time, scoped refreshes, no cross-route cache', async () => {
  const bus = useRefreshControl();
  let calls = 0;
  let current;
  const renders = [];
  const Probe = ({ id }) => {
    current = useRemoteData({
      scope: ['synthetic', id],
      load: async () => ({ id, sequence: ++calls }),
      reloadOnFocus: false,
    });
    renders.push({ id, data: current.data });
    return createElement('span', null, current.data?.sequence ?? 'loading');
  };
  let host = document.createElement('section');
  document.body.append(host);
  let root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe, { id: 1 }))); await next(); });
  await waitFor(() => current.data?.id === 1, 'first mounted query');
  assert.equal(current.data.id, 1);
  const first = current.data.sequence;
  assert.equal(bus.peek(['synthetic', 1])?.sequence, first);

  await act(async () => { await bus.refresh({ scope: ['unrelated'] }); await next(); });
  assert.equal(current.data.sequence, first, 'Unrelated view notification cannot refetch this view');
  await act(async () => { await bus.refresh({ scope: ['synthetic'] }); await next(); });
  await waitFor(() => current.data?.sequence > first, 'scoped refresh');
  assert(current.data.sequence > first, 'Mounted view refresh must fetch from the server');

  await act(async () => { root.render(withQuery(createElement(Probe, { id: 2 }))); await next(); });
  await waitFor(() => current.data?.id === 2, 'changed query scope');
  assert.equal(current.data?.id, 2, 'New scope must load its own data');
  assert(!renders.some(entry => entry.id === 2 && entry.data?.id === 1),
    'Do not show another scope\'s private data during the render before its effect');
  await act(async () => { root.unmount(); });
  assert.equal(bus.peek(['synthetic', 1]), undefined, 'Unmounted data may not be retained');
  await next();
  assert.equal(memoryQueryClient.getQueryCache().findAll({ queryKey: ['hrms', 'mounted-read'] }).length,
    0, 'Private TanStack views must be garbage-collected after unmount');
  root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe, { id: 1 }))); await next(); });
  await waitFor(() => current.data?.id === 1 && current.data.sequence > first + 1,
    'fresh query after remount');
  assert(current.data.sequence > first + 1, 'Revisit must fetch new data rather than use an old snapshot');
  await act(async () => { root.unmount(); });
  host.remove();
});

test('safe holiday list is retained briefly, refresh invalidates and logout removes it', async () => {
  const bus = useRefreshControl();
  let calls = 0;
  let current;
  const scope = ['employee', 'holidays', '2026-11'];
  const Probe = () => {
    current = useRemoteData({
      scope,
      reloadOnFocus: false,
      load: async () => [{ date: '2026-11-20', sequence: ++calls }],
    });
    return createElement('span', null, current.data?.[0]?.sequence ?? 'loading');
  };
  const host = document.createElement('section');
  document.body.append(host);
  let root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe))); await next(); });
  await waitFor(() => current.data?.[0]?.sequence === 1, 'first holiday request');
  await act(async () => { root.unmount(); });
  assert.equal(calls, 1);
  assert.equal(memoryQueryClient.getQueryCache()
    .findAll({ queryKey: ['hrms', 'retained-read'] }).length, 1,
    'A reviewed holiday reference may survive unmount temporarily');

  root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe))); await next(); });
  await waitFor(() => current.data?.[0]?.sequence === 1, 'holiday cache reuse');
  assert.equal(calls, 1, 'Returning before expiry must reuse the cached calendar');

  await act(async () => {
    await bus.refresh({ scope: ['employee', 'holidays'] });
    await next();
  });
  await waitFor(() => current.data?.[0]?.sequence === 2, 'holiday invalidation');
  assert.equal(calls, 2, 'An explicit refresh must fetch changed holiday data');
  await act(async () => { root.unmount(); });
  host.remove();

  discardPrivateQueries();
  bus.reset();
  assert.equal(memoryQueryClient.getQueryCache().findAll().length, 0,
    'Logout must discard every retained reference entry');
});

test('logout reset discards mounted private state and prevents stale request completion', async () => {
  const bus = useRefreshControl();
  let deliver;
  let current;
  const Probe = () => {
    current = useRemoteData({
      scope: ['private', 'employee'],
      load: () => new Promise(resolve => { deliver = resolve; }),
      reloadOnFocus: false,
    });
    return createElement('div', null, current.data?.secret ?? 'empty');
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe))); await next(); });
  assert.equal(typeof deliver, 'function');
  await act(async () => { bus.reset(); });
  await act(async () => {
    deliver({ secret: 'must-not-appear' });
    await next();
  });
  assert.equal(current.data, undefined, 'Old-account response must never reappear after logout');
  await act(async () => { root.unmount(); });
  host.remove();
});

test('permission revocation hides prior results and blocks further protected refetches', async () => {
  const bus = useRefreshControl();
  let current;
  let revoked = false;
  let calls = 0;
  let deniedCallbacks = 0;
  const Probe = () => {
    current = useRemoteData({
      scope: ['synthetic', 'protected-revocation'],
      reloadOnFocus: false,
      load: async () => {
        calls += 1;
        if (revoked) {
          const error = new Error('Forbidden');
          error.response = { status: 403 };
          throw error;
        }
        return { privateValue: 'synthetic secret only' };
      },
      onError: () => { deniedCallbacks += 1; },
    });
    return createElement('span', null, current.data?.privateValue ?? 'not-visible');
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe))); await next(); });
  await waitFor(() => Boolean(current.data?.privateValue), 'initial protected data');
  assert.equal(bus.peek(['synthetic', 'protected-revocation'])?.privateValue,
    'synthetic secret only');

  revoked = true;
  await act(async () => {
    await bus.refresh({ scope: ['synthetic', 'protected-revocation'] });
    await next();
  });
  await waitFor(() => current.isError, '403 suppression');
  assert.equal(current.error?.response?.status, 403);
  assert.equal(current.data, undefined, 'A revoked page must hide old data');
  assert.equal(bus.peek(['synthetic', 'protected-revocation']), undefined,
    'A revoked view cannot expose old data through the refresh controller');
  assert.equal(host.textContent, 'not-visible');
  assert.equal(deniedCallbacks, 1);
  const requestsAtDenial = calls;
  await act(async () => {
    await bus.refresh({ scope: ['synthetic', 'protected-revocation'] });
    await next();
  });
  assert.equal(calls, requestsAtDenial,
    'A denied query must remain stopped until a new verified session');
  await act(async () => { root.unmount(); });
  host.remove();
});

test('failed assessment-style requests expose isError instead of an empty success view', async () => {
  let current;
  let errors = 0;
  const Probe = () => {
    current = useRemoteData({
      scope: ['synthetic', 'assessments-error'],
      load: async () => { throw new Error('synthetic assessment outage'); },
      reloadOnFocus: false,
      onError: () => { errors += 1; },
    });
    return createElement('div', null, current.isError ? 'failed' : 'pending');
  };
  const host = document.createElement('section');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe))); await next(); });
  await waitFor(() => current.isError, 'failed query error state');
  assert.equal(current.isError, true, 'Failed queries must provide isError for UI alert');
  assert.equal(current.isSuccess, false, 'Failures must not render as successful empty results');
  assert.equal(current.isLoading, false, 'Request failure must stop the loading indicator');
  assert.equal(current.error.message, 'synthetic assessment outage');
  assert.equal(errors, 1, 'Failure callback should run exactly once');
  await act(async () => { root.unmount(); });
  host.remove();
});

test('mutations retain callbacks and error handling without retaining responses globally', async () => {
  let operation;
  let successes = 0;
  let failures = 0;
  const Probe = () => {
    operation = useRemoteTask({
      run: async ({ fail }) => {
        if (fail) throw new Error('synthetic failure');
        return { saved: true };
      },
      onSuccess: async () => { successes += 1; },
      onError: async () => { failures += 1; },
    });
    return createElement('div', null, operation.status);
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(withQuery(createElement(Probe))); });
  await act(async () => {
    const response = await operation.mutateAsync({ fail: false });
    assert.equal(response.saved, true);
  });
  assert.equal(successes, 1);
  await act(async () => {
    await assert.rejects(operation.mutateAsync({ fail: true }), /synthetic failure/);
  });
  assert.equal(failures, 1);
  await act(async () => { root.unmount(); });
  host.remove();
});

memoryQueryClient.clear();
dom.window.close();
