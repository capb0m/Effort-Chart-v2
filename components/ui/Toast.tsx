"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border pointer-events-auto transition-all",
              t.type === "success" && "bg-white dark:bg-[#1e1e2e] border-green-200 dark:border-green-500/30",
              t.type === "error" && "bg-white dark:bg-[#1e1e2e] border-red-200 dark:border-red-500/30",
              t.type === "info" && "bg-white dark:bg-[#1e1e2e] border-gray-200 dark:border-white/[0.06]"
            )}
          >
            {t.type === "success" && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />}
            <p className="text-sm flex-1 text-gray-800 dark:text-white/90">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
