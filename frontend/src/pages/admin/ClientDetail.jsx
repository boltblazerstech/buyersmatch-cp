import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";
import { useToast } from "../../components/Toast";
import {
  ChevronLeft,
  Loader2,
  Building2,
  Search,
  Bed,
  Bath,
  Car,
  ArrowRight,
  MessageSquare,
  Save,
  X,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  getAdminClientProfile,
  getClientProperties,
  updateAgentNotes,
  getPropertyDocuments,
} from "../../api/client";

// Status badge color for buyer brief status
const BRIEF_STATUS_COLOR = {
  "New SignUp":       "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Brief Confirmed":  "bg-teal/20 text-teal border-teal/30",
  "Under Contract":   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Brief Completed":  "bg-green-500/20 text-green-300 border-green-500/30",
  "On Hold":          "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Closed":           "bg-red-500/20 text-red-400 border-red-500/30",
};

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [client, setClient] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [briefs, setBriefs] = useState([]);
  const [propertyImages, setPropertyImages] = useState({});
  const [loading, setLoading] = useState(true);

  // Search & tab filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");

  // Notes modal
  const [notesModal, setNotesModal] = useState(null); // { assignmentId, notes, address }
  const [savingNotes, setSavingNotes] = useState(false);

  // Buyer brief selector — "ALL" means show all non-closed brief properties
  const [selectedBriefId, setSelectedBriefId] = useState("ALL");
  const [briefDropdownOpen, setBriefDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profile, props] = await Promise.all([
          getAdminClientProfile(id),
          getClientProperties(id),
        ]);
        setClient(profile);
        const asgList = Array.isArray(props) ? props : props?.assignments || [];
        setAssignments(asgList);

        // Store briefs returned by the API (backend already strips Closed briefs)
        const briefsList = props?.briefs || [];
        setBriefs(briefsList);

        // Fetch first image for each assigned property
        const imageMap = {};
        await Promise.all(
          asgList.map(async (item) => {
            if (!item.propertyId) return;
            try {
              const docs = await getPropertyDocuments(item.propertyId);
              imageMap[item.propertyId] = docs.propertyImages?.[0]?.url || null;
            } catch {
              imageMap[item.propertyId] = null;
            }
          }),
        );
        setPropertyImages(imageMap);
      } catch (err) {
        console.error("Error fetching client details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const stats = useMemo(
    () => ({
      total: assignments.length,
      pending: assignments.filter((a) => a.portalStatus === "PENDING").length,
      accepted: assignments.filter((a) => a.portalStatus === "ACCEPTED").length,
      rejected: assignments.filter((a) => a.portalStatus === "REJECTED").length,
    }),
    [assignments],
  );

  // Build a lookup: zohoBriefId → brief object
  const briefLookup = useMemo(() => {
    const map = {};
    briefs.forEach((b) => { if (b.zohoBriefId) map[b.zohoBriefId] = b; });
    return map;
  }, [briefs]);

  // The active brief being shown (for displaying status badge etc.)
  const activeBrief = selectedBriefId === "ALL" ? null : briefs.find(
    (b) => b.id === selectedBriefId || b.zohoBriefId === selectedBriefId
  );

  const filteredAssignments = useMemo(() => assignments.filter((item) => {
    if (!item.property) return false;
    const matchesSearch =
      (item.property.addressLine1 || item.property.address || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (item.property.suburb || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "ALL" || item.portalStatus === activeTab;
    // Brief filter: if a specific brief is selected, only show assignments for that brief
    const matchesBrief =
      selectedBriefId === "ALL" ||
      item.zohoBriefId === selectedBriefId ||
      (activeBrief && item.zohoBriefId === activeBrief.zohoBriefId);
    return matchesSearch && matchesTab && matchesBrief;
  }), [assignments, searchQuery, activeTab, selectedBriefId, activeBrief]);

  const getStatusColor = (status) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-teal text-navy";
      case "REJECTED":
        return "bg-red-500 text-white";
      case "PURCHASED":
        return "bg-gold text-navy";
      default:
        return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    }
  };

  const openNotesModal = (item) => {
    setNotesModal({
      assignmentId: item.assignment?.id || item.id,
      notes: item.agentNotes || item.assignment?.agentNotes || "",
      address: item.property?.addressLine1 || item.property?.address || "",
    });
  };

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    setSavingNotes(true);
    try {
      await updateAgentNotes(notesModal.assignmentId, notesModal.notes);
      setAssignments((prev) =>
        prev.map((a) => {
          const asgId = a.assignment?.id || a.id;
          if (asgId !== notesModal.assignmentId) return a;
          return {
            ...a,
            agentNotes: notesModal.notes,
            assignment: a.assignment
              ? { ...a.assignment, agentNotes: notesModal.notes }
              : a.assignment,
          };
        }),
      );
      toast("Notes saved!");
      setNotesModal(null);
    } catch (err) {
      toast("Failed to save notes: " + err.message, "error");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-teal" size={48} />
        </div>
      </AdminLayout>
    );
  }

  const clientName =
    client?.fullName || client?.buyerBrief?.fullName || "Client";

  return (
    <AdminLayout title={clientName}>
      <div className="space-y-8">
        {/* Back */}
        <button
          onClick={() => navigate("/admin/clients")}
          className="flex items-center gap-2 text-gray-400 hover:text-teal transition-colors group"
        >
          <ChevronLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Back to Client Management
        </button>

        {/* Client Banner + Stats */}
        <div className="bg-teal/10 border border-teal/30 rounded-2xl p-6 lg:p-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-teal/20 flex items-center justify-center text-teal text-2xl font-bold shrink-0">
                {clientName.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{clientName}</h1>
                <p className="text-gray-400 text-sm mt-1">
                  {client?.loginEmail ||
                    client?.email ||
                    client?.buyerBrief?.email ||
                    ""}
                </p>
                {client?.zohoContactId && (
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    {client.zohoContactId}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: "Total",
                  value: stats.total,
                  color: "text-white",
                  bg: "bg-white/5",
                },
                {
                  label: "Assigned",
                  value: stats.pending,
                  color: "text-blue-300",
                  bg: "bg-blue-500/10",
                },
                {
                  label: "Accepted",
                  value: stats.accepted,
                  color: "text-teal",
                  bg: "bg-teal/10",
                },
                {
                  label: "Rejected",
                  value: stats.rejected,
                  color: "text-red-400",
                  bg: "bg-red-400/10",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className={`${s.bg} border border-white/10 px-4 py-3 rounded-xl text-center`}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-bold">
                    {s.label}
                  </p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Buyer Brief Selector — shown only when client has multiple non-closed briefs */}
        {briefs.length > 1 && (
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-teal" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Active Buyer Brief
              </span>
            </div>
            <div className="relative" style={{ minWidth: 280 }}>
              <button
                onClick={() => setBriefDropdownOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-3 bg-navy border border-teal/30 rounded-xl px-4 py-2.5 text-sm text-white hover:border-teal transition-all"
              >
                <span className="flex items-center gap-2 min-w-0">
                  {selectedBriefId === "ALL" ? (
                    <span className="text-gray-300">All Briefs</span>
                  ) : (
                    <>
                      <span className="text-white font-semibold truncate">
                        {activeBrief
                          ? (activeBrief.fullName || activeBrief.zohoName || activeBrief.zohoBriefId)
                          : selectedBriefId}
                      </span>
                      {activeBrief?.status && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                            BRIEF_STATUS_COLOR[activeBrief.status] ||
                            "bg-white/10 text-gray-300 border-white/20"
                          }`}
                        >
                          {activeBrief.status}
                        </span>
                      )}
                    </>
                  )}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform shrink-0 ${briefDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {briefDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#1B2A4A] border border-teal/30 rounded-xl shadow-2xl overflow-hidden">
                  {/* All option */}
                  <button
                    onClick={() => { setSelectedBriefId("ALL"); setBriefDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                      selectedBriefId === "ALL"
                        ? "bg-teal/20 text-teal"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="font-semibold">All Briefs</span>
                    <span className="text-[10px] text-gray-500">{assignments.length} properties</span>
                  </button>
                  <div className="border-t border-white/5" />
                  {briefs.map((brief) => {
                    const briefKey = brief.zohoBriefId || brief.id;
                    const isSelected = selectedBriefId === briefKey;
                    const briefName = brief.fullName || brief.zohoName || brief.zohoBriefId || "Brief";
                    const propCount = assignments.filter(
                      (a) => a.zohoBriefId === brief.zohoBriefId
                    ).length;
                    return (
                      <button
                        key={briefKey}
                        onClick={() => { setSelectedBriefId(briefKey); setBriefDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-teal/20 text-teal"
                            : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold truncate">{briefName}</span>
                          {brief.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                BRIEF_STATUS_COLOR[brief.status] ||
                                "bg-white/10 text-gray-300 border-white/20"
                              }`}
                            >
                              {brief.status}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0">{propCount} props</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Close dropdown on outside click */}
            {briefDropdownOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBriefDropdownOpen(false)}
              />
            )}
          </div>
        )}

        {/* Single brief info badge (when only 1 brief) */}
        {briefs.length === 1 && (() => {
          const b = briefs[0];
          return (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-navy border border-teal/20 rounded-xl w-fit">
              <FileText size={15} className="text-teal" />
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active Brief:</span>
              <span className="text-sm text-white font-semibold">{b.fullName || b.zohoName || b.zohoBriefId}</span>
              {b.status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${BRIEF_STATUS_COLOR[b.status] || "bg-white/10 text-gray-300 border-white/20"}`}>
                  {b.status}
                </span>
              )}
            </div>
          );
        })()}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by address or suburb..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy border border-teal/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-teal transition-all"
            />
          </div>
          <div className="flex bg-navy border border-teal/20 rounded-xl p-1">
            {["ALL", "PENDING", "ACCEPTED", "REJECTED"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-teal text-navy" : "text-gray-400 hover:text-white"}`}
              >
                {tab === "PENDING" ? "ASSIGNED" : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Properties Table */}
        {filteredAssignments.length > 0 ? (
          <div className="bg-navy border border-teal/20 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-teal/20">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Property
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Specs
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Price Range
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Yield
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAssignments.map((item) => {
                    const asgKey = item.assignment?.id || item.id;
                    const hasNotes = !!(
                      item.agentNotes || item.assignment?.agentNotes
                    );
                    return (
                      <tr
                        key={asgKey}
                        className="hover:bg-white/5 transition-colors group"
                      >
                        {/* Property */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/5">
                              {propertyImages[item.propertyId] ? (
                                <img
                                  src={propertyImages[item.propertyId]}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2
                                    size={16}
                                    className="text-gray-600"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">
                                {item.property.addressLine1 ||
                                  item.property.address}
                              </p>
                              <p className="text-teal text-xs">
                                {item.property.suburb}, {item.property.state}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Specs */}
                        <td className="px-6 py-4">
                          <div className="flex gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Bed size={12} /> {item.property.bedrooms ?? "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath size={12} />{" "}
                              {item.property.bathrooms ?? "—"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Car size={12} />{" "}
                              {item.property.carParking ?? "—"}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4">
                          <p className="text-gold font-bold text-sm">
                            ${item.property.askingPriceMin / 1000}k – $
                            {item.property.askingPriceMax / 1000}k
                          </p>
                        </td>

                        {/* Yield */}
                        <td className="px-6 py-4">
                          <p className="text-teal font-bold text-sm">
                            {item.property.yieldPercent}%
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(item.portalStatus)}`}
                          >
                            {item.portalStatus === "PENDING"
                              ? "ASSIGNED"
                              : item.portalStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openNotesModal(item)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                                hasNotes
                                  ? "bg-teal/10 text-teal border-teal/30 hover:bg-teal hover:text-navy"
                                  : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                              }`}
                              title="Agent Notes"
                            >
                              <MessageSquare size={13} />
                              Notes
                            </button>
                            <button
                              onClick={() =>
                                navigate(
                                  `/admin/client/${id}/property/${item.propertyId}`,
                                )
                              }
                              className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-teal hover:bg-teal/10 transition-all"
                              title="View property"
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="text-teal" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              No properties found
            </h3>
            <p className="text-gray-400 text-center max-w-sm">
              {searchQuery || activeTab !== "ALL"
                ? "Try adjusting your search or filters."
                : "No properties have been assigned to this client yet."}
            </p>
          </div>
        )}
      </div>

      {/* ── Notes Modal ────────────────────────────────────────────────────── */}
      {notesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setNotesModal(null)}
          />
          <div className="relative bg-[#1B2A4A] border border-teal/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="text-teal" size={20} />
                Buyers Match Notes
              </h3>
              <button
                onClick={() => setNotesModal(null)}
                className="text-gray-500 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>
            {notesModal.address && (
              <p className="text-gray-500 text-sm mb-6">{notesModal.address}</p>
            )}
            <textarea
              className="w-full bg-navy border border-white/10 rounded-2xl p-4 text-sm text-gray-300 focus:border-teal outline-none transition-all resize-none h-40"
              placeholder="Add specific remarks or advice for this client regarding this property..."
              value={notesModal.notes}
              onChange={(e) =>
                setNotesModal({ ...notesModal, notes: e.target.value })
              }
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setNotesModal(null)}
                className="flex-1 py-3 border border-white/10 text-gray-400 font-bold rounded-2xl hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex-1 py-3 bg-teal text-navy rounded-2xl font-bold hover:bg-teal/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingNotes ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Save size={16} /> Save Notes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ClientDetail;
