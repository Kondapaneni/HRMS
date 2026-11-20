import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import { branchesKey, discardPrivateQueries } from './memoryClient';

// One intentionally low-risk pilot: the ID/name-only branch directory.
// No employee records, permissions, loans, payroll or GPS data are cached.
export function useBranchDirectory(enabled = true) {
  const { profile, hasSession } = useAuth();
  const verified = Boolean(hasSession && profile?.id &&
    ['admin', 'employee'].includes(profile.role));
  const query = useQuery({
    queryKey: branchesKey(profile),
    enabled: Boolean(enabled && verified),
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true, // React Query refetches only when stale.
    queryFn: async ({ signal }) => {
      try {
        const response = await api.get('/branches', { signal });
        if (!Array.isArray(response.data?.branches)) {
          throw new Error('Unexpected branch directory response');
        }
        return response.data.branches;
      } catch (error) {
        if ([401, 403].includes(error?.response?.status)) {
          discardPrivateQueries();
        }
        throw error;
      }
    },
  });
  // Never display a retained prior successful result on 401/403 or
  // while waiting for the currently authenticated identity.
  return {
    ...query,
    data: verified && !query.isError ? query.data : undefined,
  };
}
