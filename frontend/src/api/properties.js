import { api, USE_MOCK, delay } from './http';
import { mockProperties, mockDocuments } from '../mock/data';
import { isDemoMode } from '../config/brand';
import { anonymizeProperty } from '../utils/anonymize';
import { DEMO_PROPERTIES, DEMO_DOCUMENTS } from '../mock/demoData';

const EMPTY_DOCS = { propertyImages: [], images: [], docs: [], videos: [], pdfs: [], others: [], externalVideos: [] };

const BLOCKED_DOC_TYPES = [
  'Contract', 'Finance Letter', 'BNP Report', 'Insurance',
];

function filterDemoDocuments(docs) {
  if (!isDemoMode) return docs;
  return {
    images: docs.images,
    docs: docs.docs.filter(d => !BLOCKED_DOC_TYPES.includes(d.documentType)),
    videos: docs.videos,
  };
}

// ─── All Properties ───────────────────────────────────────────────

/** GET /api/properties */
export const getAllProperties = async () => {
  if (USE_MOCK) { await delay(); return mockProperties; }
  const { data } = await api.get('/api/properties');
  return data.data;
};

// ─── Single Property ──────────────────────────────────────────────

/**
 * GET /api/property/:propertyId
 * Accepts either properties.id (UUID) or zohoPropertyId.
 */
export const getPropertyDetail = async (propertyId) => {
  if (isDemoMode && propertyId?.startsWith('demo-')) {
    return DEMO_PROPERTIES.find(p => p.zohoPropertyId === propertyId) || null;
  }
  if (USE_MOCK) {
    await delay();
    return anonymizeProperty(mockProperties.find(p => p.id === propertyId || p.zohoPropertyId === propertyId));
  }
  const { data } = await api.get(`/api/property/${propertyId}`);
  return anonymizeProperty(data.data);
};

/**
 * GET /api/property/:propertyId/documents
 * Response: { images: [...], docs: [...], videoUrl: string | null }
 * Images = documentType "Due Diligence Image", Docs = everything else.
 */
export const getPropertyDocuments = async (propertyId) => {
  if (isDemoMode && propertyId?.startsWith('demo-')) {
    return DEMO_DOCUMENTS[propertyId] || EMPTY_DOCS;
  }
  if (USE_MOCK) {
    await delay();
    const all = mockDocuments.filter(d => d.propertyId === propertyId);
    return filterDemoDocuments({
      images: all.filter(d => d.documentType === 'Due Diligence Image'),
      docs:   all.filter(d => d.documentType !== 'Due Diligence Image'),
      videos: [],
    });
  }
  const { data } = await api.get(`/api/property/${propertyId}/documents`);
  return filterDemoDocuments(data.data);
};

// ─── By Zoho Property ID ──────────────────────────────────────────

/**
 * GET /api/properties/:zohoPropertyId
 */
export const getPropertyByZohoId = async (zohoPropertyId) => {
  if (USE_MOCK) {
    await delay();
    return mockProperties.find(p => p.zohoPropertyId === zohoPropertyId);
  }
  const { data } = await api.get(`/api/properties/${zohoPropertyId}`);
  return data.data;
};

/**
 * GET /api/properties/:zohoPropertyId/documents
 * Response: { images, docs, videos }
 */
export const getPropertyDocumentsByZohoId = async (zohoPropertyId) => {
  if (USE_MOCK) {
    await delay();
    const property = mockProperties.find(p => p.zohoPropertyId === zohoPropertyId);
    if (!property) return { images: [], docs: [], videos: [] };
    const all = mockDocuments.filter(d => d.propertyId === property.id);
    return {
      images: all.filter(d => ['png', 'jpg', 'jpeg'].includes(d.fileExtension?.toLowerCase())),
      docs:   all.filter(d => d.fileExtension?.toLowerCase() === 'pdf'),
      videos: all.filter(d => ['mp4', 'movie'].includes(d.fileExtension?.toLowerCase())),
    };
  }
  const { data } = await api.get(`/api/properties/${zohoPropertyId}/documents`);
  return data.data;
};
