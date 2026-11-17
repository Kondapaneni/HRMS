/**
 * SEC-001: authenticated PHP API Storage adapter.
 * No Supabase anonymous key or direct browser Storage mutations.
 */
import api, { getAssetUrl } from '../api/axios';
const routeMap = Object.freeze({
  avatars: '/Avatar/', resumes: '/Resume/', candidate_documents: '/Candidate-Document/',
  attendance: '/Attendance/', expenses: '/Bills/', holidays: '/Holiday/',
  job_descriptions: '/Job-Description/', offer_letters: '/Offer-Letter/',
  training_videos: '/Training-Video/', loan_documents: '/Loan-Document/',
  loan_signatures: '/Loan-Signature/'
});
export const supabase = {
  storage: {
    from(bucket) {
      if (!Object.hasOwn(routeMap, bucket)) throw new Error('Unsupported bucket');
      return {
        async upload(path, file, options = {}) {
          if (options.upsert) return { data: null, error: new Error('Overwrites not permitted') };
          try {
            const result = await api.post('/storage/upload', file, {
              params: { bucket, path },
              headers: { 'Content-Type': file.type || 'application/octet-stream' }
            });
            return { data: result.data, error: null };
          } catch (err) {
            return { data: null, error: new Error(err.response?.data?.error || err.message) };
          }
        },
        async remove(paths) {
          try {
            if (!Array.isArray(paths) || paths.length === 0 || paths.length > 20) throw new Error('Invalid paths');
            const results = await Promise.all(paths.map(path => api.delete('/storage/object', { params: { bucket, path } })));
            return { data: results.map(result => result.data), error: null };
          } catch (err) {
            return { data: null, error: new Error(err.response?.data?.error || err.message) };
          }
        },
        getPublicUrl(path) {
          return { data: { publicUrl: getAssetUrl(routeMap[bucket] + path) } };
        }
      };
    }
  }
};
