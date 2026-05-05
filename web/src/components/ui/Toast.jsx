import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: <CheckCircle size={16} className="text-[var(--accent)]" />,
  error: <XCircle size={16} className="text-[var(--red)]" />,
  warning: <AlertCircle size={16} className="text-[var(--amber)]" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius)] px-4 py-3 shadow-xl animate-fade-in pointer-events-auto min-w-64 max-w-sm"
          >
            {icons[t.type] || icons.success}
            <span className="text-sm text-[var(--text-primary)] flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
