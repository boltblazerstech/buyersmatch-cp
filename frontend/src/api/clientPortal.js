import { api, USE_MOCK, delay } from './http';
import { mockAssignments, mockProperties, mockBuyerBriefs, mockClients } from '../mock/data';

// ─── Buyer Brief ──────────────────────────────────────────────────

/** GET /api/client/:clientId/brief */
export const getBuyerBrief = async (clientId) => {
  if (USE_MOCK) {
    await delay();
    return mockBuyerBriefs.find(bb => bb.clientId === clientId);
  }
  const { data } = await api.get(`/api/client/${clientId}/brief`);
  return data.data;
};

// ─── Client Profile ───────────────────────────────────────────────

/** GET /api/client/:clientId/profile */
export const getClientProfile = async (clientId) => {
  if (USE_MOCK) {
    await delay();
    return mockClients.find(c => c.id === zohoContactId || c.zohoContactId === zohoContactId);
  }
  const { data } = await api.get(`/api/client/${clientId}/profile`);
  return data.data;
};

// ─── Property Assignments ─────────────────────────────────────────

/**
 * GET /api/client/:clientId/properties
 * Returns assignments enriched with full property data.
 */
export const getClientProperties = async (clientId) => {
  if (USE_MOCK) {
    await delay();
    const assignments = mockAssignments.filter(a => a.clientId === clientId);
    return assignments.map(a => {
      const property = mockProperties.find(p => p.id === a.propertyId);
      return { ...a, property };
    });
  }
  const { data } = await api.get(`/api/client/${clientId}/properties`);
  return data.data;
};

/** GET /api/client/:zohoContactId/assignments */
export const getClientAssignments = async (zohoContactId) => {
  if (USE_MOCK) {
    await delay();
    return mockAssignments
      .filter(a => a.clientId === zohoContactId)
      .map(a => ({ ...a, property: mockProperties.find(p => p.id === a.propertyId) }));
  }
  const { data } = await api.get(`/api/client/${zohoContactId}/assignments`);
  return data.data;
};

// ─── Assignment Actions ───────────────────────────────────────────

/**
 * POST /api/client/assignment/:assignmentId/status
 * Valid statuses: ACCEPTED | REJECTED | PURCHASED | PENDING
 */
export const updateAssignmentStatus = async (assignmentId, status) => {
  if (USE_MOCK) {
    await delay(500);
    const assignment = mockAssignments.find(a => a.id === assignmentId);
    if (!assignment) throw new Error('Assignment not found');
    assignment.portalStatus = status;
    return assignment;
  }
  const { data } = await api.post(`/api/client/assignment/${assignmentId}/status`, { status });
  return data.data;
};

export const acceptProperty  = (assignmentId) => updateAssignmentStatus(assignmentId, 'ACCEPTED');
export const rejectProperty  = (assignmentId) => updateAssignmentStatus(assignmentId, 'REJECTED');
export const markPurchased   = (assignmentId) => updateAssignmentStatus(assignmentId, 'PURCHASED');

/**
 * POST /api/client/assignment/:id/notify
 * Sends a notification email to the admin — does NOT change assignment status.
 */
export const notifyPropertyAction = async (assignmentId, action, remark = '') => {
  if (USE_MOCK) { await delay(500); return { success: true }; }
  const { data } = await api.post(`/api/client/assignment/${assignmentId}/notify`, { action, remark });
  return data;
};

/**
 * POST /api/client/assignment/:id/client-notes
 * Saves client-only personal notes for an assignment.
 */
export const saveClientNotes = async (assignmentId, notes) => {
  if (USE_MOCK) { await delay(300); return { success: true }; }
  const { data } = await api.post(`/api/client/assignment/${assignmentId}/client-notes`, { notes });
  return data;
};

// ─── Notifications ────────────────────────────────────────────────

/** GET /api/client/:zohoContactId/notifications */
export const getNotifications = async (zohoContactId) => {
  const { data } = await api.get(`/api/client/${zohoContactId}/notifications`);
  return data;
};

/** GET /api/client/:zohoContactId/notifications/unread-count */
export const getUnreadCount = async (zohoContactId) => {
  const { data } = await api.get(`/api/client/${zohoContactId}/notifications/unread-count`);
  return data.count;
};

/** PATCH /api/client/:zohoContactId/notifications/read-all */
export const markAllRead = async (zohoContactId) => {
  const { data } = await api.patch(`/api/client/${zohoContactId}/notifications/read-all`);
  return data;
};

/** PATCH /api/client/notifications/:id/read */
export const markOneRead = async (notificationId) => {
  const { data } = await api.patch(`/api/client/notifications/${notificationId}/read`);
  return data;
};
