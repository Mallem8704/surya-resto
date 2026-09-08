"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast: ToastItem = { id, message, type, duration };

        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
    const error = useCallback((msg: string) => showToast(msg, "error", 5000), [showToast]);
    const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);
    const warning = useCallback((msg: string) => showToast(msg, "warning"), [showToast]);

    const value = React.useMemo(
        () => ({ showToast, success, error, info, warning }),
        [showToast, success, error, info, warning]
    );

    return (
        <ToastContext.Provider value={value}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-2 ${
                            t.type === "success"
                                ? "bg-white/95 border-emerald-300 text-emerald-950 shadow-emerald-500/10"
                                : t.type === "error"
                                ? "bg-white/95 border-red-300 text-red-950 shadow-red-500/10"
                                : t.type === "warning"
                                ? "bg-white/95 border-saffron-300 text-saffron-950 shadow-saffron-500/10"
                                : "bg-white/95 border-terracotta-200 text-espresso-950 shadow-espresso-950/10"
                        }`}
                    >
                        <div className="shrink-0 mt-0.5">
                            {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                            {t.type === "error" && <AlertCircle className="w-5 h-5 text-red-600" />}
                            {t.type === "warning" && <AlertTriangle className="w-5 h-5 text-saffron-600" />}
                            {t.type === "info" && <Info className="w-5 h-5 text-terracotta-500" />}
                        </div>

                        <div className="flex-1 text-sm font-medium leading-snug">{t.message}</div>

                        <button
                            onClick={() => removeToast(t.id)}
                            className="shrink-0 text-espresso-400 hover:text-espresso-700 transition"
                            aria-label="Dismiss toast"
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
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
