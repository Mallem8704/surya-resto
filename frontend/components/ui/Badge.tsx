"use client";

import React from "react";
import { Star, Clock, CheckCircle, ChefHat, Sparkles, XCircle, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ==========================================
// VEG / NON-VEG INDICATOR BADGE
// ==========================================

export function VegBadge({ isVeg, showText = true }: { isVeg: boolean; showText?: boolean }) {
    const { t } = useLanguage();

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wide select-none ${
                isVeg
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-800"
                    : "border-red-500/40 bg-red-50 text-red-800"
            }`}
        >
            <span
                className={`w-2 h-2 rounded-full inline-block ${
                    isVeg ? "bg-emerald-600" : "bg-red-600"
                }`}
            />
            {showText && <span>{isVeg ? t("veg") : t("non_veg")}</span>}
        </span>
    );
}

// ==========================================
// SPECIAL / BESTSELLER BADGE
// ==========================================

export function SpecialBadge({ label }: { label?: string }) {
    const { t } = useLanguage();
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-saffron-500 text-espresso-950 text-[11px] font-extrabold shadow-sm shadow-saffron-500/20">
            <Star className="w-3 h-3 fill-espresso-950 stroke-none" />
            <span>{label || t("special")}</span>
        </span>
    );
}

// ==========================================
// STOCK AVAILABILITY BADGE
// ==========================================

export function StockBadge({
    status,
    qty,
}: {
    status: "in_stock" | "low_stock" | "out_of_stock" | string;
    qty?: number;
}) {
    const { t } = useLanguage();

    if (status === "out_of_stock" || qty === 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200 text-[11px] font-bold">
                <XCircle className="w-3 h-3" />
                <span>{t("out_of_stock")}</span>
            </span>
        );
    }

    if (status === "low_stock") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-saffron-100 text-saffron-900 border border-saffron-300 text-[11px] font-bold">
                <AlertTriangle className="w-3 h-3 text-saffron-700" />
                <span>{t("low_stock")}{qty !== undefined ? ` (${qty})` : ""}</span>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
            <CheckCircle className="w-3 h-3" />
            <span>{t("in_stock")}{qty !== undefined ? ` (${qty})` : ""}</span>
        </span>
    );
}

// ==========================================
// ORDER STATUS BADGE
// ==========================================

export function OrderStatusBadge({ status }: { status: string }) {
    const { t } = useLanguage();
    const st = status.toLowerCase();

    const config: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; labelKey: any }> = {
        placed: {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
            icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
            labelKey: "status_placed",
        },
        accepted: {
            bg: "bg-indigo-50",
            text: "text-indigo-700",
            border: "border-indigo-200",
            icon: <Sparkles className="w-3.5 h-3.5 text-indigo-600" />,
            labelKey: "status_accepted",
        },
        preparing: {
            bg: "bg-saffron-50",
            text: "text-saffron-800",
            border: "border-saffron-200",
            icon: <ChefHat className="w-3.5 h-3.5 text-saffron-600 animate-bounce" />,
            labelKey: "status_preparing",
        },
        ready: {
            bg: "bg-emerald-50",
            text: "text-emerald-800",
            border: "border-emerald-200",
            icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />,
            labelKey: "status_ready",
        },
        served: {
            bg: "bg-cream-200",
            text: "text-espresso-800",
            border: "border-cream-300",
            icon: <CheckCircle className="w-3.5 h-3.5 text-espresso-700" />,
            labelKey: "status_served",
        },
        cancelled: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
            icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
            labelKey: "status_cancelled",
        },
    };

    const cfg = config[st] || config["placed"];

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold tracking-tight shadow-2xs ${cfg.bg} ${cfg.text} ${cfg.border}`}
        >
            {cfg.icon}
            <span>{t(cfg.labelKey, cfg.labelKey)}</span>
        </span>
    );
}
