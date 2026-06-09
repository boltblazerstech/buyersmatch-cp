import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, ShieldAlert } from "lucide-react";
import { superAdminLogout } from "../api/auth";
import logo from "../assets/bm-logo-white-text-1B2A4A.jpg";
import { getStoredUser } from "../api/auth";

const SuperAdminLayout = ({ children, title }) => {
  const navigate = useNavigate();
  const user = getStoredUser("SUPER_ADMIN");

  const handleLogout = async () => {
    await superAdminLogout();
    navigate("/super-admin/login");
  };

  return (
    <div className="min-h-screen bg-[#0A1128] text-white font-sans flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-orange-500/10 flex items-center justify-between px-6 lg:px-10 sticky top-0 bg-[#0A1128]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-6">
          <Link
            to="/super-admin/clients"
            className="flex items-center gap-3 group flex-shrink-0"
          >
            <img
              src={logo}
              alt="BuyersMatch"
              className="h-10 w-auto group-hover:scale-105 transition-transform"
            />
            <div className="hidden sm:block border-l border-orange-500/30 pl-3">
              <p className="text-[10px] text-orange-500 uppercase tracking-widest font-bold flex items-center gap-1">
                <ShieldAlert size={12} /> Root Access
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <p className="text-sm font-bold truncate max-w-[150px] text-orange-400">
              {user?.email}
            </p>
            <p className="text-[10px] text-orange-500/70 uppercase tracking-widest">
              Super Admin
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

export default SuperAdminLayout;
