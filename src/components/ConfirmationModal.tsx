import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = true,
}: Props) {
  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Card container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full relative z-10 p-6 flex flex-col gap-4"
          >
            {/* Close button top right */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Content */}
            <div className="flex items-start gap-3.5">
              {isDestructive && (
                <div className="p-2 bg-red-50 text-red-600 rounded-none flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                  Confirm Required Action
                </p>
              </div>
            </div>

            {/* Message */}
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {message}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-none"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors cursor-pointer rounded-none ${
                  isDestructive
                    ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/15"
                    : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/15"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
