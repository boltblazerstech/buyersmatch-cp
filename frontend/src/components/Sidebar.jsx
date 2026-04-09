import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, User, LogOut, X } from 'lucide-react';
import { logout, getStoredUser } from '../api/client';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Properties', path: '/dashboard', icon: Building2 },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-[240px] bg-navy border-r border-teal/30 z-50
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-2xl font-bold text-teal tracking-tight">
              Buyers Match
            </h1>
            <button onClick={toggleSidebar} className="lg:hidden text-white hover:text-teal">
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                  ${isActive 
                    ? 'text-teal border-l-3 border-teal bg-teal/10' 
                    : 'text-white hover:bg-teal/20'}
                `}
                onClick={() => window.innerWidth < 1024 && toggleSidebar()}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="pt-6 border-t border-teal/30">
            <div className="mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Logged in as</p>
              <p className="text-white font-semibold truncate">
                {user?.greetingName || user?.email || 'Client'}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-white hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
