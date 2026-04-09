import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import NotificationBell from './NotificationBell';

const Layout = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-[#0F1E35] text-white flex flex-col">
      {/* Top Bar */}
      <header className="h-16 bg-navy border-b border-teal/20 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="text-xl font-bold text-teal tracking-tighter hover:opacity-80 transition-opacity">
            BUYERS MATCH
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
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
