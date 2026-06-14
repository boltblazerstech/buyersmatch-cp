import React, { useEffect, useState } from "react";
import SuperAdminLayout from "../../components/SuperAdminLayout";
import { getSuperAdminStats, updateAdminLimit, superAdminOffboardClient, superAdminOnboardClient, superAdminGetAllBuyerBriefs } from "../../api/admin";
import { getStoredUser } from "../../api/auth";
import { useToast } from "../../components/Toast";
import { ShieldAlert, Trash2, UserPlus, Save, Loader2, UserMinus } from "lucide-react";
import { Navigate } from "react-router-dom";

const SuperAdminDashboard = () => {
  const adminUser = getStoredUser("SUPER_ADMIN");
  const toast = useToast();
  
  const [admins, setAdmins] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // Limit edits
  const [edits, setEdits] = useState({});

  useEffect(() => {
    if (adminUser?.isSuperAdmin) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [adminUser]);

  const loadData = async () => {
    try {
      const [adminData, clientData] = await Promise.all([
        getSuperAdminStats(),
        superAdminGetAllBuyerBriefs()
      ]);
      setAdmins(adminData.admins || adminData);
      setClients(clientData || []);
    } catch (err) {
      toast("Failed to load super admin data", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!adminUser?.isSuperAdmin) {
    return <Navigate to="/super-admin/login" replace />;
  }

  if (loading) {
    return (
      <SuperAdminLayout title="Super Admin Dashboard">
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={40} /></div>
      </SuperAdminLayout>
    );
  }

  const handleEditChange = (adminId, val) => {
    setEdits(prev => ({ ...prev, [adminId]: val }));
  };

  const handleSaveLimit = async (admin) => {
    const newLimit = parseInt(edits[admin.id]);
    if (isNaN(newLimit)) return;

    setUpdatingId(admin.id);
    try {
      await updateAdminLimit(admin.id, newLimit);
      toast(`Updated limit for ${admin.email}`);
      await loadData();
      setEdits(prev => {
        const next = { ...prev };
        delete next[admin.id];
        return next;
      });
    } catch (err) {
      toast("Failed to update limit", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOnboardClient = async (client) => {
    if (!window.confirm(`Are you sure you want to manually onboard ${client.fullName}?`)) return;
    setUpdatingId(client.id);
    try {
      const password = Math.random().toString(36).slice(-8); // Generate random password
      await superAdminOnboardClient({
        buyerBriefId: client.id,
        fullName: client.fullName,
        email: client.email,
        password: password
      });
      toast(`${client.fullName} onboarded manually!`);
      await loadData();
    } catch (err) {
      toast(err.message || "Failed to onboard client", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOffboardClient = async (client) => {
    if (!window.confirm(`WARNING: Offboarding ${client.fullName} will permanently remove their access. Proceed?`)) return;
    setUpdatingId(client.id);
    try {
      await superAdminOffboardClient(client.id);
      toast(`${client.fullName} offboarded.`);
      await loadData();
    } catch (err) {
      toast(err.message || "Failed to offboard client", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SuperAdminLayout title="Super Admin Dashboard">
      <div className="space-y-8">
        
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-4">
          <ShieldAlert className="text-orange-500 shrink-0" />
          <div>
            <h3 className="text-orange-500 font-bold">Super Admin Access</h3>
            <p className="text-orange-400/80 text-sm">
              You have elevated privileges. You can manage billing limits and force onboard/offboard clients.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4">Admin Onboarding Limits</h2>
          <div className="bg-[#1B2A4A] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Admin Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Total Onboarded</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Limit</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td className="px-6 py-4 text-white">{admin.email}</td>
                    <td className="px-6 py-4 text-center text-teal font-bold">{admin.totalOnboarded || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="number"
                        className="w-24 bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-center text-white focus:border-teal outline-none"
                        value={edits[admin.id] !== undefined ? edits[admin.id] : admin.onboardingLimit}
                        onChange={e => handleEditChange(admin.id, e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {edits[admin.id] !== undefined && edits[admin.id] !== String(admin.onboardingLimit) && (
                        <button
                          onClick={() => handleSaveLimit(admin)}
                          disabled={updatingId === admin.id}
                          className="px-4 py-1.5 bg-teal text-navy rounded-lg text-sm font-bold hover:bg-teal/90 transition-all disabled:opacity-50 inline-flex items-center gap-2"
                        >
                          {updatingId === admin.id ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No standard admins found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4 mt-8">All Platform Clients</h2>
          <div className="bg-[#1B2A4A] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Client Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map(client => {
                  const isOnboarded = client.onboarded || client.portalUser != null;
                  return (
                    <tr key={client.id}>
                      <td className="px-6 py-4 text-white font-medium">{client.fullName || client.dealName}</td>
                      <td className="px-6 py-4 text-gray-400">{client.email}</td>
                      <td className="px-6 py-4 text-center">
                        {isOnboarded ? (
                          <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-lg text-xs font-bold uppercase">Active</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-lg text-xs font-bold uppercase">Unboarded</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isOnboarded ? (
                          <button
                            onClick={() => handleOffboardClient(client)}
                            disabled={updatingId === client.id}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {updatingId === client.id ? <Loader2 className="animate-spin" size={14} /> : <UserMinus size={14} />} Offboard
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOnboardClient(client)}
                            disabled={updatingId === client.id}
                            className="px-3 py-1.5 bg-teal/10 border border-teal/20 text-teal hover:bg-teal hover:text-navy rounded-lg text-xs font-bold transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                          >
                            {updatingId === client.id ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />} Onboard
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No clients found in system.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
