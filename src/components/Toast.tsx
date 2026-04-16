import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Toast, ToastType } from '../lib/types';

interface ToastContextValue {
  toasts: Toast[];
  push: (message: string, type?: ToastType) => string;
  dismiss: (id: string) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType = 'info'): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <ToastCtx.Provider value={{ toasts, push, dismiss }}>
      {children}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const BORDER_COLOR: Record<ToastType, string> = {
  success: 'border-l-green',
  error: 'border-l-red',
  info: 'border-l-accent',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);
  return (
    <div
      className={`min-w-[220px] max-w-[360px] bg-surface border border-border border-l-[3px] ${BORDER_COLOR[toast.type]} py-3 px-4 rounded-xl cursor-pointer text-[13px] animate-toast-in`}
      onClick={() => onDismiss(toast.id)}
    >
      {toast.message}
    </div>
  );
}

export function ToastStack() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-90">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
