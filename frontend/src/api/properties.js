import { api, USE_MOCK, delay } from './http';
import { mockProperties, mockDocuments } from '../mock/data';
import { isDemoMode } from '../config/brand';
import { anonymizeProperty } from '../utils/anonymize';
import { DEMO_PROPERTIES, DEMO_DOCUMENTS } from '../mock/demoData';

const EMPTY_DOCS = { propertyImages: [], images: [], docs: [], videos: [], pdfs: [], others: [], externalVideos: [] };

// Normalise a demo document entry: guarantee `url` exists regardless of linter renaming downloadLink→url
const normDoc = (d) => ({ ...d, url: d.url || d.downloadLink || null });

// Normalise a full DEMO_DOCUMENTS entry: guarantee `propertyImages` key and `url` on every item
const normaliseDemoDocs = (raw) => {
  if (!raw) return EMPTY_DOCS;
  const imgs = (raw.propertyImages || raw.images || []).map(normDoc);
  const allDocs = (raw.docs || []).map(normDoc);
  const PDF_EXTS = ['pdf'];
  const IMG_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const pdfs   = allDocs.filter(d => PDF_EXTS.includes(d.fileExtension?.toLowerCase()));
  const others = allDocs.filter(d => !PDF_EXTS.includes(d.fileExtension?.toLowerCase()) && !IMG_EXTS.includes(d.fileExtension?.toLowerCase()));
  // Image-type docs (jpg/png etc.) go into others so they still appear in the doc list
  const imgDocs = allDocs.filter(d => IMG_EXTS.includes(d.fileExtension?.toLowerCase()));
  return {
    propertyImages: imgs,
    images: imgs,
    docs:          allDocs,
    videos:        raw.videos   || [],
    pdfs,
    others:        [...others, ...imgDocs],
    externalVideos: raw.externalVideos || [],
  };
};

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
    return normaliseDemoDocs(DEMO_DOCUMENTS[propertyId]);
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
