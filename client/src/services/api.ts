/**
 * CareSphere API URL and Request Utility
 * 
 * In production when deployed on Render as a Single Web Service (Monolith),
 * the frontend is served by Express and API_BASE is empty (''), allowing
 * all requests to route cleanly via relative '/api/...' URLs without CORS or domain issues.
 * 
 * If deployed decoupled (e.g., Render Static Site + Render Web Service),
 * set VITE_API_BASE_URL to point directly to the backend URL (e.g., https://caresphere-api.onrender.com).
 */

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
export const API_BASE_URL: string = rawBaseUrl.trim().replace(/\/$/, '');

/**
 * Resolves a given API endpoint path to the full API URL.
 * Example:
 *   apiUrl('/api/auth/me') -> '/api/auth/me' (or 'https://caresphere-backend.onrender.com/api/auth/me')
 */
export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

/**
 * Wrapper around standard fetch that automatically prepends API_BASE_URL.
 */
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = apiUrl(endpoint);
  return fetch(url, options);
}
