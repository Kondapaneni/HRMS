import { queryOptions } from '@tanstack/react-query';
import api from '../api/axios';
import { candidateQueryKeys } from './candidateQueryKeys';

// PHP candidate profile and sidebar Supabase projection intentionally differ.
// Keep every account-scoped private response in the in-memory QueryClient.
const requiredArray = (data, resource) => {
  if (!Array.isArray(data)) throw new Error(`Invalid candidate ${resource} response`);
  return data;
};

export const candidateQueryOptions = {
  profile: candidateId => queryOptions({
    queryKey: candidateQueryKeys.profile(candidateId),
    queryFn: async ({ signal }) => (await api.get('/candidate/profile', { signal })).data?.profile ?? null,
    enabled: !!candidateId,
    staleTime: 5 * 60_000,
  }),
  applications: candidateId => queryOptions({
    queryKey: candidateQueryKeys.applications(candidateId),
    queryFn: async ({ signal }) =>
      requiredArray((await api.get('/candidate/applications', { signal })).data?.applications, 'applications'),
    enabled: !!candidateId,
    staleTime: 5 * 60_000,
  }),
  jobs: candidateId => queryOptions({
    queryKey: candidateQueryKeys.jobs(candidateId),
    queryFn: async ({ signal }) =>
      requiredArray((await api.get('/candidate/jobs', { signal })).data?.jobs, 'jobs'),
    enabled: !!candidateId,
    staleTime: 5 * 60_000,
  }),
};

// Select transforms the *observer result*, not the canonical raw applications
// cache. Do not mutate nested timelines shared with dashboard/jobs observers.
export const selectCandidateApplicationCards = apps => apps.map(app => {
  const timeline = Array.isArray(app.application_timeline)
    ? [...app.application_timeline].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];
  let resumeName = 'Primary Resume';
  if (app.resume_url) {
    const parts = String(app.resume_url).split('/');
    resumeName = parts[parts.length - 1] || resumeName;
  }
  return {
    id: app.id,
    jobTitle: app.jobs?.title || 'Unknown Position',
    department: app.jobs?.department || 'General',
    location: app.jobs?.location || 'Headquarters',
    jobType: app.jobs?.type || 'Full-time',
    deadline: app.jobs?.deadline,
    appliedDate: app.applied_date,
    status: app.status,
    resumeName,
    resumeUrl: app.resume_url,
    offerLetterPath: app.offer_letter_path || null,
    noticePeriod: app.notice_period,
    coverNote: app.cover_note,
    timeline,
  };
});
