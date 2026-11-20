// Synthetic mounted browser test: exercises the REAL branch hook with an isolated
// AuthContext and Axios transport, never contacting an HRMS server.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const React = require('react');
const { createElement, act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const { build } = require('esbuild');
const { QueryClientProvider } = require('@tanstack/react-query');

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

// Bundle the real branch query hook and its real memory client. Only external
// identity/transport dependencies are simulated, not the query implementation.
const outputPath = resolve('src/query/.branch-hook-browser-test.mjs');
try {
  const generated = await build({
    stdin: {
      contents: [
        "export { useBranchDirectory } from './src/query/useBranchDirectory.js';",
        "export { memoryQueryClient, discardPrivateQueries } from './src/query/memoryClient.js';",
      ].join('\n'),
      resolveDir: resolve('.'),
      sourcefile: 'branch-runtime-entry.js',
      loader: 'js',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    external: ['react', '@tanstack/react-query'],
    plugins: [{
      name: 'only-mock-browser-auth-and-network',
      setup(context) {
        context.onResolve({ filter: /^\.\.\/contexts\/AuthContext$/ }, () =>
          ({ path: 'synthetic-auth', namespace: 'cache-pilot-mock' }));
        context.onResolve({ filter: /^\.\.\/api\/axios$/ }, () =>
          ({ path: 'synthetic-axios', namespace: 'cache-pilot-mock' }));
        context.onLoad({ filter: /.*/, namespace: 'cache-pilot-mock' }, args => ({
          contents: args.path === 'synthetic-auth'
            ? 'export const useAuth = () => globalThis.__cachePilotAuth;'
            : 'export default { get: (...args) => globalThis.__cachePilotGet(...args) };',
          loader: 'js',
        }));
      },
    }],
  });
  writeFileSync(outputPath, generated.outputFiles[0].contents);

  const { useBranchDirectory, memoryQueryClient, discardPrivateQueries } =
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
    assert.equal(latest.data, undefined);
    assert.equal(latest.isError, true);
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
