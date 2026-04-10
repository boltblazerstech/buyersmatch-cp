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

// 👉 move to env if needed
const DEMO_CLIENT_ID = 'demo-contact-1';

// ─── Normalise Demo Brief ─────────────────────────────────────────

const normalisedDemoBrief = () => ({
  ...DEMO_BRIEF,
  zohoBriefId: DEMO_BRIEF?.zohoBriefId || DEMO_BRIEF?.id || 'demo-brief-1',
  buyerMatchNotes:
    DEMO_BRIEF?.buyerMatchNotes ||
    'Client is pre-approved and ready to move quickly. Prefers low-maintenance investment properties with strong rental yield. Avoids heavy renovation properties.',
});

// ─── Buyer Brief ──────────────────────────────────────────────────

export const getBuyerBrief = async (clientId) => {
  try {
    if (isDemoMode && clientId === DEMO_CLIENT_ID) {
      return normalisedDemoBrief();
    }

    if (USE_MOCK) {
      await delay();
      const brief = mockBuyerBriefs.find(bb => bb.clientId === clientId);
      return brief ? anonymizeBrief(brief) : null;
    }

    const { data } = await api.get(`/api/client/${clientId}/brief`);
    return data?.data ? anonymizeBrief(data.data) : null;

  } catch (error) {
    console.error('Error fetching buyer brief:', error);
    return null;
  }
};

// ─── Client Profile ───────────────────────────────────────────────

export const getClientProfile = async (clientId) => {
  try {
    if (isDemoMode && clientId === DEMO_CLIENT_ID) {
      const brief = normalisedDemoBrief();

      return {
        ...DEMO_USER,
        fullName: brief?.fullName || DEMO_USER?.fullName || 'Alex Johnson',
        greetingName: brief?.greetingName || DEMO_USER?.greetingName || 'Alex',
        email: brief?.email || DEMO_USER?.email,
      };
    }

    if (USE_MOCK) {
      await delay();
      const client = mockClients.find(
        c => c.id === clientId || c.zohoContactId === clientId
      );
      return client ? anonymizeBrief(client) : null;
    }

    const { data } = await api.get(`/api/client/${clientId}/profile`);
    return data?.data ? anonymizeBrief(data.data) : null;

  } catch (error) {
    console.error('Error fetching client profile:', error);
    return null;
  }
};

// ─── Property Assignments ─────────────────────────────────────────

export const getClientProperties = async (clientId) => {
  try {
    if (isDemoMode && clientId === DEMO_CLIENT_ID) {
      const brief = normalisedDemoBrief();

      const assignments = DEMO_ASSIGNMENTS.map(a => {
        const prop = DEMO_PROPERTIES.find(p => p.id === a.propertyId);

        return {
          assignment: { ...a },
          property: prop || null,
          propertyId: prop?.zohoPropertyId || a.propertyId,
          portalStatus: a.portalStatus,
          zohoBriefId: brief.zohoBriefId,
          clientNotes: null,
        };
      });

      return { assignments, briefs: [brief] };
    }

    if (USE_MOCK) {
      await delay();

      const mockFiltered = mockAssignments.filter(a => a.clientId === clientId);

      return {
        assignments: mockFiltered.map(a => {
          const property = mockProperties.find(p => p.id === a.propertyId);

          return {
            assignment: anonymizeAssignment(a),
            property: property ? anonymizeProperty(property) : null,
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
    const responseData = data?.data || {};

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

  } catch (error) {
    console.error('Error fetching properties:', error);
    return { assignments: [], briefs: [] };
  }
};

// ─── Assignments List ─────────────────────────────────────────────

export const getClientAssignments = async (zohoContactId) => {
  try {
    if (USE_MOCK) {
      await delay();
      return mockAssignments
        .filter(a => a.clientId === zohoContactId)
        .map(a => ({
          ...a,
          property: mockProperties.find(p => p.id === a.propertyId) || null,
        }));
    }

    const { data } = await api.get(`/api/client/${zohoContactId}/assignments`);
    return data?.data || [];

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
};

// ─── Assignment Actions ───────────────────────────────────────────

export const updateAssignmentStatus = async (assignmentId, status) => {
  try {
    if (USE_MOCK) {
      await delay(500);
      const assignment = mockAssignments.find(a => a.id === assignmentId);
      if (!assignment) throw new Error('Assignment not found');
      assignment.portalStatus = status;
      return assignment;
    }

    const { data } = await api.post(
      `/api/client/assignment/${assignmentId}/status`,
      { status }
    );
    return data?.data;

  } catch (error) {
    console.error('Error updating assignment status:', error);
    throw error;
  }
};

export const acceptProperty  = (id) => updateAssignmentStatus(id, 'ACCEPTED');
export const rejectProperty  = (id) => updateAssignmentStatus(id, 'REJECTED');
export const markPurchased   = (id) => updateAssignmentStatus(id, 'PURCHASED');

// ✅ FIXED: Added back missing function
export const notifyPropertyAction = async (assignmentId, action, remark = '') => {
  try {
    if (USE_MOCK) {
      await delay(500);
      return { success: true };
    }

    const { data } = await api.post(
      `/api/client/assignment/${assignmentId}/notify`,
      { action, remark }
    );

    return data;

  } catch (error) {
    console.error('Error notifying property action:', error);
    return { success: false };
  }
};

// ─── Client Notes ─────────────────────────────────────────────────

export const saveClientNotes = async (assignmentId, notes) => {
  try {
    if (USE_MOCK) {
      await delay(300);
      return { success: true };
    }

    const { data } = await api.post(
      `/api/client/assignment/${assignmentId}/client-notes`,
      { notes }
    );

    return data;

  } catch (error) {
    console.error('Error saving client notes:', error);
    return { success: false };
  }
};

// ─── Notifications ────────────────────────────────────────────────

export const getNotifications = async (zohoContactId) => {
  try {
    if (isDemoMode && zohoContactId === DEMO_CLIENT_ID) {
      return { data: DEMO_NOTIFICATIONS };
    }

    const { data } = await api.get(`/api/client/${zohoContactId}/notifications`);

    return Array.isArray(data)
      ? { data: data.map(n => anonymizeNotification(n)) }
      : data;

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: [] };
  }
};

export const getUnreadCount = async (zohoContactId) => {
  try {
    if (isDemoMode && zohoContactId === DEMO_CLIENT_ID) {
      return DEMO_NOTIFICATIONS.filter(n => !n.isRead).length;
    }

    const { data } = await api.get(
      `/api/client/${zohoContactId}/notifications/unread-count`
    );

    return data?.count || 0;

  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};

export const markAllRead = async (zohoContactId) => {
  try {
    const { data } = await api.patch(
      `/api/client/${zohoContactId}/notifications/read-all`
    );
    return data;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return null;
  }
};

export const markOneRead = async (notificationId) => {
  try {
    const { data } = await api.patch(
      `/api/client/notifications/${notificationId}/read`
    );
    return data;
  } catch (error) {
    console.error('Error marking one as read:', error);
    return null;
  }
};