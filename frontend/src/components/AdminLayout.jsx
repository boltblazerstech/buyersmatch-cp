import React, { useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { LogOut, Users, FileText, MessageSquare } from "lucide-react";
import { adminLogout, getStoredUser } from "../api/client";
import logo from "../assets/bm-logo-white-text-1B2A4A.jpg";
import { BRAND } from "../config/brand";

const AdminLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser("ADMIN");

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--color-primary",
      BRAND.primary,
    );
    document.documentElement.style.setProperty("--color-dark", BRAND.dark);
    document.documentElement.style.setProperty("--color-accent", BRAND.accent);
  }, []);

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
            {BRAND.name}
            {/* <img 
              src={logo} 
              alt={BRAND.name}
              className="h-10 w-auto group-hover:scale-105 transition-transform" 
            /> */}
            <div className="hidden sm:block border-l border-white/10 pl-3">
              <p className="text-[10px] text-teal uppercase tracking-widest font-bold">
                Admin Portal
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end">
            <p className="text-sm font-bold truncate max-w-[150px]">
              {user?.email}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">
              Administrator
            </p>
          </div>
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
