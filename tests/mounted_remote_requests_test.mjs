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
const { act, createElement } = React;
const { useRemoteData, useRemoteTask, useRefreshControl } =
  await import('../frontend/src/state/remote.js');

const next = () => new Promise(resolve => setTimeout(resolve, 0));

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
  await act(async () => { root.render(createElement(Probe, { id: 1 })); await next(); });
  assert.equal(current.data.id, 1);
  const first = current.data.sequence;
  assert.equal(bus.peek(['synthetic', 1])?.sequence, first);

  await act(async () => { await bus.refresh({ scope: ['unrelated'] }); await next(); });
  assert.equal(current.data.sequence, first, 'Unrelated view notification cannot refetch this view');
  await act(async () => { await bus.refresh({ scope: ['synthetic'] }); await next(); });
  assert(current.data.sequence > first, 'Mounted view refresh must fetch from the server');

  await act(async () => { root.render(createElement(Probe, { id: 2 })); await next(); });
  assert.equal(current.data?.id, 2, 'New scope must load its own data');
  assert(!renders.some(entry => entry.id === 2 && entry.data?.id === 1),
    'Do not show another scope\'s private data during the render before its effect');
  await act(async () => { root.unmount(); });
  assert.equal(bus.peek(['synthetic', 1]), undefined, 'Unmounted data may not be retained');
  root = createRoot(host);
  await act(async () => { root.render(createElement(Probe, { id: 1 })); await next(); });
  assert(current.data.sequence > first + 1, 'Revisit must fetch new data rather than use an old snapshot');
  await act(async () => { root.unmount(); });
  host.remove();
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
  await act(async () => { root.render(createElement(Probe)); await next(); });
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
  await act(async () => { root.render(createElement(Probe)); });
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

dom.window.close();
