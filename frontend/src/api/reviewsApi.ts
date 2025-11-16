import { apiGet, apiCall } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';

export const reviewsApi = {
  summary: async (targetType: 'station' | 'poi', targetId: number): Promise<any> => {
    const res = await apiGet(apiEndpoints.reviews.summary(targetType, targetId));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  list: async (targetType: 'station' | 'poi', targetId: number, pageSize = 10): Promise<any> => {
    const res = await apiGet(apiEndpoints.reviews.list(targetType, targetId, pageSize));
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  create: async (
    payload: { targetType: 'station' | 'poi'; targetId: number; rating: number; comment: string | null; displayName: string | null },
    sessionId: string,
  ): Promise<any> => {
    const path = apiEndpoints.reviews.create();
    const res = await apiCall(
      path.startsWith('/') ? path : `/${path}`,
      {
        method: 'POST',
        headers: { 'X-Session-Id': sessionId, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },
};
