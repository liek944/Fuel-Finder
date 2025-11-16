import { apiCall, getApiUrl } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';

export const ownerApi = {
  getOwnerInfo: async (subdomain: string) => {
    const url = getApiUrl(apiEndpoints.owner.info());
    const res = await apiCall(url, { method: 'GET', headers: { 'x-owner-domain': subdomain } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  getDashboard: async (apiKey: string, subdomain: string) => {
    const url = getApiUrl(apiEndpoints.owner.dashboard());
    const res = await apiCall(url, { method: 'GET', headers: { 'x-owner-domain': subdomain } }, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  getStations: async (apiKey: string, subdomain: string) => {
    const url = getApiUrl(apiEndpoints.owner.stations());
    const res = await apiCall(url, { method: 'GET', headers: { 'x-owner-domain': subdomain } }, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  getPendingReports: async (apiKey: string, subdomain: string) => {
    const url = getApiUrl(apiEndpoints.owner.pendingReports());
    const res = await apiCall(url, { method: 'GET', headers: { 'x-owner-domain': subdomain } }, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  verifyReport: async (reportId: number, apiKey: string, subdomain: string, notes?: string) => {
    const url = getApiUrl(apiEndpoints.owner.verifyReport(reportId));
    const res = await apiCall(
      url,
      {
        method: 'POST',
        headers: { 'x-owner-domain': subdomain, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || 'Verified by owner' })
      },
      apiKey
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  rejectReport: async (reportId: number, apiKey: string, subdomain: string, reason?: string) => {
    const url = getApiUrl(apiEndpoints.owner.rejectReport(reportId));
    const res = await apiCall(
      url,
      {
        method: 'POST',
        headers: { 'x-owner-domain': subdomain, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Rejected by owner', reason: reason || 'Incorrect price information' })
      },
      apiKey
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  getReviews: async (
    apiKey: string,
    subdomain: string,
    params: { status?: string; stationId?: number | 'all'; page?: number; pageSize?: number } = {}
  ) => {
    const search = new URLSearchParams();
    if (params.status && params.status !== 'all') search.set('status', params.status);
    if (params.stationId && params.stationId !== 'all') search.set('stationId', String(params.stationId));
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));

    const url = getApiUrl(`${apiEndpoints.owner.reviews()}?${search.toString()}`);
    const res = await apiCall(url, { method: 'GET', headers: { 'x-owner-domain': subdomain } }, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  updateStation: async (stationId: number, data: any, apiKey: string, subdomain: string) => {
    const url = getApiUrl(apiEndpoints.owner.updateStation(stationId));
    const res = await apiCall(
      url,
      { method: 'PUT', headers: { 'x-owner-domain': subdomain, 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
      apiKey,
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  updateFuelPrice: async (
    stationId: number,
    fuel_type: string,
    price: number | string,
    apiKey: string,
    subdomain: string,
  ) => {
    const url = getApiUrl(apiEndpoints.owner.updateFuelPrice(stationId));
    const res = await apiCall(
      url,
      {
        method: 'PUT',
        headers: { 'x-owner-domain': subdomain, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fuel_type, price })
      },
      apiKey,
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  getMarketInsights: async (apiKey: string, subdomain: string, days: 7 | 15 | 30) => {
    const search = new URLSearchParams();
    search.set('days', String(days));
    const url = getApiUrl(`${apiEndpoints.owner.marketInsights()}?${search.toString()}`);
    const res = await apiCall(url, { method: 'GET', headers: { 'x-owner-domain': subdomain } }, apiKey);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  updateReview: async (
    reviewId: number,
    apiKey: string,
    subdomain: string,
    data: { status: 'published' | 'rejected' }
  ) => {
    const url = getApiUrl(apiEndpoints.owner.updateReview(reviewId));
    const res = await apiCall(
      url,
      { method: 'PATCH', headers: { 'x-owner-domain': subdomain, 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
      apiKey,
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
    return json;
  },

  deleteFuelPrice: async (
    stationId: number,
    fuelType: string,
    apiKey: string,
    subdomain: string,
  ) => {
    const url = getApiUrl(apiEndpoints.owner.deleteFuelPrice(stationId, fuelType));
    const res = await apiCall(
      url,
      { method: 'DELETE', headers: { 'x-owner-domain': subdomain } },
      apiKey,
    );
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json?.message || `HTTP ${res.status}`);
    }
    return true;
  },
};
