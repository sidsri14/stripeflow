import axios from 'axios';

// Get base URL from env or default to local backend port
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
});

// Intercept requests to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses for global error handling (e.g., 401s)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If not authorized, clear token and optionally redirect
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // window.location.href = '/login'; // Let the React wrapper handle navigation instead to avoid hard reloads if possible
    }
    return Promise.reject(error);
  }
);
