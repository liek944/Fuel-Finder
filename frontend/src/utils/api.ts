// API Configuration and Utilities for Fuel Finder Frontend
// This file handles environment-specific API configuration and provides
// utility functions for making API calls across development and production

// Global request deduplication to prevent multiple identical requests
const pendingRequests = new Map<string, Promise<Response>>();
const REQUEST_DEDUP_WINDOW_MS = 3000; // 3 seconds

function createRequestKey(url: string, method: string, body?: any): string {
  const bodyStr = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${bodyStr}`;
}

/**
 * Get the API base URL from environment variables
 * Falls back to localhost for development, Vercel for production
 */
const getApiBaseUrl = (): string => {
  // First try to get from environment variable
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (envUrl && !envUrl.includes('duckdns.org')) {
    // Remove trailing slash if present
    return envUrl.replace(/\/$/, "");
  }

  // Fallback for development
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }

  // Production default: Vercel backend
  return "https://fuel-finder-six.vercel.app";
};

/**
 * The base URL for all API calls
 */
export const API_BASE_URL = getApiBaseUrl();

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
 * @param path - The API path (e.g., '/api/stations', '/api/pois/123')
 * @returns Full URL for the API endpoint
 */
export const getApiUrl = (path: string): string => {
  // Ensure path starts with /
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Common API request headers
 */
export const getCommonHeaders = (apiKey?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  return headers;
};

/**
 * Helper function for making authenticated API calls
 * @param url - The API URL
 * @param options - Fetch options
 * @param apiKey - Optional API key for authenticated requests
 */
export const apiCall = async (
  url: string,
  options: RequestInit = {},
  apiKey?: string,
): Promise<Response> => {
  const defaultOptions: RequestInit = {
    headers: getCommonHeaders(apiKey),
  };

  // Merge headers properly
  const mergedOptions: RequestInit = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const method = mergedOptions.method || 'GET';
  const body = mergedOptions.body;

  // Only apply deduplication to POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const requestKey = createRequestKey(url, method, body);
    
    // Check if an identical request is already in progress
    if (pendingRequests.has(requestKey)) {
      console.warn(`⚠️ [API DEDUP] Duplicate ${method} request blocked:`, url);
      console.warn('   Returning existing pending request instead of making a new one');
      return pendingRequests.get(requestKey)!;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        console.log(`📤 [API] Making ${method} request to:`, url);
        const response = await fetchWithTimeout(url, mergedOptions);
        console.log(`📥 [API] Response received (${response.status}) from:`, url);
        return response;
      } catch (error) {
        console.error(`❌ [API] ${method} request failed:`, error);
        throw error;
      } finally {
        // Clean up after a delay to allow for deduplication window
        setTimeout(() => {
          pendingRequests.delete(requestKey);
          console.log(`🧹 [API DEDUP] Cleared request key from pending:`, requestKey.substring(0, 50) + '...');
        }, REQUEST_DEDUP_WINDOW_MS);
      }
    })();

    // Store the promise
    pendingRequests.set(requestKey, requestPromise);
    console.log(`🔒 [API DEDUP] Request locked:`, requestKey.substring(0, 50) + '...');
    
    return requestPromise;
  }

  // For GET requests, proceed with fallback support
  try {
    const response = await fetchWithTimeout(url, mergedOptions);
    return response;
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
};

/**
 * Helper for making GET requests
 */
export const apiGet = async (
  path: string,
  apiKey?: string,
): Promise<Response> => {
  return apiCall(getApiUrl(path), { method: "GET" }, apiKey);
};

/**
 * Helper for making POST requests
 */
export const apiPost = async (
  path: string,
  data?: any,
  apiKey?: string,
): Promise<Response> => {
  return apiCall(
    getApiUrl(path),
    {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    },
    apiKey,
  );
};

/**
 * Convert a File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Convert multiple files to base64 format for API upload
 */
export const filesToBase64 = async (
  files: File[],
): Promise<{ filename: string; base64: string; mimeType: string }[]> => {
  const base64Images = await Promise.all(
    files.map(async (file) => {
      const base64Data = await fileToBase64(file);
      return {
        filename: file.name,
        base64: base64Data,
        mimeType: file.type,
      };
    }),
  );
  return base64Images;
};

/**
 * Upload images as base64 JSON payload
 */
export const apiPostBase64Images = async (
  path: string,
  files: File[],
  apiKey?: string,
): Promise<Response> => {
  const base64Images = await filesToBase64(files);

  return apiPost(path, { images: base64Images }, apiKey);
};

/**
 * Helper for making PUT requests
 */
export const apiPut = async (
  path: string,
  data?: any,
  apiKey?: string,
): Promise<Response> => {
  return apiCall(
    getApiUrl(path),
    {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    },
    apiKey,
  );
};

/**
 * Helper for making DELETE requests
 */
export const apiDelete = async (
  path: string,
  apiKey?: string,
): Promise<Response> => {
  return apiCall(getApiUrl(path), { method: "DELETE" }, apiKey);
};

/**
 * Helper for making PATCH requests
 */
export const apiPatch = async (
  path: string,
  data?: any,
  apiKey?: string,
): Promise<Response> => {
  return apiCall(
    getApiUrl(path),
    {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    },
    apiKey,
  );
};

/**
 * Get the full URL for image resources
 * @param imagePath - The image path from API (e.g., '/api/images/stations/filename.jpg')
 */
export const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return "";

  // If it's already a full URL, return as-is
  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  // Otherwise, construct the full URL
  return `${API_BASE_URL}${imagePath}`;
};

/**
 * Configuration object for different environments
 */
export const CONFIG = {
  API_BASE_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  // Add other environment-specific config here
};

// Development logging
if (CONFIG.isDevelopment) {
  console.log("🔧 API Configuration:", {
    baseUrl: API_BASE_URL,
    environment: import.meta.env.MODE,
  });
}
