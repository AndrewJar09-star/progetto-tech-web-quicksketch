import React, { createContext, useContext, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';

const ToastContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
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
            const icons = { success: '✅', error: '❌', info: 'ℹ️' };
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

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
