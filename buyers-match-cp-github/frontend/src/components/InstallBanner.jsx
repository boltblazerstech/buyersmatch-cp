import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISSED_KEY = 'bm-install-dismissed';

const InstallBanner = () => {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    if (ios && !standalone) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') dismiss();
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-[72px] md:bottom-5 left-4 right-4 z-50 flex items-center gap-3 bg-[#1B2A4A] border border-teal/40 rounded-2xl p-4 shadow-2xl shadow-black/60">
      <div className="w-11 h-11 rounded-xl bg-teal/15 flex items-center justify-center text-teal shrink-0">
        {isIOS ? <Share size={20} /> : <Download size={20} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-tight">Install BuyersMatch</p>
        {isIOS ? (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">
            Tap <strong className="text-teal">Share</strong> then <strong className="text-teal">Add to Home Screen</strong>
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">Add to home screen for the best experience</p>
        )}
      </div>

      {!isIOS && (
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-teal text-navy text-sm font-bold rounded-xl shrink-0 hover:bg-teal/90 active:scale-95 transition-all"
        >
          Install
        </button>
      )}

      <button
        onClick={dismiss}
        className="p-1.5 text-gray-500 hover:text-white transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default InstallBanner;
