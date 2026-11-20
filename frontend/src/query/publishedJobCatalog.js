import api from '../api/axios.js';
import { branchesKey, discardPrivateQueries, memoryQueryClient } from './memoryClient.js';

// Catalog contains published job postings ONLY. Never store applications,
// resumes, candidate profiles, screening results or application statuses here.
export function publishedJobsKey(profile) {
  return ['hrms', 'published-jobs', 'v1', ...branchesKey(profile).slice(3)];
}

export async function fetchPublishedJobCatalog(profile) {
  if (!profile?.id || !['candidate', 'employee'].includes(profile.role)) {
    throw new Error('Verified candidate or employee session required');
  }
  const queryKey = publishedJobsKey(profile);
  return memoryQueryClient.fetchQuery({
    queryKey,
    staleTime: 60 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: false,
    meta: { hrmsPublishedJobs: true },
    queryFn: async ({ signal }) => {
      try {
        const response = await api.get('/candidate/jobs', { signal });
        if (!Array.isArray(response.data?.jobs)) {
          throw new Error('Unexpected published job catalog response');
        }
        return response.data.jobs;
      } catch (error) {
        if (!signal.aborted && [401, 403].includes(error?.response?.status)) {
          discardPrivateQueries();
        }
        throw error;
      }
    },
  });
}
