import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReactDOM from 'react-dom';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 3500) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {ReactDOM.createPortal(
        <div id="toast-container">
          {toasts.map(toast => {
            const icons: Record<ToastType, string> = { success: '✅', error: '❌', info: 'ℹ️' };
            return (
              <div key={toast.id} className={`toast toast-${toast.type}`}>
                <span>{icons[toast.type] || ''}</span> {toast.message}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
