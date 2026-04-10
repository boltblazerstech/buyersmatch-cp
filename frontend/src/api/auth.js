import { api, adminApi, USE_MOCK, delay, STORAGE_KEYS } from './http';
import { mockUsers } from '../mock/data';
import { isDemoMode } from '../config/brand';
import { DEMO_USER } from '../mock/demoData';

const DEMO_EMAIL = 'demo@propertypulse.com.au';
const DEMO_PASSWORD = 'demo123';

// ─── Client Login ─────────────────────────────────────────────────
export const login = async (email, password) => {
  if (isDemoMode && email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    // Normalise: ensure clientId and fullName exist regardless of what the linter strips
    const demoUser = {
      ...DEMO_USER,
      clientId: DEMO_USER.clientId || DEMO_USER.zohoContactId,
      fullName: DEMO_USER.fullName || 'Alex Johnson',
    };
    localStorage.setItem(STORAGE_KEYS.CLIENT_USER, JSON.stringify(demoUser));
    return demoUser;
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

// Ensure clientId is always present — old sessions or linter-stripped DEMO_USER
// may only have zohoContactId; normalise so every call site can rely on clientId.
const normaliseClientUser = (u) => {
  if (!u) return u;
  if (u.clientId) return u;
  return { ...u, clientId: u.zohoContactId || u.id };
};

export const getStoredUser = (rolePreference = null) => {
  if (rolePreference === 'ADMIN') {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_USER));
  }
  if (rolePreference === 'CLIENT') {
    return normaliseClientUser(JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_USER)));
  }
  const clientUser = normaliseClientUser(JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENT_USER)));
  return clientUser || JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_USER));
};
