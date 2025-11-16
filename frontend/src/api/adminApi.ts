import { apiGet, apiPatch, apiDelete } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';

export interface AdminReviewsParams {
  status?: string; // 'all' | 'published' | 'pending' | 'rejected'
  targetType?: string; // 'all' | 'station' | 'poi'
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export const adminApi = {
  listReviews: async (
    apiKey: string,
    params: AdminReviewsParams = {},
  ): Promise<any> => {
    const search = new URLSearchParams();
    if (params.status && params.status !== 'all') search.set('status', params.status);
    if (params.targetType && params.targetType !== 'all') search.set('targetType', params.targetType);
    if (params.searchTerm) search.set('searchTerm', params.searchTerm);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));

    const path = `${apiEndpoints.admin.reviews()}?${search.toString()}`;
    const res = await apiGet(path, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  updateReviewStatus: async (
    reviewId: number,
    newStatus: 'published' | 'pending' | 'rejected',
    apiKey: string,
  ): Promise<any> => {
    const path = apiEndpoints.admin.reviewById(reviewId);
    const res = await apiPatch(path, { status: newStatus }, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  deleteReview: async (reviewId: number, apiKey: string): Promise<boolean> => {
    const path = apiEndpoints.admin.reviewById(reviewId);
    const res = await apiDelete(path, apiKey);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.message || `HTTP ${res.status}`);
    }
    return true;
  },
};
