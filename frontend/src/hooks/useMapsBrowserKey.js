import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

// SEC-016: Intentionally public, website/API-restricted browser key.
// Keep it separate from attendance/geofence business payloads and backend keys.
export default function useMapsBrowserKey() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['maps', 'browser-config'],
    queryFn: async () => (await api.get('/maps/browser-config')).data,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    browserKey: data?.mapsJavaScriptApiKey ?? '',
    loadingBrowserKey: isLoading,
    browserKeyError: error,
  };
}
