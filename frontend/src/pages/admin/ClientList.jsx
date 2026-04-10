import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import {
  Search,
  ArrowRight,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit,
  X,
  Lock,
  Mail,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  getAllBuyerBriefs,
  resetClientPassword,
  createClient,
  updateClientEmail,
  deactivatePortalUser,
  reactivatePortalUser,
} from "../../api/client";
import { Link } from "react-router-dom";
import { useToast } from "../../components/Toast";
import { useDemoGuard } from "../../context/DemoContext";

const ALPHANUM =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const generatePassword = () =>
  Array.from(
    { length: 6 },
    () => ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)],
  ).join("");

const ClientList = () => {
  const toast = useToast();
  const { guard } = useDemoGuard();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Credentials modal (Active / Inactive)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [credentialForm, setCredentialForm] = useState({
    email: "",
    password: "",
  });
  const [showCredPwd, setShowCredPwd] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [credSendEmail, setCredSendEmail] = useState(false);

  // Onboard modal (Unboarded)
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardingClient, setOnboardingClient] = useState(null);
  const [onboardForm, setOnboardForm] = useState({ email: "", password: "" });
  const [showOnboardPwd, setShowOnboardPwd] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardSendEmail, setOnboardSendEmail] = useState(false);

  useEffect(() => {
    getAllBuyerBriefs()
      .then(setClients)
      .catch((err) => console.error("Error fetching clients:", err))
      .finally(() => setLoading(false));
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = clients.filter((c) => {
    const name = (c.fullName || "").toLowerCase();
    const email = (c.email || c.portalUser?.email || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || name.includes(q) || email.includes(q);

    let matchesTab = true;
    if (activeTab === "active")
      matchesTab = c.portalUser?.status === "onboarded";
    if (activeTab === "inactive")
      matchesTab = c.portalUser?.status === "deactivated";
    if (activeTab === "unboarded") matchesTab = !c.portalUser;

    return matchesSearch && matchesTab;
  });

  const tabCounts = {
    all: clients.length,
    active: clients.filter((c) => c.portalUser?.status === "onboarded").length,
    inactive: clients.filter((c) => c.portalUser?.status === "deactivated")
      .length,
    unboarded: clients.filter((c) => !c.portalUser).length,
  };

  // ── Deactivate / Reactivate ────────────────────────────────────────────────
  const handleDeactivate = async (briefId) => {
    try {
      await deactivatePortalUser(briefId);
      setClients((prev) =>
        prev.map((c) =>
          c.id === briefId
            ? { ...c, portalUser: { ...c.portalUser, status: "deactivated" } }
            : c,
        ),
      );
      toast("User deactivated.");
    } catch (err) {
      toast("Failed to deactivate: " + err.message, "error");
    }
  };

  const handleReactivate = async (briefId) => {
    try {
      await reactivatePortalUser(briefId);
      setClients((prev) =>
        prev.map((c) =>
          c.id === briefId
            ? { ...c, portalUser: { ...c.portalUser, status: "onboarded" } }
            : c,
        ),
      );
      toast("User reactivated.");
    } catch (err) {
      toast("Failed to reactivate: " + err.message, "error");
    }
  };

  // ── Credentials modal ──────────────────────────────────────────────────────
  const openCredentialsModal = (client) => {
    setEditingClient(client);
    setCredentialForm({
      email: client.portalUser?.email || client.email || "",
      password: "",
    });
    setShowCredPwd(false);
    setCredSendEmail(false);
    setShowCredentialsModal(true);
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    if (!guard(null, "Updating credentials is disabled in demo mode.")) return;
    setUpdating(true);
    const briefId = editingClient.id;
    const portalUserId = editingClient.portalUser?.id;
    try {
      const originalEmail =
        editingClient.portalUser?.email || editingClient.email;
      if (credentialForm.email !== originalEmail) {
        await updateClientEmail(briefId, credentialForm.email);
      }
      const newPwd = await resetClientPassword(
        portalUserId,
        credentialForm.password,
        credSendEmail,
      );
      setClients((prev) =>
        prev.map((c) =>
          c.id === briefId
            ? {
                ...c,
                portalUser: {
                  ...c.portalUser,
                  email: credentialForm.email,
                  password: newPwd || credentialForm.password,
                },
              }
            : c,
        ),
      );
      setShowCredentialsModal(false);
      toast("Credentials updated!");
    } catch (err) {
      toast("Failed to update: " + err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  // ── Onboard modal ──────────────────────────────────────────────────────────
  const openOnboardModal = (client) => {
    setOnboardingClient(client);
    setOnboardForm({ email: client.email || "", password: "" });
    setShowOnboardPwd(true);
    setOnboardSendEmail(false);
    setShowOnboardModal(true);
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!guard(null, "Onboarding clients is disabled in demo mode.")) return;
    setOnboarding(true);
    try {
      const result = await createClient({
        buyerBriefId: onboardingClient.id,
        loginEmail: onboardForm.email,
        password: onboardForm.password,
        sendEmail: onboardSendEmail,
      });
      setClients((prev) =>
        prev.map((c) =>
          c.id === onboardingClient.id
            ? {
                ...c,
                portalUser: {
                  id: result.id,
                  email: onboardForm.email,
                  status: "onboarded",
                  password: onboardForm.password,
                },
              }
            : c,
        ),
      );
      setShowOnboardModal(false);
      toast(`${onboardingClient.fullName} onboarded successfully!`);
    } catch (err) {
      toast("Failed to onboard: " + err.message, "error");
    } finally {
      setOnboarding(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const statusBadge = (client) => {
    if (!client.portalUser) {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-gray-500/10 text-gray-400 border-gray-500/20">
          Unboarded
        </span>
      );
    }
    if (client.portalUser.status === "onboarded") {
      return (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-green-500/10 text-green-400 border-green-500/20">
          Active
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-500/10 text-red-400 border-red-500/20">
        Inactive
      </span>
    );
  };

  const tabs = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Unboarded", value: "unboarded" },
  ];

  return (
    <AdminLayout title="Client Management">
      <div className="space-y-8">
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="bg-[#1B2A4A] p-1.5 rounded-2xl border border-white/5 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.value
                    ? "bg-teal text-navy"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.value
                      ? "bg-navy/30 text-navy"
                      : "bg-white/10 text-gray-500"
                  }`}
                >
                  {tabCounts[tab.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="w-full bg-[#1B2A4A] border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-sm focus:border-teal outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#1B2A4A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-8">
                    Name
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Active Briefs
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Password
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right pr-8">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-20 text-center">
                      <Loader2
                        className="animate-spin text-teal mx-auto"
                        size={32}
                      />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-20 text-center text-gray-500 italic"
                    >
                      No {activeTab} clients found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <tr
                      key={client.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Name + Contact ID */}
                      <td className="px-6 py-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center text-teal font-bold text-sm shrink-0">
                            {(client.fullName || "?").charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-teal transition-colors">
                              {client.fullName || "Unnamed"}
                            </p>
                            {client.zohoContactId && (
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                {client.zohoContactId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-300">
                          {client.portalUser?.email || client.email || "—"}
                        </p>
                      </td>

                      {/* Active Briefs */}
                      <td className="px-6 py-4">
                        {client.activeBriefCount > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal/10 text-teal border border-teal/20">
                            {client.activeBriefCount}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>

                      {/* Password */}
                      <td className="px-6 py-4">
                        {client.portalUser ? (
                          <p className="text-sm font-mono text-teal bg-teal/5 px-2 py-1 rounded inline-block">
                            {client.portalUser.password || "—"}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 italic">
                            Not set
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">{statusBadge(client)}</td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right pr-8">
                        {!client.portalUser ? (
                          /* Unboarded — onboard button */
                          <button
                            onClick={() => guard(() => openOnboardModal(client), "Onboarding clients is disabled in demo mode.")}
                            className="flex items-center gap-2 px-4 py-2 bg-teal/10 text-teal border border-teal/30 rounded-xl text-xs font-bold hover:bg-teal hover:text-navy transition-all ml-auto"
                          >
                            <UserPlus size={14} /> Onboard
                          </button>
                        ) : (
                          /* Active / Inactive — management actions */
                          <div className="flex items-center justify-end gap-2">
                            {/* Toggle active/inactive */}
                            {client.portalUser.status === "onboarded" ? (
                              <button
                                onClick={() => guard(() => handleDeactivate(client.id), "Deactivating users is disabled in demo mode.")}
                                className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Deactivate"
                              >
                                <XCircle size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => guard(() => handleReactivate(client.id), "Reactivating users is disabled in demo mode.")}
                                className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-all"
                                title="Activate"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}

                            {/* Edit credentials */}
                            <button
                              onClick={() => guard(() => openCredentialsModal(client), "Editing credentials is disabled in demo mode.")}
                              className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-teal hover:bg-teal/10 transition-all"
                              title="Edit credentials"
                            >
                              <Key size={16} />
                            </button>

                            {/* View properties */}
                            <Link
                              to={`/admin/client/${client.id}`}
                              className="p-2 bg-white/5 rounded-xl text-gray-400 hover:text-teal hover:bg-teal/10 transition-all"
                              title="View properties"
                            >
                              <ArrowRight size={16} />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Edit Credentials Modal ─────────────────────────────────────────── */}
      {showCredentialsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCredentialsModal(false)}
          />
          <div className="relative bg-[#1B2A4A] border border-teal/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Edit Credentials</h3>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Updating credentials for{" "}
              <span className="text-white font-bold">
                {editingClient?.fullName}
              </span>
              . Leave password blank to keep unchanged.
            </p>
            <form onSubmit={handleUpdateCredentials} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Login Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    className="w-full bg-navy border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:border-teal outline-none transition-all"
                    value={credentialForm.email}
                    onChange={(e) =>
                      setCredentialForm({
                        ...credentialForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  New Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      size={16}
                    />
                    <input
                      type={showCredPwd ? "text" : "password"}
                      required
                      placeholder="Enter or generate"
                      className="w-full bg-navy border border-white/10 rounded-2xl py-3 pl-11 pr-10 text-sm font-mono focus:border-teal outline-none transition-all"
                      value={credentialForm.password}
                      onChange={(e) =>
                        setCredentialForm({
                          ...credentialForm,
                          password: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowCredPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-teal"
                    >
                      {showCredPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCredentialForm((f) => ({
                        ...f,
                        password: generatePassword(),
                      }));
                      setShowCredPwd(true);
                    }}
                    className="px-4 py-2 bg-teal/10 text-teal border border-teal/30 rounded-xl text-xs font-bold hover:bg-teal hover:text-navy transition-all whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>
              {/* <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={credSendEmail}
                    onChange={(e) => setCredSendEmail(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded-md border border-white/20 bg-navy peer-checked:bg-teal peer-checked:border-teal transition-all flex items-center justify-center">
                    {credSendEmail && (
                      <svg
                        className="w-3 h-3 text-navy"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Send Mail</p>
                  <p className="text-xs text-gray-500">
                    Email updated credentials to the client
                  </p>
                </div>
              </label> */}
              <button
                type="submit"
                disabled={updating}
                className="w-full py-3.5 bg-teal text-navy rounded-2xl text-sm font-bold hover:bg-teal/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "Save Changes"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Onboard Modal ──────────────────────────────────────────────────── */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowOnboardModal(false)}
          />
          <div className="relative bg-[#1B2A4A] border border-teal/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Onboard Client</h3>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={22} />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Creating portal access for{" "}
              <span className="text-white font-bold">
                {onboardingClient?.fullName}
              </span>
              .
            </p>
            <form onSubmit={handleOnboard} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Login Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="email"
                    required
                    className="w-full bg-navy border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:border-teal outline-none transition-all"
                    value={onboardForm.email}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Password
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                      size={16}
                    />
                    <input
                      type={showOnboardPwd ? "text" : "password"}
                      required
                      placeholder="Enter or generate"
                      className="w-full bg-navy border border-white/10 rounded-2xl py-3 pl-11 pr-10 text-sm font-mono focus:border-teal outline-none transition-all"
                      value={onboardForm.password}
                      onChange={(e) =>
                        setOnboardForm({
                          ...onboardForm,
                          password: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowOnboardPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-teal"
                    >
                      {showOnboardPwd ? (
                        <EyeOff size={15} />
                      ) : (
                        <Eye size={15} />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardForm((f) => ({
                        ...f,
                        password: generatePassword(),
                      }));
                      setShowOnboardPwd(true);
                    }}
                    className="px-4 py-2 bg-teal/10 text-teal border border-teal/30 rounded-xl text-xs font-bold hover:bg-teal hover:text-navy transition-all whitespace-nowrap"
                  >
                    Generate
                  </button>
                </div>
              </div>
              {/* <label className="flex items-center gap-3 cursor-pointer select-none group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={onboardSendEmail}
                    onChange={e => setOnboardSendEmail(e.target.checked)}
                  />
                  <div className="w-5 h-5 rounded-md border border-white/20 bg-navy peer-checked:bg-teal peer-checked:border-teal transition-all flex items-center justify-center">
                    {onboardSendEmail && <svg className="w-3 h-3 text-navy" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Send Mail</p>
                  <p className="text-xs text-gray-500">Email portal credentials to the client</p>
                </div>
              </label> */}
              <button
                type="submit"
                disabled={onboarding}
                className="w-full py-3.5 bg-teal text-navy rounded-2xl text-sm font-bold hover:bg-teal/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {onboarding ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <UserPlus size={16} /> Onboard Client
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ClientList;
