import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  variant?: 'info' | 'success' | 'error' | 'warning';
  onClose: () => void;
  duration?: number; // ms
  rtl?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, variant = 'info', onClose, duration = 2500, rtl = false }) => {
  useEffect(() => {
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [onClose, duration]);

  const styles = {
    info: 'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-500 text-gray-900',
  } as const;

  return createPortal(
    <div
      className={`fixed left-1/2 -translate-x-1/2 ${rtl ? 'rtl' : ''} z-[9999] bottom-16 sm:bottom-20 px-4 transition-all duration-200 ease-out`}
      role="status"
      aria-live="polite"
    >
      <div className={`shadow-lg rounded-full px-4 py-2 text-sm sm:text-base ${styles[variant]} flex items-center gap-2 animate-[toast-in_0.2s_ease-out]`}
      >
        <span>{message}</span>
        <button
          onClick={onClose}
          className="ml-1 text-white/80 hover:text-white"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </div>,
    document.body
  );
};
