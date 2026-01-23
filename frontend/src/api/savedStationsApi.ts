/**
 * Saved Stations API Client
 * Functions for managing user's saved/favorite stations
 */

import { apiCall, getApiUrl } from '../utils/api';
import { apiEndpoints } from '../constants/apiEndpoints';
import type { Station } from '../types/station.types';

export interface SavedStation {
  id: string;
  stationId: number;
  notes: string | null;
  savedAt: string;
  station: Pick<Station, 'id' | 'name' | 'brand' | 'address' | 'location'> | null;
}

export interface SavedStationsListResponse {
  success: boolean;
  savedStations: SavedStation[];
}

export interface SavedStationIdsResponse {
  success: boolean;
  stationIds: number[];
}

export interface CheckSavedResponse {
  success: boolean;
  isSaved: boolean;
  savedStation?: {
    id: string;
    notes: string | null;
    savedAt: string;
  };
}

/**
 * Get auth headers from localStorage
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }
  return { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const savedStationsApi = {
  /**
   * List all saved stations for the current user
   */
  list: async (): Promise<SavedStation[]> => {
    const url = getApiUrl(apiEndpoints.savedStations.list());
    const res = await apiCall(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const json = await res.json() as SavedStationsListResponse;
    if (!res.ok) {
      throw new Error((json as unknown as { message?: string })?.message || `HTTP ${res.status}`);
    }
    return json.savedStations;
  },

  /**
   * Get just the IDs of saved stations (lightweight for initial load)
   */
  getIds: async (): Promise<number[]> => {
    const url = getApiUrl(apiEndpoints.savedStations.ids());
    const res = await apiCall(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const json = await res.json() as SavedStationIdsResponse;
    if (!res.ok) {
      throw new Error((json as unknown as { message?: string })?.message || `HTTP ${res.status}`);
    }
    return json.stationIds;
  },

  /**
   * Check if a specific station is saved
   */
  check: async (stationId: number): Promise<CheckSavedResponse> => {
    const url = getApiUrl(apiEndpoints.savedStations.check(stationId));
    const res = await apiCall(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    const json = await res.json() as CheckSavedResponse;
    if (!res.ok) {
      throw new Error((json as unknown as { message?: string })?.message || `HTTP ${res.status}`);
    }
    return json;
  },

  /**
   * Save a station
   */
  save: async (stationId: number, notes?: string): Promise<void> => {
    const url = getApiUrl(apiEndpoints.savedStations.save(stationId));
    const res = await apiCall(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: notes ? JSON.stringify({ notes }) : undefined,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { message?: string })?.message || `HTTP ${res.status}`);
    }
  },

  /**
   * Unsave/remove a station
   */
  unsave: async (stationId: number): Promise<void> => {
    const url = getApiUrl(apiEndpoints.savedStations.unsave(stationId));
    const res = await apiCall(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { message?: string })?.message || `HTTP ${res.status}`);
    }
  },
};
