import { apiGet, apiPost } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';

export const donationsApi = {
  stats: async (): Promise<any> => {
    const res = await apiGet(apiEndpoints.donations.stats());
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  recent: async (limit: number = 5): Promise<any[]> => {
    const res = await apiGet(apiEndpoints.donations.recent(limit));
    const json = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json as any[];
  },

  // Payment integration disabled in UI, but keep API wrapper ready
  create: async (payload: { amount: number; donor_name?: string; donor_email?: string; cause: string; notes?: string }): Promise<any> => {
    const res = await apiPost(apiEndpoints.donations.create(), payload);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },
};
