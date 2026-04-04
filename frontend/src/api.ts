import axios from 'axios';

const getDefaultApiUrl = () => {
  if (import.meta.env.PROD) return '/api';
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
};

// Get base URL from env or derive from current host in development.
const API_URL = import.meta.env.VITE_API_URL || getDefaultApiUrl();

if (import.meta.env.PROD && API_URL.includes('localhost')) {
  console.warn('⚠️ API_URL points to localhost in a production build. Check VITE_API_URL.');
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Phase 2: Secure Cookie Support
});

// Phase 2: CSRF Token — cached per page load
let csrfToken: string | null = null;
const getCsrfToken = async (): Promise<string> => {
  if (!csrfToken) {
    const { data } = await axios.get(`${API_URL.replace('/api', '')}/api/csrf-token`, { withCredentials: true });
    csrfToken = data.token;
  }
  return csrfToken!;
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
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/'];

// Intercept responses for global error handling (e.g., 401s)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to /login if the user is on a protected page.
      // Public pages (register, forgot-password, etc.) get 401 on /auth/me on load — that's expected.
      const currentPath = window.location.pathname;
      const isPublicPage = PUBLIC_PATHS.some(p => currentPath === p || currentPath.startsWith(p + '?'));
      if (!isPublicPage) {
        window.location.href = '/login';
      }
    }
    // On CSRF failure, clear the cached token so next request fetches fresh
    if (error.response?.status === 403) {
      csrfToken = null;
    }
    return Promise.reject(error);
  }
);
