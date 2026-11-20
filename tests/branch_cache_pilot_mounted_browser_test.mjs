// Synthetic mounted browser test: exercises the REAL branch hook with an isolated
// AuthContext and Axios transport, never contacting an HRMS server.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const React = require('react');
const { createElement, act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><main id="test-root"></main></body></html>', {
  url: 'https://synthetic.invalid/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  configurable: true, value: dom.window.navigator,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.__cachePilotAuth = { hasSession: false, profile: null };
let requests = [];
let handler = async () => ({ data: { branches: [{ id: 'alpha', name: 'Alpha' }] } });
globalThis.__cachePilotGet = async (path, options) => {
  requests.push({ path, signal: options?.signal });
  return handler(path, options);
};

// Execute the real hook source, replacing ONLY its AuthContext/transport imports
// with simulated identity and HTTP. The production hook logic is unchanged.
const outputPath = resolve('src/query/.branch-hook-browser-test.mjs');
try {
  let source = readFileSync(resolve('src/query/useBranchDirectory.js'), 'utf8');
  const substitutions = [
    ["import { useAuth } from '../contexts/AuthContext';",
      "const useAuth = () => globalThis.__cachePilotAuth;"],
    ["import api from '../api/axios';",
      "const api = { get: (...args) => globalThis.__cachePilotGet(...args) };"],
    ["import { branchesKey, discardPrivateQueries } from './memoryClient';",
      "import { branchesKey, discardPrivateQueries } from './memoryClient.js';"],
  ];
  for (const [oldText, replacement] of substitutions) {
    assert.equal(source.split(oldText).length, 2, 'The actual hook import must match exactly');
    source = source.replace(oldText, replacement);
  }
  // The real hook uses a five-minute garbage-collection timer in production.
  // Shorten only that timer in this synthetic Node browser to avoid holding
  // the test process open; the production TTL remains separately CI-asserted.
  assert.equal(source.split('gcTime: 5 * 60 * 1000').length, 2,
    'The branch hook must keep its five-minute production retention policy');
  source = source.replace('gcTime: 5 * 60 * 1000', 'gcTime: 100');
  writeFileSync(outputPath, source + [
    '',
    "export { QueryClientProvider } from '@tanstack/react-query';",
    "export { memoryQueryClient } from './memoryClient.js';",
    'export { discardPrivateQueries };',
    '',
  ].join('\n'));

  const { useBranchDirectory, QueryClientProvider, memoryQueryClient, discardPrivateQueries } =
    await import(pathToFileURL(outputPath).href);
  const host = document.getElementById('test-root');
  const root = createRoot(host);
  let latest;
  const Probe = ({ active = true }) => {
    latest = useBranchDirectory(active);
    return createElement('p', { id: 'branches' },
      latest.data?.map(branch => branch.name).join(', ') ?? 'none');
  };
  const render = async (active = true) => {
    await act(async () => {
      root.render(createElement(QueryClientProvider, { client: memoryQueryClient },
        createElement(Probe, { active })));
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  };
  const waitFor = async (predicate, title) => {
    for (let attempt = 0; attempt < 25; attempt++) {
      if (predicate()) return;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    }
    assert.fail('Timed out waiting for: ' + title);
  };
  const accountA = { id: 'a', role: 'admin', branchId: 'a-branch' };
  const accountB = { id: 'b', role: 'admin', branchId: 'b-branch' };

  await test('unauthenticated browser does not fetch or expose branch records', async () => {
    await render();
    assert.equal(requests.length, 0);
    assert.equal(latest.data, undefined);
    assert.equal(document.getElementById('branches').textContent, 'none');
  });

  await test('same authenticated account can reuse branch data across navigation', async () => {
    globalThis.__cachePilotAuth = { hasSession: true, profile: accountA };
    handler = async () => ({ data: { branches: [{ id: 'alpha', name: 'Alpha' }] } });
    await render();
    await waitFor(() => latest.data?.[0]?.name === 'Alpha', 'account A branch fetch');
    assert.equal(requests.length, 1);
    assert.equal(document.getElementById('branches').textContent, 'Alpha');
    await render(false);
    await render();
    assert.equal(requests.length, 1, 'Returning to the same route reuses fresh branch data');
  });

  await test('account switch clears prior list and fetches a distinct identity', async () => {
    discardPrivateQueries();
    globalThis.__cachePilotAuth = { hasSession: false, profile: null };
    await render();
    assert.equal(latest.data, undefined);
    globalThis.__cachePilotAuth = { hasSession: true, profile: accountB };
    handler = async () => ({ data: { branches: [{ id: 'bravo', name: 'Bravo' }] } });
    await render();
    await waitFor(() => latest.data?.[0]?.name === 'Bravo', 'account B branch fetch');
    assert.equal(requests.length, 2);
    assert.equal(latest.data?.[0]?.name, 'Bravo');
    assert(!document.getElementById('branches').textContent.includes('Alpha'));
  });

  await test('logout hides previous data immediately without another GET', async () => {
    discardPrivateQueries();
    globalThis.__cachePilotAuth = { hasSession: false, profile: null };
    await render();
    assert.equal(latest.data, undefined);
    assert.equal(requests.length, 2);
  });

  await test('403 response never exposes an old branch list', async () => {
    globalThis.__cachePilotAuth = { hasSession: true, profile: accountA };
    handler = async () => {
      const error = new Error('Forbidden');
      error.response = { status: 403 };
      throw error;
    };
    await render();
    await waitFor(() => latest.isError === true, '403 blocked branch state');
    assert.equal(latest.data, undefined);
    assert.equal(latest.isError, true);
    assert.equal(requests.length, 3, '403 must not trigger a repeated authorization request');
    assert.equal(document.getElementById('branches').textContent, 'none');
    assert.equal(memoryQueryClient.getQueryData(['hrms', 'branch-reference', 'v1', '', 'a-branch', 'a', 'admin']), undefined);
  });

  await act(async () => { root.unmount(); });
  discardPrivateQueries();
} finally {
  try { unlinkSync(outputPath); } catch {}
  dom.window.close();
  delete globalThis.__cachePilotAuth;
  delete globalThis.__cachePilotGet;
}
