import { api, BASE_URL, USE_MOCK, delay } from './http';
import { mockProperties, mockDocuments } from '../mock/data';

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
  if (USE_MOCK) {
    await delay();
    return mockProperties.find(p => p.id === propertyId || p.zohoPropertyId === propertyId);
  }
  const { data } = await api.get(`/api/property/${propertyId}`);
  return data.data;
};

/**
 * GET /api/property/:propertyId/documents
 * Response: { images: [...], docs: [...], videoUrl: string | null }
 * Images = documentType "Due Diligence Image", Docs = everything else.
 */
export const getPropertyDocuments = async (propertyId) => {
  if (USE_MOCK) {
    await delay();
    const all = mockDocuments.filter(d => d.propertyId === propertyId);
    return {
      images: all.filter(d => d.documentType === 'Due Diligence Image'),
      docs:   all.filter(d => d.documentType !== 'Due Diligence Image'),
      videoUrl: null,
    };
  }
  const { data } = await api.get(`/api/property/${propertyId}/documents`);
  const docs = data.data;

  // Replace doc.url with a backend proxy URL so images/videos render even when
  // the file hasn't been uploaded to R2 yet (Zoho WorkDrive links require auth
  // and can't be used directly in <img> or <video> tags).
  const withProxyUrl = (list) => (list || []).map(doc =>
    doc.id ? { ...doc, url: `${BASE_URL}/api/document/${doc.id}/stream` } : doc
  );

  return {
    propertyImages: withProxyUrl(docs.propertyImages),
    images:         withProxyUrl(docs.images),
    videos:         withProxyUrl(docs.videos),
    pdfs:           withProxyUrl(docs.pdfs),
    others:         withProxyUrl(docs.others),
    externalVideos: docs.externalVideos || [],
  };
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
