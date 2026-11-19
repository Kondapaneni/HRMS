// SEC-023: Ensure deploys install the exact audited npm lockfile rather than
// silently resolving older vulnerable ranges during image builds.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = JSON.parse(readFileSync('frontend/package.json', 'utf8'));
const lock = JSON.parse(readFileSync('frontend/package-lock.json', 'utf8'));
assert.equal(lock.lockfileVersion, 3);
const floors = new Map([
  ['axios', '1.21.1'],
  ['react-router-dom', '7.18.6'],
  ['vite', '8.3.8'],
  ['@capacitor/cli', '8.6.2'],
  ['eslint', '10.15.0'],
]);
const parts = value => value.split(/[-.]/).slice(0, 3).map(Number);
const atLeast = (v, min) => {
  const current = parts(v), floor = parts(min);
  for (let i = 0; i < 3; i++) {
    if (current[i] > floor[i]) return true;
    if (current[i] < floor[i]) return false;
  }
  return true;
};
for (const [name, min] of floors) {
  const section = root.dependencies[name] ? 'dependencies' : 'devDependencies';
  const spec = root[section][name];
  assert.equal(lock.packages[''][section][name], spec, name + ' root lockfile spec differs');
  assert.equal(spec, '^' + min, name + ' minimum safe version changed without review');
  assert(atLeast(lock.packages['node_modules/' + name].version, min), name + ' locked below safe floor');
}
for (const [name, min] of [
  ['react-router','7.18.2'], ['follow-redirects','1.16.2'],
  ['form-data','4.0.6'], ['postcss','8.5.23'],
  ['source-map-js','1.2.2'], ['nanoid','3.3.18'], ['zod','4.6.6']
]) {
  const version = lock.packages['node_modules/' + name]?.version;
  assert(version && atLeast(version, min), name + ' below remediated advisory floor');
}
const docker = readFileSync('Dockerfile', 'utf8');
assert(docker.includes('RUN npm ci'), 'Docker image must use audited lockfile');
assert(!docker.includes('RUN npm install'), 'Docker image must not re-resolve dependencies');
console.log('SEC-023: patched direct minima, safe transitives, matching root lockfile, reproducible Docker install');
