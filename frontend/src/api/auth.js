import { api, adminApi, USE_MOCK, delay, STORAGE_KEYS } from './http';
import { mockUsers } from '../mock/data';
import { isDemoMode } from '../config/brand';
import { DEMO_USER } from '../mock/demoData';

const DEMO_EMAIL = 'demo@propertypulse.com.au';
const DEMO_PASSWORD = 'demo123';

// ─── Client Login ─────────────────────────────────────────────────
export const login = async (email, password) => {
  if (isDemoMode && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_USER, JSON.stringify(DEMO_USER));
    return DEMO_USER;
  }
  if (USE_MOCK) {
    await delay();
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      return user;
    }
    throw new Error('Invalid credentials');
  }
  const { data: response } = await api.post('/api/auth/login', { email, password });
  const data = response.data;
  localStorage.setItem(STORAGE_KEYS.CLIENT_USER, JSON.stringify(data));
  return data;
};

// ─── Admin-specific Login ─────────────────────────────────────────
// Stores the sessionToken in localStorage so adminApi interceptor picks it up.
export const adminLogin = async (email, password) => {
  if (USE_MOCK) {
    await delay();
    const user = mockUsers.find(u => u.email === email && u.password === password && u.role === 'ADMIN');
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, 'mock-admin-token');
      return user;
    }
    throw new Error('Invalid admin credentials');
  }
  const { data: response } = await adminApi.post('/api/admin/auth/login', { email, password });
  const data = response.data;
  localStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, data.sessionToken);
  const user = { id: data.adminId, email: data.email, fullName: data.fullName, role: 'ADMIN' };
  localStorage.setItem(STORAGE_KEYS.ADMIN_USER, JSON.stringify(user));
  return user;
};

// ─── Admin Logout ─────────────────────────────────────────────────
export const adminLogout = async () => {
  if (!USE_MOCK) {
    try { await adminApi.post('/api/admin/auth/logout'); } catch (_) { /* best effort */ }
  }
  localStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ADMIN_USER);
};

// ─── Admin Change Password ────────────────────────────────────────
export const changeAdminPassword = async (currentPassword, newPassword) => {
  if (USE_MOCK) { await delay(); return { success: true }; }
  const { data } = await adminApi.patch('/api/admin/auth/change-password', { currentPassword, newPassword });
  return data;
};

// ─── Client Logout (stateless — just clears local storage) ────────
export const logout = async () => {
  localStorage.removeItem(STORAGE_KEYS.CLIENT_USER);
};

// ─── Helpers ──────────────────────────────────────────────────────
export const getStoredUser = (rolePreference = null) => {
  if (rolePreference === 'ADMIN') {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_USER));
  }
  if (rolePreference === 'CLIENT') {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_USER));
  }
  // Default to client if no preference
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_USER)) || JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_USER));
};
