import React, { useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import NotificationBell from './NotificationBell';
import BottomNav from './BottomNav';
import InstallBanner from './InstallBanner';
import logo from '../assets/bm-logo-white-text-1B2A4A.jpg';

// ── Pull-to-refresh ──────────────────────────────────────────────────────────
const THRESHOLD = 72;

const PullToRefresh = ({ children }) => {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const dragging = useRef(false);
  const distRef = useRef(0);

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].pageY;
      dragging.current = true;
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    const raw = e.touches[0].pageY - startY.current;
    if (raw > 0 && window.scrollY === 0) {
      e.preventDefault();
      const d = Math.min(raw * 0.45, THRESHOLD + 16);
      distRef.current = d;
      setPullDist(d);
    } else if (raw <= 0) {
      dragging.current = false;
      distRef.current = 0;
      setPullDist(0);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    if (distRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPullDist(THRESHOLD);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } else {
      setPullDist(0);
      distRef.current = 0;
    }
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const progress = Math.min(pullDist / THRESHOLD, 1);

  return (
    <div ref={containerRef} style={{ overscrollBehavior: 'contain' }} className="flex-1 flex flex-col">
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pullDist > 6 ? `${pullDist}px` : '0px' }}
      >
        <div
          className={`w-8 h-8 rounded-full border-2 border-teal border-t-transparent ${
            refreshing || pullDist >= THRESHOLD ? 'animate-spin' : ''
          }`}
          style={{ transform: !refreshing ? `rotate(${progress * 300}deg)` : undefined, opacity: Math.max(progress, 0.3) }}
        />
      </div>
      {children}
    </div>
  );
};

// ── Layout ───────────────────────────────────────────────────────────────────
const Layout = ({ children, title }) => {
  return (
    <div className="min-h-screen bg-[#0F1E35] text-white flex flex-col">
      {/* Top Bar */}
      <header className="h-16 bg-navy border-b border-teal/20 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={logo} alt="BuyersMatch" className="h-8 w-auto" />
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

      {/* Content with pull-to-refresh */}
      <PullToRefresh>
        <main className="flex-1 p-6 pb-28 md:pb-10 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </PullToRefresh>

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Install banner (fixed, sits above bottom nav) */}
      <InstallBanner />
    </div>
  );
};

export default Layout;
