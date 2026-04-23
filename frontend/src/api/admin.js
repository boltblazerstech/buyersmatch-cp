import { adminApi, USE_MOCK, delay } from './http';
import {
  mockClients, mockUsers, mockAssignments,
  mockProperties, mockNotifications, mockBuyerBriefs
} from '../mock/data';

// ─── Client Management ────────────────────────────────────────────

/** GET /api/admin/clients */
export const getAllClients = async () => {
  if (USE_MOCK) {
    await delay();
    return mockClients.map(c => ({ ...c, user: mockUsers.find(u => u.clientId === c.id) }));
  }
  const { data } = await adminApi.get('/api/admin/clients');
  return data.data.map(c => ({
    ...c,
    buyerBriefId: c.buyerBrief?.id,
    fullName: c.fullName || c.buyerBrief?.fullName,
    email: c.loginEmail || c.buyerBrief?.email,
    zohoContactId: c.zohoContactId || c.buyerBrief?.zohoContactId,
  }));
};

/**
 * GET /api/admin/buyer-briefs
 * Returns all buyer briefs from Zoho (onboarded and not).
 * Each item may have an `onboarded` flag or `portalUser` nested object.
 */
export const getAllBuyerBriefs = async () => {
  if (USE_MOCK) {
    await delay();
    // Simulate onboarding status by checking if a portal user exists for this brief
    return mockBuyerBriefs.map(bb => {
      const client = mockClients.find(c => c.id === bb.clientId);
      return {
        ...bb,
        fullName: client?.fullName || 'Unknown',
        email: client?.email || '',
        portalUser: client ? { id: client.id, email: client.email, status: 'onboarded' } : null,
      };
    });
  }
  const { data } = await adminApi.get('/api/admin/buyer-briefs');
  return data.data;
};

/** GET /api/admin/portal-users/:buyerBriefId */
export const getAdminClientProfile = async (buyerBriefId) => {
  if (USE_MOCK) {
    await delay();
    return mockClients.find(c => c.id === buyerBriefId);
  }
  const { data } = await adminApi.get(`/api/admin/portal-users/${buyerBriefId}`);
  return data.data;
};

/** POST /api/admin/client */
export const createClient = async ({ buyerBriefId, loginEmail, password, sendEmail = false }) => {
  if (USE_MOCK) {
    await delay(800);
    const newId = `c${mockClients.length + 1}`;
    const client = { id: newId, buyerBriefId, loginEmail, status: 'onboarded', generatedPassword: 'mock-pass-123' };
    mockClients.push(client);
    return client;
  }
  const { data } = await adminApi.post('/api/admin/client', { buyerBriefId, loginEmail, password, sendEmail });
  return data.data;
};

/** POST /api/admin/client/:clientId/notes */
export const updateAgentNotes = async (clientId, notes) => {
  if (USE_MOCK) {
    await delay();
    const client = mockClients.find(c => c.id === clientId);
    if (client) client.agentNotes = notes;
    return { id: clientId, notes };
  }
  const { data } = await adminApi.post(`/api/admin/client/${clientId}/notes`, { notes });
  return data.data;
};

/** POST /api/admin/assignment/:assignmentId/agent-notes */
export const updateAssignmentAgentNotes = async (assignmentId, agentNotes) => {
  if (USE_MOCK) {
    await delay();
    return { id: assignmentId, agentNotes };
  }
  const { data } = await adminApi.post(`/api/admin/assignment/${assignmentId}/agent-notes`, { agentNotes });
  return data.data;
};

/** POST /api/admin/assign-property */
export const assignPropertyToClient = async (clientId, propertyId, briefId) => {
  if (USE_MOCK) {
    await delay(500);
    const newAssignment = {
      id: `a${Math.random().toString(36).substr(2, 9)}`,
      clientId, propertyId, zohoBriefId: briefId,
      portalStatus: 'PENDING', assignedAt: new Date().toISOString()
    };
    mockAssignments.push(newAssignment);
    return newAssignment;
  }
  const { data } = await adminApi.post('/api/admin/assign-property', { clientId, propertyId, briefId });
  return data.data;
};

/** GET /api/admin/responses */
export const getAllResponses = async () => {
  if (USE_MOCK) {
    await delay();
    return mockAssignments.map(a => ({
      ...a,
      client: mockClients.find(c => c.id === a.clientId),
      property: mockProperties.find(p => p.id === a.propertyId),
    }));
  }
  const { data } = await adminApi.get('/api/admin/responses');
  return data.data.map(r => ({
    ...r,
    id: r.id || r.assignmentId,
    client: r.client || { fullName: r.clientName },
  }));
};

/** POST /api/admin/user/:userId/reset-password */
export const resetClientPassword = async (userId, newPassword, sendEmail = false) => {
  if (USE_MOCK) { await delay(500); return newPassword || 'new-password-123'; }
  const payload = { sendEmail, ...(newPassword ? { newPassword } : {}) };
  const { data } = await adminApi.post(`/api/admin/user/${userId}/reset-password`, payload);
  return data.data.newPassword;
};

// ─── Portal User Management ───────────────────────────────────────

/** GET /api/admin/portal-users?status=... */
export const getPortalUsers = async (status) => {
  if (USE_MOCK) { await delay(); return mockClients; }
  const params = status ? { status } : {};
  const { data } = await adminApi.get('/api/admin/portal-users', { params });
  return data.data;
};

/** PATCH /api/admin/portal-users/:buyerBriefId/deactivate */
export const deactivatePortalUser = async (buyerBriefId) => {
  if (USE_MOCK) { await delay(); return { success: true }; }
  const { data } = await adminApi.patch(`/api/admin/portal-users/${buyerBriefId}/deactivate`);
  return data.data || data;
};

/** PATCH /api/admin/portal-users/:buyerBriefId/reactivate */
export const reactivatePortalUser = async (buyerBriefId) => {
  if (USE_MOCK) { await delay(); return { success: true }; }
  const { data } = await adminApi.patch(`/api/admin/portal-users/${buyerBriefId}/reactivate`);
  return data.data || data;
};

/** DELETE /api/admin/portal-users/:buyerBriefId */
export const unboardClient = async (buyerBriefId) => {
  if (USE_MOCK) {
    await delay();
    const idx = mockClients.findIndex(c => c.id === buyerBriefId || c.buyerBriefId === buyerBriefId);
    if (idx !== -1) mockClients.splice(idx, 1);
    return { success: true };
  }
  const { data } = await adminApi.delete(`/api/admin/portal-users/${buyerBriefId}`);
  return data.data || data;
};

/** PATCH /api/admin/portal-users/:buyerBriefId/email */
export const updateClientEmail = async (buyerBriefId, loginEmail) => {
  if (USE_MOCK) {
    await delay(500);
    const client = mockClients.find(c => c.id === buyerBriefId);
    if (client) client.email = loginEmail;
    return { success: true };
  }
  const { data } = await adminApi.patch(`/api/admin/portal-users/${buyerBriefId}/email`, { loginEmail });
  return data.data;
};

/** PATCH /api/admin/portal-users/:buyerBriefId/reset-password */
export const setClientPassword = async (buyerBriefId, newPassword) => {
  if (USE_MOCK) { await delay(); return { success: true }; }
  const { data } = await adminApi.patch(`/api/admin/portal-users/${buyerBriefId}/reset-password`, { newPassword });
  return data;
};

// ─── Zoho Sync ────────────────────────────────────────────────────

/** GET /api/admin/sync/status */
export const getSyncStatus = async () => {
  if (USE_MOCK) { await delay(); return { lastSync: null, modules: {} }; }
  const { data } = await adminApi.get('/api/admin/sync/status');
  return data.data;
};

/** POST /api/admin/sync/:module */
export const triggerSync = async (module = 'full') => {
  if (USE_MOCK) { await delay(2000); return { success: true, module }; }
  const { data } = await adminApi.post(`/api/admin/sync/${module}`);
  return data;
};

// ─── Notifications (no backend endpoint — mock-only for now) ──────
export const getNotifications = async (userId) => {
  return mockNotifications.filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

export const markNotificationRead = async (notificationId) => {
  const n = mockNotifications.find(n => n.id === notificationId);
  if (n) n.read = true;
  return { success: true };
};

export const markAllNotificationsRead = async (userId) => {
  mockNotifications.filter(n => n.userId === userId).forEach(n => n.read = true);
  return { success: true };
};
