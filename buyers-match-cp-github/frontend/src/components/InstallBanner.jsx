import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

const DISMISSED_KEY = 'bm-install-dismissed';

// ── iOS device / browser detection ──────────────────────────────────────────
const getIOSContext = () => {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  // CriOS = Chrome, FxiOS = Firefox, OPiOS = Opera, EdgiOS = Edge, GSA = Google app
  const isNonSafariBrowser = /(CriOS|FxiOS|OPiOS|EdgiOS|GSA)/i.test(ua);
  return { isIOS, isStandalone, isNonSafariBrowser, isSafari: isIOS && !isNonSafariBrowser };
};

// ── Share icon (matches iOS share button exactly) ────────────────────────────
const IOSShareIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

// ── Add to Home Screen icon ──────────────────────────────────────────────────
const AddIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

// ── Step row ─────────────────────────────────────────────────────────────────
const Step = ({ number, text, sub, Icon }) => (
  <div className="flex items-center gap-4">
    <div className="w-7 h-7 rounded-full bg-teal/20 border border-teal/40 flex items-center justify-center shrink-0">
      <span className="text-teal text-xs font-bold">{number}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white leading-tight">{text}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    {Icon && (
      <div className="w-9 h-9 rounded-xl bg-[#0F1E35] border border-white/10 flex items-center justify-center text-teal shrink-0">
        <Icon />
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const InstallBanner = () => {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState(null); // 'ios-safari' | 'ios-other' | 'android'
  const [androidPrompt, setAndroidPrompt] = useState(null);
  const [visible, setVisible] = useState(false); // for slide-in animation

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const { isIOS, isStandalone, isNonSafariBrowser, isSafari } = getIOSContext();

    if (isStandalone) return; // already installed

    if (isIOS) {
      setMode(isSafari ? 'ios-safari' : 'ios-other');
      setShow(true);
      setTimeout(() => setVisible(true), 100); // allow mount before animating
      return;
    }

    // Android / desktop: wait for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setAndroidPrompt(e);
      setMode('android');
      setShow(true);
      setTimeout(() => setVisible(true), 100);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(DISMISSED_KEY, '1');
      setShow(false);
    }, 300);
  };

  const handleAndroidInstall = async () => {
    if (!androidPrompt) return;
    androidPrompt.prompt();
    const { outcome } = await androidPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
  };

  if (!show) return null;

  // ── iOS: not Safari ────────────────────────────────────────────────────────
  if (mode === 'ios-other') {
    return (
      <div
        className={`fixed bottom-[72px] left-4 right-4 z-50 transition-all duration-300 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="bg-[#1B2A4A] border border-amber-400/40 rounded-2xl p-4 shadow-2xl shadow-black/60 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Open in Safari to install</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">
              Copy this link and open it in <span className="text-amber-400 font-semibold">Safari</span> — only Safari supports adding to your home screen on iPhone.
            </p>
          </div>
          <button onClick={dismiss} className="text-gray-500 hover:text-white transition-colors shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── iOS Safari: step-by-step bottom sheet ──────────────────────────────────
  if (mode === 'ios-safari') {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          onClick={dismiss}
        />

        {/* Sheet */}
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
            visible ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="bg-[#1B2A4A] rounded-t-3xl border-t border-teal/30 shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 pt-4 pb-8">
              {/* App info */}
              <div className="flex items-center gap-4 mb-6">
                <img
                  src="/bm-logo-192x192.png"
                  alt="BuyersMatch"
                  className="w-14 h-14 rounded-2xl shadow-lg border border-white/10"
                />
                <div>
                  <p className="text-base font-bold text-white">BuyersMatch Portal</p>
                  <p className="text-xs text-teal font-medium mt-0.5">clientportal.buyersmatch.com.au</p>
                  <p className="text-xs text-gray-400 mt-1">Install for the full app experience</p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/8 mb-5" />

              {/* Steps */}
              <div className="space-y-4 mb-6">
                <Step
                  number="1"
                  text="Tap the Share button"
                  sub="at the bottom of Safari"
                  Icon={IOSShareIcon}
                />
                <Step
                  number="2"
                  text='Scroll and tap "Add to Home Screen"'
                  Icon={AddIcon}
                />
                <Step
                  number="3"
                  text='Tap "Add" in the top-right corner'
                  sub="The app icon will appear on your home screen"
                />
              </div>

              {/* Animated arrow pointing down to Safari toolbar */}
              <div className="flex flex-col items-center gap-1 mb-6">
                <p className="text-xs text-gray-500">Share button is down here</p>
                <div className="text-teal animate-bounce text-xl leading-none">↓</div>
              </div>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="w-full py-3 rounded-2xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all active:scale-95"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Android / desktop install prompt ──────────────────────────────────────
  return (
    <div
      className={`fixed bottom-[72px] md:bottom-5 left-4 right-4 z-50 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-[#1B2A4A] border border-teal/40 rounded-2xl p-4 shadow-2xl shadow-black/60 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-teal/15 flex items-center justify-center text-teal shrink-0">
          <Download size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Install BuyersMatch</p>
          <p className="text-xs text-gray-400 mt-0.5">Add to home screen for the best experience</p>
        </div>
        <button
          onClick={handleAndroidInstall}
          className="px-4 py-2 bg-teal text-navy text-sm font-bold rounded-xl shrink-0 hover:bg-teal/90 active:scale-95 transition-all"
        >
          Install
        </button>
        <button onClick={dismiss} className="p-1.5 text-gray-500 hover:text-white transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
