// API Configuration for Fuel Finder Owner App
// Points directly at the production backend

const API_BASE_URL = 'https://fuel-finder-six.vercel.app';

/**
 * Fetch with timeout support
 */
const fetchWithTimeout = async (
  url: string,
  options: RequestInit,
): Promise<Response> => {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
};

/**
 * Construct a full API URL from a path
 */
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Common API request headers
 */
export const getCommonHeaders = (apiKey?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  return headers;
};

/**
 * Helper function for making authenticated API calls
 */
export const apiCall = async (
  url: string,
  options: RequestInit = {},
  apiKey?: string,
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    headers: getCommonHeaders(apiKey),
  };

  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetchWithTimeout(url, mergedOptions);
    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};
