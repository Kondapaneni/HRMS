// Candidate sidebar requests only avatar/document indicator columns from
// Supabase. The full profile screen requests a different response shape from
// the PHP API. These two datasets must not share a cache key.
export const candidateQueryKeys = {
  all: ['candidate'],
  profileBase: ['candidate', 'profile'],
  profile: candidateId => ['candidate', 'profile', candidateId],
  sidebarBase: ['candidate', 'sidebarProfile'],
  sidebar: candidateId => ['candidate', 'sidebarProfile', candidateId],
};
