import { useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * TanStack Query v5 removed per-query onError callbacks from useQuery.
 * React to a real query error (not an empty successful result) without
 * retrying the request or changing global authorization behavior.
 */
export function useQueryErrorToast(error, message, toastId) {
  useEffect(() => {
    if (error) {
      toast.error(message, { id: toastId });
    }
  }, [error, message, toastId]);
}
