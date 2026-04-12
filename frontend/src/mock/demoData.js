import imgHome from '../assets/home.jpg';
import imgQld from '../assets/house_qld.jpg';
import imgSa from '../assets/house_sa.jpg';
import imgWa from '../assets/house_wa.jpg';
import contractPropertyDoc from '../assets/contract-property.pdf';
import propDocImage from '../assets/prop-doc.jpg';

export const DEMO_USER = {
  id: "demo-user-1",
  clientId: "demo-contact-1",
  loginEmail: "demo@propertypulse.com.au",
  role: "CLIENT",
  zohoContactId: "demo-contact-1",
  greetingName: "Alex",
  zohoBriefId: "demo-brief-1"
}

export const DEMO_ADMIN_USER = {
  id: "demo-admin-1",
  email: "admin@propertypulse.com.au",
  fullName: "Demo Admin",
  role: "ADMIN"
}

export const DEMO_BRIEF = {
  id: "demo-brief-1",
  zohoContactId: "demo-contact-1",
  fullName: "Alex Johnson",
  email: "demo@propertypulse.com.au",
  secondaryEmail: null,
  greetingName: "Alex",
  minBudget: 600000,
  maxBudget: 700000,
  availableDeposit: 140000,
  depositEquityPercent: 20,
  propertyTypes: ["House"],
  preferredStates: ["QLD", "WA"],
  preferredSuburbs: "Bundaberg, Townsville, Rockingham",
  bedBathGarage: "3 2 2",
  landSizeSqm: "450",
  timelineToBuy: "ASAP / Immediate",
  preApproved: true,
  interestRate: 6.5,
  weeklyRent: 650,
  monthlyHoldingCost: 800,
  yieldPercent: 4.8,
  taxRate: 37,
  status: "Brief Confirmed",
  priority: "High",
  assignedAgents: ["Vish", "Martin"],
  tags: ["High Growth"],
  financerName: "Saurabh Arora",
  propertyAssigned: true
}

export const DEMO_PROPERTIES = [
  {
    id: "dp1",
    zohoPropertyId: "demo-prop-1",
    address: "14 Riverside Drive, Bundaberg QLD 4670",
    addressLine1: "14 Riverside Drive",
    suburb: "Bundaberg",
    state: "QLD",
    postCode: "4670",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    carParking: 2,
    areaSqm: 520,
    yearBuilt: 2008,
    pool: false,
    askingPriceMin: 580000,
    askingPriceMax: 620000,
    minRentPerMonth: 2200,
    yieldPercent: 5.8,
    status: "DD Completed",
    saleType: "Off Market",
    rentalSituation: "Tenanted",
    linkToListing: null,
    agentName: "Sarah Mitchell",
    archived: false
  },
  {
    id: "dp2",
    zohoPropertyId: "demo-prop-2",
    address: "7 Parkview Court, Rockingham WA 6168",
    addressLine1: "7 Parkview Court",
    suburb: "Rockingham",
    state: "WA",
    postCode: "6168",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 2,
    carParking: 2,
    areaSqm: 620,
    yearBuilt: 2012,
    pool: true,
    askingPriceMin: 640000,
    askingPriceMax: 680000,
    minRentPerMonth: 2600,
    yieldPercent: 6.1,
    status: "DD Completed",
    saleType: "Off Market",
    rentalSituation: "Owner Occupied",
    linkToListing: null,
    agentName: "James Cooper",
    archived: false
  },
  {
    id: "dp3",
    zohoPropertyId: "demo-prop-3",
    address: "23 Hillcrest Avenue, Townsville QLD 4812",
    addressLine1: "23 Hillcrest Avenue",
    suburb: "Townsville",
    state: "QLD",
    postCode: "4812",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 1,
    carParking: 1,
    areaSqm: 480,
    yearBuilt: 2000,
    pool: false,
    askingPriceMin: 420000,
    askingPriceMax: 450000,
    minRentPerMonth: 1800,
    yieldPercent: 5.2,
    status: "DD Completed",
    saleType: "Private Sale",
    rentalSituation: "Tenanted",
    linkToListing: null,
    agentName: "Emily Watson",
    archived: false
  },
  {
    id: "dp4",
    zohoPropertyId: "demo-prop-4",
    address: "52 Sunset Boulevard, Hervey Bay QLD 4655",
    addressLine1: "52 Sunset Boulevard",
    suburb: "Hervey Bay",
    state: "QLD",
    postCode: "4655",
    propertyType: "House",
    bedrooms: 4,
    bathrooms: 2,
    carParking: 2,
    areaSqm: 700,
    yearBuilt: 2015,
    pool: false,
    askingPriceMin: 660000,
    askingPriceMax: 695000,
    minRentPerMonth: 2400,
    yieldPercent: 5.5,
    status: "DD Completed",
    saleType: "Off Market",
    rentalSituation: "Tenanted",
    linkToListing: null,
    agentName: "Michael Torres",
    archived: false
  },
  {
    id: "dp5",
    zohoPropertyId: "demo-prop-5",
    address: "9 Ironbark Close, Kallangur QLD 4503",
    addressLine1: "9 Ironbark Close",
    suburb: "Kallangur",
    state: "QLD",
    postCode: "4503",
    propertyType: "House",
    bedrooms: 3,
    bathrooms: 2,
    carParking: 2,
    areaSqm: 510,
    yearBuilt: 2018,
    pool: false,
    askingPriceMin: 590000,
    askingPriceMax: 625000,
    minRentPerMonth: 2100,
    yieldPercent: 4.9,
    status: "DD Completed",
    saleType: "Off Market",
    rentalSituation: "Owner Occupied",
    linkToListing: null,
    agentName: "Rachel Kim",
    archived: false
  }
]

const propertyVideos = {
    video1:"https://www.youtube.com/shorts/ye7eRew9pgg",
    video2:"https://www.youtube.com/shorts/JbyVVFITn8k",
    video3:"https://www.youtube.com/shorts/6cXawULEjlE"
}

export const DEMO_ASSIGNMENTS = [
  {
    id: "da1",
    zohoAssignmentId: "demo-assign-1",
    clientId: "demo-user-1",
    zohoContactId: "demo-contact-1",
    propertyId: "dp1",
    zohoPropertyId: "demo-prop-1",
    zohoStatus: "Property Assigned",
    portalStatus: "PENDING",
    financeOption: "Loan",
    assignedAt: "2026-03-01T10:00:00Z",
    bnpReportLink: null,
    financeLetterLink: null,
    contractDownloadLink: null,
    docusignLink: null,
    cashflowDocLink: null,
    agentNotes: "These are the default Buyer Match notes for this property. This property aligns well with your investment goals, showing strong yield potential and solid fundamentals in a growing suburb.",
    clientNotes: "These are my personal notes. I really like the layout of this property and the proximity to local amenities."
  },
  {
    id: "da2",
    zohoAssignmentId: "demo-assign-2",
    clientId: "demo-user-1",
    zohoContactId: "demo-contact-1",
    propertyId: "dp2",
    zohoPropertyId: "demo-prop-2",
    zohoStatus: "Offer Accepted",
    portalStatus: "ACCEPTED",
    financeOption: "Loan",
    offerAmount: 655000,
    assignedAt: "2026-02-10T10:00:00Z",
    bnpReportLink: null,
    financeLetterLink: null,
    contractDownloadLink: null,
    docusignLink: null,
    cashflowDocLink: null,
    agentNotes: "These are the default Buyer Match notes for this property. This property aligns well with your investment goals, showing strong yield potential and solid fundamentals in a growing suburb.",
    clientNotes: "These are my personal notes. I really like the layout of this property and the proximity to local amenities."
  },
  {
    id: "da3",
    zohoAssignmentId: "demo-assign-3",
    clientId: "demo-user-1",
    zohoContactId: "demo-contact-1",
    propertyId: "dp3",
    zohoPropertyId: "demo-prop-3",
    zohoStatus: "Property Rejected",
    portalStatus: "REJECTED",
    financeOption: "Loan",
    assignedAt: "2026-01-20T10:00:00Z",
    bnpReportLink: null,
    financeLetterLink: null,
    contractDownloadLink: null,
    docusignLink: null,
    cashflowDocLink: null,
    agentNotes: "These are the default Buyer Match notes for this property. This property aligns well with your investment goals, showing strong yield potential and solid fundamentals in a growing suburb.",
    clientNotes: "These are my personal notes. I really like the layout of this property and the proximity to local amenities."
  },
  {
    id: "da4",
    zohoAssignmentId: "demo-assign-4",
    clientId: "demo-user-1",
    zohoContactId: "demo-contact-1",
    propertyId: "dp4",
    zohoPropertyId: "demo-prop-4",
    zohoStatus: "Contract Signed",
    portalStatus: "PURCHASED",
    financeOption: "Loan",
    offerAmount: 675000,
    purchasePrice: 672000,
    assignedAt: "2026-01-05T10:00:00Z",
    bnpReportLink: null,
    financeLetterLink: null,
    contractDownloadLink: null,
    docusignLink: null,
    cashflowDocLink: null,
    agentNotes: "These are the default Buyer Match notes for this property. This property aligns well with your investment goals, showing strong yield potential and solid fundamentals in a growing suburb.",
    clientNotes: "These are my personal notes. I really like the layout of this property and the proximity to local amenities."
  },
  {
    id: "da5",
    zohoAssignmentId: "demo-assign-5",
    clientId: "demo-user-1",
    zohoContactId: "demo-contact-1",
    propertyId: "dp5",
    zohoPropertyId: "demo-prop-5",
    zohoStatus: "Property Assigned",
    portalStatus: "PENDING",
    financeOption: "Loan",
    assignedAt: "2026-03-15T10:00:00Z",
    bnpReportLink: null,
    financeLetterLink: null,
    contractDownloadLink: null,
    docusignLink: null,
    cashflowDocLink: null,
    agentNotes: "These are the default Buyer Match notes for this property. This property aligns well with your investment goals, showing strong yield potential and solid fundamentals in a growing suburb.",
    clientNotes: "These are my personal notes. I really like the layout of this property and the proximity to local amenities."
  }
]

export const DEMO_NOTIFICATIONS = [
  {
    id: "dn1",
    zohoContactId: "demo-contact-1",
    type: "PROPERTY_ASSIGNED",
    title: "New Property Matched",
    message: "A new investment opportunity has been matched to your strategy. Review the property details and next steps in your portal.",
    isRead: false,
    createdAt: "2026-03-15T10:00:00Z"
  },
  {
    id: "dn2",
    zohoContactId: "demo-contact-1",
    type: "OFFER_ACCEPTED",
    title: "Offer Accepted",
    message: "Great news — your offer has been accepted! We are now moving ahead with contracts and due diligence.",
    isRead: false,
    createdAt: "2026-02-15T10:00:00Z"
  },
  {
    id: "dn3",
    zohoContactId: "demo-contact-1",
    type: "CONTRACT_UNCONDITIONAL",
    title: "Contract Unconditional",
    message: "Your contract is now unconditional and fully secured. We are progressing towards settlement with all checks complete.",
    isRead: true,
    createdAt: "2026-01-10T10:00:00Z"
  }
]

const demoImages = [
  { id: "img-1", url: imgHome, caption: "Front Elevation" },
  { id: "img-2", url: imgQld, caption: "Living Area" },
  { id: "img-3", url: imgSa, caption: "Kitchen" },
  { id: "img-4", url: imgWa, caption: "Backyard" }
];

const demoExtVideos = [
  propertyVideos.video1,
  propertyVideos.video2,
  propertyVideos.video3
];

const demoDocs = [
  {
    id: "doc-1",
    documentType: "DOCUMENT",
    fileName: "contract-property.pdf",
    caption: "Property Contract",
    fileSizeBytes: 1048576,
    url: contractPropertyDoc,
    fileExtension: "pdf"
  },
  {
    id: "doc-2",
    documentType: "DOCUMENT",
    fileName: "prop-doc.jpg",
    caption: "Property Document Image",
    fileSizeBytes: 204800,
    url: propDocImage,
    fileExtension: "jpg"
  }
];

const getImages = (shift) => {
  const arr = [...demoImages];
  for (let i = 0; i < shift; i++) {
    arr.push(arr.shift());
  }
  return arr;
}

export const DEMO_DOCUMENTS = {
  "demo-prop-1": {
    images: getImages(0),
    videos: [],
    docs: demoDocs,
    externalVideos: demoExtVideos
  },
  "demo-prop-2": {
    images: getImages(1),
    videos: [],
    docs: demoDocs,
    externalVideos: demoExtVideos
  },
  "demo-prop-3": {
    images: getImages(2),
    videos: [],
    docs: demoDocs,
    externalVideos: demoExtVideos
  },
  "demo-prop-4": {
    images: getImages(3),
    videos: [],
    docs: demoDocs,
    externalVideos: demoExtVideos
  },
  "demo-prop-5": {
    images: getImages(1),
    videos: [],
    docs: demoDocs,
    externalVideos: demoExtVideos
  }
};

