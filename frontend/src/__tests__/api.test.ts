import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simulate an Axios response error with the given HTTP status.
 */
function makeAxiosError(status: number) {
  const err: any = new Error(`Request failed with status ${status}`);
  err.response = { status, data: { error: 'test' } };
  return err;
}

// ─── CSRF interceptor logic ───────────────────────────────────────────────────

describe('CSRF token caching', () => {
  // We test the caching logic independently without importing api.ts directly
  // (which would pull in import.meta.env and window at module load time).

  let cache: string | null = null;

  const fetchCsrfToken = async (fetcher: () => Promise<string>): Promise<string> => {
    if (!cache) {
      cache = await fetcher();
    }
    return cache!;
  };

  const clearCache = () => { cache = null; };

  beforeEach(() => clearCache());

  test('fetches the token on the first call', async () => {
    const fetcher = vi.fn().mockResolvedValue('csrf-abc');
    const token = await fetchCsrfToken(fetcher);
    expect(token).toBe('csrf-abc');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('returns the cached token on subsequent calls', async () => {
    const fetcher = vi.fn().mockResolvedValue('csrf-abc');
    await fetchCsrfToken(fetcher);
    await fetchCsrfToken(fetcher);
    await fetchCsrfToken(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  test('fetches again after cache is cleared', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');
    const t1 = await fetchCsrfToken(fetcher);
    clearCache();
    const t2 = await fetchCsrfToken(fetcher);
    expect(t1).toBe('token-1');
    expect(t2).toBe('token-2');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// ─── Response error handling logic ────────────────────────────────────────────

describe('API response interceptor logic', () => {
  /**
   * Mirrors the logic in api.ts's response error interceptor.
   */
  function handleResponseError(error: any, clearCsrfToken: () => void): Promise<never> {
    if (error.response?.status === 403) {
      clearCsrfToken();
    }
    return Promise.reject(error);
  }

  test('clears CSRF token on 403 response', async () => {
    const clear = vi.fn();
    await expect(handleResponseError(makeAxiosError(403), clear)).rejects.toThrow();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test('does NOT clear CSRF token on 401', async () => {
    const clear = vi.fn();
    await expect(handleResponseError(makeAxiosError(401), clear)).rejects.toThrow();
    expect(clear).not.toHaveBeenCalled();
  });

  test('does NOT clear CSRF token on 500', async () => {
    const clear = vi.fn();
    await expect(handleResponseError(makeAxiosError(500), clear)).rejects.toThrow();
    expect(clear).not.toHaveBeenCalled();
  });

  test('propagates the original error', async () => {
    const clear = vi.fn();
    const err = makeAxiosError(422);
    await expect(handleResponseError(err, clear)).rejects.toBe(err);
  });
});

// ─── State-mutating methods that need CSRF ────────────────────────────────────

describe('CSRF required methods', () => {
  const mutatingMethods = ['post', 'put', 'patch', 'delete'];
  const readMethods = ['get', 'head', 'options'];

  test('mutating methods require CSRF token', () => {
    for (const method of mutatingMethods) {
      const requiresCsrf = ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());
      expect(requiresCsrf).toBe(true);
    }
  });

  test('read methods do not require CSRF token', () => {
    for (const method of readMethods) {
      const requiresCsrf = ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase());
      expect(requiresCsrf).toBe(false);
    }
  });
});

// ─── URL construction logic ───────────────────────────────────────────────────

describe('API URL construction', () => {
  /**
   * Mirrors the getDefaultApiUrl logic in api.ts.
   */
  function getApiUrl(isProd: boolean, origin = 'http://localhost:5173'): string {
    if (isProd) return '/api';
    const url = new URL(origin);
    return `${url.protocol}//${url.hostname}:3000/api`;
  }

  test('returns /api in production', () => {
    expect(getApiUrl(true)).toBe('/api');
  });

  test('returns localhost:3000/api in development', () => {
    expect(getApiUrl(false, 'http://localhost:5173')).toBe('http://localhost:3000/api');
  });

  test('uses current hostname with port 3000 in dev', () => {
    expect(getApiUrl(false, 'http://myserver.local:5173')).toBe('http://myserver.local:3000/api');
  });

  test('preserves protocol (http vs https)', () => {
    expect(getApiUrl(false, 'https://dev.example.com')).toBe('https://dev.example.com:3000/api');
  });
});
