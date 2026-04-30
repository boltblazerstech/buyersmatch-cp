import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, RefreshCw, Image, X, CheckCircle2, AlertCircle } from "lucide-react";
import { adminLogout, getStoredUser } from "../api/client";
import logo from "../assets/bm-logo-white-text-1B2A4A.jpg";

// Backend stores LocalDateTime (no TZ) in UTC — append Z so JS parses as UTC, then convert to IST
const toUtcDate = (isoString) => {
  if (!isoString) return null;
  if (typeof isoString !== "string") return new Date(isoString);
  return new Date(isoString.includes("Z") || isoString.includes("+") ? isoString : isoString + "Z");
};

const formatIST = (isoString) => {
  const d = toUtcDate(isoString);
  if (!d || isNaN(d.getTime())) return "Never";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const SyncResultPopup = ({ label, logs, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 10000);
    return () => clearTimeout(t);
  }, [onClose]);

  const completedLogs = logs.filter(l => l.status === "SUCCESS" || l.status === "FAILED");
  const lastCompleted = completedLogs[0];

  return (
    <div className="fixed top-24 right-6 z-[200] w-80 bg-[#0D1B35] border border-teal/30 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 bg-teal/10 border-b border-teal/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-teal" />
          <span className="text-sm font-bold text-white">{label} Complete</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">
        {completedLogs.length === 0 ? (
          <p className="text-xs text-gray-400">No log data available.</p>
        ) : (
          completedLogs.map((log, i) => {
            const durationMs = log.completedAt && log.startedAt
              ? new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()
              : null;
            const durationStr = durationMs != null
              ? durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`
              : "—";
            return (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">{log.module}</span>
                <div className="flex items-center gap-3">
                  <span className={log.status === "FAILED" ? "text-red-400" : "text-teal font-bold"}>
                    {log.recordsSynced ?? 0} records
                  </span>
                  <span className="text-gray-500 w-10 text-right">{durationStr}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      {lastCompleted?.completedAt && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-[10px] text-gray-500">
            Completed {formatIST(lastCompleted.completedAt)} IST
          </p>
        </div>
      )}
    </div>
  );
};

// watchModules: array of sync_state module names to poll for completion
const SyncButton = ({ label, icon: Icon, endpoint, colorClass, activeColorClass, lastSyncedAt, watchModules, logModules, onDone }) => {
  const [state, setState] = useState("idle"); // idle | syncing | done | error
  const [resultLogs, setResultLogs] = useState(null);
  const pollRef    = useRef(null);
  const snapshotRef  = useRef(0); // lastSyncedAt value before click
  const clickTimeRef = useRef(0); // epoch ms when button was clicked

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const handleClick = async () => {
    if (state === "syncing") return;

    snapshotRef.current = lastSyncedAt ? (toUtcDate(lastSyncedAt)?.getTime() ?? 0) : 0;
    clickTimeRef.current = Date.now();
    setState("syncing");
    setResultLogs(null);

    try {
      const { triggerSync, getSyncStatus, getSyncLogs } = await import('../api/admin');
      await triggerSync(endpoint);

      const deadline = Date.now() + 10 * 60 * 1000;

      pollRef.current = setInterval(async () => {
        if (Date.now() > deadline) {
          stopPolling();
          setState("error");
          setTimeout(() => setState("idle"), 3000);
          return;
        }
        try {
          const modules = await getSyncStatus();
          const map = {};
          (Array.isArray(modules) ? modules : []).forEach(m => { map[m.module] = m.lastSyncedAt; });

          const latest = watchModules
            .map(mod => map[mod] ? (toUtcDate(map[mod])?.getTime() ?? 0) : 0)
            .reduce((a, b) => Math.max(a, b), 0);

          if (latest > snapshotRef.current) {
            stopPolling();
            setState("done");
            if (onDone) onDone(map); // pass map directly — no second fetch needed
            // Fetch sync logs for popup
            try {
              const logs = await getSyncLogs(logModules ?? watchModules, clickTimeRef.current);
              setResultLogs(logs);
            } catch { /* non-critical */ }
            setTimeout(() => setState("idle"), 10000);
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
    <>
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
          Last: {formatIST(lastSyncedAt)}
        </span>
      </div>
      {state === "done" && resultLogs && (
        <SyncResultPopup
          label={label}
          logs={resultLogs}
          onClose={() => { setResultLogs(null); setState("idle"); }}
        />
      )}
    </>
  );
};

const AdminLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser("ADMIN");
  const [syncStatus, setSyncStatus] = useState({});

  const loadSyncStatus = async (directMap) => {
    if (directMap) { setSyncStatus(directMap); return; }
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
  const dataLastSync = dataModules.map(m => syncStatus[m]).filter(Boolean).sort().at(-1) ?? null;

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
            logModules={["BuyerBriefs", "Properties", "PropertyDocuments", "ClientManagement"]}
            onDone={loadSyncStatus}
          />

          <SyncButton
            label="Sync Media"
            icon={Image}
            endpoint="media"
            colorClass="bg-purple-500/10 border-purple-500/30 text-purple-400"
            activeColorClass="hover:bg-purple-500 hover:text-white"
            lastSyncedAt={syncStatus["MediaSync"] ?? null}
            watchModules={["MediaSync"]}
            logModules={["Media"]}
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
