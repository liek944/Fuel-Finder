/**
 * Authentication API Client
 * Functions for user registration, login, and profile retrieval
 */

import { apiCall, getApiUrl } from '../utils/api';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  role: 'user' | 'owner' | 'admin';
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user: User;
  token: string;
}

export const authApi = {
  /**
   * Register a new user account
   */
  register: async (email: string, password: string, displayName?: string): Promise<AuthResponse> => {
    const url = getApiUrl('/api/auth/register');
    const res = await apiCall(url, {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || `Registration failed: ${res.status}`);
    }
    return json;
  },

  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const url = getApiUrl('/api/auth/login');
    const res = await apiCall(url, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || `Login failed: ${res.status}`);
    }
    return json;
  },

  /**
   * Get current authenticated user profile
   */
  getMe: async (token: string): Promise<User> => {
    const url = getApiUrl('/api/auth/me');
    const res = await apiCall(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.message || `Failed to get user: ${res.status}`);
    }
    return json;
  },

  /**
   * Logout (client-side token removal + optional server notification)
   */
  logout: async (): Promise<void> => {
    const url = getApiUrl('/api/auth/logout');
    try {
      await apiCall(url, { method: 'POST' });
    } catch {
      // Ignore errors - logout is primarily client-side
    }
  },
};
