/**
 * Owner Management API
 * Admin-level API functions for managing station owners
 */

import { apiGet, apiPost, apiPut } from '../utils/api';

const BASE_PATH = '/api/admin';

export interface Owner {
  id: string;
  name: string;
  domain: string;
  api_key?: string;
  email: string | null;
  contact_person: string | null;
  phone: string | null;
  is_active: boolean;
  theme_config: ThemeConfig | null;
  station_count: number;
  created_at: string;
  updated_at?: string;
}

export interface ThemeConfig {
  brandName?: string;
  logoUrl?: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
    textSecondary?: string;
  };
  mode?: 'light' | 'dark';
}

export interface UnassignedStation {
  id: number;
  name: string;
  brand: string | null;
  address: string;
}

export interface CreateOwnerInput {
  name: string;
  domain: string;
  email?: string;
  contact_person?: string;
  phone?: string;
  theme_config?: ThemeConfig;
  station_ids?: number[];
}

export interface UpdateOwnerInput {
  name?: string;
  domain?: string;
  email?: string;
  contact_person?: string;
  phone?: string;
  theme_config?: ThemeConfig;
  is_active?: boolean;
}

/**
 * Get all owners with station counts
 */
export async function getAllOwners(adminApiKey: string): Promise<Owner[]> {
  const response = await apiGet(`${BASE_PATH}/owners`, adminApiKey);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch owners');
  return data.data;
}

/**
 * Get a single owner by ID
 */
export async function getOwnerById(id: string, adminApiKey: string): Promise<Owner & { stations: UnassignedStation[] }> {
  const response = await apiGet(`${BASE_PATH}/owners/${id}`, adminApiKey);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch owner');
  return data.data;
}

/**
 * Create a new owner
 */
export async function createOwner(input: CreateOwnerInput, adminApiKey: string): Promise<Owner> {
  const response = await apiPost(`${BASE_PATH}/owners`, input, adminApiKey);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to create owner');
  return data.data;
}

/**
 * Update an existing owner
 */
export async function updateOwner(id: string, input: UpdateOwnerInput, adminApiKey: string): Promise<Owner> {
  const response = await apiPut(`${BASE_PATH}/owners/${id}`, input, adminApiKey);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to update owner');
  return data.data;
}

/**
 * Get unassigned stations
 */
export async function getUnassignedStations(adminApiKey: string): Promise<UnassignedStation[]> {
  const response = await apiGet(`${BASE_PATH}/stations/unassigned`, adminApiKey);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch unassigned stations');
  return data.data;
}

/**
 * Assign stations to an owner
 */
export async function assignStationsToOwner(ownerId: string, stationIds: number[], adminApiKey: string) {
  const response = await apiPost(`${BASE_PATH}/owners/${ownerId}/stations`, { station_ids: stationIds }, adminApiKey);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to assign stations');
  return data.data;
}

/**
 * Unassign stations from an owner
 */
export async function unassignStationsFromOwner(ownerId: string, stationIds: number[], adminApiKey: string) {
  const url = `${BASE_PATH}/owners/${ownerId}/stations`;
  const response = await fetch(url.startsWith('http') ? url : `${window.location.origin}${url}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': adminApiKey
    },
    body: JSON.stringify({ station_ids: stationIds })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to unassign stations');
  return data.data;
}
