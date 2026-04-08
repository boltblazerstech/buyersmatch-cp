/**
 * src/api/client.js — Barrel export
 *
 * All page components import from this file.
 * Functions are implemented in focused modules:
 *   - auth.js        → Authentication
 *   - admin.js       → Admin management, notifications, sync
 *   - clientPortal.js → Client portal (brief, assignments, actions)
 *   - properties.js  → Property data & documents
 *
 * To switch from mock to real backend, set in your .env:
 *   VITE_API_BASE_URL=http://localhost:8080
 */

// Auth
export {
  login,
  adminLogin,
  adminLogout,
  changeAdminPassword,
  logout,
  getStoredUser,
} from './auth';

// Admin — Client & Portal User Management
export {
  getAllClients,
  getAllBuyerBriefs,
  getAdminClientProfile,
  createClient,
  updateAgentNotes,
  assignPropertyToClient,
  getAllResponses,
  resetClientPassword,
  getPortalUsers,
  deactivatePortalUser,
  reactivatePortalUser,
  unboardClient,
  updateClientEmail,
  setClientPassword,
  getSyncStatus,
  triggerSync,
} from './admin';

// Client Portal — Briefs, Assignments & Actions
export {
  getBuyerBrief,
  getClientProfile,
  getClientProperties,
  getClientAssignments,
  updateAssignmentStatus,
  acceptProperty,
  rejectProperty,
  markPurchased,
  notifyPropertyAction,
  saveClientNotes,
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from './clientPortal';

// Properties
export {
  getAllProperties,
  getPropertyDetail,
  getPropertyDocuments,
  getPropertyByZohoId,
  getPropertyDocumentsByZohoId,
} from './properties';
