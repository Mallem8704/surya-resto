"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    X,
    Briefcase,
    Banknote,
    Printer,
    CheckCircle2,
    AlertTriangle,
    Clock,
    DollarSign,
    QrCode,
    CreditCard,
    Calculator,
    ArrowRight,
    RefreshCw,
    Shield,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { formatRupees } from "@/lib/formatters";
import { printShiftHandoverReport } from "@/lib/thermalPrint";

interface POSShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    outlet: any;
    currentUserName?: string;
}

export function POSShiftModal({ isOpen, onClose, outlet, currentUserName = "Cashier" }: POSShiftModalProps) {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasOpenShift, setHasOpenShift] = useState<boolean>(false);
    const [currentShift, setCurrentShift] = useState<any | null>(null);

    // Opening Shift Form
    const [openingFloatRupees, setOpeningFloatRupees] = useState<string>("2000");
    const [shiftName, setShiftName] = useState<string>("Morning / Lunch Shift");
    const [openNotes, setOpenNotes] = useState<string>("");
    const [isOpening, setIsOpening] = useState<boolean>(false);

    // Closing Shift Denominations Form
    const [counts, setCounts] = useState<{ [key: string]: string }>({
        "500": "0",
        "200": "0",
        "100": "0",
        "50": "0",
        "20": "0",
        "10": "0",
        "coins": "0",
    });
    const [closingNotes, setClosingNotes] = useState<string>("");
    const [isClosing, setIsClosing] = useState<boolean>(false);

    // Calculate Physical Cash Counted
    const totalPhysicalCashRupees = useMemo(() => {
        const c500 = (parseInt(counts["500"]) || 0) * 500;
        const c200 = (parseInt(counts["200"]) || 0) * 200;
        const c100 = (parseInt(counts["100"]) || 0) * 100;
        const c50 = (parseInt(counts["50"]) || 0) * 50;
        const c20 = (parseInt(counts["20"]) || 0) * 20;
        const c10 = (parseInt(counts["10"]) || 0) * 10;
        const coins = parseInt(counts["coins"]) || 0;
        return c500 + c200 + c100 + c50 + c20 + c10 + coins;
    }, [counts]);

    const expectedCashRupees = currentShift?.expected_cash_rupees || 0;
    const differenceRupees = totalPhysicalCashRupees - expectedCashRupees;

    const fetchShiftStatus = async () => {
        setIsLoading(true);
        try {
            const data = await api.getCurrentShift(outlet?.id);
            setHasOpenShift(data.has_open_shift);
            setCurrentShift(data.shift);
        } catch {
            toast.error("Failed to load shift register status");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchShiftStatus();
        }
    }, [isOpen, outlet?.id]);

    // Open Shift Submit
    const handleOpenShiftSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const floatRs = parseFloat(openingFloatRupees) || 0;
        setIsOpening(true);
        try {
            await api.openShift({
                opening_float_paise: Math.round(floatRs * 100),
                shift_name: shiftName,
                notes: openNotes,
            }, outlet?.id);
            toast.success(`🚀 Shift started with ₹${floatRs.toFixed(2)} opening float`);
            fetchShiftStatus();
        } catch (err: any) {
            toast.error(err.message || "Failed to open shift");
        } finally {
            setIsOpening(false);
        }
    };

    // Close Shift Submit
    const handleCloseShiftSubmit = async () => {
        if (!currentShift) return;
        setIsClosing(true);
        try {
            const res = await api.closeShift(currentShift.id, {
                actual_cash_paise: Math.round(totalPhysicalCashRupees * 100),
                denominations_json: JSON.stringify(counts),
                closing_notes: closingNotes,
            });

            toast.success(res.message || "Shift closed successfully");
            if (res.handover_report) {
                printShiftHandoverReport(res.handover_report, outlet);
            }
            fetchShiftStatus();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to close shift");
        } finally {
            setIsClosing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#17130F] text-white rounded-3xl border border-[#D4AF37]/40 shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
                {/* MODAL HEADER */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-serif font-black text-lg sm:text-xl text-white flex items-center gap-2">
                                Cash Drawer &amp; Shift Register
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                                    hasOpenShift ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30" : "bg-red-500/20 text-red-300 border border-red-500/30"
                                }`}>
                                    {hasOpenShift ? "Shift Open" : "Register Closed"}
                                </span>
                            </h2>
                            <p className="text-xs text-white/50">Opening float, live drawer reconciliation &amp; cashier shift handover</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={fetchShiftStatus}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 transition cursor-pointer"
                            title="Refresh shift data"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* MODAL BODY */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    {isLoading ? (
                        <div className="py-12 text-center text-xs text-white/40">Loading shift register status...</div>
                    ) : !hasOpenShift ? (
                        /* ══════════════════════════════════════════════════════════
                            1. START NEW SHIFT FORM
                           ══════════════════════════════════════════════════════════ */
                        <form onSubmit={handleOpenShiftSubmit} className="space-y-4 max-w-lg mx-auto">
                            <div className="p-4 rounded-3xl bg-black/40 border border-white/10 space-y-3">
                                <div className="flex items-center gap-2 text-amber-400">
                                    <Shield className="w-4 h-4" />
                                    <h3 className="font-bold text-sm text-white">Start Cashier Shift</h3>
                                </div>
                                <p className="text-xs text-white/60">
                                    Enter your starting drawer float (coins &amp; change) to begin billing and tracking cash reconciliation.
                                </p>

                                <div>
                                    <label className="text-xs font-bold text-white/70 block mb-1">Shift Name</label>
                                    <select
                                        value={shiftName}
                                        onChange={(e) => setShiftName(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
                                    >
                                        <option value="Morning / Lunch Shift">🌅 Morning / Lunch Shift (7 AM - 4 PM)</option>
                                        <option value="Evening / Dinner Shift">🍗 Evening / Dinner Shift (4 PM - 11:30 PM)</option>
                                        <option value="Full Day Shift">🌟 Full Day Continuous Shift</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-white/70 block mb-1">
                                        Opening Cash Float (₹ in Drawer) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-amber-400">
                                            ₹
                                        </span>
                                        <input
                                            type="number"
                                            value={openingFloatRupees}
                                            onChange={(e) => setOpeningFloatRupees(e.target.value)}
                                            placeholder="2000"
                                            required
                                            min="0"
                                            className="w-full pl-8 pr-3 py-2.5 bg-black/60 border border-white/10 rounded-xl text-sm font-mono font-black text-white focus:outline-none focus:border-amber-400"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {["1000", "2000", "3000", "5000"].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setOpeningFloatRupees(amt)}
                                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-white/80"
                                            >
                                                ₹{amt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-white/70 block mb-1">Opening Notes (Optional)</label>
                                    <input
                                        type="text"
                                        value={openNotes}
                                        onChange={(e) => setOpenNotes(e.target.value)}
                                        placeholder="e.g. Received ₹2000 from Manager Asif"
                                        className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isOpening}
                                className="w-full py-3.5 rounded-2xl bg-[#D4AF37] hover:bg-[#C59B27] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition cursor-pointer"
                            >
                                <Briefcase className="w-4 h-4" />
                                <span>{isOpening ? "Starting Shift..." : "Open Shift &amp; Unlock Register"}</span>
                            </button>
                        </form>
                    ) : (
                        /* ══════════════════════════════════════════════════════════
                            2. ACTIVE SHIFT RECONCILIATION & CLOSING FORM
                           ══════════════════════════════════════════════════════════ */
                        <div className="space-y-6">
                            {/* Live Shift KPI Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10">
                                    <span className="text-[10px] text-white/50 block uppercase font-bold">Opening Float</span>
                                    <span className="font-mono font-black text-base text-white">
                                        ₹{currentShift.opening_float_rupees.toFixed(2)}
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-black/40 border border-emerald-500/30">
                                    <span className="text-[10px] text-emerald-400 block uppercase font-bold">Cash Sales</span>
                                    <span className="font-mono font-black text-base text-emerald-400">
                                        +₹{currentShift.cash_sales_rupees.toFixed(2)}
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-black/40 border border-indigo-500/30">
                                    <span className="text-[10px] text-indigo-400 block uppercase font-bold">UPI Online QR</span>
                                    <span className="font-mono font-black text-base text-indigo-400">
                                        ₹{currentShift.upi_sales_rupees.toFixed(2)}
                                    </span>
                                </div>
                                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40">
                                    <span className="text-[10px] text-amber-300 block uppercase font-black">Expected Drawer Cash</span>
                                    <span className="font-mono font-black text-lg text-[#D4AF37]">
                                        ₹{currentShift.expected_cash_rupees.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* Denomination Counter Matrix */}
                            <div className="p-4 rounded-3xl bg-black/40 border border-white/10 space-y-3">
                                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                    <h4 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-amber-400" />
                                        Physical Cash Counter (Shift Closing Handover)
                                    </h4>
                                    <span className="text-[11px] font-mono text-white/50">Enter Note Counts</span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {[
                                        { key: "500", label: "₹500 Notes" },
                                        { key: "200", label: "₹200 Notes" },
                                        { key: "100", label: "₹100 Notes" },
                                        { key: "50", label: "₹50 Notes" },
                                        { key: "20", label: "₹20 Notes" },
                                        { key: "10", label: "₹10 Notes" },
                                        { key: "coins", label: "Coins Total (₹)" },
                                    ].map((d) => (
                                        <div key={d.key} className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] text-white/60 font-bold block mb-1">{d.label}</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={counts[d.key]}
                                                onChange={(e) => setCounts({ ...counts, [d.key]: e.target.value })}
                                                className="w-full px-2 py-1 bg-black/60 border border-white/10 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Reconciled Comparison Bar */}
                                <div className="mt-3 p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] text-white/50 block uppercase font-bold">Total Physical Cash Counted</span>
                                        <span className="font-mono font-black text-xl text-white">
                                            ₹{totalPhysicalCashRupees.toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] text-white/50 block uppercase font-bold">Handover Difference</span>
                                        <span
                                            className={`font-mono font-black text-lg ${
                                                differenceRupees === 0
                                                    ? "text-emerald-400"
                                                    : differenceRupees > 0
                                                    ? "text-amber-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {differenceRupees === 0
                                                ? "✓ EXACT MATCH (₹0.00)"
                                                : differenceRupees > 0
                                                ? `+₹${differenceRupees.toFixed(2)} (OVERAGE)`
                                                : `-₹${Math.abs(differenceRupees).toFixed(2)} (SHORTAGE)`}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] text-white/60 font-bold block mb-1">Shift Closing Audit Notes</label>
                                    <input
                                        type="text"
                                        value={closingNotes}
                                        onChange={(e) => setClosingNotes(e.target.value)}
                                        placeholder="e.g. Handed over cash box to night manager Saleem"
                                        className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                                    />
                                </div>
                            </div>

                            {/* Handover & Close Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-xs text-white/70 transition cursor-pointer"
                                >
                                    Keep Shift Active &amp; Return to POS
                                </button>

                                <button
                                    type="button"
                                    onClick={handleCloseShiftSubmit}
                                    disabled={isClosing}
                                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    <span>{isClosing ? "Closing Shift..." : "Close Shift &amp; Print Handover (X-Report)"}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
