import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

/**
 * Extension of Axios config to support internal retry logic (e.g. for CSRF rotation)
 */
interface InternalAxiosRequestConfigWithRetry extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRedirect?: boolean;
}

const getDefaultApiUrl = () => {
  if (import.meta.env.PROD) return '/api';
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

// For production on Vercel, default to the unified /api route (proxied via vercel.json).
// Allow VITE_API_URL to override if provided in the Vercel dashboard.
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : getDefaultApiUrl());

if (import.meta.env.PROD && API_URL.includes('localhost')) {
  console.warn('⚠️ API_URL points to localhost in a production build. Check VITE_API_URL.');
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Phase 2: Secure Cookie Support
  timeout: 30000,
});

// Phase 2: CSRF Token — cached per page load
// csrfFetchInFlight shares the in-flight promise across concurrent callers so only
// one fetch fires at a time, preventing the race where two requests both see
// csrfToken===null, both fetch, and the second token overwrites the cookie while the
// first request already has the old token in its header → 403.
let csrfToken: string | null = null;
let csrfFetchInFlight: Promise<string> | null = null;
const getCsrfToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken;
  if (!csrfFetchInFlight) {
    csrfFetchInFlight = axios
      .get(`${API_URL}/csrf-token`, { withCredentials: true })
      .then(({ data }) => {
        csrfToken = data.token;
        csrfFetchInFlight = null;
        return csrfToken!;
      })
      .catch((err) => {
        csrfFetchInFlight = null;
        throw err;
      });
  }
  return csrfFetchInFlight;
};

// Attach the CSRF token to every state-changing request
api.interceptors.request.use(async (config) => {
  const method = (config.method ?? '').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    try {
      const token = await getCsrfToken();
      config.headers = config.headers || {};
      config.headers['x-csrf-token'] = token;
    } catch {
      // Fail silently; the server will reject if CSRF is invalid
    }
  }
  return config;
});

// Public paths that should never trigger a /login redirect on 401
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/', '/terms', '/privacy', '/contact', '/demo'];

// Intercept responses for global error handling (e.g., 401s)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const config = error.config as InternalAxiosRequestConfigWithRetry;
      // Skip redirect for requests that opted out (e.g. the initial auth probe in App.tsx)
      // and for public pages where a 401 is expected and handled by React state.
      if (!config?._skipAuthRedirect) {
        const currentPath = window.location.pathname;
        const isPublicPage = PUBLIC_PATHS.some(p => currentPath === p || currentPath.startsWith(p + '?'));
        if (!isPublicPage) {
          window.location.href = '/login';
        }
      }
    }
    // On CSRF failure, clear cached token. 
    // If it's a first-time failure, retry the original request once after fetching a fresh token.
    if (error.response?.status === 403) {
      const config = error.config as InternalAxiosRequestConfigWithRetry;
      if (config && !config._retry) {
        csrfToken = null;
        config._retry = true;
        return api(config);
      }
    }
    return Promise.reject(error);
  }
);
