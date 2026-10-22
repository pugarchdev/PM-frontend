/**
 * Centralized API utility for PugArch Project Management System.
 * Supports VITE_API_URL configuration for cross-origin backend deployments
 * as well as same-domain / relative proxy deployments.
 */

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '0.0.0.0');

const rawEnvUrl = (((import.meta as any).env?.VITE_API_URL || '') as string).trim();
// Strip trailing slashes and trailing /api to prevent duplicate /api/api/... paths
const cleanEnvUrl = rawEnvUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

// On localhost, always use relative path ("") to route through Vite's local dev server proxy.
// In production, use VITE_API_URL if configured, or same-origin.
export const API_BASE_URL: string = isLocalhost ? '' : cleanEnvUrl;

/**
 * Structured API Client Error with HTTP status classification.
 * Helps TanStack Query and consumers differentiate between non-retryable
 * client/auth errors (401, 403, 400, 422) and transient network/server errors.
 */
export class ApiClientError extends Error {
  status: number;
  data: any;
  isAuthError: boolean;
  isValidationError: boolean;
  isNotFound: boolean;
  isAbortError: boolean;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
    this.isAuthError = status === 401 || status === 403;
    this.isValidationError = status === 400 || status === 422;
    this.isNotFound = status === 404;
    this.isAbortError = status === 0;
  }
}

/**
 * Returns the fully qualified URL for an API endpoint.
 * @example apiUrl('/api/auth/login') => 'https://api.example.com/api/auth/login' (if VITE_API_URL set)
 * @example apiUrl('/api/auth/login') => '/api/auth/login' (if VITE_API_URL not set)
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    return normalizedPath;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}

// In-flight GET request registry for concurrent request deduplication
const inFlightGetRequests = new Map<string, Promise<Response>>();

/**
 * Enhanced fetch wrapper that:
 * 1. Resolves relative paths to the centralized API_BASE_URL
 * 2. Automatically includes credentials (cookies) for cross-origin session persistence
 * 3. Preserves standard RequestInit options and signal-based cancellation
 * 4. Deduplicates identical concurrent GET requests across components
 * 5. Handles request aborts cleanly without polluting console with false network alarms
 */
export async function apiFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? apiUrl(input) : input;
  const method = (init?.method || 'GET').toUpperCase();
  const startTime = Date.now();

  // Deduplicate identical concurrent GET requests (unless a custom AbortSignal is attached)
  const isDeduplicatableGet = method === 'GET' && typeof url === 'string' && !init?.signal;
  if (isDeduplicatableGet && inFlightGetRequests.has(url)) {
    const existingPromise = inFlightGetRequests.get(url)!;
    try {
      const res = await existingPromise;
      return res.clone();
    } catch (err) {
      // In case the shared promise fails, proceed with a fresh request
    }
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(url, {
        ...init,
        credentials: init?.credentials || 'include',
      });

      const elapsed = Date.now() - startTime;
      if (!res.ok && res.status !== 401) {
        console.warn(`[API] ${method} ${typeof url === 'string' ? url : (url as any).url} -> ${res.status} (${elapsed}ms)`);
      }

      return res;
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      if (err.name === 'AbortError') {
        const abortErr = new ApiClientError('Request aborted', 0);
        abortErr.name = 'AbortError';
        abortErr.isAbortError = true;
        throw abortErr;
      }
      console.error(`[API] Network failure: ${method} ${typeof url === 'string' ? url : (url as any).url} (${elapsed}ms):`, err?.message || err);
      throw err;
    } finally {
      if (isDeduplicatableGet) {
        inFlightGetRequests.delete(url);
      }
    }
  })();

  if (isDeduplicatableGet) {
    inFlightGetRequests.set(url, fetchPromise);
  }

  return fetchPromise;
}

/**
 * Type-safe GET helper that automatically checks HTTP status and returns parsed JSON.
 * Throws structured ApiClientError on non-2xx responses.
 */
export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, { ...init, method: 'GET' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.error || data.message || `API GET request failed with status ${res.status}`;
    throw new ApiClientError(message, res.status, data);
  }
  return res.json() as Promise<T>;
}

/**
 * Type-safe mutation helper (POST, PUT, PATCH, DELETE) that sets JSON headers,
 * serializes payload, and parses JSON responses.
 * Throws structured ApiClientError on non-2xx responses.
 */
export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: any,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await apiFetch(path, {
    ...init,
    method,
    headers,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.error || data.message || `API ${method} request failed with status ${res.status}`;
    throw new ApiClientError(message, res.status, data);
  }

  // Handle 204 No Content or empty responses
  if (res.status === 204) {
    return {} as T;
  }

  return res.json().catch(() => ({} as T));
}
