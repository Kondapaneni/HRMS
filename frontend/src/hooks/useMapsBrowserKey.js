import { useRemoteData } from '../state/remote.js';
import api from '../api/axios';

// SEC-016: Intentionally public, website/API-restricted browser key.
// Keep it separate from attendance/geofence business payloads and backend keys.
export default function useMapsBrowserKey() {
  const { data, isLoading, error } = useRemoteData({
    scope: ['maps', 'browser-config'],
    load: async () => (await api.get('/maps/browser-config')).data,
    retry: false,
  });

  return {
    browserKey: data?.mapsJavaScriptApiKey ?? '',
    loadingBrowserKey: isLoading,
    browserKeyError: error,
  };
}
