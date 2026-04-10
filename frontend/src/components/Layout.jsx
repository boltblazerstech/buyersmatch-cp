import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import NotificationBell from "./NotificationBell";
import { BRAND } from "../config/brand";
import logo from "../assets/bm-logo-white-text-1B2A4A.jpg";

const Layout = ({ children, title }) => {
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--color-primary",
      BRAND.primary,
    );
    document.documentElement.style.setProperty("--color-dark", BRAND.dark);
    document.documentElement.style.setProperty("--color-accent", BRAND.accent);
  }, []);

  return (
    <div className="min-h-screen bg-[#0F1E35] text-white flex flex-col">
      {/* Top Bar */}
      <header className="h-16 bg-navy border-b border-teal/20 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <Link
            to="/dashboard"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            {BRAND.name}
            {/* <img src={logo} alt={BRAND.name} className="h-8 w-auto" /> */}
          </Link>
          <h2 className="hidden md:block text-lg font-medium text-white/60 tracking-tight border-l border-white/10 pl-8">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <Link
            to="/profile"
            className="w-8 h-8 rounded-full bg-teal/20 border border-teal/40 flex items-center justify-center text-teal hover:bg-teal/30 transition-all"
            title="View Profile"
          >
            <User size={16} />
          </Link>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
