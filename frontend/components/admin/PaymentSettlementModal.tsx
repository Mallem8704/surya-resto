"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Banknote,
    QrCode,
    Users,
    CheckCircle2,
    Printer,
    MessageCircle,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import { formatRupees } from "@/lib/formatters";
import { soundManager } from "@/lib/sound";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useOutlet } from "@/context/OutletContext";
import { printPOSReceipt } from "@/lib/thermalPrint";
import { dispatchCustomerWhatsApp } from "@/lib/whatsapp";

interface PaymentSettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any | null;
    onSuccess: () => void;
}

export function PaymentSettlementModal({
    isOpen,
    onClose,
    order,
    onSuccess,
}: PaymentSettlementModalProps) {
    const toast = useToast();
    const { language } = useLanguage();
    const { outlet } = useOutlet();

    const [activeTab, setActiveTab] = useState<"cash" | "upi" | "split">("cash");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cash State
    const [tenderedAmount, setTenderedAmount] = useState<number | string>("");

    // Dynamic UPI State
    const [dynamicUpi, setDynamicUpi] = useState<any>(null);
    const [isLoadingUpi, setIsLoadingUpi] = useState(false);

    // Split State
    const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
    const [splitPeople, setSplitPeople] = useState<number>(2);
    const [customCashRs, setCustomCashRs] = useState<number | string>("");
    const [customUpiRs, setCustomUpiRs] = useState<number | string>("");
    const [customCardRs, setCustomCardRs] = useState<number | string>("");

    // Calculate Balances
    const totalPaise = order ? order.total_paise : 0;
    const totalRs = totalPaise / 100;

    // Load Dynamic UPI when tab is selected
    useEffect(() => {
        if (isOpen && order && activeTab === "upi") {
            setIsLoadingUpi(true);
            api.getDynamicUpi(order.id)
                .then((data: any) => setDynamicUpi(data))
                .catch((err: any) => {
                    console.error("Failed to load dynamic UPI QR:", err);
                    toast.error("Failed to load dynamic UPI details");
                })
                .finally(() => setIsLoadingUpi(false));
        }
    }, [isOpen, order, activeTab, toast]);

    // Reset fields on modal open
    useEffect(() => {
        if (isOpen && order) {
            setTenderedAmount(order.total_paise / 100);
            setCustomCashRs(Math.floor(totalRs / 2));
            setCustomUpiRs(Math.ceil(totalRs / 2));
            setCustomCardRs("");
        }
    }, [isOpen, order, totalRs]);

    if (!isOpen || !order) return null;

    const tenderedNum = Number(tenderedAmount) || 0;
    const changeReturnRs = tenderedNum >= totalRs ? (tenderedNum - totalRs) : 0;
    const shortAmountRs = tenderedNum < totalRs ? (totalRs - tenderedNum) : 0;

    // Fast Cash Buttons
    const fastNotes = [
        { label: `Exact (₹${totalRs})`, val: totalRs },
        { label: "₹100", val: 100 },
        { label: "₹200", val: 200 },
        { label: "₹500", val: 500 },
        { label: "₹1000", val: 1000 },
        { label: "₹2000", val: 2000 },
    ].filter((n) => n.val >= totalRs || n.label.startsWith("Exact"));

    // 1. Submit Cash Payment
    const handleSettleCash = async () => {
        if (tenderedNum < totalRs) {
            toast.error(`Tendered amount is short by ₹${shortAmountRs.toFixed(2)}`);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.recordPayment(order.id, {
                method: "cash",
                amount_paise: totalPaise,
                tendered_paise: Math.round(tenderedNum * 100),
                change_returned_paise: Math.round(changeReturnRs * 100),
                notes: `Cash collected at counter. Tendered: ₹${tenderedNum}, Change: ₹${changeReturnRs}`,
            });

            toast.success(`🎉 Order #${order.order_number} PAID in Cash! Return change: ₹${changeReturnRs.toFixed(2)}`);
            soundManager.playPaymentSoundbox(totalRs, "Cash", order.table_label, language as any);

            // Auto-print POS thermal receipt
            printPOSReceipt({ ...order, payment_status: "paid", payment_method: "cash" }, outlet);

            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to record cash payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 2. Submit Direct Dynamic UPI Payment
    const handleSettleUpi = async () => {
        setIsSubmitting(true);
        try {
            await api.recordPayment(order.id, {
                method: "upi",
                amount_paise: totalPaise,
                txn_id: `UPI-${Date.now()}`,
                notes: `Direct UPI payment verified by cashier`,
            });

            toast.success(`🎉 Order #${order.order_number} PAID via Direct UPI!`);
            soundManager.playPaymentSoundbox(totalRs, "UPI", order.table_label, language as any);

            printPOSReceipt({ ...order, payment_status: "paid", payment_method: "upi" }, outlet);

            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to record UPI payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 3. Submit Split Payment
    const handleSettleSplit = async () => {
        setIsSubmitting(true);
        try {
            if (splitType === "equal") {
                const perPersonRs = totalRs / splitPeople;
                const perPersonPaise = Math.round(perPersonRs * 100);
                const payments = Array.from({ length: splitPeople }, (_, i) => ({
                    method: "upi",
                    amount_paise: i === splitPeople - 1 ? totalPaise - perPersonPaise * (splitPeople - 1) : perPersonPaise,
                    notes: `Equal split (${i + 1}/${splitPeople})`,
                }));

                await api.splitPayment(order.id, { payments, notes: `Split equally among ${splitPeople} persons` });
            } else {
                const cashPaise = Math.round((Number(customCashRs) || 0) * 100);
                const upiPaise = Math.round((Number(customUpiRs) || 0) * 100);
                const cardPaise = Math.round((Number(customCardRs) || 0) * 100);

                if (cashPaise + upiPaise + cardPaise !== totalPaise) {
                    toast.error(`Split sum (₹${((cashPaise + upiPaise + cardPaise) / 100).toFixed(2)}) must equal total bill (₹${totalRs})`);
                    setIsSubmitting(false);
                    return;
                }

                const payments = [];
                if (cashPaise > 0) payments.push({ method: "cash", amount_paise: cashPaise, notes: "Hybrid split cash" });
                if (upiPaise > 0) payments.push({ method: "upi", amount_paise: upiPaise, notes: "Hybrid split UPI" });
                if (cardPaise > 0) payments.push({ method: "card", amount_paise: cardPaise, notes: "Hybrid split card" });

                await api.splitPayment(order.id, { payments, notes: "Multi-tender hybrid payment" });
            }

            toast.success(`🎉 Order #${order.order_number} Split Payment Settled!`);
            soundManager.playPaymentSoundbox(totalRs, "Split", order.table_label, language as any);

            printPOSReceipt({ ...order, payment_status: "paid", payment_method: "split" }, outlet);

            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Failed to process split payment");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-[#120e09] border border-amber-400/40 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col text-white">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-amber-950/80 via-black to-amber-950/80 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                                {order.order_type === "delivery" ? "🛵 Delivery Settle" : `🍽️ Table ${order.table_label || "Counter"}`}
                            </span>
                            <span className="font-mono text-xs text-white/60">#{order.order_number}</span>
                        </div>
                        <h2 className="text-xl font-black text-white mt-1">
                            Settle Bill: <span className="text-amber-400 font-mono">{formatRupees(totalPaise)}</span>
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 transition cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-black/40 p-1.5 gap-1.5">
                    <button
                        onClick={() => setActiveTab("cash")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            activeTab === "cash"
                                ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Banknote className="w-4 h-4" />
                        <span>💵 Cash Tender</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("upi")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            activeTab === "upi"
                                ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <QrCode className="w-4 h-4" />
                        <span>📱 Dynamic UPI</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("split")}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            activeTab === "split"
                                ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-black"
                                : "text-white/60 hover:text-white hover:bg-white/5"
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>👥 Split Bill</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
                    {/* TAB 1: CASH TENDER */}
                    {activeTab === "cash" && (
                        <div className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-white/70 mb-1.5">
                                    Cash Amount Received from Customer (₹)
                                </label>
                                <input
                                    type="number"
                                    value={tenderedAmount}
                                    onChange={(e) => setTenderedAmount(e.target.value)}
                                    placeholder="Enter cash given"
                                    className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/20 text-xl font-mono font-black text-amber-400 focus:outline-none focus:border-emerald-400"
                                />
                            </div>

                            {/* Quick Note Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {fastNotes.map((note, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setTenderedAmount(note.val)}
                                        className={`px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                            Number(tenderedAmount) === note.val
                                                ? "bg-emerald-500 text-black shadow-md"
                                                : "bg-white/10 hover:bg-white/20 text-white"
                                        }`}
                                    >
                                        {note.label}
                                    </button>
                                ))}
                            </div>

                            {/* Change Return Banner */}
                            <div
                                className={`p-4 rounded-2xl border flex items-center justify-between ${
                                    tenderedNum >= totalRs
                                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                                        : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                                }`}
                            >
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                                        {tenderedNum >= totalRs ? "Return Change to Customer" : "Short Amount"}
                                    </p>
                                    <p className="text-2xl font-mono font-black">
                                        {tenderedNum >= totalRs
                                            ? `₹${changeReturnRs.toFixed(2)}`
                                            : `₹${shortAmountRs.toFixed(2)} short`}
                                    </p>
                                </div>
                                <span className="text-3xl">{tenderedNum >= totalRs ? "💵" : "⚠️"}</span>
                            </div>

                            <button
                                onClick={handleSettleCash}
                                disabled={isSubmitting || tenderedNum < totalRs}
                                className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition cursor-pointer"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Collect Cash & Mark Paid (Print Bill)</span>
                            </button>
                        </div>
                    )}

                    {/* TAB 2: DYNAMIC ZERO-FEE UPI QR */}
                    {activeTab === "upi" && (
                        <div className="space-y-4 text-center animate-in fade-in">
                            {isLoadingUpi ? (
                                <div className="py-12 flex flex-col items-center gap-2">
                                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                                    <p className="text-xs text-white/60">Generating Dynamic UPI QR...</p>
                                </div>
                            ) : dynamicUpi ? (
                                <div className="p-4 rounded-3xl bg-black/60 border border-amber-400/30 flex flex-col items-center gap-3">
                                    <div className="bg-white p-3 rounded-2xl shadow-xl">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                                dynamicUpi.upi_uri
                                            )}`}
                                            alt="Dynamic UPI QR"
                                            className="w-44 h-44 object-contain rounded-lg"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                            <span>Scan with GPay / PhonePe / Paytm / BHIM</span>
                                        </div>
                                        <p className="text-lg font-mono font-black text-amber-400">
                                            ₹{dynamicUpi.amount_rs.toFixed(2)}
                                        </p>
                                        <p className="text-[11px] text-white/50 font-mono">
                                            VPA: {dynamicUpi.upi_vpa} &bull; {dynamicUpi.outlet_name}
                                        </p>
                                    </div>

                                    {/* Mobile Direct UPI Intent */}
                                    <a
                                        href={dynamicUpi.upi_uri}
                                        className="sm:hidden w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Open in UPI App on this device</span>
                                    </a>
                                </div>
                            ) : null}

                            <button
                                onClick={handleSettleUpi}
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition cursor-pointer"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Verify & Mark Paid via UPI (Voice Chime)</span>
                            </button>
                        </div>
                    )}

                    {/* TAB 3: SPLIT BILL */}
                    {activeTab === "split" && (
                        <div className="space-y-4 animate-in fade-in">
                            {/* Split Sub-Tabs */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSplitType("equal")}
                                    className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                        splitType === "equal"
                                            ? "bg-cyan-500 text-black"
                                            : "bg-white/10 text-white/70"
                                    }`}
                                >
                                    Divide by Persons
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSplitType("custom")}
                                    className={`py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                        splitType === "custom"
                                            ? "bg-cyan-500 text-black"
                                            : "bg-white/10 text-white/70"
                                    }`}
                                >
                                    Hybrid (Cash + UPI)
                                </button>
                            </div>

                            {splitType === "equal" ? (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-white/70">
                                        Number of Friends / People Splitting
                                    </label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[2, 3, 4, 5, 6].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setSplitPeople(p)}
                                                className={`py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
                                                    splitPeople === p
                                                        ? "bg-cyan-500 text-black shadow-lg"
                                                        : "bg-white/10 text-white hover:bg-white/15"
                                                }`}
                                            >
                                                {p} Pax
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-4 rounded-2xl bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] text-cyan-300 font-bold uppercase">
                                                Each Person Pays
                                            </p>
                                            <p className="text-2xl font-mono font-black text-white">
                                                ₹{(totalRs / splitPeople).toFixed(2)}
                                            </p>
                                        </div>
                                        <span className="text-3xl">👥</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-white/70 mb-1">
                                            Cash Portion (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={customCashRs}
                                            onChange={(e) => setCustomCashRs(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-sm font-mono text-emerald-400 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-white/70 mb-1">
                                            UPI Portion (₹)
                                        </label>
                                        <input
                                            type="number"
                                            value={customUpiRs}
                                            onChange={(e) => setCustomUpiRs(e.target.value)}
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 text-sm font-mono text-amber-400 focus:outline-none"
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs font-bold pt-1">
                                        <span className="text-white/60">Total Bill: ₹{totalRs}</span>
                                        <span
                                            className={
                                                (Number(customCashRs) || 0) + (Number(customUpiRs) || 0) === totalRs
                                                    ? "text-emerald-400"
                                                    : "text-rose-400"
                                            }
                                        >
                                            Allocated: ₹{((Number(customCashRs) || 0) + (Number(customUpiRs) || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleSettleSplit}
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition cursor-pointer"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Record Split Settlements</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Fast Actions */}
                <div className="p-4 bg-black/60 border-t border-white/10 flex items-center justify-between text-xs">
                    <button
                        onClick={() => printPOSReceipt(order, outlet)}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Print Bill</span>
                    </button>

                    <button
                        onClick={() => dispatchCustomerWhatsApp(order, outlet)}
                        className="px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp Invoice</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
