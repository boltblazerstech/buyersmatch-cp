import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, User } from 'lucide-react';

const BottomNav = () => {
  const { pathname } = useLocation();
  const [bellCount, setBellCount] = useState(0);

  // Receive unread count broadcast from NotificationBell
  useEffect(() => {
    const handler = (e) => setBellCount(e.detail?.count ?? 0);
    window.addEventListener('bm-notification-count', handler);
    return () => window.removeEventListener('bm-notification-count', handler);
  }, []);

  const openBell = () => {
    window.dispatchEvent(new CustomEvent('bm-open-notifications'));
  };

  const items = [
    { type: 'link', to: '/dashboard', icon: Home, label: 'Home' },
    { type: 'button', onClick: openBell, icon: Bell, label: 'Alerts', badge: bellCount },
    { type: 'link', to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy border-t border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = item.to && pathname === item.to;
          const Icon = item.icon;

          const inner = (
            <>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-teal rounded-full" />
              )}
              <div className="relative">
                <Icon size={22} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-gold text-navy text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 border border-navy">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
            </>
          );

          const cls = `relative flex flex-col items-center justify-center gap-0 flex-1 h-full transition-colors ${
            active ? 'text-teal' : 'text-gray-500'
          }`;

          return item.type === 'link' ? (
            <Link key={item.to} to={item.to} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={item.label} onClick={item.onClick} className={cls}>
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
