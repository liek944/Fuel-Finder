import { apiGet, apiPost } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';

export interface HeartbeatPayload {
  sessionId: string;
  location?: { lat: number; lng: number; city?: string; region?: string } | null;
  page?: string;
  feature?: string;
}

export const userApi = {
  heartbeat: async (payload: HeartbeatPayload): Promise<any> => {
    const res = await apiPost(apiEndpoints.user.heartbeat(), payload);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  count: async (): Promise<{ activeUsers: number }> => {
    const res = await apiGet(apiEndpoints.user.count());
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as { activeUsers: number };
  },
};
