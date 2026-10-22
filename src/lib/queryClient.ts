import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api.ts';

/**
 * Shared TanStack QueryClient configured for PugArch Project Management Application.
 *
 * Policies:
 * - Controlled retry: strictly prevents retrying non-retryable errors (401/403 auth, 400/422 validation, 404 not found, or user aborts)
 * - Safe mutations: mutations never auto-retry to prevent duplicate transactions
 * - Cache freshness: 20s default stale time, 5 min garbage collection
 * - Focus refetching: disabled globally to prevent layout shifts on window switching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000, // 20s data freshness
      gcTime: 5 * 60_000, // 5 min cache retention
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Never retry aborts/cancellations
        if (error?.name === 'AbortError' || error?.isAbortError) {
          return false;
        }

        // Never retry client errors, auth failures, or validation errors
        if (error instanceof ApiClientError) {
          if (error.isAuthError || error.isValidationError || error.isNotFound) {
            return false;
          }
        }

        const status = error?.status;
        if (status === 401 || status === 403 || status === 404 || status === 400 || status === 422) {
          return false;
        }

        // Allow at most 2 retries for transient 5xx or network drops
        return failureCount < 2;
      },
    },
    mutations: {
      // Never auto-retry mutations to prevent accidental repeated creations/updates
      retry: 0,
    },
  },
});

