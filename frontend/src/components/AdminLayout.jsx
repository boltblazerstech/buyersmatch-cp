import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, RefreshCw, Image } from "lucide-react";
import { adminLogout, getStoredUser } from "../api/client";
import logo from "../assets/bm-logo-white-text-1B2A4A.jpg";

const timeAgo = (isoString) => {
  if (!isoString) return "Never";
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(isoString);
  return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
};

// watchModules: array of sync_state module names to poll for completion
const SyncButton = ({ label, icon: Icon, endpoint, colorClass, activeColorClass, lastSyncedAt, watchModules, onDone }) => {
  const [state, setState] = useState("idle"); // idle | syncing | done | error
  const pollRef   = useRef(null);
  const snapshotRef = useRef(0); // lastSyncedAt value captured at click time

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const handleClick = async () => {
    if (state === "syncing") return;

    // Snapshot the current timestamp before firing so we can detect when it advances
    snapshotRef.current = lastSyncedAt ? new Date(lastSyncedAt).getTime() : 0;
    setState("syncing");

    try {
      const { triggerSync, getSyncStatus } = await import('../api/admin');
      await triggerSync(endpoint);

      const deadline = Date.now() + 5 * 60 * 1000; // 5-minute timeout

      pollRef.current = setInterval(async () => {
        if (Date.now() > deadline) {
          stopPolling();
          setState("error"); // timed out
          setTimeout(() => setState("idle"), 3000);
          return;
        }
        try {
          const modules = await getSyncStatus();
          const map = {};
          (Array.isArray(modules) ? modules : []).forEach(m => { map[m.module] = m.lastSyncedAt; });

          // Find the most recent timestamp across all watched modules
          const latest = watchModules
            .map(mod => map[mod] ? new Date(map[mod]).getTime() : 0)
            .reduce((a, b) => Math.max(a, b), 0);

          if (latest > snapshotRef.current) {
            stopPolling();
            setState("done");
            if (onDone) onDone();
            setTimeout(() => setState("idle"), 3000);
          }
        } catch { /* ignore transient poll errors */ }
      }, 3000);

    } catch {
      stopPolling();
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label_ =
    state === "syncing" ? "Syncing..." :
    state === "done"    ? "Done ✓" :
    state === "error"   ? "Failed ✗" :
    label;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={handleClick}
        disabled={state === "syncing"}
        className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all
          ${state === "done"    ? "bg-green-500/20 border-green-500/40 text-green-400" :
            state === "error"   ? "bg-red-500/20 border-red-500/40 text-red-400" :
            state === "syncing" ? `${colorClass} opacity-60 cursor-wait` :
            `${colorClass} ${activeColorClass}`}
        `}
      >
        <Icon size={16} className={state === "syncing" ? "animate-spin" : ""} />
        <span className="hidden sm:inline">{label_}</span>
      </button>
      <span className="text-[9px] text-gray-500 hidden sm:block">
        Last: {timeAgo(lastSyncedAt)}
      </span>
    </div>
  );
};

const AdminLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser("ADMIN");
  const [syncStatus, setSyncStatus] = useState({});

  const loadSyncStatus = async () => {
    try {
      const { getSyncStatus } = await import('../api/admin');
      const modules = await getSyncStatus();
      const map = {};
      (Array.isArray(modules) ? modules : []).forEach(m => { map[m.module] = m.lastSyncedAt; });
      setSyncStatus(map);
    } catch { /* silent */ }
  };

  useEffect(() => {
    loadSyncStatus();
    const id = setInterval(loadSyncStatus, 60000);
    return () => clearInterval(id);
  }, []);

  // Data last sync = most recent across the 4 text modules
  const dataModules = ["BuyerBriefs", "Properties", "PropertyDocuments", "ClientManagement"];
  const dataLastSync = dataModules
    .map(m => syncStatus[m])
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#0A1128] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 lg:px-10 sticky top-0 bg-[#0A1128]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <Link
            to="/admin/clients"
            className="flex items-center gap-3 group flex-shrink-0"
          >
            <img
              src={logo}
              alt="BuyersMatch"
              className="h-10 w-auto group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block border-l border-white/10 pl-3">
              <p className="text-[10px] text-teal uppercase tracking-widest font-bold">
                Admin Portal
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <p className="text-sm font-bold truncate max-w-[150px]">
              {user?.email}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Administrator
            </p>
          </div>

          <SyncButton
            label="Sync Data"
            icon={RefreshCw}
            endpoint="data"
            colorClass="bg-teal/10 border-teal/30 text-teal"
            activeColorClass="hover:bg-teal hover:text-navy"
            lastSyncedAt={dataLastSync}
            watchModules={["BuyerBriefs", "Properties", "PropertyDocuments", "ClientManagement"]}
            onDone={loadSyncStatus}
          />

          <SyncButton
            label="Sync Media"
            icon={Image}
            endpoint="media"
            colorClass="bg-purple-500/10 border-purple-500/30 text-purple-400"
            activeColorClass="hover:bg-purple-500 hover:text-white"
            lastSyncedAt={syncStatus["Media"] ?? null}
            watchModules={["Media"]}
            onDone={loadSyncStatus}
          />

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;
