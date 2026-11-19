// PERF-001: reproducible, dependency-free analysis of the Vite 8/Rolldown manifest.
// Run from repository root after: (cd frontend && npm ci && npm run build -- --manifest)
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';

const dir = resolve('frontend/dist');
const assets = join(dir, 'assets');
const manifestPath = join(dir, '.vite/manifest.json');
assert(existsSync(manifestPath), 'Run Vite production build with --manifest first');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const all = Object.entries(manifest);
const entry = all.find(([, value]) => value.isEntry && value.file?.endsWith('.js'));
assert(entry, 'Could not find the frontend JS entry in Vite manifest');

function byteSize(file) {
  const full = join(dir, file);
  assert(existsSync(full), 'Missing emitted file: ' + file);
  const bytes = readFileSync(full);
  return {
    raw: bytes.length,
    gzip: gzipSync(bytes, { level: 9 }).length,
    brotli: brotliCompressSync(bytes, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 6 }
    }).length,
  };
}
function sum(sizes) {
  return sizes.reduce((result, s) => ({
    raw: result.raw + s.raw,
    gzip: result.gzip + s.gzip,
    brotli: result.brotli + s.brotli
  }), { raw: 0, gzip: 0, brotli: 0 });
}
function graph(keys) {
  const seen = new Set();
  const files = new Set();
  const visit = key => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = manifest[key];
    assert(chunk, 'Unknown manifest dependency: ' + key);
    if (chunk.file?.endsWith('.js')) files.add(chunk.file);
    for (const imported of chunk.imports || []) visit(imported);
  };
  for (const key of keys) visit(key);
  return {
    files: [...files].sort(),
    sizes: sum([...files].map(byteSize))
  };
}
function getKey(source) {
  const match = all.find(([key]) => key === source || key.endsWith('/' + source));
  assert(match, 'Missing route in manifest: ' + source);
  return match[0];
}
const entryGraph = graph([entry[0]]);
// These are script-transfer estimates from Vite's manifest import graph.
// They do not include runtime responses, speculative prefetch, HTTP headers,
// network waterfalls or server Content-Encoding negotiation.
const paths = {
  login: [entry[0]],
  candidateLogin: [entry[0]],
  candidateJobs: [entry[0], getKey('src/components/CandidateLayout.jsx'), getKey('src/pages/CandidateJobs.jsx')],
  adminDashboard: [entry[0], getKey('src/components/AdminLayout.jsx'), getKey('src/pages/AdminDashboard.jsx')],
  employeeDashboard: [entry[0], getKey('src/components/EmployeeLayout.jsx'), getKey('src/pages/EmployeeDashboard.jsx')]
};
const routes = Object.fromEntries(Object.entries(paths).map(([name, keys]) => {
  const details = graph(keys);
  return [name, { chunks: details.files.length, ...details.sizes, files: details.files }];
}));
const js = readdirSync(assets).filter(name => name.endsWith('.js')).map(file => ({
  file: 'assets/' + file, ...byteSize('assets/' + file)
})).sort((a,b) => b.raw - a.raw);
const css = readdirSync(assets).filter(name => name.endsWith('.css')).map(file => ({
  file: 'assets/' + file, ...byteSize('assets/' + file)
}));
function logoDetails(name) {
  const full = join(dir, name);
  if (!existsSync(full)) return null;
  const data = readFileSync(full);
  const png = name.endsWith('.png') && data.subarray(1,4).toString() === 'PNG';
  return {
    file: name, bytes: data.length,
    ...(png && data.length >= 24 ? {
      width: data.readUInt32BE(16), height: data.readUInt32BE(20), colorType: data[25],
    } : {}),
  };
}
const branding = ['logo.png', 'logo.webp', 'favicon.png', 'favicon.svg',
  'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png']
  .map(logoDetails).filter(Boolean);
const report = {
  entry: { key: entry[0], file: entry[1].file, ...byteSize(entry[1].file) },
  initialEntryGraph: { chunks: entryGraph.files.length, ...entryGraph.sizes, files: entryGraph.files },
  routes, jsChunkCount: js.length, totalJs: sum(js),
  majorChunks: js.slice(0, 20), css, branding,
  lazyRouteCount: all.filter(([,value]) => value.isDynamicEntry).length,
};
console.log('PERF001_MANIFEST_REPORT ' + JSON.stringify(report));
if (process.argv.includes('--enforce')) {
  assert(report.entry.raw < 500_000, 'PERF-001 initial entry exceeds 500 KB');
  const logo = branding.find(x => x.file === 'logo.png');
  assert(logo && logo.bytes < 50_000, 'PERF-001 logo.png must be under 50 KB');
  assert(logo.width >= 192 && logo.width === logo.height, 'PERF-001 branding must retain adequate square resolution');
  const rawLogo = readFileSync(join(dir, 'logo.png'));
  assert(logo.colorType === 6 || (logo.colorType === 3 && rawLogo.includes(Buffer.from('tRNS'))),
    'PERF-001 logo.png must preserve alpha transparency');
  assert(js.length >= 60, 'PERF-001 lazy chunk count regression');
  console.log('PERF-001 bundle and branding budgets PASS');
}