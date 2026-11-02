"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    X,
    Printer,
    Share2,
    Calendar,
    DollarSign,
    TrendingUp,
    ShoppingBag,
    CreditCard,
    Banknote,
    Clock,
    RefreshCw,
    Sparkles,
    CheckCircle2,
    Store,
    Flame,
    ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatRupees } from "@/lib/formatters";
import { printEODZReport } from "@/lib/thermalPrint";
import { dispatchEODWhatsApp } from "@/lib/whatsapp";
import { useOutlet } from "@/context/OutletContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";

interface EODReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function EODReportModal({ isOpen, onClose }: EODReportModalProps) {
    const { outlet } = useOutlet();
    const toast = useToast();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [report, setReport] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getEODReport(selectedDate, outlet?.id);
            setReport(data);
        } catch {
            toast.error("Failed to generate EOD Z-Report");
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, outlet?.id, toast]);

    useEffect(() => {
        if (isOpen) {
            fetchReport();
        }
    }, [isOpen, fetchReport]);

    if (!isOpen) return null;

    const s = report?.sales_summary || {};
    const pm = report?.payment_methods || {};
    const oc = report?.order_channels || {};
    const topItems = report?.top_selling_items || [];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] bg-white text-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <span>Daily End-of-Day (EOD) Z-Report</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold">
                                    {outlet?.name || "Surya Family Restaurant"}
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500">
                                Cash drawer reconciliation, sales overview, and tax reporting
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader Date & Actions */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white border border-slate-300 text-xs text-slate-900 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-600 font-bold"
                        />
                        <button
                            onClick={fetchReport}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Refresh Report"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => printEODZReport(report, outlet)}
                            disabled={!report}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Z-Report (Thermal)</span>
                        </button>

                        <button
                            onClick={() => dispatchEODWhatsApp(report, outlet?.phone || "9876543210")}
                            disabled={!report}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Send to WhatsApp</span>
                        </button>
                    </div>
                </div>

                {/* Report Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-24 bg-slate-100 rounded-2xl border border-slate-200" />
                                ))}
                            </div>
                            <div className="h-44 bg-slate-100 rounded-2xl border border-slate-200" />
                        </div>
                    ) : !report ? (
                        <div className="text-center py-16 text-slate-400">
                            <p>No report data found for this date.</p>
                        </div>
                    ) : (
                        <>
                            {/* 4 KPI Summary Tiles */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-espresso-400 uppercase tracking-wider">Total Orders</span>
                                    <div className="text-2xl font-black text-slate-900 font-mono mt-1">{s.total_orders || 0}</div>
                                    <span className="text-[10px] text-espresso-500 mt-1">Dine-in: {oc.dine_in?.count || 0} • Deliv: {oc.delivery?.count || 0}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-espresso-400 uppercase tracking-wider">Gross Sales</span>
                                    <div className="text-2xl font-black text-blue-600 font-mono mt-1">{formatRupees(s.gross_sales_paise || 0)}</div>
                                    <span className="text-[10px] text-espresso-500 mt-1">Before discounts</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-espresso-400 uppercase tracking-wider">Total Discounts</span>
                                    <div className="text-2xl font-black text-red-500 font-mono mt-1">-{formatRupees(s.total_discount_paise || 0)}</div>
                                    <span className="text-[10px] text-espresso-500 mt-1">Promo code savings</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Net Revenue</span>
                                    <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{formatRupees(s.total_revenue_paise || 0)}</div>
                                    <span className="text-[10px] text-emerald-400/70 mt-1">Incl. {formatRupees(s.total_tax_paise || 0)} GST</span>
                                </div>
                            </div>

                            {/* Cash Drawer Reconciliation */}
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                                    <Banknote className="w-4 h-4" />
                                    <span>Payment Method & Cash Drawer Reconciliation</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">Cash in Drawer</span>
                                            <p className="text-[10px] text-slate-400">{pm.cash?.count || 0} cash bills</p>
                                        </div>
                                        <span className="text-base font-black text-slate-900 font-mono">{formatRupees(pm.cash?.total_paise || 0)}</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">UPI / QR Collections</span>
                                            <p className="text-[10px] text-slate-400">{pm.upi?.count || 0} direct QR payments</p>
                                        </div>
                                        <span className="text-base font-black text-blue-600 font-mono">{formatRupees(pm.upi?.total_paise || 0)}</span>
                                    </div>
                                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800">Other (Card / Counter)</span>
                                            <p className="text-[10px] text-slate-400">{(pm.card?.count || 0) + (pm.counter?.count || 0) + (pm.cod?.count || 0)} orders</p>
                                        </div>
                                        <span className="text-base font-black text-slate-900 font-mono">
                                            {formatRupees((pm.card?.total_paise || 0) + (pm.counter?.total_paise || 0) + (pm.cod?.total_paise || 0))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Top 5 Selling Dishes Today */}
                            {topItems.length > 0 && (
                                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-3">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                                        <Flame className="w-4 h-4" />
                                        <span>Top Selling Dishes of the Day</span>
                                    </h4>
                                    <div className="divide-y divide-slate-200 pt-1">
                                        {topItems.map((it: any, i: number) => (
                                            <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-[10px]">
                                                        {i + 1}
                                                    </span>
                                                    <span className="font-bold text-slate-900">{it.item_name}</span>
                                                    <span className="text-[10px] text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                        x{it.qty_sold} sold
                                                    </span>
                                                </div>
                                                <span className="font-black text-blue-600 font-mono">{formatRupees(it.revenue_paise)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
