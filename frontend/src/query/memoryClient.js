import { QueryClient } from '@tanstack/react-query';
// Re-export the provider from the same ESM module instance for isolated tests.
export { QueryClientProvider } from '@tanstack/react-query';

// A newly designed, in-memory cache. Nothing is persisted to browser storage.
// Other HRMS data stays on the existing fresh-request path during this pilot.
export const memoryQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      retry: (attempt, error) => attempt < 1 && ![401, 403, 429, 503].includes(error?.response?.status),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

// Partition by the identity actually verified by /api/me. Never include tokens,
// secrets or employee personal records in query keys.
export function branchesKey(profile) {
  return [
    'hrms', 'branch-reference', 'v1',
    String(profile?.organizationId ?? profile?.tenantId ?? profile?.companyId ?? ''),
    String(profile?.branchId ?? profile?.branch ?? ''),
    String(profile?.id ?? ''),
    String(profile?.role ?? ''),
  ];
}

// Synchronous discard prevents account switches and cross-tab logout from
// ever reusing the prior session's in-memory records.
export function discardPrivateQueries() {
  void memoryQueryClient.cancelQueries();
  memoryQueryClient.clear();
}
