import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, XCircle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Portal Container */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const config = getToastConfig(toast.type);
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
                className={`pointer-events-auto w-full border ${config.bg} ${config.border} flex items-start gap-3 p-4 shadow-xl relative overflow-hidden`}
              >
                {/* Accent indicator line */}
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${config.accent}`}></div>

                <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
                  {config.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white font-sans leading-relaxed">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="flex-shrink-0 p-1 hover:bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function getToastConfig(type: ToastType) {
  switch (type) {
    case "success":
      return {
        bg: "bg-white dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        accent: "bg-emerald-500",
        iconColor: "text-emerald-500",
        icon: <CheckCircle className="w-4 h-4" />
      };
    case "error":
      return {
        bg: "bg-white dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        accent: "bg-red-500",
        iconColor: "text-red-500",
        icon: <XCircle className="w-4 h-4" />
      };
    case "warning":
      return {
        bg: "bg-white dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        accent: "bg-amber-500",
        iconColor: "text-amber-500",
        icon: <AlertCircle className="w-4 h-4" />
      };
    case "info":
    default:
      return {
        bg: "bg-white dark:bg-slate-900",
        border: "border-slate-200 dark:border-slate-800",
        accent: "bg-blue-500",
        iconColor: "text-blue-500",
        icon: <Info className="w-4 h-4" />
      };
  }
}
