import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const STYLES = {
  success: {
    border: 'border-teal/40',
    icon: <CheckCircle2 size={18} className="text-teal shrink-0" />,
    title: 'text-teal',
  },
  error: {
    border: 'border-red-500/40',
    icon: <XCircle size={18} className="text-red-400 shrink-0" />,
    title: 'text-red-400',
  },
  info: {
    border: 'border-blue-400/40',
    icon: <AlertCircle size={18} className="text-blue-400 shrink-0" />,
    title: 'text-blue-400',
  },
};

const ToastItem = ({ toast, onClose }) => {
  const s = STYLES[toast.type] || STYLES.info;
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 bg-[#1B2A4A] border ${s.border} rounded-2xl px-4 py-3 shadow-2xl min-w-[280px] max-w-sm animate-in fade-in slide-in-from-right-4 duration-200`}
    >
      {s.icon}
      <p className="text-sm text-white flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-white transition-colors shrink-0 mt-px"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
