import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useToast } from "../../components/Toast";
import {
  Bed,
  Bath,
  Car,
  Square,
  Calendar,
  Building2,
  ChevronLeft,
  Loader2,
  Play,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Clock,
  MessageSquare,
  Eye,
  MapPin,
  Tag,
  Home,
  Waves,
  Ruler,
  BarChart2,
  PiggyBank,
  Percent,
  ArrowUpDown,
  Link2,
  BookOpen,
  LayoutList,
} from "lucide-react";
import {
  getPropertyDetail,
  getPropertyDocuments,
  getClientProperties,
  updateAssignmentAgentNotes,
} from "../../api/client";

const AdminPropertyDetail = () => {
  const { clientId, propertyId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [property, setProperty] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [documents, setDocuments] = useState({
    propertyImages: [],
    images: [],
    videos: [],
    pdfs: [],
    others: [],
    externalVideos: [],
  });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);
  const [activeIsVideo, setActiveIsVideo] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [activeExternalVideoIndex, setActiveExternalVideoIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propData, docsData, clientData] = await Promise.all([
          getPropertyDetail(propertyId),
          getPropertyDocuments(propertyId),
          getClientProperties(clientId),
        ]);

        setProperty(propData);
        setDocuments(docsData);

        const firstImg = docsData.propertyImages?.[0];
        const firstVid = docsData.videos?.[0];
        const first = firstImg || firstVid;
        if (first) {
          setActiveImage(first.url);
          setActiveIsVideo(!firstImg);
        }

        const assignments =
          clientData?.assignments ||
          (Array.isArray(clientData) ? clientData : []);
        const matched = assignments.find((a) => a.propertyId === propertyId);
        if (matched) {
          const assembled = {
            ...matched.assignment,
            id: matched.assignment?.id || matched.id || matched.assignmentId,
            portalStatus: matched.portalStatus,
            agentNotes: matched.agentNotes || matched.assignment?.agentNotes,
          };
          setAssignment(assembled);
          setNotesDraft(assembled.agentNotes || "");
        }
      } catch (err) {
        console.error("Error fetching property details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId, propertyId]);

  const handleDownload = async (url, fileName) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading Property...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-teal" size={48} />
        </div>
      </AdminLayout>
    );
  }

  if (!property) {
    return (
      <AdminLayout title="Property Not Found">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-white mb-4">
            Property not found
          </h2>
          <button
            onClick={() => navigate(`/admin/client/${clientId}`)}
            className="text-teal hover:underline"
          >
            Back to Client
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Financial Calculations
  const weeklyRent = property.minRentPerMonth
    ? (property.minRentPerMonth / 4.33).toFixed(0)
    : null;
  const annualIncome = weeklyRent ? (weeklyRent * 52).toFixed(0) : null;
  const yieldMin = property.askingPriceMin
    ? ((annualIncome / property.askingPriceMin) * 100).toFixed(2)
    : null;
  const yieldMax = property.askingPriceMax
    ? ((annualIncome / property.askingPriceMax) * 100).toFixed(2)
    : null;

  const overview = `This ${property.propertyType || "property"} in ${property.suburb || "the area"} features ${property.bedrooms ?? "N/A"} bedrooms, ${property.bathrooms ?? "N/A"} bathrooms, and space for ${property.carParking ?? "N/A"} vehicles. Situated on a ${property.areaSqm ? `${property.areaSqm}sqm` : "generous"} block, this property was ${property.yearBuilt ? `built in ${property.yearBuilt}` : "expertly maintained"}${property.rentalSituation ? ` and is currently ${property.rentalSituation.toLowerCase()}` : ""}. Offered as a ${property.saleType ? property.saleType.toLowerCase() : "market"} opportunity, it presents a strong investment option in the ${property.state || "Australian"} market.`;

  const dealStages = [
    "Property Assigned",
    "Due Diligence",
    "Offer Made",
    "Contract Signed",
    "Finance Approved",
    "Settlement",
  ];

  const getActiveStage = () => {
    const status = assignment?.zohoStatus;
    if (status === "Settled") return 6;
    if (status === "Contract Signed") return 4;
    if (status === "Offer Made") return 3;
    return 1;
  };
  const activeStage = getActiveStage();
  const isRejected = assignment?.zohoStatus === "Property Rejected";

  const fmtSize = (bytes) => {
    if (!bytes || bytes <= 0) return null;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const typeLabel = (t) => t || "Document";

  const handleSaveNotes = async () => {
    if (!assignment?.id) {
      toast.error("Cannot save: assignment ID not found");
      return;
    }
    setNotesSaving(true);
    try {
      await updateAssignmentAgentNotes(assignment.id, notesDraft);
      setAssignment((prev) => ({ ...prev, agentNotes: notesDraft }));
      toast.success("Notes saved");
    } catch (err) {
      console.error("Failed to save notes:", err);
      toast.error("Failed to save notes");
    } finally {
      setNotesSaving(false);
    }
  };

  const hasDocuments =
    documents.videos.length > 0 ||
    documents.images.length > 0 ||
    documents.pdfs.length > 0 ||
    documents.others.length > 0 ||
    documents.externalVideos.length > 0 ||
    [
      assignment?.bnpReportLink,
      assignment?.financeLetterLink,
      assignment?.contractDownloadLink,
      assignment?.docusignLink,
      assignment?.cashflowDocLink,
    ].some(Boolean);

  return (
    <AdminLayout
      title={property.address || property.addressLine1 || "Property Detail"}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <button
          onClick={() => navigate(`/admin/client/${clientId}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-teal transition-colors mb-8 group"
        >
          <ChevronLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Client
        </button>

        {/* Assignment Status Bar */}
        {assignment && (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-5 bg-navy border border-white/5 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                Assignment Status
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${
                  assignment.portalStatus === "ACCEPTED"
                    ? "bg-teal/10 text-teal border-teal/30"
                    : assignment.portalStatus === "REJECTED"
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : assignment.portalStatus === "PURCHASED"
                        ? "bg-gold/10 text-gold border-gold/30"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                }`}
              >
                {assignment.zohoStatus || (assignment.portalStatus === "PENDING" ? "ASSIGNED" : assignment.portalStatus)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-12">
          {/* 1. Gallery */}
          {(documents.propertyImages.length > 0 ||
            documents.videos.length > 0) &&
            (() => {
              const galleryItems = [
                ...documents.propertyImages.map((d) => ({
                  ...d,
                  mediaType: "image",
                })),
                ...documents.videos.map((d) => ({ ...d, mediaType: "video" })),
              ];
              return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 aspect-[4/3] rounded-3xl overflow-hidden border border-teal/20 bg-navy">
                    {activeIsVideo ? (
                      <video
                        key={activeImage}
                        controls
                        autoPlay
                        className="w-full h-full object-cover"
                        src={activeImage}
                      />
                    ) : (
                      <img
                        src={activeImage}
                        alt="Property"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto max-h-[500px] scrollbar-hide">
                    {galleryItems.map((item, idx) => {
                      const isActive = activeImage === item.url;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveImage(item.url);
                            setActiveIsVideo(item.mediaType === "video");
                          }}
                          className={`relative flex-shrink-0 w-24 h-24 md:w-full md:h-32 rounded-2xl overflow-hidden border-2 transition-all ${isActive ? "border-teal scale-95" : "border-transparent opacity-50 hover:opacity-100"}`}
                        >
                          {item.mediaType === "video" ? (
                            <video
                              src={item.url}
                              muted
                              preload="metadata"
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.caption || item.fileName || ""}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          {item.mediaType === "video" && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Play
                                  size={14}
                                  className="text-white ml-0.5"
                                  fill="white"
                                />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          {/* 2. Property Information */}
          <div className="bg-navy border border-teal/20 rounded-3xl overflow-hidden">
            <div className="px-8 py-5 bg-white/[0.03] border-b border-teal/20 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/15 flex items-center justify-center">
                <LayoutList className="text-teal" size={18} />
              </div>
              <h3 className="text-lg font-bold text-white">
                Property Information
              </h3>
            </div>

            {/* Location & Identity */}
            <div className="px-8 py-6 border-b border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <MapPin size={14} className="text-teal" />
                <p className="text-[10px] uppercase tracking-widest text-teal font-bold">
                  Location & Identity
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                  <Home size={15} className="text-teal shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                      Address
                    </p>
                    <p className="text-sm text-white font-semibold">
                      {property.address || property.addressLine1 || "—"}
                    </p>
                  </div>
                </div>
                {[
                  { label: "Suburb", value: property.suburb, icon: MapPin },
                  { label: "State", value: property.state, icon: MapPin },
                ].map(({ label, value, icon: Icon, badge, color }, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3"
                  >
                    <Icon size={15} className="text-gray-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                        {label}
                      </p>
                      {badge && value ? (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}
                        >
                          {value}
                        </span>
                      ) : (
                        <p className="text-sm text-white font-semibold">
                          {value ?? "—"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Specs */}
            <div className="px-8 py-6 border-b border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <Home size={14} className="text-teal" />
                <p className="text-[10px] uppercase tracking-widest text-teal font-bold">
                  Property Specs
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Type",
                    value: property.propertyType,
                    icon: Building2,
                  },
                  { label: "Bedrooms", value: property.bedrooms, icon: Bed },
                  { label: "Bathrooms", value: property.bathrooms, icon: Bath },
                  {
                    label: "Car Spaces",
                    value: property.carParking,
                    icon: Car,
                  },
                  {
                    label: "Land Size",
                    value:
                      property.areaSqm != null
                        ? `${property.areaSqm} m²`
                        : null,
                    icon: Ruler,
                  },
                  {
                    label: "Year Built",
                    value: property.yearBuilt,
                    icon: Calendar,
                  },
                  {
                    label: "Dual Occupancy",
                    value:
                      property.pool === true
                        ? "Yes"
                        : property.pool === false
                          ? "No"
                          : null,
                    icon: Waves,
                  },
                ].map(({ label, value, icon: Icon }, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-4 text-center"
                  >
                    <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center">
                      <Icon size={16} className="text-teal" />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-tight">
                      {label}
                    </p>
                    <p className="text-sm text-white font-bold">
                      {value ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials & Sale Info */}
            <div className="px-8 py-6 border-b border-white/5">
              <div className="flex items-center gap-2 mb-5">
                <DollarSign size={14} className="text-teal" />
                <p className="text-[10px] uppercase tracking-widest text-teal font-bold">
                  Financials & Sale Info
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Min. Asking Price
                  </p>
                  <p className="text-xl font-bold text-gold">
                    {property.askingPriceMin != null
                      ? `$${Number(property.askingPriceMin).toLocaleString()}`
                      : "—"}
                  </p>
                </div>
                <div className="bg-gold/5 border border-gold/20 rounded-xl px-4 py-4 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Max. Asking Price
                  </p>
                  <p className="text-xl font-bold text-gold">
                    {property.askingPriceMax != null
                      ? `$${Number(property.askingPriceMax).toLocaleString()}`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: "Yield %",
                    value:
                      property.yieldPercent != null
                        ? `${property.yieldPercent}%`
                        : null,
                    icon: Percent,
                    color: "text-teal",
                  },
                  {
                    label: "Weekly Rent",
                    value:
                      weeklyRent != null
                        ? `$${Number(weeklyRent).toLocaleString()}`
                        : null,
                    icon: PiggyBank,
                    color: "text-teal",
                  },
                  {
                    label: "Rental Appraisal",
                    value: property.rentalAppraisal,
                    icon: BarChart2,
                    color: "text-white",
                  },
                  {
                    label: "Sale Type",
                    value: property.saleType,
                    icon: Tag,
                    color: "text-white",
                  },
                  {
                    label: "Rental Situation",
                    value: property.rentalSituation,
                    icon: ArrowUpDown,
                    color: "text-white",
                  },
                ].map(({ label, value, icon: Icon, color }, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
                        {label}
                      </p>
                      <p className={`text-sm font-bold ${color}`}>
                        {value ?? "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            {(property.linkToListing ||
              property.stashLink ||
              property.cmaLink) && (
              <div className="px-8 py-6">
                <div className="flex items-center gap-2 mb-5">
                  <Link2 size={14} className="text-teal" />
                  <p className="text-[10px] uppercase tracking-widest text-teal font-bold">
                    Links
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {property.linkToListing && (
                    <a
                      href={property.linkToListing}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-teal/10 border border-teal/30 hover:bg-teal/20 text-teal font-bold text-sm rounded-xl transition-all"
                    >
                      <ExternalLink size={15} /> View Listing
                    </a>
                  )}
                  {property.stashLink && (
                    <a
                      href={property.stashLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-sm rounded-xl transition-all"
                    >
                      <BookOpen size={15} /> Stash Link
                    </a>
                  )}
                  {property.cmaLink && (
                    <a
                      href={property.cmaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-sm rounded-xl transition-all"
                    >
                      <BarChart2 size={15} /> CMA Report
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 3. Deal Progress */}
          <div className="bg-navy border border-teal/10 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="text-teal" size={20} /> Deal Progress
              </h3>
              {isRejected && (
                <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
                  REJECTED
                </span>
              )}
            </div>
            <div className="relative">
              <div className="hidden md:block absolute top-5 left-0 w-full h-0.5 bg-gray-800" />
              <div className="md:hidden absolute left-5 top-0 bottom-0 w-0.5 bg-gray-800" />
              <div className="relative flex flex-col md:flex-row justify-between gap-8 md:gap-0">
                {dealStages.map((stage, idx) => {
                  const stageNum = idx + 1;
                  const isDone = stageNum < activeStage;
                  const isActive = stageNum === activeStage;
                  let bgColor = "bg-gray-800";
                  let borderColor = "border-gray-700";
                  let textColor = "text-gray-500";
                  let iconColor = "text-gray-600";
                  if (isDone) {
                    bgColor = "bg-gold/20";
                    borderColor = "border-gold/50";
                    textColor = "text-gold";
                    iconColor = "text-gold";
                  }
                  if (isActive) {
                    if (isRejected && stageNum === 1) {
                      bgColor = "bg-red-500/20";
                      borderColor = "border-red-500/50";
                      textColor = "text-red-400";
                      iconColor = "text-red-400";
                    } else {
                      bgColor = "bg-teal/20";
                      borderColor = "border-teal/50";
                      textColor = "text-teal";
                      iconColor = "text-teal";
                    }
                  }
                  return (
                    <div
                      key={idx}
                      className="flex md:flex-col items-center gap-4 md:gap-3 relative z-10 md:w-1/6"
                    >
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${bgColor} ${borderColor}`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} className={iconColor} />
                        ) : (
                          <span className={`text-xs font-bold ${textColor}`}>
                            {stageNum}
                          </span>
                        )}
                      </div>
                      <div className="text-left md:text-center">
                        <p
                          className={`text-[10px] font-bold uppercase tracking-tighter px-1 ${textColor}`}
                        >
                          {stage}
                        </p>
                        {isActive && (
                          <p className="text-[8px] text-white/40 uppercase tracking-tighter mt-1 font-bold md:px-1">
                            Current Stage
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Financial Analysis */}
          <div className="bg-navy border border-teal/20 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-teal" size={24} />
                <h3 className="text-xl font-bold text-white">
                  Offer & Financial Analysis
                </h3>
              </div>
              <div className="px-4 py-1 bg-gold/10 border border-gold/30 rounded-full">
                <p className="text-[10px] text-gold font-bold uppercase tracking-widest">
                  Yield: {property.yieldPercent}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Min. Asking Price
                </p>
                <p className="text-2xl font-bold text-white">
                  ${property.askingPriceMin?.toLocaleString() || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Max. Asking Price
                </p>
                <p className="text-2xl font-bold text-white">
                  ${property.askingPriceMax?.toLocaleString() || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                  Weekly Rent
                </p>
                <p className="text-2xl font-bold text-teal">
                  ${weeklyRent || "N/A"}
                </p>
              </div>
            </div>


            {/* Offer Details */}
            {(assignment?.offerAmount || assignment?.offerDate) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 border-t border-white/5 pt-8">
                {assignment?.offerAmount && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                      Offer Price
                    </p>
                    <p className="text-xl font-bold text-gold">
                      ${Number(assignment.offerAmount).toLocaleString()}
                    </p>
                  </div>
                )}
                {assignment?.offerDate && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                      Offer Date
                    </p>
                    <p className="text-xl font-bold text-white">
                      {assignment.offerDate.split('T')[0].split('-').reverse().join('-')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Property Overview */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Property Overview</h3>
            <p className="text-gray-400 leading-relaxed text-lg">{overview}</p>
          </div>

          {/* 6. Documents & Media */}
          {hasDocuments && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <FileText className="text-teal" size={22} />
                <h3 className="text-xl font-bold text-white">
                  Documents & Media
                </h3>
              </div>

              {documents.videos.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-teal uppercase tracking-widest flex items-center gap-2">
                    <Play size={12} /> Videos
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {documents.videos.map((vid, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="aspect-video rounded-2xl overflow-hidden border border-teal/20 bg-navy">
                          <video
                            controls
                            className="w-full h-full"
                            src={vid.url}
                          />
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white leading-tight">
                              {vid.caption || vid.fileName || "—"}
                            </p>
                            <p className="text-[10px] text-teal/70 font-medium mt-0.5">
                              {typeLabel(vid.documentType)}
                              {fmtSize(vid.fileSizeBytes)
                                ? ` · ${fmtSize(vid.fileSizeBytes)}`
                                : ""}
                            </p>
                          </div>
                          {vid.url && (
                            <button
                              onClick={() =>
                                handleDownload(
                                  vid.url,
                                  vid.fileName || vid.caption || "video",
                                )
                              }
                              className="p-2 text-gray-500 hover:text-teal bg-white/5 rounded-lg hover:bg-white/10 transition-colors shrink-0 ml-2"
                            >
                              <Download size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {documents.externalVideos.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-teal uppercase tracking-widest flex items-center gap-2">
                    <Play size={12} /> Video Walkthrough
                  </p>
                  <div className="space-y-4">
                    {(() => {
                      const getEmbedInfo = (vid) => {
                        if (!vid || !vid.url) return null;
                        const raw = vid.url.trim();
                        try {
                          const u = new URL(raw);
                          let videoId = null;
                          if (u.hostname.includes("youtube.com")) {
                            videoId = u.searchParams.get("v");
                            if (!videoId) {
                              const seg = u.pathname.split("/").filter(Boolean);
                              if (seg.length >= 2 && ["shorts", "live", "embed", "v"].includes(seg[0])) {
                                videoId = seg[1];
                              }
                            }
                          } else if (u.hostname === "youtu.be") {
                            videoId = u.pathname.slice(1);
                          }
                          if (videoId) {
                            return {
                              embedUrl: `https://www.youtube.com/embed/${videoId}`,
                              thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                              caption: vid.caption
                            };
                          }
                        } catch {}
                        return { rawUrl: raw, caption: vid.caption };
                      };

                      const videoInfos = documents.externalVideos.map(getEmbedInfo).filter(Boolean);
                      if (videoInfos.length === 0) return null;

                      const activeInfo = videoInfos[activeExternalVideoIndex] || videoInfos[0];

                      return (
                        <div className="flex flex-col gap-4">
                          {activeInfo.embedUrl ? (
                            <div className="space-y-3">
                              <div className="aspect-video rounded-2xl overflow-hidden border border-teal/20 bg-navy">
                                <iframe
                                  width="100%"
                                  height="100%"
                                  src={activeInfo.embedUrl}
                                  title="Active Video"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                              {activeInfo.caption && (
                                <p className="text-sm font-medium text-white px-1">{activeInfo.caption}</p>
                              )}
                            </div>
                          ) : (
                            <a
                              href={activeInfo.rawUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-4 bg-navy border border-teal/20 rounded-2xl hover:border-teal/50 transition-all"
                            >
                              <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">
                                <Play size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white">
                                  {activeInfo.caption || "Property Video Link"}
                                </p>
                                <p className="text-xs text-teal truncate">
                                  {activeInfo.rawUrl}
                                </p>
                              </div>
                              <ExternalLink size={16} className="text-gray-500 shrink-0" />
                            </a>
                          )}

                          {/* Thumbnails row */}
                          {videoInfos.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                              {videoInfos.map((info, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => setActiveExternalVideoIndex(idx)}
                                  className={`relative shrink-0 w-32 aspect-video rounded-xl overflow-hidden border-2 transition-all ${activeExternalVideoIndex === idx ? 'border-teal' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                  {info.thumbnailUrl ? (
                                    <>
                                      <img src={info.thumbnailUrl} alt={`Video ${idx+1}`} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <Play size={20} className="text-white drop-shadow-md" />
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full bg-navy flex items-center justify-center border border-teal/20">
                                      <Play size={20} className="text-teal" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {documents.images.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-teal uppercase tracking-widest flex items-center gap-2">
                    <Eye size={12} /> Images
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents.images.map((img, idx) => (
                      <div key={idx} className="space-y-2">
                        <div
                          className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 bg-navy cursor-pointer relative group"
                          onClick={() =>
                            setPreviewImg({
                              url: img.url,
                              caption: img.caption || img.fileName,
                            })
                          }
                        >
                          <img
                            src={img.url}
                            alt={img.caption || img.fileName || "Image"}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <Eye size={18} className="text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white leading-tight">
                              {img.caption || img.fileName || "—"}
                            </p>
                            <p className="text-[10px] text-teal/70 font-medium mt-0.5">
                              {typeLabel(img.documentType)}
                              {fmtSize(img.fileSizeBytes)
                                ? ` · ${fmtSize(img.fileSizeBytes)}`
                                : ""}
                            </p>
                          </div>
                          {img.url && (
                            <div className="flex gap-2 shrink-0 ml-2">
                              <button
                                onClick={() =>
                                  setPreviewImg({
                                    url: img.url,
                                    caption: img.caption || img.fileName,
                                  })
                                }
                                className="p-2 text-teal bg-teal/10 rounded-lg hover:bg-teal hover:text-navy transition-colors"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDownload(
                                    img.url,
                                    img.fileName || img.caption || "image",
                                  )
                                }
                                className="p-2 text-gray-500 hover:text-teal bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                              >
                                <Download size={15} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(documents.pdfs.length > 0 || documents.others.length > 0) && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-teal uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} /> Reports & Documents
                  </p>
                  <div className="space-y-2">
                    {[...documents.pdfs, ...documents.others].map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-4 bg-navy border border-white/5 rounded-2xl hover:border-teal/30 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">
                            {doc.caption || doc.fileName || "—"}
                          </p>
                          <p className="text-[11px] text-teal/70 font-medium mt-0.5">
                            {typeLabel(doc.documentType)}
                            {fmtSize(doc.fileSizeBytes)
                              ? ` · ${fmtSize(doc.fileSizeBytes)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {doc.url && (
                            <button
                              onClick={() => setPreviewDoc(doc.url)}
                              className="p-2 text-teal bg-teal/10 rounded-lg hover:bg-teal hover:text-navy transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-500 hover:text-teal bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Download size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {[
                { label: "BNP Report", link: assignment?.bnpReportLink },
                {
                  label: "Finance Letter",
                  link: assignment?.financeLetterLink,
                },
                { label: "Contract", link: assignment?.contractDownloadLink },
                { label: "DocuSign", link: assignment?.docusignLink },
                {
                  label: "Cashflow Analysis",
                  link: assignment?.cashflowDocLink,
                },
              ].filter((item) => item.link).length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-teal uppercase tracking-widest flex items-center gap-2">
                    <ExternalLink size={12} /> Assignment Documents
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "BNP Report", link: assignment?.bnpReportLink },
                      {
                        label: "Finance Letter",
                        link: assignment?.financeLetterLink,
                      },
                      {
                        label: "Contract",
                        link: assignment?.contractDownloadLink,
                      },
                      { label: "DocuSign", link: assignment?.docusignLink },
                      {
                        label: "Cashflow Analysis",
                        link: assignment?.cashflowDocLink,
                      },
                    ]
                      .filter((item) => item.link)
                      .map((item, idx) => (
                        <a
                          key={idx}
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-teal/5 border border-teal/20 rounded-2xl hover:bg-teal/10 transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-teal/20 flex items-center justify-center text-teal shrink-0">
                            <ExternalLink size={18} />
                          </div>
                          <p className="text-sm font-bold text-white flex-1">
                            {item.label}
                          </p>
                          <Download size={16} className="text-teal shrink-0" />
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 7. Agent Notes (editable by admin) */}
          <div className="bg-navy border border-teal/10 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-teal" size={24} />
                <h3 className="text-xl font-bold text-white">
                  BuyersMatch Notes
                </h3>
              </div>
              <button
                onClick={handleSaveNotes}
                disabled={
                  notesSaving || notesDraft === (assignment?.agentNotes || "")
                }
                className="flex items-center gap-2 px-5 py-2 bg-teal text-navy font-bold text-sm rounded-xl hover:bg-teal/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {notesSaving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                {notesSaving ? "Saving..." : "Save Notes"}
              </button>
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Add notes about this property for the client..."
              rows={6}
              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-teal/50 resize-y leading-relaxed transition-colors"
            />
          </div>

          {/* 8. Property Notes */}
          <div className="bg-navy border border-teal/10 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-teal" size={24} />
              <h3 className="text-xl font-bold text-white">My Notes</h3>
            </div>
            <p className="text-gray-400 leading-relaxed">
              {property.notes ||
                "No additional notes available for this property at this time."}
            </p>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {previewImg && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
          <div
            className="relative max-w-5xl w-full flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center px-2">
              <p className="text-white font-bold text-sm truncate max-w-[80%]">
                {previewImg.caption || "Image Preview"}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleDownload(
                      previewImg.url,
                      previewImg.caption || "image",
                    )
                  }
                  className="p-2 text-teal bg-teal/10 rounded-xl hover:bg-teal hover:text-navy transition-colors"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setPreviewImg(null)}
                  className="p-2 text-gray-400 hover:text-white bg-white/10 rounded-xl transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>
            <div className="w-full max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden border border-white/10">
              <img
                src={previewImg.url}
                alt={previewImg.caption || "Preview"}
                className="max-w-full max-h-[80vh] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview */}
      {previewDoc && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewDoc(null)}
          />
          <div className="relative bg-navy border border-teal/30 rounded-3xl p-4 w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4 px-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="text-teal" size={24} /> Document Preview
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle size={28} />
              </button>
            </div>
            <div className="flex-1 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <object
                data={previewDoc}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                  <AlertCircle size={48} className="text-gray-500" />
                  <p className="text-white font-bold text-lg">
                    Unable to load preview
                  </p>
                  <a
                    href={previewDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-teal text-navy rounded-xl font-bold mt-4"
                  >
                    Download PDF instead
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPropertyDetail;
