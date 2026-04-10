import axios from 'axios';
import { isDemoMode } from '../config/brand';

// ─── Configuration ────────────────────────────────────────────────
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * USE_MOCK: true when VITE_API_BASE_URL is not set, or VITE_USE_MOCK=true.
 * Set VITE_USE_MOCK=false in .env to switch to the real backend.
 */
export const USE_MOCK = !import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_USE_MOCK === 'true';

/** Simulated network delay for mock mode */
export const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

// ─── Storage Keys ─────────────────────────────────────────────────
export const STORAGE_KEYS = {
  CLIENT_USER: 'bm_client_user',
  ADMIN_USER: 'bm_admin_user',
  ADMIN_TOKEN: 'bm_admin_token',
};

// ─── Public API Instance (Client Portal, Properties, Auth) ────────
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Admin API Instance (auto-attaches X-Admin-Token) ─────────────
export const adminApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  if (isDemoMode) {
    config.headers['X-Demo-Mode'] = 'true';
  }
  return config;
});

adminApi.interceptors.request.use(config => {
  const token = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  if (token) {
    config.headers['X-Admin-Token'] = token;
  }
  return config;
});

// ─── Global Error Handler ─────────────────────────────────────────
const handleError = (error) => {
  // Try to get message from backend response (wrapped or unwrapped)
  const message = 
    error?.response?.data?.error || 
    error?.response?.data?.message || 
    error?.message || 
    'An unexpected error occurred';
  throw new Error(message);
};

api.interceptors.response.use(res => res, handleError);

adminApi.interceptors.response.use(
  res => res,
  (error) => {
    // If we get a 401 and it's not a login request, redirect to admin login
    if (error?.response?.status === 401 && !error.config.url.includes('/api/admin/auth/login')) {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      window.location.href = '/admin/login';
    }
    return handleError(error);
  }
);
