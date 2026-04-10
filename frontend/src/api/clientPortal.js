import { api, USE_MOCK, delay } from './http';
import { mockAssignments, mockProperties, mockBuyerBriefs, mockClients } from '../mock/data';
import {
  anonymizeAssignment,
  anonymizeProperty,
  anonymizeBrief,
  anonymizeNotification,
} from '../utils/anonymize';
import { isDemoMode } from '../config/brand';
import {
  DEMO_USER,
  DEMO_BRIEF,
  DEMO_PROPERTIES,
  DEMO_ASSIGNMENTS,
  DEMO_NOTIFICATIONS,
} from '../mock/demoData';

const DEMO_CLIENT_ID = 'demo-contact-1';

// ─── Buyer Brief ──────────────────────────────────────────────────

/** GET /api/client/:clientId/brief */
export const getBuyerBrief = async (clientId) => {
  if (isDemoMode && clientId === DEMO_CLIENT_ID) return DEMO_BRIEF;
  if (USE_MOCK) {
    await delay();
    return anonymizeBrief(mockBuyerBriefs.find(bb => bb.clientId === clientId));
  }
  const { data } = await api.get(`/api/client/${clientId}/brief`);
  return anonymizeBrief(data.data);
};

// ─── Client Profile ───────────────────────────────────────────────

/** GET /api/client/:clientId/profile */
export const getClientProfile = async (clientId) => {
  if (isDemoMode && clientId === DEMO_CLIENT_ID) {
    return {
      ...DEMO_USER,
      fullName: DEMO_BRIEF.fullName,
      greetingName: DEMO_BRIEF.greetingName,
      email: DEMO_BRIEF.email,
    };
  }
  if (USE_MOCK) {
    await delay();
    return anonymizeBrief(mockClients.find(c => c.id === clientId || c.zohoContactId === clientId));
  }
  const { data } = await api.get(`/api/client/${clientId}/profile`);
  return anonymizeBrief(data.data);
};

// ─── Property Assignments ─────────────────────────────────────────

/**
 * GET /api/client/:clientId/properties
 * Returns assignments enriched with full property data.
 */
export const getClientProperties = async (clientId) => {
  if (isDemoMode && clientId === DEMO_CLIENT_ID) {
    const assignments = DEMO_ASSIGNMENTS.map(a => {
      const prop = DEMO_PROPERTIES.find(p => p.id === a.propertyId);
      return {
        assignment: { ...a },
        property: prop,
        propertyId: prop?.zohoPropertyId,
        portalStatus: a.portalStatus,
        zohoBriefId: DEMO_BRIEF.zohoBriefId,
        clientNotes: null,
      };
    });
    return { assignments, briefs: [DEMO_BRIEF] };
  }
  if (USE_MOCK) {
    await delay();
    const mockFiltered = mockAssignments.filter(a => a.clientId === clientId);
    return {
      assignments: mockFiltered.map(a => {
        const property = mockProperties.find(p => p.id === a.propertyId);
        return {
          assignment: anonymizeAssignment(a),
          property: anonymizeProperty(property),
          propertyId: a.propertyId,
          portalStatus: a.portalStatus,
          zohoBriefId: null,
          clientNotes: null,
        };
      }),
      briefs: [],
    };
  }
  const { data } = await api.get(`/api/client/${clientId}/properties`);
  const responseData = data.data;
  return {
    assignments: (responseData.assignments || []).map(item => ({
      assignment: anonymizeAssignment(item.assignment),
      property: anonymizeProperty(item.property),
      propertyId: item.propertyId,
      portalStatus: item.portalStatus,
      zohoBriefId: item.zohoBriefId,
      clientNotes: item.clientNotes,
    })),
    briefs: responseData.briefs || [],
  };
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
  if (isDemoMode && zohoContactId === DEMO_CLIENT_ID) {
    return { data: DEMO_NOTIFICATIONS };
  }
  const { data } = await api.get(`/api/client/${zohoContactId}/notifications`);
  return Array.isArray(data) ? { data: data.map(n => anonymizeNotification(n)) } : data;
};

/** GET /api/client/:zohoContactId/notifications/unread-count */
export const getUnreadCount = async (zohoContactId) => {
  if (isDemoMode && zohoContactId === DEMO_CLIENT_ID) {
    return DEMO_NOTIFICATIONS.filter(n => !n.isRead).length;
  }
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
