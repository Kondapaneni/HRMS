import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const axios = read('frontend/src/api/axios.js');
const auth = read('frontend/src/contexts/AuthContext.jsx');
const native = read('frontend/src/api/nativeSession.js');
const tracker = read('frontend/src/components/BackgroundLocationTracker.jsx');
const candidate = read('frontend/src/pages/CandidateLogin.jsx');
const root = read('frontend/src/App.jsx');
const storage = read('frontend/src/api/browserStorage.js');
const entry = read('frontend/src/main.jsx');
const gate = read('frontend/src/components/MaintenanceGate.jsx');
const theme = read('frontend/src/contexts/ThemeContext.jsx');
const refresh = read('backend/src/Utils/RefreshSessions.php');
const backend = read('backend/public/index.php');
const vite = read('frontend/vite.config.js');

assert(!/PersistQueryClientProvider|createSyncStoragePersister|persistOptions/.test(root),
  'No TanStack query response is written to browser storage');
assert(entry.includes('<QueryClientProvider client={memoryQueryClient}>') &&
  entry.includes('clearLegacySensitiveStorage()'),
  'The scoped pilot is memory-only and bootstrap still wipes legacy private storage');
const memoryClient = read('frontend/src/query/memoryClient.js');
const branchHook = read('frontend/src/query/useBranchDirectory.js');
assert.match(memoryClient, /memoryQueryClient\.clear\(\)/,
  'Query cache must be immediately discarded on session transitions');
assert.match(auth, /discardPrivateQueries\(\)/,
  'All authenticated session transitions must discard the pilot cache');
assert.match(branchHook, /verified && !query\.isError/,
  'Unauthorized branch results cannot be displayed from a previous snapshot');
assert(!/PersistQueryClientProvider|createSyncStoragePersister|persistQueryClient/.test(entry + memoryClient + branchHook),
  'No TanStack persistence or offline cache allowed');
assert(!/gcTime:\s*24\s*\*\s*60/.test(root), 'No 24-hour private query retention');
assert(storage.includes('REACT_QUERY_OFFLINE_CACHE')
  && storage.includes('TANSTACK_QUERY_OFFLINE_CACHE'), 'Legacy persisted query payloads purged');
assert(entry.includes('clearLegacySensitiveStorage()'), 'Legacy private storage cleared on every boot');
for (const file of [axios, auth, candidate, tracker]) {
  assert(!/localStorage\.(?:setItem|getItem)\(['"]token['"]/.test(file),
    'Access JWT must never be read from or written to localStorage');
  assert(!/sessionStorage\.setItem\(['"](?:token|refreshToken)/.test(file),
    'No sessionStorage authentication secret persistence');
}
assert(axios.includes('let webAccessToken = null')
  && axios.includes('setAccessToken(res.data.token)'), 'Web access JWT is kept only in memory');
assert(axios.includes('withCredentials: true')
  && axios.includes("'X-HRMS-Refresh': '1'")
  && axios.includes('navigator.locks.request'), 'HttpOnly refresh stays same-origin and serialized');
assert(auth.includes('await restoreSession()')
  && auth.includes('refreshControl.reset()')
  && auth.includes('clearSessionAccess()'), 'Auth restores from cookie and clears account cache');
assert(candidate.includes('setAccessToken(res.data.token)'), 'Candidate login uses memory token');
assert(gate.includes('hasSession') && !gate.includes("localStorage.getItem('token')"),
  'Maintenance UX uses auth state instead of a persisted token');
assert(theme.includes('if (profile)') && !theme.includes("localStorage.getItem('token')"),
  'Theme preference syncing remains available through verified auth profile');
assert(tracker.includes('await getNativeAccessToken()'),
  'Android background tracker reads current Keystore token');
assert(native.includes('NativeLocationTracker.getSessionAccessToken()')
  && native.includes('NativeLocationTracker.refreshSession()'),
  'Android native refresh and access mechanisms preserved');
assert(refresh.includes('Secure; HttpOnly; SameSite=Strict')
  && refresh.includes('Path=/api/auth/refresh'), 'Refresh token cannot be read by browser JS');
assert(backend.includes("'/api/auth/refresh'")
  && backend.includes("X-HRMS-Refresh")
  && backend.includes("Cross-origin refresh denied"), 'CSRF-resistant refresh gate remains intact');
assert(backend.includes("'Cache-Control', 'no-store'")
  && backend.includes("str_starts_with($request->getUri()->getPath(), '/api/')"),
  'All HRMS API responses carry no-store');
for (const path of ['frontend/src/components/AdminChatbot.jsx','frontend/src/components/EmployeeChatbot.jsx',
  'frontend/src/pages/OriginationMobileLoanLeadDetails.jsx','frontend/src/pages/OriginationMobileLoanMemberDetails.jsx',
  'frontend/src/pages/OriginationMobileSaleLeadDetails.jsx','frontend/src/pages/OriginationMobileSaleMemberDetails.jsx']) {
  assert(!/sessionStorage\.(?:getItem|setItem)/.test(read(path)),
    path + ' must not persist private records or chat transcripts');
}
assert(vite.includes('dropConsole: true'),
  'Production browser build must remove raw console objects');
assert(!read('frontend/index.html').includes('console.log('),
  'Static HTML must not bypass production log redaction');
assert(!/localStorage\.(?:setItem|getItem)\(['"]token['"]/.test(read('frontend/src/pages/CandidateLogin.jsx')),
  'Candidate never persists a token');

if (process.argv.includes('--built')) {
  const built = readdirSync('frontend/dist/assets')
    .filter(p => p.endsWith('.js'))
    .map(p => read('frontend/dist/assets/' + p)).join('\n');
  for (const secretDiagnostic of ['API Error:', 'Failed to fetch profile:', 'Native Foreground Service start error:']) {
    assert(!built.includes(secretDiagnostic), 'Raw diagnostics absent from production bundle: ' + secretDiagnostic);
  }
}
console.log('SEC-021 browser storage, auth, native and logging policy PASS');
