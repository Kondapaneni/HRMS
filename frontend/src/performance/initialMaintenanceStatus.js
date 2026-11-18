import api from '../api/axios';

// A full reload previously waited for refresh -> /me and *then* started
// the public maintenance status check. Start that read concurrently while
// AuthProvider displays its protected splash. Security checks still run
// before any protected UI renders, with no persistent caching.
const MAX_BOOT_STATUS_AGE_MS = 3000;
let bootRequest = null;

export function primeInitialMaintenanceStatus() {
  if (!bootRequest) {
    bootRequest = {
      startedAt: Date.now(),
      promise: api.get('/news', {
        params: { maintenance_check: Date.now() },
        headers: { 'Cache-Control': 'no-cache' },
      }),
    };
  }
  return bootRequest.promise;
}

// A public maintenance response older than 3s is not reused; Gate performs
// its own fresh request. Failed requests are handled fail-closed by the Gate.
export function consumeInitialMaintenanceStatus() {
  const pending = bootRequest;
  bootRequest = null;
  if (!pending || Date.now() - pending.startedAt > MAX_BOOT_STATUS_AGE_MS) {
    return null;
  }
  return pending.promise;
}
