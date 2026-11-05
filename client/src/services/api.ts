import { Capacitor } from '@capacitor/core';

/**
 * CareSphere API configuration.
 *
 * Website: uses relative API URLs.
 * Android/iOS: connects to the live Render backend.
 */

const RENDER_API_URL = 'https://caresphere-855t.onrender.com';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

const rawBaseUrl =
  envBaseUrl?.trim() ||
  (Capacitor.isNativePlatform() ? RENDER_API_URL : '');

export const API_BASE_URL = rawBaseUrl.replace(/\/$/, '');

export function apiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/')
    ? endpoint
    : `/${endpoint}`;

  return `${API_BASE_URL}${cleanEndpoint}`;
}

export async function apiFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(apiUrl(endpoint), options);
}
